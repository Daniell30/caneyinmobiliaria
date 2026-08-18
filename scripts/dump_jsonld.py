#!/usr/bin/env python3
"""Dump every listing page's JSON-LD blocks from a deployed site.

Used before AND after the Phase 3 schema migration so the two states can
be diffed and no data silently lost:

    python3 scripts/dump_jsonld.py --base-url https://caneyinmobiliaria.com \
        --out scripts/jsonld-pre-migration.json

Slugs are derived from src/_data/properties.json exactly as the templates
derive them. Output: { "<slug>": [ <parsed JSON-LD block>, ... ] }.
"""
import argparse
import json
import os
import re
import sys
import unicodedata
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def slugify(s):
    s = unicodedata.normalize("NFD", str(s or ""))
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return re.sub(r"(^-|-$)", "", s)

LD_RE = re.compile(
    r'<script[^>]*type\s*=\s*["\']application/ld\+json["\'][^>]*>(.*?)</script>',
    re.DOTALL | re.IGNORECASE,
)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base-url", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    base = args.base_url.rstrip("/")

    props = json.load(open(os.path.join(ROOT, "src/_data/properties.json")))
    result, errors = {}, 0
    for p in props:
        slug = f"{slugify(p['title'])}-{slugify(p.get('sector') or p.get('area') or '')}"
        url = f"{base}/{slug}"
        try:
            with urllib.request.urlopen(
                urllib.request.Request(url, headers={"User-Agent": "caney-jsonld-dump"}),
                timeout=20,
            ) as resp:
                html = resp.read().decode("utf-8", errors="replace")
        except Exception as e:
            print(f"FETCH ERROR {slug}: {e}")
            errors += 1
            continue
        blocks = []
        for m in LD_RE.finditer(html):
            try:
                blocks.append(json.loads(m.group(1)))
            except json.JSONDecodeError as e:
                print(f"INVALID JSON-LD on {slug}: {e}")
                errors += 1
                blocks.append({"_unparseable_raw": m.group(1)})
        result[slug] = blocks

    with open(os.path.join(ROOT, args.out), "w") as fh:
        json.dump(result, fh, indent=1, ensure_ascii=False)
    print(f"dumped {len(result)} pages "
          f"({sum(len(v) for v in result.values())} JSON-LD blocks), "
          f"{errors} errors -> {args.out}")
    sys.exit(1 if errors else 0)

if __name__ == "__main__":
    main()
