#!/usr/bin/env python3
from __future__ import annotations

"""
从公开 RSS 抓取 Prop Firm / 外汇行业新闻，用 Gemini 筛出与 funded trader 相关的条目，
写成 data/news/<slug>.json。已存在的 sourceUrl 会跳过，不会覆盖。

用法：
  export GEMINI_API_KEY=your_key
  python3 scripts/news_scraper.py
  python3 scripts/news_scraper.py --dry-run
  python3 scripts/news_scraper.py --max-items 5 --model gemini-3.5-flash-lite

说明：
  每条候选新闻只调用 Gemini 一次，单次响应包含英文总结 + 6 语种翻译（共 7 个 locale）。
  默认模型 gemini-3.5-flash-lite（免费档约 500 RPD）；每天最多处理 5 条 → 约 5 次请求。
"""

import argparse
import hashlib
import json
import os
import re
import socket
import sys
import time
from datetime import datetime, timedelta, timezone
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, Literal, Optional
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from pydantic import BaseModel, Field, HttpUrl, field_validator

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from prop_firms import PROP_FIRMS

ROOT = SCRIPT_DIR.parent
NEWS_DIR = ROOT / "data" / "news"
FIRMS_DIR = ROOT / "data" / "firms"
ENV_FILES = (ROOT / ".env", ROOT / "gemini-key.txt")

BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    ),
    "Accept": "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.7",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
}
DEFAULT_MODEL = "gemini-3.5-flash-lite"
FALLBACK_MODELS = ("gemini-flash-lite-latest", "gemini-3.1-flash-lite")
MAX_AGE_HOURS = 96
MAX_SUMMARY_CHARS = 800
# 条目之间的短暂停顿（限流友好；每条仍只 1 次请求）
BATCH_PAUSE_S = 2.0
MAX_ITEMS_DEFAULT = 5
REQUEST_TIMEOUT_S = 20
TITLE_SIMILARITY_THRESHOLD = 0.72
TITLE_JACCARD_THRESHOLD = 0.55

# 与 src/i18n/routing.ts / messages/*.json 的 locale key 对齐
NEWS_LOCALES = ("en", "es", "cn", "tw", "th", "vi", "pt")
LOCALE_LABELS = {
    "en": "English",
    "es": "Spanish",
    "cn": "Simplified Chinese",
    "tw": "Traditional Chinese",
    "th": "Thai",
    "vi": "Vietnamese",
    "pt": "Portuguese",
}

# 用户提供的源里，部分是 RSS 目录页或旧路径；这里用实际可解析的 XML。
RSS_FEEDS = [
    "https://www.financemagnates.com/forex/feed",
    "https://www.fxstreet.com/rss",
    "https://investinglive.com/feed/news/",
    "https://www.actionforex.com/feed/",
    "https://www.dailyforex.com/rss/forexnews.xml",
    "https://ftmo.com/en/blog/feed/",
    "https://fundednext.com/blog/feed/",
    "https://joinprop.com/feed/",
    "https://www.luxtradingfirm.com/blog/feed/",
]

STOPWORDS = {
    "a", "an", "the", "and", "or", "to", "of", "for", "in", "on", "at", "by",
    "with", "from", "as", "is", "are", "was", "be", "its", "after", "over",
    "into", "vs", "versus", "new", "says", "say", "launches", "launch",
}

EVENT_KEYWORDS = (
    "ftmo",
    "fundednext",
    "fundingpips",
    "prop firm",
    "prop firms",
    "payout",
    "shutdown",
    "suspended",
    "rubik",
    "instant funding",
    "funded account",
)

KEYWORD_HINTS = (
    "prop firm",
    "prop firms",
    "proprietary trading",
    "funded trader",
    "funded account",
    "funded trading",
    "profit split",
    "payout",
    "challenge fee",
    "evaluation account",
    "instant funding",
    "ftmo",
    "fundednext",
    "fundingpips",
    "myfunded",
    "topstep",
    "apex trader",
    "lux trading",
    "e8 markets",
    "news trading",
)

