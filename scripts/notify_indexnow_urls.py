#!/usr/bin/env python3
from __future__ import annotations

"""Push arbitrary site URLs to IndexNow (Bing / Yandex / compatible engines).

Usage:
  python3 scripts/notify_indexnow_urls.py --core
  python3 scripts/notify_indexnow_urls.py --url https://www.propfxlab.com/faq
  python3 scripts/notify_indexnow_urls.py --path /calculator --all-locales
"""

import argparse
import json
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
HOST = "www.propfxlab.com"
ENDPOINT = "https://api.indexnow.org/indexnow"
KEY = "abc8dfc79fc54c40b0fecce27d963c8c"
KEY_LOCATION = f"https://{HOST}/{KEY}.txt"
LOCALES = ("en", "es", "cn", "tw", "th", "vi", "pt")
TIMEOUT_S = 20

# Priority crawl set for a brand-new domain (hubs + firms). Compare matrix is
# left to sitemaps so we do not flood IndexNow with thousands of URLs at once.
CORE_PATHS = (
    "",
    "/calculator",
    "/compare",
    "/faq",
    "/news",
    "/defunct",
    "/about",
)


def locale_url(locale: str, pathname: str) -> str:
    path = "" if pathname in ("", "/") else pathname
    if locale == "en":
        return f"https://{HOST}{path or '/'}"
    return f"https://{HOST}/{locale}{path}"


def firm_slugs() -> list[str]:
    firms_dir = ROOT / "data" / "firms"
    return sorted(p.stem for p in firms_dir.glob("*.json"))


def core_urls() -> list[str]:
    urls: list[str] = []
    for path in CORE_PATHS:
        for locale in LOCALES:
            urls.append(locale_url(locale, path))
    for slug in firm_slugs():
        for locale in LOCALES:
            urls.append(locale_url(locale, f"/firm/{slug}"))
    # de-dupe preserve order
    seen: set[str] = set()
    out: list[str] = []
    for u in urls:
        if u not in seen:
            seen.add(u)
            out.append(u)
    return out


def chunked(items: list[str], size: int = 10000) -> list[list[str]]:
    return [items[i : i + size] for i in range(0, len(items), size)]


def post_urls(url_list: list[str]) -> int:
    payload = {
        "host": HOST,
        "key": KEY,
        "keyLocation": KEY_LOCATION,
        "urlList": url_list,
    }
    body = json.dumps(payload).encode("utf-8")
    request = Request(
        ENDPOINT,
        data=body,
        headers={
            "Content-Type": "application/json; charset=utf-8",
            "User-Agent": "PropFXLab-IndexNow/1.0",
        },
        method="POST",
    )
    with urlopen(request, timeout=TIMEOUT_S) as response:
        return getattr(response, "status", None) or response.getcode()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--core", action="store_true", help="Push hubs + all firm pages × 7 locales")
    parser.add_argument("--url", action="append", default=[], help="Absolute URL to push")
    parser.add_argument("--path", action="append", default=[], help="Site path like /faq")
    parser.add_argument(
        "--all-locales",
        action="store_true",
        help="Expand each --path across all 7 locales",
    )
    args = parser.parse_args()

    urls: list[str] = []
    if args.core:
        urls.extend(core_urls())
    urls.extend(args.url)
    for path in args.path:
        if not path.startswith("/"):
            path = "/" + path
        if args.all_locales:
            urls.extend(locale_url(locale, path) for locale in LOCALES)
        else:
            urls.append(locale_url("en", path))

    # de-dupe
    seen: set[str] = set()
    unique: list[str] = []
    for u in urls:
        if u not in seen:
            seen.add(u)
            unique.append(u)

    if not unique:
        print("No URLs to push.", file=sys.stderr)
        return 2

    print(f"Pushing {len(unique)} URLs to IndexNow…")
    ok = True
    for batch in chunked(unique, 10000):
        try:
            status = post_urls(batch)
            print(f"  batch {len(batch)}: HTTP {status}" + (" OK" if status in (200, 202) else ""))
            if status not in (200, 202):
                ok = False
        except HTTPError as error:
            print(f"  batch failed: HTTP {error.code}")
            ok = False
        except (URLError, TimeoutError, OSError) as error:
            print(f"  batch failed: {error}")
            ok = False
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
