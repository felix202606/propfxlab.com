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
import base64
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

try:
    import requests
    import tweepy
except ImportError:
    requests = None  # type: ignore[assignment]
    tweepy = None  # type: ignore[assignment]

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
    "es": "Español",
    "cn": "简体中文",
    "tw": "繁體中文",
    "th": "ไทย",
    "vi": "Tiếng Việt",
    "pt": "Português",
}

# IndexNow：新稿写入后秒级通知搜索引擎
INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow"
INDEXNOW_HOST = "www.propfxlab.com"
INDEXNOW_KEY = "abc8dfc79fc54c40b0fecce27d963c8c"
INDEXNOW_KEY_LOCATION = f"https://{INDEXNOW_HOST}/{INDEXNOW_KEY}.txt"
# 与用户约定的推送顺序一致
INDEXNOW_LOCALES = ("en", "es", "pt", "tw", "cn", "th", "vi")

# 语种国旗 Emoji（用于 Telegram/X 发帖）
LOCALE_FLAGS = {
    "en": "🇬🇧",
    "es": "🇪🇸",
    "cn": "🇨🇳",
    "tw": "🇹🇼",
    "th": "🇹🇭",
    "vi": "🇻🇳",
    "pt": "🇵🇹",
}

# 社媒发布配置：UTC 00/06/12/18 各最多 1 条（对应 NZ 12/18/00/06）
# GitHub cron 常延迟数小时，所以用「档位」而不是「距上次满 6 小时」。
SOCIAL_POST_INTERVAL_HOURS = 6
LAST_POST_TIME_FILE = ROOT / ".last_social_post_time"
TELEGRAM_QUEUE_FILE = ROOT / "data" / "telegram_queue.json"
TELEGRAM_STATE_BRANCH = "chore/telegram-state"
TELEGRAM_QUEUE_REL = "data/telegram_queue.json"
PROPFXLAB_SITE_URL = "https://www.propfxlab.com"
_TELEGRAM_QUEUE_SHA: Optional[str] = None

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
    # 扩展：外汇经纪商和交易平台
    "forex broker",
    "fx broker",
    "metatrader",
    "mt4",
    "mt5",
    "ctrader",
    "trading platform",
    "broker regulation",
    "cysec",
    "fca",
    "asic",
    "nfa",
    # 扩展：交易工具和策略
    "trading strategy",
    "trading indicator",
    "algorithmic trading",
    "automated trading",
    "trading bot",
    "trading signal",
    # 扩展：重要市场事件
    "nfp",
    "fomc",
    "ecb rate",
    "central bank",
    "interest rate",
    "volatility",
)