GEMINI_SYSTEM_INSTRUCTION = """You rewrite one prop-firm industry news item for PropFXLab, a comparison site for funded traders.
Return JSON only for THIS single RSS item.
If the item is NOT about prop firms / funded traders / payouts / challenge rules / firm launches-shutdowns / regulation of prop trading / named roster firms, set keep=false and leave other fields empty.
If keep=true:
- Write an original English briefing (do not copy the source verbatim; do not invent facts).
- English summary: 3–4 sentences. English body/content: 5–8 short paragraphs separated by blank lines.
- Provide translations for ALL locale keys exactly: en, es, cn, tw, th, vi, pt.
- Each locale needs title, summary, and content. en is the canonical rewrite; other locales are natural full translations of that English rewrite.
- related_firm_slugs must be a subset of the provided roster slugs (or empty).
- Also set top-level title/summary/body to the English rewrite.
"""


class RssItem(BaseModel):
    title: str
    source_name: str
    source_url: str
    summary: str = ""
    published_at: datetime


class LocaleCopy(BaseModel):
    title: str
    summary: str
    content: str

    @field_validator("title", "summary", "content", mode="before")
    @classmethod
    def strip_text(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class SelectedArticle(BaseModel):
    keep: bool = True
    source_url: str = ""
    title: str = ""
    summary: str = ""
    body: str = ""
    translations: dict[str, LocaleCopy] = Field(default_factory=dict)
    tags: list[str] = Field(default_factory=list)
    related_firm_slugs: list[str] = Field(default_factory=list)
    relevance: Literal["high", "medium"] = "medium"

    @field_validator("title", "summary", "body", mode="before")
    @classmethod
    def strip_text(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class NewsArticleFile(BaseModel):
    slug: str
    title: str
    summary: str
    body: str
    sourceName: str
    sourceUrl: HttpUrl
    publishedAt: str
    scrapedAt: str
    tags: list[str]
    relatedFirmSlugs: list[str]
    relevance: Literal["high", "medium"]
    translations: dict[str, LocaleCopy]


def load_dotenv() -> None:
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


def kebab(value: str) -> str:
    cleaned: list[str] = []
    prev_dash = False
    for char in value.strip().lower():
        if char.isalnum():
            cleaned.append(char)
            prev_dash = False
        elif not prev_dash:
            cleaned.append("-")
            prev_dash = True
    return "".join(cleaned).strip("-")


def known_firm_slugs() -> set[str]:
    slugs = {firm["slug"] for firm in PROP_FIRMS}
    if FIRMS_DIR.is_dir():
        slugs.update(path.stem for path in FIRMS_DIR.glob("*.json"))
    return slugs


def make_slug(title: str, url: str) -> str:
    base = kebab(title)[:72].strip("-") or "news"
    digest = hashlib.sha1(url.encode("utf-8")).hexdigest()[:8]
    return f"{base}-{digest}"


def isoformat_utc(moment: datetime) -> str:
    return moment.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace(
        "+00:00", "Z"
    )


def load_existing() -> tuple[dict[str, dict[str, Any]], set[str], list[str]]:
    by_slug: dict[str, dict[str, Any]] = {}
    urls: set[str] = set()
    titles: list[str] = []
    if not NEWS_DIR.is_dir():
        return by_slug, urls, titles
    for path in NEWS_DIR.glob("*.json"):
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        if not isinstance(payload, dict):
            continue
        slug = str(payload.get("slug") or path.stem)
        by_slug[slug] = payload
        url = str(payload.get("sourceUrl") or "").strip()
        if url:
            urls.add(normalize_url(url))
        title = str(payload.get("title") or "").strip()
        if title:
            titles.append(title)
    return by_slug, urls, titles


def normalize_url(url: str) -> str:
    parsed = urlparse(url.strip())
    scheme = (parsed.scheme or "https").lower()
    netloc = parsed.netloc.lower()
    path = parsed.path.rstrip("/")
    return f"{scheme}://{netloc}{path}"


def looks_relevant(title: str, summary: str) -> bool:
    title_l = title.lower()
    # 促销码落地页不是新闻
    if "discount code" in title_l:
        return False
    blob = f"{title}\n{summary}".lower()
    if any(hint in title_l for hint in KEYWORD_HINTS):
        return True
    # 摘要里的弱命中（如周报顺带提到 prop firm）不算优先候选
    strong = (
        "prop firm",
        "prop firms",
        "proprietary trading",
        "funded trader",
        "funded account",
        "instant funding",
        "profit split",
        "challenge fee",
    )
    if any(hint in blob for hint in strong):
        # 标题像宏观/外汇行情则丢掉
        fxish = (
            "price forecast",
            "weekly outlook",
            "weekly review",
            "nfp",
            "cpi",
            "cftc report",
            "net positions",
            "usd/",
            "eur/",
            "gbp/",
            "aud/",
            "gold ",
            "oil ",
        )
        if any(token in title_l for token in fxish):
            return False
        return True
    for firm in PROP_FIRMS:
        name = firm["name"].lower()
        slug = firm["slug"].replace("-", " ")
        # 短名/泛名（如 "For Traders"）必须整词匹配，避免 for traders 误伤
        if len(name) < 12 or name in {"for traders"}:
            if re.search(rf"\b{re.escape(name)}\b", blob) or re.search(
                rf"\b{re.escape(slug)}\b", blob
            ):
                return True
            continue
        if name in blob or slug in blob:
            return True
    return False


def normalize_title(title: str) -> str:
    text = title.lower()
    text = re.sub(r"\s+[-|–—]\s+[^-|–—]+$", "", text)
    text = re.sub(r"[^a-z0-9\s]+", " ", text)
    return " ".join(text.split())


def title_tokens(title: str) -> set[str]:
    return {
        token
        for token in normalize_title(title).split()
        if token not in STOPWORDS and len(token) > 2
    }


def event_keywords_in(title: str) -> set[str]:
    blob = normalize_title(title)
    hits = {keyword for keyword in EVENT_KEYWORDS if keyword in blob}
    for firm in PROP_FIRMS:
        name = firm["name"].lower()
        slug = firm["slug"].replace("-", " ")
        if name in blob or slug in blob:
            hits.add(firm["slug"])
    return hits


def titles_are_duplicate(left: str, right: str) -> bool:
    if not left or not right:
        return False
    if SequenceMatcher(None, normalize_title(left), normalize_title(right)).ratio() >= TITLE_SIMILARITY_THRESHOLD:
        return True
    tokens_left = title_tokens(left)
    tokens_right = title_tokens(right)
    if not tokens_left or not tokens_right:
        return False
    jaccard = len(tokens_left & tokens_right) / len(tokens_left | tokens_right)
    # “prop firm(s)” 太泛，不能单独当去重信号，否则所有 prop 稿会互相误杀
    shared_events = {
        keyword
        for keyword in (event_keywords_in(left) & event_keywords_in(right))
        if keyword not in {"prop firm", "prop firms"}
    }
    if shared_events and len(tokens_left & tokens_right) >= 3:
        return True
    if jaccard >= TITLE_JACCARD_THRESHOLD and shared_events:
        return True
    return jaccard >= 0.7


def source_quality(item: RssItem) -> tuple[int, int, int, float]:
    host = urlparse(item.source_url).netloc.lower()
    if host.endswith("ftmo.com") or host.endswith("fundednext.com"):
        outlet = 3
    elif "financemagnates.com" in host:
        outlet = 2
    elif "news.google.com" in host:
        outlet = 0
    else:
        outlet = 1
    relevant = 1 if looks_relevant(item.title, item.summary) else 0
    return (relevant, outlet, len(item.summary), item.published_at.timestamp())


def dedupe_items(items: list[RssItem], existing_titles: list[str]) -> list[RssItem]:
    unique: list[RssItem] = []
    dropped = 0
    for item in items:
        if any(titles_are_duplicate(item.title, title) for title in existing_titles):
            dropped += 1
            continue
        duplicate_at: Optional[int] = None
        for index, kept in enumerate(unique):
            if titles_are_duplicate(item.title, kept.title):
                duplicate_at = index
                break
        if duplicate_at is None:
            unique.append(item)
            continue
        dropped += 1
        if source_quality(item) > source_quality(unique[duplicate_at]):
            unique[duplicate_at] = item
    if dropped:
        print(f"  去重去掉 {dropped} 条重复报道")
    return unique


def struct_to_datetime(value: Any) -> Optional[datetime]:
    if value is None:
        return None
    try:
        return datetime(*value[:6], tzinfo=timezone.utc)
    except (TypeError, ValueError):
        return None


def fetch_bytes(url: str) -> bytes:
    request = Request(url, headers=BROWSER_HEADERS)
    try:
        with urlopen(request, timeout=REQUEST_TIMEOUT_S) as response:
            return response.read()
    except (HTTPError, URLError, TimeoutError, OSError) as error:
        message = str(error)
        if isinstance(error, HTTPError) or "SSL" not in message and "TLS" not in message:
            raise
        return fetch_bytes_curl(url)


def fetch_bytes_curl(url: str) -> bytes:
    import subprocess

    result = subprocess.run(
        [
            "curl",
            "-sS",
            "-L",
            "--max-time",
            str(REQUEST_TIMEOUT_S),
            "-A",
            BROWSER_HEADERS["User-Agent"],
            "-H",
            f"Accept: {BROWSER_HEADERS['Accept']}",
            url,
        ],
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        detail = (result.stderr or result.stdout).decode("utf-8", "replace")[:200]
        raise URLError(detail or f"curl exit {result.returncode}")
    return result.stdout


def fetch_feed(url: str) -> list[RssItem]:
    import feedparser

    try:
        body = fetch_bytes(url)
    except HTTPError as error:
        print(f"  RSS HTTP {error.code}  {url}")
        return []
    except (URLError, TimeoutError, OSError) as error:
        print(f"  RSS 失败 {url}: {error}")
        return []

    sniff = body.lstrip()[:80].lower()
    if sniff.startswith(b"<!doctype html") or sniff.startswith(b"<html"):
        print(f"  RSS 非 XML（HTML）  {url}")
        return []

    parsed = feedparser.parse(body)
    if getattr(parsed, "bozo", False) and not parsed.entries:
        bozo = getattr(parsed, "bozo_exception", None)
        print(f"  RSS 失败 {url}: {bozo or 'empty'}")
        return []
    feed_title = str(getattr(parsed.feed, "title", "") or urlparse(url).netloc)
    items: list[RssItem] = []
    for entry in parsed.entries:
        link = str(getattr(entry, "link", "") or "").strip()
        title = str(getattr(entry, "title", "") or "").strip()
        if not link or not title:
            continue
        summary = str(
            getattr(entry, "summary", "") or getattr(entry, "description", "") or ""
        ).strip()
        if "<" in summary:
            summary = strip_html(summary)
        source_obj = getattr(entry, "source", None)
        source_title = ""
        if isinstance(source_obj, dict):
            source_title = str(source_obj.get("title") or "")
        elif source_obj is not None:
            source_title = str(getattr(source_obj, "title", "") or "")
        published = struct_to_datetime(
            getattr(entry, "published_parsed", None)
            or getattr(entry, "updated_parsed", None)
        )
        if published is None:
            published = datetime.now(timezone.utc)
        items.append(
            RssItem(
                title=title,
                source_name=source_title or feed_title,
                source_url=link,
                summary=summary[:MAX_SUMMARY_CHARS],
                published_at=published,
            )
        )
    print(f"  RSS {len(items):>3}  {feed_title}")
    return items


def strip_html(raw: str) -> str:
    from html.parser import HTMLParser

    class _Text(HTMLParser):
        def __init__(self) -> None:
            super().__init__()
            self.parts: list[str] = []

        def handle_data(self, data: str) -> None:
            if data:
                self.parts.append(data)

    parser = _Text()
    try:
        parser.feed(raw)
        parser.close()
    except Exception:
        return raw
    return " ".join(" ".join(parser.parts).split())


def collect_candidates(
    max_age: timedelta,
    seen_urls: set[str],
    existing_titles: list[str],
    max_items: int,
) -> list[RssItem]:
    cutoff = datetime.now(timezone.utc) - max_age
    pooled: dict[str, RssItem] = {}
    for feed_url in RSS_FEEDS:
        try:
            entries = fetch_feed(feed_url)
        except Exception as error:
            print(f"  RSS 异常 {feed_url}: {error}")
            continue
        for item in entries:
            key = normalize_url(item.source_url)
            if key in seen_urls or key in pooled:
                continue
            if item.published_at < cutoff:
                continue
            pooled[key] = item

    ranked = sorted(pooled.values(), key=lambda item: item.published_at, reverse=True)
    unique = dedupe_items(ranked, existing_titles)
    preferred = [item for item in unique if looks_relevant(item.title, item.summary)]
    filler = [item for item in unique if item not in preferred]
    # 先尽量塞满 prop 相关，不够再用其他；池子要大于最终送审数
    pool_limit = max(max_items * 8, 40)
    ordered = preferred + filler
    return ordered[:pool_limit]


def build_prompt(item: RssItem, roster: list[str]) -> str:
    locale_help = ", ".join(f"{code} ({LOCALE_LABELS[code]})" for code in NEWS_LOCALES)
    payload = {
        "title": item.title,
        "source_name": item.source_name,
        "source_url": item.source_url,
        "published_at": isoformat_utc(item.published_at),
        "summary": item.summary,
    }
    return (
        "Roster slugs (only use these in related_firm_slugs):\n"
        + ", ".join(roster)
        + "\n\nLocales that MUST appear under translations when keep=true (exact keys): "
        + locale_help
        + "\n\nProcess this ONE RSS item in a single response. "
        "If relevant, set keep=true and return the English rewrite PLUS full translations "
        "for en/es/cn/tw/th/vi/pt in the same JSON (1 request = 1 article + all locales). "
        "If not relevant, set keep=false.\n\nRSS item:\n"
        + json.dumps(payload, ensure_ascii=False, indent=2)
    )


LOCALE_COPY_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "summary": {"type": "string"},
        "content": {"type": "string"},
    },
    "required": ["title", "summary", "content"],
}

# 单条新闻单次请求：英文总结 + 6 语种翻译全部在同一响应里
SELECTION_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "keep": {"type": "boolean"},
        "source_url": {"type": "string"},
        "title": {"type": "string"},
        "summary": {"type": "string"},
        "body": {"type": "string"},
        "translations": {
            "type": "object",
            "properties": {locale: LOCALE_COPY_SCHEMA for locale in NEWS_LOCALES},
            "required": list(NEWS_LOCALES),
        },
        "tags": {"type": "array", "items": {"type": "string"}},
        "related_firm_slugs": {"type": "array", "items": {"type": "string"}},
        "relevance": {"type": "string", "enum": ["high", "medium"]},
    },
    "required": ["keep"],
}


