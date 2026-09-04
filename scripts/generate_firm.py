from __future__ import annotations

"""
把抓取的原始文本/关键词送给 Gemini（JSON Schema Structured Outputs），
生成符合 src/lib/schema.ts 的 Prop Firm JSON，并写入 data/firms/<slug>.json。

用法：
  export GEMINI_API_KEY=your_key
  python3 scripts/generate_firm.py --source scrape.txt --keywords "ftmo,payout,profit split"
  python3 scripts/generate_firm.py --source scrape.txt --keywords-file keywords.txt --force
  python3 scripts/generate_firm.py --batch
  python3 scripts/generate_firm.py --batch --only the5ers,e8-markets --force
"""

import argparse
import json
import os
import re
import subprocess
import sys
import time
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, List, Optional
from urllib.error import URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from prop_firms import PROP_FIRMS, PropFirmSeed

ROOT = SCRIPT_DIR.parent
FIRMS_DIR = ROOT / "data" / "firms"
EXPORT_SCHEMA = ROOT / "scripts" / "export-json-schema.ts"
SAFE_INT_MAX = 9007199254740991
_MISSING = object()

CLOSED_FIRM_WARNING = "⚠️ Warning: Firm appeared to be closed."

GEMINI_SYSTEM_INSTRUCTION = """You are extracting a complete Prop Firm profile for a comparison website.
Return one JSON object that exactly matches the provided JSON Schema.
Do not include markdown or commentary.
If the website content indicates that the prop firm has closed, ceased operations, or suspended services, you MUST output "status": "suspended" in the JSON.
"""

# Path tokens that usually mean a shutdown landing page (not FAQ copy like "account closed").
CLOSURE_URL_MARKERS = (
    "shut-down",
    "shutdown",
    "out-of-business",
    "stop-operations",
    "winding-down",
    "ceased-operations",
)

# Firm-level shutdown copy. Bare "closed" / "shut down" is too noisy (account-breach FAQs).
CLOSURE_TEXT_PHRASES = (
    "no longer operating",
    "no longer in operation",
    "no longer in business",
    "ceased operations",
    "cease operations",
    "stop operations",
    "stopped operations",
    "out of business",
    "winding down operations",
    "has shut down",
    "have shut down",
    "is shutting down",
    "shutting down operations",
    "suspended services",
    "suspended operations",
    "is no longer operating",
)

_CLOSURE_CONTEXT_RE = re.compile(
    r"\b(?:firm|company|business|operations?|services?)\b.{0,48}\b(?:closed|shut\s*down|ceased)\b"
    r"|"
    r"\b(?:closed|shut\s*down|ceased)\b.{0,48}\b(?:firm|company|business|operations?|services?)\b",
    re.IGNORECASE | re.DOTALL,
)


@dataclass(frozen=True)
class FetchedPage:
    url: str
    text: str
    appeared_closed: bool


ENV_FILES = (
    ROOT / ".env",
    ROOT / "gemini-key.txt",
)


def load_dotenv() -> None:
    """读取仓库根目录的密钥文件（不覆盖已有环境变量）。"""
    for path in ENV_FILES:
        if not path.is_file():
            continue
        for raw_line in path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip("'").strip('"')
            if key and key not in os.environ:
                os.environ[key] = value


def load_zod_json_schema() -> dict[str, Any]:
    env = os.environ.copy()
    env["PATH"] = "/opt/homebrew/bin:/usr/local/bin:" + env.get("PATH", "")
    result = subprocess.run(
        ["npx", "tsx", str(EXPORT_SCHEMA)],
        cwd=ROOT,
        capture_output=True,
        text=True,
        env=env,
    )
    if result.returncode != 0:
        sys.stderr.write(result.stderr or result.stdout)
        raise SystemExit("无法从 src/lib/schema.ts 导出 JSON Schema（需要 Node 与 tsx）")
    return json.loads(result.stdout)