GEMINI_SYSTEM_INSTRUCTION = """You rewrite one trading/forex industry news item for PropFXLab, a comparison site for funded traders.
Return JSON only for THIS single RSS item.

KEEP=TRUE if the item is about ANY of these topics:
- Prop firms / funded traders / payouts / challenge rules / firm launches-shutdowns
- Forex brokers / trading platforms (MT4/MT5, cTrader, TradingView)
- Retail FX regulation / broker licensing / industry compliance
- Trading technology / tools / indicators / strategies
- Major FX market events / economic data releases that traders care about
- Broker promotions / trading competitions
- Industry fraud / scams / warnings (relevant to traders)

KEEP=FALSE only if clearly irrelevant (e.g., general stock market, crypto mining, real estate).

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
    # 摘要里的弱命中也算（放宽标准）
    if any(hint in blob for hint in KEYWORD_HINTS):
        # 标题像宏观/外汇行情也接受（改为仅排除明显不相关的）
        irrelevant = (
            "real estate",
            "cryptocurrency mining",
            "bitcoin mining",
            "stock market crash",
            "equity trading",
        )
        if any(token in title_l for token in irrelevant):
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


def notify_indexnow(slug: str) -> None:
    """向 IndexNow 推送该 slug 在全部 locale 下的新闻 URL。"""
    if os.environ.get("SKIP_INDEXNOW", "").strip().lower() in {"1", "true", "yes"}:
        print(f"  IndexNow 推迟（SKIP_INDEXNOW）：{slug}")
        return
    payload = {
        "host": INDEXNOW_HOST,
        "key": INDEXNOW_KEY,
        "keyLocation": INDEXNOW_KEY_LOCATION,
        "urlList": [
            f"https://{INDEXNOW_HOST}/{locale}/news/{slug}"
            for locale in INDEXNOW_LOCALES
        ],
    }
    body = json.dumps(payload).encode("utf-8")
    request = Request(
        INDEXNOW_ENDPOINT,
        data=body,
        headers={
            "Content-Type": "application/json; charset=utf-8",
            "User-Agent": BROWSER_HEADERS["User-Agent"],
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=REQUEST_TIMEOUT_S) as response:
            status = getattr(response, "status", None) or response.getcode()
            print(f"  IndexNow 推送 {slug}: HTTP {status}" + ("（成功）" if status in (200, 202) else ""))
    except HTTPError as error:
        print(f"  IndexNow 推送 {slug}: HTTP {error.code}")
    except (URLError, TimeoutError, OSError) as error:
        print(f"  IndexNow 推送 {slug} 失败：{error}")


def telegram_slot_start(when: datetime) -> datetime:
    """UTC 上 6 小时一档：00:00 / 06:00 / 12:00 / 18:00。"""
    utc = when.astimezone(timezone.utc)
    hour = (utc.hour // SOCIAL_POST_INTERVAL_HOURS) * SOCIAL_POST_INTERVAL_HOURS
    return utc.replace(hour=hour, minute=0, second=0, microsecond=0)


def _github_repo_token() -> Optional[tuple[str, str]]:
    repo = os.environ.get("GITHUB_REPOSITORY", "").strip()
    token = (os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN") or "").strip()
    if not repo or not token or requests is None:
        return None
    return repo, token


def _github_headers(token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def _ensure_telegram_state_branch(repo: str, token: str) -> None:
    headers = _github_headers(token)
    ref_url = f"https://api.github.com/repos/{repo}/git/ref/heads/{TELEGRAM_STATE_BRANCH}"
    response = requests.get(ref_url, headers=headers, timeout=REQUEST_TIMEOUT_S)
    if response.status_code == 200:
        return
    if response.status_code != 404:
        print(f"  Warning: 读取 {TELEGRAM_STATE_BRANCH} 失败：HTTP {response.status_code}")
        return
    main_ref = requests.get(
        f"https://api.github.com/repos/{repo}/git/ref/heads/main",
        headers=headers,
        timeout=REQUEST_TIMEOUT_S,
    )
    if main_ref.status_code != 200:
        print(f"  Warning: 无法从 main 创建 {TELEGRAM_STATE_BRANCH}：HTTP {main_ref.status_code}")
        return
    sha = str(main_ref.json().get("object", {}).get("sha") or "")
    if not sha:
        return
    created = requests.post(
        f"https://api.github.com/repos/{repo}/git/refs",
        headers=headers,
        json={"ref": f"refs/heads/{TELEGRAM_STATE_BRANCH}", "sha": sha},
        timeout=REQUEST_TIMEOUT_S,
    )
    if created.status_code not in {200, 201}:
        print(f"  Warning: 创建 {TELEGRAM_STATE_BRANCH} 失败：HTTP {created.status_code} {created.text[:200]}")
        return
    print(f"  已创建分支 {TELEGRAM_STATE_BRANCH} 用于持久化 Telegram 队列")


def pull_telegram_queue_from_github() -> None:
    """CI 中从不受保护的 state 分支拉取队列，避免等 main 上的队列 PR。"""
    global _TELEGRAM_QUEUE_SHA
    auth = _github_repo_token()
    if not auth:
        return
    repo, token = auth
    try:
        _ensure_telegram_state_branch(repo, token)
        response = requests.get(
            f"https://api.github.com/repos/{repo}/contents/{TELEGRAM_QUEUE_REL}",
            headers=_github_headers(token),
            params={"ref": TELEGRAM_STATE_BRANCH},
            timeout=REQUEST_TIMEOUT_S,
        )
        if response.status_code == 404:
            _TELEGRAM_QUEUE_SHA = None
            return
        response.raise_for_status()
        payload = response.json()
        _TELEGRAM_QUEUE_SHA = str(payload.get("sha") or "") or None
        raw = str(payload.get("content") or "").replace("\n", "")
        if not raw:
            return
        TELEGRAM_QUEUE_FILE.parent.mkdir(parents=True, exist_ok=True)
        TELEGRAM_QUEUE_FILE.write_text(base64.b64decode(raw).decode("utf-8"), encoding="utf-8")
    except Exception as error:
        print(f"  Warning: 拉取 Telegram 队列失败：{error}")


def _merge_telegram_queues(local: dict[str, Any], remote: dict[str, Any]) -> dict[str, Any]:
    slugs: list[str] = []
    seen: set[str] = set()
    for source in (remote, local):
        raw_slugs = source.get("slugs") if isinstance(source, dict) else None
        if not isinstance(raw_slugs, list):
            continue
        for slug in raw_slugs:
            cleaned = str(slug).strip()
            if cleaned and cleaned not in seen:
                slugs.append(cleaned)
                seen.add(cleaned)
    local_ts = parse_queue_timestamp(local.get("lastPostedAt") if isinstance(local, dict) else None)
    remote_ts = parse_queue_timestamp(remote.get("lastPostedAt") if isinstance(remote, dict) else None)
    latest = max((stamp for stamp in (local_ts, remote_ts) if stamp is not None), default=None)
    return {
        "slugs": slugs,
        "lastPostedAt": latest.isoformat() if latest else None,
    }


def push_telegram_queue_to_github() -> None:
    """把队列写到 chore/telegram-state，不走受保护的 main。"""
    global _TELEGRAM_QUEUE_SHA
    auth = _github_repo_token()
    if not auth or not TELEGRAM_QUEUE_FILE.is_file():
        return
    repo, token = auth
    headers = _github_headers(token)
    try:
        _ensure_telegram_state_branch(repo, token)
        body = TELEGRAM_QUEUE_FILE.read_bytes()
        encoded = base64.b64encode(body).decode("ascii")
        payload: dict[str, Any] = {
            "message": "chore(news): update telegram queue",
            "content": encoded,
            "branch": TELEGRAM_STATE_BRANCH,
        }
        if _TELEGRAM_QUEUE_SHA:
            payload["sha"] = _TELEGRAM_QUEUE_SHA
        response = requests.put(
            f"https://api.github.com/repos/{repo}/contents/{TELEGRAM_QUEUE_REL}",
            headers=headers,
            json=payload,
            timeout=REQUEST_TIMEOUT_S,
        )
        if response.status_code == 409:
            current = requests.get(
                f"https://api.github.com/repos/{repo}/contents/{TELEGRAM_QUEUE_REL}",
                headers=headers,
                params={"ref": TELEGRAM_STATE_BRANCH},
                timeout=REQUEST_TIMEOUT_S,
            )
            current.raise_for_status()
            remote_payload = current.json()
            _TELEGRAM_QUEUE_SHA = str(remote_payload.get("sha") or "") or None
            remote_raw = str(remote_payload.get("content") or "").replace("\n", "")
            remote_queue = json.loads(base64.b64decode(remote_raw).decode("utf-8")) if remote_raw else {}
            local_queue = json.loads(body.decode("utf-8"))
            merged = _merge_telegram_queues(local_queue, remote_queue)
            TELEGRAM_QUEUE_FILE.write_text(
                json.dumps(merged, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            payload["content"] = base64.b64encode(TELEGRAM_QUEUE_FILE.read_bytes()).decode("ascii")
            if _TELEGRAM_QUEUE_SHA:
                payload["sha"] = _TELEGRAM_QUEUE_SHA
            response = requests.put(
                f"https://api.github.com/repos/{repo}/contents/{TELEGRAM_QUEUE_REL}",
                headers=headers,
                json=payload,
                timeout=REQUEST_TIMEOUT_S,
            )
        if response.status_code not in {200, 201}:
            print(f"  Warning: 保存 Telegram 队列失败：HTTP {response.status_code} {response.text[:200]}")
            return
        _TELEGRAM_QUEUE_SHA = str(response.json().get("content", {}).get("sha") or "") or _TELEGRAM_QUEUE_SHA
        print(f"  Telegram 队列已写入 {TELEGRAM_STATE_BRANCH}")
    except Exception as error:
        print(f"  Warning: 保存 Telegram 队列失败：{error}")


def check_social_post_interval(last_posted_at: Optional[datetime] = None) -> bool:
    """当前 UTC 6 小时档尚未发过则可以发帖。"""
    if last_posted_at is None:
        if LAST_POST_TIME_FILE.is_file():
            try:
                last_posted_at = datetime.fromisoformat(
                    LAST_POST_TIME_FILE.read_text(encoding="utf-8").strip()
                )
            except (OSError, ValueError) as error:
                print(f"  Warning: 读取上次发帖时间失败：{error}")
                return True
        else:
            return True

    if last_posted_at.tzinfo is None:
        last_posted_at = last_posted_at.replace(tzinfo=timezone.utc)

    last_slot = telegram_slot_start(last_posted_at)
    now_slot = telegram_slot_start(datetime.now(timezone.utc))
    if last_slot >= now_slot:
        print(
            f"  ⏰ {now_slot.strftime('%Y-%m-%d %H:%M')} UTC 档已发过"
            f"（上次 {last_posted_at.isoformat()}），跳过"
        )
        return False
    return True


def update_last_post_time(when: Optional[datetime] = None) -> None:
    """更新本地上次发帖时间戳（非 CI 路径）。"""
    stamp = when or datetime.now(timezone.utc)
    try:
        LAST_POST_TIME_FILE.write_text(stamp.isoformat(), encoding="utf-8")
    except OSError as error:
        print(f"  Warning: 保存发帖时间戳失败：{error}")


def load_telegram_queue() -> dict[str, Any]:
    """读取持久化 Telegram 队列。"""
    pull_telegram_queue_from_github()
    if not TELEGRAM_QUEUE_FILE.is_file():
        return {"slugs": [], "lastPostedAt": None}
    try:
        payload = json.loads(TELEGRAM_QUEUE_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        print(f"  Warning: 读取 Telegram 队列失败：{error}")
        return {"slugs": [], "lastPostedAt": None}
    if not isinstance(payload, dict):
        return {"slugs": [], "lastPostedAt": None}
    slugs = payload.get("slugs")
    if not isinstance(slugs, list):
        slugs = []
    cleaned = [str(slug).strip() for slug in slugs if str(slug).strip()]
    return {
        "slugs": cleaned,
        "lastPostedAt": payload.get("lastPostedAt"),
    }


def save_telegram_queue(slugs: list[str], last_posted_at: Optional[str]) -> None:
    """写入持久化 Telegram 队列。"""
    TELEGRAM_QUEUE_FILE.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "slugs": slugs,
        "lastPostedAt": last_posted_at,
    }
    TELEGRAM_QUEUE_FILE.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    push_telegram_queue_to_github()


def parse_queue_timestamp(raw: Any) -> Optional[datetime]:
    if not raw:
        return None
    try:
        parsed = datetime.fromisoformat(str(raw).strip())
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def post_to_telegram(title: str, summary: str, slug: str, translations: dict[str, LocaleCopy]) -> bool:
    """发送新闻到 Telegram 频道。成功返回 True。"""
    bot_token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat_id = os.environ.get("TELEGRAM_CHAT_ID")
    
    if not bot_token or not chat_id:
        print("  Warning: 缺少 TELEGRAM_BOT_TOKEN 或 TELEGRAM_CHAT_ID，跳过 Telegram 发帖")
        return False
    
    if requests is None:
        print("  Warning: 缺少 requests 库，跳过 Telegram 发帖")
        return False
    
    try:
        # 构建消息：标题 + 精简看点 + 每个国旗对应语言的链接
        # 使用 HTML 格式隐藏长链接，只显示语言名称
        locale_links = []
        for locale in NEWS_LOCALES:
            flag = LOCALE_FLAGS.get(locale, "")
            label = LOCALE_LABELS.get(locale, locale.upper())
            url = f"{PROPFXLAB_SITE_URL}/{locale}/news/{slug}"
            # HTML 格式：<a href="url">文本</a>
            locale_links.append(f'{flag} <a href="{url}">{label}</a>')
        
        links_text = "\n".join(locale_links)
        message = f"📰 <b>{title}</b>\n\n{summary}\n\n{links_text}"
        
        # 调用 Telegram Bot API
        api_url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": message,
            "parse_mode": "HTML",
            "disable_web_page_preview": True,  # 禁用预览避免卡顿
        }
        
        response = requests.post(api_url, json=payload, timeout=REQUEST_TIMEOUT_S)
        response.raise_for_status()
        
        print(f"  ✅ Telegram 发帖成功 (@propfxlab)：{slug}")
        return True
        
    except Exception as error:
        print(f"  Warning: Telegram 发帖失败：{error}")
        return False


def post_telegram_for_slug(slug: str) -> bool:
    """从 data/news/<slug>.json 读取并发送 Telegram。成功返回 True。"""
    path = NEWS_DIR / f"{slug}.json"
    if not path.is_file():
        print(f"  Warning: 找不到新闻文件，跳过 Telegram：{path.name}")
        return False
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        print(f"  Warning: 读取 {path.name} 失败：{error}")
        return False
    title = str(payload.get("title") or "").strip()
    summary = str(payload.get("summary") or "").strip()
    if not title or not summary:
        print(f"  Warning: {path.name} 缺少 title/summary，跳过 Telegram")
        return False
    raw_translations = payload.get("translations") if isinstance(payload, dict) else None
    translations = normalize_translations(
        raw_translations if isinstance(raw_translations, dict) else None,
        fallback_title=title,
        fallback_summary=summary,
        fallback_body=str(payload.get("body") or ""),
    )
    return post_to_telegram(title, summary, slug, translations)


def enqueue_telegram_slugs(slugs: list[str]) -> list[str]:
    """把 slug 追加进队列（去重，保持顺序），返回当前队列。"""
    queue = load_telegram_queue()
    existing = list(queue["slugs"])
    seen = set(existing)
    for slug in slugs:
        cleaned = slug.strip()
        if cleaned and cleaned not in seen:
            existing.append(cleaned)
            seen.add(cleaned)
    save_telegram_queue(existing, queue.get("lastPostedAt") if isinstance(queue.get("lastPostedAt"), str) else None)
    print(f"  Telegram 队列现有 {len(existing)} 条待发")
    return existing


def flush_telegram_queue(force: bool = False) -> bool:
    """
    从队列发至多 1 条。默认每个 UTC 6 小时档最多 1 条。
    返回 True 表示队列文件有变更（发帖或清理失效 slug）。
    """
    queue = load_telegram_queue()
    slugs = list(queue["slugs"])
    last_raw = queue.get("lastPostedAt") if isinstance(queue.get("lastPostedAt"), str) else None
    last_posted_at = parse_queue_timestamp(last_raw)

    if not slugs:
        print("  Telegram 队列为空，无需发帖")
        return False

    if not force and not check_social_post_interval(last_posted_at):
        return False

    changed = False
    while slugs:
        slug = slugs[0]
        news_path = NEWS_DIR / f"{slug}.json"
        if not news_path.is_file():
            print(f"  Warning: 队列中的 {slug} 已不存在，移除")
            slugs.pop(0)
            changed = True
            continue

        ok = post_telegram_for_slug(slug)
        if not ok:
            # 保留队首，下次再试；仍写出清理后的队列
            save_telegram_queue(slugs, last_raw)
            return changed

        slugs.pop(0)
        now = datetime.now(timezone.utc)
        last_raw = now.isoformat()
        save_telegram_queue(slugs, last_raw)
        update_last_post_time(now)
        print(f"  Telegram 队列剩余 {len(slugs)} 条")
        return True

    if changed:
        save_telegram_queue(slugs, last_raw)
    return changed


def post_to_x(title: str, summary: str, slug: str, translations: dict[str, LocaleCopy]) -> None:
    """发送新闻到 X (Twitter)。"""
    api_key = os.environ.get("X_API_KEY")
    api_secret = os.environ.get("X_API_SECRET")
    access_token = os.environ.get("X_ACCESS_TOKEN")
    access_secret = os.environ.get("X_ACCESS_SECRET")
    
    if not all([api_key, api_secret, access_token, access_secret]):
        print("  Warning: 缺少 X API 凭证，跳过 X 发帖")
        return
    
    if tweepy is None:
        print("  Warning: 缺少 tweepy 库，跳过 X 发帖")
        return
    
    try:
        # 使用 tweepy v2 API
        client = tweepy.Client(
            consumer_key=api_key,
            consumer_secret=api_secret,
            access_token=access_token,
            access_token_secret=access_secret,
        )
        
        # 构建推文：标题 + 国旗 + 英文链接（Twitter字符限制）
        # 为了节省字符，只显示国旗，链接到英文版
        flags = " ".join(LOCALE_FLAGS.get(locale, "") for locale in NEWS_LOCALES)
        news_url = f"{PROPFXLAB_SITE_URL}/en/news/{slug}"
        
        # Twitter 字符限制处理
        tweet_base = f"📰 {title}\n\n{flags}\n\n🔗 {news_url}"
        
        if len(tweet_base) <= 280:
            tweet_text = tweet_base
        else:
            # 如果太长，缩短标题
            max_title_len = 280 - len(f"\n\n{flags}\n\n🔗 {news_url}") - 5  # 5 = "📰 " + "..."
            if max_title_len > 20:
                truncated_title = title[:max_title_len] + "..."
                tweet_text = f"📰 {truncated_title}\n\n{flags}\n\n🔗 {news_url}"
            else:
                # 极端情况：只发链接
                tweet_text = f"{flags}\n\n🔗 {news_url}"
        
        # 发送推文
        response = client.create_tweet(text=tweet_text)
        print(f"  ✅ X 发帖成功 (@PropFXLab)")
        
    except Exception as error:
        print(f"  Warning: X 发帖失败：{error}")



def write_article(item: RssItem, selected: SelectedArticle, allowed_slugs: set[str]) -> tuple[Path, dict[str, LocaleCopy]]:
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
    notify_indexnow(slug)
    return out_path, translations


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
        slug = str(payload.get("slug") or path.stem)
        notify_indexnow(slug)
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
    parser.add_argument(
        "--notify-indexnow",
        nargs="+",
        metavar="SLUG",
        help="仅向 IndexNow 推送给定 slug（用于 CI：main 推送后再通知搜索引擎）",
    )
    parser.add_argument(
        "--enqueue-telegram",
        nargs="+",
        metavar="SLUG",
        help="把 slug 加入 Telegram 队列（不立刻连发）",
    )
    parser.add_argument(
        "--flush-telegram",
        action="store_true",
        help="从队列发至多 1 条（默认每个 UTC 6 小时档最多 1 条）",
    )
    parser.add_argument(
        "--force-flush-telegram",
        action="store_true",
        help="忽略发帖间隔，从队列强制发 1 条",
    )
    parser.add_argument(
        "--post-telegram",
        nargs="+",
        metavar="SLUG",
        help="入队后立刻尝试 flush 1 条（不会一次发多条）",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    socket.setdefaulttimeout(REQUEST_TIMEOUT_S)
    load_dotenv()

    NEWS_DIR.mkdir(parents=True, exist_ok=True)

    if args.notify_indexnow:
        # Force-send even if SKIP_INDEXNOW is set in the job env
        os.environ.pop("SKIP_INDEXNOW", None)
        for slug in args.notify_indexnow:
            notify_indexnow(slug.strip())
        return

    if args.enqueue_telegram:
        enqueue_telegram_slugs([slug.strip() for slug in args.enqueue_telegram])
        return

    if args.flush_telegram or args.force_flush_telegram:
        flush_telegram_queue(force=bool(args.force_flush_telegram))
        return

    if args.post_telegram:
        enqueue_telegram_slugs([slug.strip() for slug in args.post_telegram])
        flush_telegram_queue(force=False)
        return

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
            out_path, article_translations = write_article(item, selected, allowed)
        except FileExistsError:
            skipped += 1
            print("  跳过：文件已存在")
            if index < len(candidates):
                time.sleep(BATCH_PAUSE_S)
            continue
        written += 1
        slug = out_path.stem
        print(f"  写入 {out_path.relative_to(ROOT)}（含 {len(article_translations)} 语种）")

        # CI 里先写盘、后推 main，再发社媒，避免链接 404
        if os.environ.get("SKIP_SOCIAL", "").strip().lower() in {"1", "true", "yes"}:
            print("  社媒发帖推迟（SKIP_SOCIAL）")
        elif check_social_post_interval():
            if post_to_telegram(
                title=selected.title,
                summary=selected.summary,
                slug=slug,
                translations=article_translations,
            ):
                update_last_post_time()
            # 本地路径也只发 1 条：写入成功后立刻结束本轮社媒
            # （其余新闻仍写入 JSON，Telegram 留给队列/下次）
            # 注意：CI 走 SKIP_SOCIAL + 合并后队列，不走这里。

        if index < len(candidates):
            time.sleep(BATCH_PAUSE_S)

    print(f"完成：写入 {written}，跳过 {skipped}，失败 {failed}（约 {written + skipped + failed} 次 API）")
    if written == 0:
        print("本轮没有可发布的新新闻（限流或候选被筛掉都算正常结束）")
    return


if __name__ == "__main__":
    main()