BACKFILL_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "translations": {
            "type": "object",
            "properties": {locale: LOCALE_COPY_SCHEMA for locale in NEWS_LOCALES},
            "required": list(NEWS_LOCALES),
        }
    },
    "required": ["translations"],
}


def call_gemini(
    prompt: str,
    model_name: str,
    *,
    schema: dict[str, Any] = SELECTION_JSON_SCHEMA,
    system_instruction: str = GEMINI_SYSTEM_INSTRUCTION,
    preferred_model: Optional[str] = None,
) -> tuple[dict[str, Any], str]:
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        raise SystemExit(
            "缺少 google-genai。请先运行: pip install -r scripts/requirements.txt"
        )

    load_dotenv()
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise SystemExit("缺少 GEMINI_API_KEY（GitHub Actions Secret 或本地 .env / gemini-key.txt）")

    client = genai.Client(api_key=api_key)
    ordered: list[str] = []
    for candidate in (preferred_model, model_name, *FALLBACK_MODELS):
        if candidate and candidate not in ordered:
            ordered.append(candidate)

    last_error: Exception | None = None
    for model_id in ordered:
        for attempt in range(1, 4):
            try:
                response = client.models.generate_content(
                    model=model_id,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        response_mime_type="application/json",
                        response_json_schema=schema,
                        temperature=0.2,
                    ),
                )
                text = getattr(response, "text", None)
                if not text:
                    raise RuntimeError(f"Gemini 没有返回 JSON：{response}")
                if model_id != model_name:
                    print(f"  改用模型 {model_id}")
                return json.loads(text), model_id
            except Exception as error:
                last_error = error
                message = str(error)
                hard_miss = "404" in message or "NOT_FOUND" in message
                if hard_miss:
                    print(f"  模型 {model_id} 不可用（404），跳过")
                    break
                # 免费额度耗尽：立刻停止，避免重试把 RPD 打光
                if "429" in message or "RESOURCE_EXHAUSTED" in message:
                    raise RuntimeError(error)
                transient = "503" in message or "UNAVAILABLE" in message
                if not transient:
                    print(f"  模型 {model_id} 失败：{error}")
                    break
                # 503 只重试 1 次，节省配额
                if attempt >= 2:
                    break
                wait_s = 15
                print(f"  Gemini {model_id} 忙碌，{wait_s}s 后重试一次")
                time.sleep(wait_s)
        print(f"  模型 {model_id} 本轮放弃，尝试下一个…")
    raise RuntimeError(last_error or "Gemini 调用失败")