def sanitize_for_gemini(node: Any) -> Any:
    """去掉 Gemini Structured Outputs 不太吃的 JSON Schema 关键字。"""
    if isinstance(node, list):
        return [sanitize_for_gemini(item) for item in node]
    if not isinstance(node, dict):
        return node

    exclusive_min = node.get("exclusiveMinimum", _MISSING)
    out: dict[str, Any] = {}
    for key, value in node.items():
        if key in {"$schema", "default", "exclusiveMinimum"}:
            continue
        if key == "maximum" and value == SAFE_INT_MAX:
            continue
        if key == "const":
            out["enum"] = [sanitize_for_gemini(value)]
            continue
        out[key] = sanitize_for_gemini(value)

    if exclusive_min is not _MISSING:
        if out.get("type") == "integer" and exclusive_min == 0:
            out["minimum"] = 1
        else:
            out.setdefault("minimum", exclusive_min)
    return out


def read_text(path: str) -> str:
    if path == "-":
        return sys.stdin.read()
    return Path(path).read_text(encoding="utf-8")


def collect_keywords(raw: Optional[str], file_path: Optional[str]) -> List[str]:
    items: List[str] = []
    if raw:
        items.extend(part.strip() for part in raw.replace("\n", ",").split(","))
    if file_path:
        items.extend(
            line.strip()
            for line in Path(file_path).read_text(encoding="utf-8").splitlines()
        )
    return [item for item in items if item]


class _VisibleTextParser(HTMLParser):
    _SKIP = {"script", "style", "noscript", "svg", "template"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._skip_depth = 0
        self.chunks: List[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, Optional[str]]]) -> None:
        if tag in self._SKIP:
            self._skip_depth += 1

    def handle_endtag(self, tag: str) -> None:
        if tag in self._SKIP and self._skip_depth:
            self._skip_depth -= 1

    def handle_data(self, data: str) -> None:
        if self._skip_depth:
            return
        text = " ".join(data.split())
        if text:
            self.chunks.append(text)


def detect_firm_closure(url: str, text: str = "") -> bool:
    """True when the URL or page copy looks like a firm-level shutdown notice."""
    parsed = urlparse(url)
    path = parsed.path.lower()
    normalized = path.rstrip("/")
    if normalized.endswith("/closed") or "/closed/" in path:
        return True
    url_haystack = f"{path} {parsed.query} {parsed.fragment}".lower()
    if any(marker in url_haystack for marker in CLOSURE_URL_MARKERS):
        return True

    lowered = " ".join(text.lower().split())
    if any(phrase in lowered for phrase in CLOSURE_TEXT_PHRASES):
        return True
    return bool(lowered and _CLOSURE_CONTEXT_RE.search(lowered))


def warn_if_closed(url: str, text: str = "") -> bool:
    appeared_closed = detect_firm_closure(url, text)
    if appeared_closed:
        print(CLOSED_FIRM_WARNING)
    return appeared_closed


def fetch_site_text(url: str, max_chars: int = 16000) -> FetchedPage:
    """Best-effort homepage text for Gemini context. Empty text on failure."""
    request = Request(
        url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (compatible; PropFXLab/1.0; +https://www.propfxlab.com)"
            ),
            "Accept": "text/html,application/xhtml+xml",
        },
        method="GET",
    )
    try:
        with urlopen(request, timeout=20) as response:
            final_url = response.geturl() or url
            raw = response.read(max_chars * 4)
            charset = response.headers.get_content_charset() or "utf-8"
            html = raw.decode(charset, errors="replace")
    except (URLError, TimeoutError, OSError, ValueError) as error:
        print(f"  抓取 {url} 失败（将仅用公开知识生成）: {error}")
        return FetchedPage(
            url=url,
            text="",
            appeared_closed=warn_if_closed(url, ""),
        )

    parser = _VisibleTextParser()
    try:
        parser.feed(html)
        parser.close()
        text = " ".join(parser.chunks)[:max_chars]
    except Exception:
        text = html[:max_chars]

    appeared_closed = detect_firm_closure(final_url, text) or detect_firm_closure(
        url, text
    )
    if appeared_closed:
        print(CLOSED_FIRM_WARNING)
    return FetchedPage(url=final_url, text=text, appeared_closed=appeared_closed)


