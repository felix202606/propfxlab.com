from __future__ import annotations

"""
把抓取的原始文本/关键词送给 Gemini（JSON Schema Structured Outputs），
生成符合 src/lib/schema.ts 的 Prop Firm JSON，并写入 data/firms/<slug>.json。

用法：
  export GEMINI_API_KEY=AIzaSyCJMrl1yGlqhECysBJbFCHsKkvbJLzJWFY
  python3 scripts/generate_firm.py --source scrape.txt --keywords "ftmo,payout,profit split"
  python3 scripts/generate_firm.py --source scrape.txt --keywords-file keywords.txt --force
"""

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any, List, Optional

ROOT = Path(__file__).resolve().parent.parent
FIRMS_DIR = ROOT / "data" / "firms"
EXPORT_SCHEMA = ROOT / "scripts" / "export-json-schema.ts"
SAFE_INT_MAX = 9007199254740991
_MISSING = object()


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


def call_gemini(prompt: str, schema: dict[str, Any], model: str) -> dict[str, Any]:
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        raise SystemExit(
            "缺少 google-genai。请先运行: pip3 install -r scripts/requirements.txt"
        )

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise SystemExit("请设置环境变量 GEMINI_API_KEY（或 GOOGLE_API_KEY）")

    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model=model,
        contents=prompt,
        config=types.GenerateContentConfig(
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
        description="用 Gemini Structured Outputs 从抓取文本生成 Prop Firm JSON"
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
        default="gemini-2.5-flash",
        help="Gemini 模型 ID（默认 gemini-2.5-flash）",
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
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    raw_schema = load_zod_json_schema()
    gemini_schema = sanitize_for_gemini(raw_schema)

    if args.print_schema:
        json.dump(gemini_schema, sys.stdout, ensure_ascii=False, indent=2)
        sys.stdout.write("\n")
        return

    if not args.source:
        raise SystemExit("请提供 --source（抓取文本文件，或 - 表示 stdin）")

    source_text = read_text(args.source)
    if not source_text.strip():
        raise SystemExit("原始文本为空")

    keywords = collect_keywords(args.keywords, args.keywords_file)
    prompt = build_prompt(source_text, keywords, args.slug)
    firm = call_gemini(prompt, gemini_schema, args.model)

    slug = kebab(args.slug or str(firm.get("slug") or ""))
    if not slug:
        raise SystemExit("无法确定文件名：模型未返回 slug，请使用 --slug")
    firm["slug"] = slug

    FIRMS_DIR.mkdir(parents=True, exist_ok=True)
    out_path = FIRMS_DIR / f"{slug}.json"
    if out_path.exists() and not args.force:
        raise SystemExit(f"已存在 {out_path}，如需覆盖请加 --force")

    out_path.write_text(
        json.dumps(firm, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"已写入 {out_path}")

    if not args.skip_validate:
        validate_with_zod()


if __name__ == "__main__":
    main()