def normalize_translations(
    raw: Optional[dict[str, Any]],
    *,
    fallback_title: str,
    fallback_summary: str,
    fallback_body: str,
) -> dict[str, LocaleCopy]:
    source = raw if isinstance(raw, dict) else {}
    en_raw = source.get("en") if isinstance(source.get("en"), dict) else {}
    en_title = str(en_raw.get("title") or fallback_title).strip() or fallback_title
    en_summary = str(en_raw.get("summary") or fallback_summary).strip() or fallback_summary
    en_content = (
        str(en_raw.get("content") or fallback_body).strip() or fallback_body
    )
    out: dict[str, LocaleCopy] = {
        "en": LocaleCopy(title=en_title, summary=en_summary, content=en_content)
    }
    for locale in NEWS_LOCALES:
        if locale == "en":
            continue
        block = source.get(locale)
        if not isinstance(block, dict):
            continue
        title = str(block.get("title") or "").strip()
        summary = str(block.get("summary") or "").strip()
        content = str(block.get("content") or "").strip()
        if title and summary and content:
            out[locale] = LocaleCopy(title=title, summary=summary, content=content)
    return out


def write_article(item: RssItem, selected: SelectedArticle, allowed_slugs: set[str]) -> Path:
    NEWS_DIR.mkdir(parents=True, exist_ok=True)
    translations = normalize_translations(
        {k: v.model_dump() if isinstance(v, LocaleCopy) else v for k, v in selected.translations.items()},
        fallback_title=selected.title or item.title,
        fallback_summary=selected.summary,
        fallback_body=selected.body,
    )
    en = translations["en"]
    title = selected.title.strip() or en.title
    summary = selected.summary.strip() or en.summary
    body = selected.body.strip() or en.content
    slug = make_slug(title, item.source_url)
    related = [
        slug_value
        for slug_value in selected.related_firm_slugs
        if slug_value in allowed_slugs
    ]
    tags = [kebab(tag) for tag in selected.tags if kebab(tag)]
    payload = NewsArticleFile(
        slug=slug,
        title=title,
        summary=summary,
        body=body,
        sourceName=item.source_name,
        sourceUrl=item.source_url,  # type: ignore[arg-type]
        publishedAt=isoformat_utc(item.published_at),
        scrapedAt=isoformat_utc(datetime.now(timezone.utc)),
        tags=tags[:8],
        relatedFirmSlugs=related,
        relevance=selected.relevance,
        translations=translations,
    )
    out_path = NEWS_DIR / f"{slug}.json"
    if out_path.exists():
        raise FileExistsError(out_path)
    out_path.write_text(
        payload.model_dump_json(indent=2) + "\n",
        encoding="utf-8",
    )
    return out_path