def build_prompt(source_text: str, keywords: List[str], slug_hint: Optional[str]) -> str:
    keyword_block = ", ".join(keywords) if keywords else "(none provided)"
    slug_line = (
        f"- Prefer slug `{slug_hint}` unless the source clearly uses another kebab-case name.\n"
        if slug_hint
        else ""
    )
    return f"""You are extracting a complete Prop Firm profile for a comparison website.

Return one JSON object that exactly matches the provided JSON Schema.
Do not include markdown or commentary.
If the website content indicates that the prop firm has closed, ceased operations, or suspended services, you MUST output "status": "suspended" in the JSON.

Rules:
- Use only facts supported by the source text. Do not invent payout numbers, fees, or dates.
- If a nullable field is unknown, use null (for example maxAmount, subsequentIntervalDays, maxProfit).
- If a required field is missing from the source, use the most conservative value consistent with the text and say so in payoutCycle.description or an FAQ answer.
- slug, FAQ id/slug, and channel id must be kebab-case (lowercase letters, digits, hyphens).
- defaultTraderSharePercent + defaultFirmSharePercent must equal 100.
- faq.seo.schemaType must be FAQPage.
- faq.seo.canonicalPath must look like /firms/<slug>/faq/<faq-slug>.
- faq.seo.metaDescription max 320 characters.
- Include at least 5 FAQs useful for pSEO, incorporating the keywords where natural.
- Logo src must be an http(s) URL or a path starting with /.
{slug_line}
Keywords to cover:
{keyword_block}

Source text:
---
{source_text.strip()}
---
"""


def build_batch_prompt(firm: PropFirmSeed, source_text: str) -> str:
    """Map card-level fields onto the full Zod schema used by the site."""
    site_block = (
        f"Official website excerpt (may be incomplete or marketing copy):\n---\n{source_text}\n---\n"
        if source_text.strip()
        else "No website excerpt was available. Use well-known public facts and stay conservative.\n"
    )
    return f"""You are extracting a complete Prop Firm profile for a comparison website.

Return one JSON object that exactly matches the provided JSON Schema.
Do not include markdown or commentary.
If the website content indicates that the prop firm has closed, ceased operations, or suspended services, you MUST output "status": "suspended" in the JSON.

Locked fields (copy exactly, do not rename):
- slug: "{firm['slug']}"
- basic.name: "{firm['name']}"
- basic.website: "{firm['url']}"

Status field:
- Use "active" only if the firm still operates and pays out.
- If the website content indicates that the prop firm has closed, ceased operations, or suspended services, you MUST output "status": "suspended" in the JSON.

Card-level facts the homepage needs (encode them in the full schema, not as extra keys):
- profitSplit: a human-readable range such as "80% - 90%". Encode this as
  withdrawal.defaultTraderSharePercent (the typical starting trader share) plus
  calculator.profitSplitTiers covering each published program / scaled tier.
  defaultTraderSharePercent + defaultFirmSharePercent must equal 100.
- payoutSpeed: short card copy such as "Within 24 Hours". Put it in payoutSpeed.
- payoutMethods: methods such as Crypto/USDT, Rise, Bank Transfer. Encode each
  as an object in withdrawal.channels (id kebab-case, method one of
  bank_wire / card / ewallet / crypto / other).
- faqs: at least 4 detailed Q&A items focused on payout rules and drawdown.
  Each FAQ must include id, slug, locale "en", keywords, and seo
  (schemaType "FAQPage", canonicalPath "/firms/{firm['slug']}/faq/<faq-slug>",
  metaDescription max 320 characters, datePublished "2026-09-04").

Other rules:
- Use only facts supported by the website excerpt or widely published terms.
  Do not invent precise fees, dates, or percentages you are unsure of.
- If a nullable field is unknown, use null (for example maxAmount, subsequentIntervalDays, maxProfit).
- If a required field is missing, use the most conservative value consistent with
  public info and say so in payoutCycle.description or an FAQ answer.
- slug, FAQ id/slug, and channel id must be kebab-case.
- Logo src must be an http(s) URL or a path starting with /. Prefer {firm['url'].rstrip('/')}/favicon.ico if unknown.
- Include prosAndCons with at least one pro and one con.
- Include withdrawal.warnings with real risk items (drawdown breach, payout pause, prohibited strategies).

{site_block}
"""


def apply_locked_fields(
    payload: dict[str, Any],
    firm: PropFirmSeed,
    *,
    status: Optional[str] = None,
) -> dict[str, Any]:
    payload["slug"] = firm["slug"]
    if status:
        payload["status"] = status
    elif payload.get("status") not in {"active", "warning", "suspended"}:
        payload["status"] = "active"
    basic = payload.get("basic")
    if not isinstance(basic, dict):
        basic = {}
        payload["basic"] = basic
    basic["name"] = firm["name"]
    basic["website"] = firm["url"]
    return payload


