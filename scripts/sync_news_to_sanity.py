#!/usr/bin/env python3
"""Upload data/news/*.json articles that Sanity does not have yet.

Existing documents are never overwritten, so edits made in the Studio win.
Sanity's webhook then revalidates /news, the article and the news sitemap
on the live deployment, without a Vercel build.

  SANITY_WRITE_TOKEN=... python3 scripts/sync_news_to_sanity.py
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import sys
from pathlib import Path
from typing import Any
from urllib.parse import quote

import requests

ROOT = Path(__file__).resolve().parents[1]
NEWS_DIR = ROOT / "data" / "news"
API = "https://7am7u5md.api.sanity.io/v2025-02-19/data"
DATASET = "production"
BATCH = 50


def news_doc_id(slug: str) -> str:
    """Sanity ids are limited to [a-zA-Z0-9._-]; must match sanity-export.ts."""
    if re.fullmatch(r"[A-Za-z0-9_-]+", slug):
        return f"news.{slug}"
    return f"news.h{hashlib.sha1(slug.encode('utf-8')).hexdigest()[:24]}"


def drop_nulls(value: Any) -> Any:
    if isinstance(value, dict):
        return {k: drop_nulls(v) for k, v in value.items() if v is not None}
    if isinstance(value, list):
        return [drop_nulls(v) for v in value if v is not None]
    return value


def main() -> int:
    token = os.environ.get("SANITY_WRITE_TOKEN", "").strip()
    if not token:
        print("::error::SANITY_WRITE_TOKEN is not set")
        return 1
    headers = {"Authorization": f"Bearer {token}"}

    query = quote('*[_type == "newsArticle"]._id')
    response = requests.get(f"{API}/query/{DATASET}?query={query}", headers=headers, timeout=30)
    response.raise_for_status()
    existing = set(response.json().get("result") or [])

    missing: list[dict[str, Any]] = []
    for path in sorted(NEWS_DIR.glob("*.json")):
        payload = json.loads(path.read_text(encoding="utf-8"))
        slug = str(payload.get("slug") or path.stem)
        doc_id = news_doc_id(slug)
        if doc_id in existing:
            continue
        missing.append({"_id": doc_id, "_type": "newsArticle", **drop_nulls(payload)})

    print(f"Sanity has {len(existing)} articles; uploading {len(missing)}")
    for start in range(0, len(missing), BATCH):
        chunk = missing[start : start + BATCH]
        result = requests.post(
            f"{API}/mutate/{DATASET}?returnIds=true",
            headers={**headers, "Content-Type": "application/json"},
            json={"mutations": [{"createIfNotExists": doc} for doc in chunk]},
            timeout=60,
        )
        if result.status_code >= 300:
            print(f"::error::Sanity mutate failed: HTTP {result.status_code} {result.text[:500]}")
            return 1
        for doc in chunk:
            print(f"  + {doc['_id']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