BACKFILL_SYSTEM = """You rewrite and translate PropFXLab news briefings for funded traders.
Return JSON only with a translations object containing every locale key: en, es, cn, tw, th, vi, pt.
Keep facts identical to the source briefing — do not invent numbers, product names, or events.
First expand English into a richer briefing: summary 3–4 sentences; content 5–8 short paragraphs
covering what happened, why funded traders should care, payout/rule/product implications,
competitive context, and what to verify on the official site. Separate paragraphs with blank lines.
Then provide natural full translations for es, cn, tw, th, vi, pt of that expanded English.
Each locale needs title, summary, and content.
"""


def backfill_translations(model_name: str, force: bool = False) -> None:
    files = sorted(NEWS_DIR.glob("*.json"))
    if not files:
        print("data/news/ 下没有 JSON")
        return

    updated = 0
    skipped = 0
    for path in files:
        payload = json.loads(path.read_text(encoding="utf-8"))
        existing = payload.get("translations") if isinstance(payload, dict) else None
        missing = [
            locale
            for locale in NEWS_LOCALES
            if not (
                isinstance(existing, dict)
                and isinstance(existing.get(locale), dict)
                and str(existing[locale].get("title") or "").strip()
                and str(existing[locale].get("summary") or "").strip()
                and str(existing[locale].get("content") or "").strip()
            )
        ]
        if not missing and not force:
            print(f"  跳过已完整 {path.name}")
            skipped += 1
            continue

        print(f"  扩写+翻译 {path.name}（缺 {', '.join(missing) or 'force'}）")
        prompt = (
            "Expand this PropFXLab news briefing into a richer English article, "
            "then translate into all locales "
            f"{list(NEWS_LOCALES)}.\n"
            "Locale labels: "
            + ", ".join(f"{k}={v}" for k, v in LOCALE_LABELS.items())
            + "\n\nSource briefing:\n"
            + json.dumps(
                {
                    "title": payload.get("title"),
                    "summary": payload.get("summary"),
                    "content": payload.get("body"),
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        result, _model_used = call_gemini(
            prompt,
            model_name,
            schema=BACKFILL_JSON_SCHEMA,
            system_instruction=BACKFILL_SYSTEM,
        )
        translations = normalize_translations(
            result.get("translations") if isinstance(result, dict) else None,
            fallback_title=str(payload.get("title") or ""),
            fallback_summary=str(payload.get("summary") or ""),
            fallback_body=str(payload.get("body") or ""),
        )
        payload["translations"] = {
            locale: copy.model_dump() for locale, copy in translations.items()
        }
        # keep top-level English in sync
        payload["title"] = translations["en"].title
        payload["summary"] = translations["en"].summary
        payload["body"] = translations["en"].content
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        updated += 1
        time.sleep(1.2)

    print(f"回填完成：更新 {updated}，跳过 {skipped}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="抓取 Prop Firm 新闻并写入 data/news/")
    parser.add_argument(
        "--model",
        default=os.environ.get("GEMINI_MODEL", DEFAULT_MODEL),
        help=f"Gemini 模型 ID（默认 {DEFAULT_MODEL}）",
    )
    parser.add_argument(
        "--max-items",
        type=int,
        default=int(os.environ.get("NEWS_MAX_ITEMS", MAX_ITEMS_DEFAULT)),
        help=f"本轮最多送给 Gemini 的候选条数（默认 {MAX_ITEMS_DEFAULT}）",
    )
    parser.add_argument(
        "--max-age-hours",
        type=int,
        default=MAX_AGE_HOURS,
        help="只保留最近 N 小时的 RSS 条目（默认 96）",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="只抓 RSS、打印候选，不调用 Gemini、不写文件",
    )
    parser.add_argument(
        "--backfill-translations",
        action="store_true",
        help="仅用于修补旧稿：为已有 data/news/*.json 补齐 translations（正常抓取不走此路径）",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="与 --backfill-translations 联用：即使已有翻译也重写",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    socket.setdefaulttimeout(REQUEST_TIMEOUT_S)
    load_dotenv()

    NEWS_DIR.mkdir(parents=True, exist_ok=True)

    if args.backfill_translations:
        backfill_translations(args.model, force=args.force)
        return

    existing, seen_urls, existing_titles = load_existing()
    print(f"已有新闻 {len(existing)} 条")

    print("拉取 RSS…")
    candidates = collect_candidates(
        max_age=timedelta(hours=args.max_age_hours),
        seen_urls=seen_urls,
        existing_titles=existing_titles,
        max_items=max(1, args.max_items),
    )
    print(f"新候选 {len(candidates)} 条")

    if args.dry_run:
        for item in candidates:
            flag = "kw" if looks_relevant(item.title, item.summary) else "  "
            print(f"  [{flag}] {isoformat_utc(item.published_at)}  {item.title[:90]}")
        return

    if not candidates:
        print("没有新的候选新闻，结束")
        return

    allowed = known_firm_slugs()
    roster = sorted(allowed)
    written = 0
    skipped = 0
    failed = 0
    active_model: Optional[str] = None

    # 关键词预筛：只把真正像 prop 的条目送 Gemini，避免烧 RPD
    preferred = [item for item in candidates if looks_relevant(item.title, item.summary)]
    if preferred:
        print(f"关键词命中 {len(preferred)} 条，优先送审（每条 1 次 API）")
        candidates = preferred[: max(1, args.max_items)]
    else:
        print("无关键词命中，本轮不调用 Gemini（避免用外汇行情浪费配额）")
        return

    for index, item in enumerate(candidates, start=1):
        print(f"Gemini [{index}/{len(candidates)}] {item.title[:80]}")
        try:
            raw, active_model = call_gemini(
                build_prompt(item, roster),
                args.model,
                preferred_model=active_model,
            )
            selected = SelectedArticle.model_validate(raw)
        except Exception as error:
            failed += 1
            message = str(error)
            print(f"  失败，跳过：{error}")
            if "429" in message or "RESOURCE_EXHAUSTED" in message:
                print("  免费额度已用尽，停止本轮剩余请求以节省配额")
                break
            if index < len(candidates):
                time.sleep(BATCH_PAUSE_S)
            continue

        if not selected.keep:
            skipped += 1
            print("  跳过：模型判定与 prop firm 无关")
            if index < len(candidates):
                time.sleep(BATCH_PAUSE_S)
            continue

        # 强制绑定本条 source_url，避免模型改写链接
        selected.source_url = item.source_url
        translations = normalize_translations(
            {
                k: (v.model_dump() if isinstance(v, LocaleCopy) else v)
                for k, v in selected.translations.items()
            },
            fallback_title=selected.title or item.title,
            fallback_summary=selected.summary,
            fallback_body=selected.body,
        )
        missing_locales = [locale for locale in NEWS_LOCALES if locale not in translations]
        if missing_locales:
            skipped += 1
            print(f"  跳过：缺少语种 {', '.join(missing_locales)}（要求单次返回全部翻译）")
            if index < len(candidates):
                time.sleep(BATCH_PAUSE_S)
            continue
        if not translations["en"].summary or not translations["en"].content:
            skipped += 1
            print("  跳过：英文 summary/content 为空")
            if index < len(candidates):
                time.sleep(BATCH_PAUSE_S)
            continue

        selected.translations = translations
        selected.title = selected.title or translations["en"].title
        selected.summary = selected.summary or translations["en"].summary
        selected.body = selected.body or translations["en"].content
        try:
            out_path = write_article(item, selected, allowed)
        except FileExistsError:
            skipped += 1
            print("  跳过：文件已存在")
            if index < len(candidates):
                time.sleep(BATCH_PAUSE_S)
            continue
        written += 1
        print(f"  写入 {out_path.relative_to(ROOT)}（含 {len(translations)} 语种）")

        if index < len(candidates):
            time.sleep(BATCH_PAUSE_S)

    print(f"完成：写入 {written}，跳过 {skipped}，失败 {failed}（约 {written + skipped + failed} 次 API）")
    if written == 0:
        print("本轮没有可发布的新新闻（限流或候选被筛掉都算正常结束）")
    return


if __name__ == "__main__":
    main()