def write_firm_json(payload: dict[str, Any], slug: str, force: bool) -> Path:
    FIRMS_DIR.mkdir(parents=True, exist_ok=True)
    out_path = FIRMS_DIR / f"{slug}.json"
    if out_path.exists() and not force:
        raise SystemExit(f"已存在 {out_path}，如需覆盖请加 --force")
    out_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return out_path


def generate_firm_json(
    firm: PropFirmSeed,
    schema: dict[str, Any],
    model: str,
    force: bool,
    fetch_site: bool,
) -> Path:
    if fetch_site:
        page = fetch_site_text(firm["url"])
        source_text = page.text
        appeared_closed = page.appeared_closed
    else:
        source_text = ""
        appeared_closed = warn_if_closed(firm["url"], "")
    prompt = build_batch_prompt(firm, source_text)
    payload = apply_locked_fields(
        call_gemini(prompt, schema, model),
        firm,
        status="suspended" if appeared_closed else None,
    )
    payload["slug"] = kebab(str(payload.get("slug") or firm["slug"]))
    if payload["slug"] != firm["slug"]:
        payload["slug"] = firm["slug"]
    out_path = write_firm_json(payload, firm["slug"], force)
    print(f"Generated {out_path}")
    return out_path


def call_gemini(prompt: str, schema: dict[str, Any], model: str) -> dict[str, Any]:
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        raise SystemExit(
            "缺少 google-genai。请先运行: pip3 install -r scripts/requirements.txt"
        )

    load_dotenv()
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise SystemExit(
            "缺少 API Key。请打开 gemini-key.txt，把等号后面换成你的密钥。\n"
            "文件位置：项目根目录的 gemini-key.txt"
        )

    client = genai.Client(api_key=api_key)
    last_error: Exception | None = None
    for attempt in range(1, 4):
        try:
            response = client.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=GEMINI_SYSTEM_INSTRUCTION,
                    response_mime_type="application/json",
                    response_json_schema=schema,
                    temperature=0.2,
                ),
            )
            text = getattr(response, "text", None)
            if not text:
                raise SystemExit(f"Gemini 没有返回 JSON 文本。finish 信息: {response}")
            try:
                return json.loads(text)
            except json.JSONDecodeError as error:
                raise SystemExit(f"Gemini 返回的内容不是合法 JSON: {error}\n{text[:2000]}")
        except SystemExit:
            raise
        except Exception as error:
            last_error = error
            message = str(error)
            transient = "503" in message or "UNAVAILABLE" in message or "429" in message
            if not transient or attempt == 3:
                raise SystemExit(error)
            wait_s = 25 * attempt
            print(f"  Gemini 忙碌/限流，{wait_s}s 后重试（{attempt}/3）")
            time.sleep(wait_s)
    raise SystemExit(last_error)


def kebab(value: str) -> str:
    cleaned = []
    prev_dash = False
    for char in value.strip().lower():
        if char.isalnum():
            cleaned.append(char)
            prev_dash = False
        elif not prev_dash:
            cleaned.append("-")
            prev_dash = True
    return "".join(cleaned).strip("-")


