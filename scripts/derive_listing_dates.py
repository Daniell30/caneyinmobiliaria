#!/usr/bin/env python3
"""Derive each listing's first-publication date from git history.

datePosted is a real, auditable signal: the date the listing's `filename`
key first appeared in the catalog — src/_data/properties.json until the
CMS phase 1, one file per listing in src/propiedades/ since. It is NOT
invented, and it survives later reformatting (git log -S searches content).

Writes src/_data/listing_dates.json  ->  { "<filename>": "YYYY-MM-DD" }
Since phase 1 every listing carries an explicit "datePosted" in its own
file, which overrides this; listing_dates.json is only the fallback.
"""
import json, os, subprocess

import catalogo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "src/_data")

props = catalogo.load_properties()
out, missing = {}, []
for p in props:
    key = str(p.get("filename") or "").strip()
    if not key:
        continue
    r = subprocess.run(
        ["git", "log", "--format=%ad", "--date=short", "-S", f'"{key}"',
         "--", "src/_data/properties.json", "src/propiedades"],
        cwd=ROOT, capture_output=True, text=True)
    dates = [d for d in r.stdout.split() if d]
    if dates:
        out[key] = dates[-1]          # oldest commit that introduced the key
    else:
        missing.append(key)

json.dump(dict(sorted(out.items())), open(os.path.join(DATA, "listing_dates.json"), "w"),
          indent=1, ensure_ascii=False)
print(f"wrote src/_data/listing_dates.json: {len(out)} dates"
      + (f", {len(missing)} without history: {missing}" if missing else ""))