def validate_with_zod() -> None:
    env = os.environ.copy()
    env["PATH"] = "/opt/homebrew/bin:/usr/local/bin:" + env.get("PATH", "")
    result = subprocess.run(
        ["npm", "run", "validate:firms"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        env=env,
    )
    sys.stdout.write(result.stdout)
    if result.returncode != 0:
        sys.stderr.write(result.stderr)
        raise SystemExit("Zod 校验失败，已写入文件但不符合 src/lib/schema.ts")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="用 Gemini Structured Outputs 生成符合 src/lib/schema.ts 的 Prop Firm JSON"
    )
    parser.add_argument(
        "--source",
        help="抓取的原始文本文件路径，或 - 表示从 stdin 读取",
    )
    parser.add_argument("--keywords", help="逗号分隔的关键词")
    parser.add_argument("--keywords-file", help="关键词文件，一行一个")
    parser.add_argument("--slug", help="输出文件名（kebab-case），默认用模型返回的 slug")
    parser.add_argument(
        "--model",
        default="gemini-3.5-flash",
        help="Gemini 模型 ID（默认 gemini-3.5-flash）",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="覆盖已存在的 data/firms/<slug>.json",
    )
    parser.add_argument(
        "--skip-validate",
        action="store_true",
        help="写入后不跑 npm run validate:firms",
    )
    parser.add_argument(
        "--print-schema",
        action="store_true",
        help="只打印发给 Gemini 的 JSON Schema，不调用 API",
    )
    parser.add_argument(
        "--batch",
        action="store_true",
        help="循环 PROP_FIRMS（30 家），按官网公开信息生成 JSON",
    )
    parser.add_argument(
        "--only",
        help="批量模式下只跑这些 slug（逗号分隔）",
    )
    parser.add_argument(
        "--sleep",
        type=float,
        default=1.5,
        help="批量模式两次 Gemini 调用之间的间隔秒数（默认 1.5）",
    )
    parser.add_argument(
        "--no-fetch",
        action="store_true",
        help="批量模式不抓取官网正文，仅用名称/网址提示模型",
    )
    return parser.parse_args()


def select_batch_firms(only: Optional[str]) -> list[PropFirmSeed]:
    if not only:
        return list(PROP_FIRMS)
    wanted = {part.strip() for part in only.split(",") if part.strip()}
    selected = [firm for firm in PROP_FIRMS if firm["slug"] in wanted]
    missing = wanted - {firm["slug"] for firm in selected}
    if missing:
        raise SystemExit(f"PROP_FIRMS 中找不到 slug: {', '.join(sorted(missing))}")
    return selected


def run_batch(args: argparse.Namespace, schema: dict[str, Any]) -> None:
    firms = select_batch_firms(args.only)
    generated = 0
    skipped = 0
    failed: list[str] = []

    for index, firm in enumerate(firms):
        out_path = FIRMS_DIR / f"{firm['slug']}.json"
        if out_path.exists() and not args.force:
            print(f"跳过已存在 {out_path}（加 --force 可覆盖）")
            skipped += 1
            continue

        print(f"[{index + 1}/{len(firms)}] {firm['name']} ({firm['slug']})")
        try:
            generate_firm_json(
                firm,
                schema,
                args.model,
                force=True,
                fetch_site=not args.no_fetch,
            )
            generated += 1
        except SystemExit as error:
            print(f"  失败: {error}", file=sys.stderr)
            failed.append(firm["slug"])
        except Exception as error:
            print(f"  失败: {error}", file=sys.stderr)
            failed.append(firm["slug"])

        if index < len(firms) - 1 and args.sleep > 0:
            time.sleep(args.sleep)

    print(
        f"批量完成：生成 {generated}，跳过 {skipped}，失败 {len(failed)}"
        + (f"（{', '.join(failed)}）" if failed else "")
    )
    if failed:
        raise SystemExit(1)


def main() -> None:
    args = parse_args()
    raw_schema = load_zod_json_schema()
    gemini_schema = sanitize_for_gemini(raw_schema)

    if args.print_schema:
        json.dump(gemini_schema, sys.stdout, ensure_ascii=False, indent=2)
        sys.stdout.write("\n")
        return

    if args.batch:
        run_batch(args, gemini_schema)
        if not args.skip_validate:
            validate_with_zod()
        return

    if not args.source:
        raise SystemExit("请提供 --source，或使用 --batch 生成 PROP_FIRMS")

    source_text = read_text(args.source)
    if not source_text.strip():
        raise SystemExit("原始文本为空")

    appeared_closed = warn_if_closed(args.slug or "", source_text)
    keywords = collect_keywords(args.keywords, args.keywords_file)
    prompt = build_prompt(source_text, keywords, args.slug)
    firm = call_gemini(prompt, gemini_schema, args.model)

    slug = kebab(args.slug or str(firm.get("slug") or ""))
    if not slug:
        raise SystemExit("无法确定文件名：模型未返回 slug，请使用 --slug")
    firm["slug"] = slug
    if appeared_closed:
        firm["status"] = "suspended"

    out_path = write_firm_json(firm, slug, args.force)
    print(f"Generated {out_path}")

    if not args.skip_validate:
        validate_with_zod()


if __name__ == "__main__":
    main()
