#!/usr/bin/env python3
"""Generate src/_redirects from the data sources — never hand-type rules.

Inputs:
  - src/_data/properties.json  (listing slugs: .html -> extensionless)
  - scripts/rename-map.json    (old asset URL -> new asset URL, from the
                                Phase 1 bulk rename)

Netlify notes:
  - first match wins; `301!` forces the redirect even when a file exists
    at the source path (needed while both URL forms exist)
  - redirect matching is case-insensitive, so case-only renames need no
    rule; those pairs are filtered out below
  - spaces in the `from` column must be percent-encoded

Rerun after inventory changes:  python3 scripts/generate_redirects.py
"""
import json
import os
import re
import sys
import unicodedata
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PER_PAGE = 20  # keep in sync with the list-*.11ty.js templates


def slugify(s):
    s = unicodedata.normalize("NFD", str(s or ""))
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return re.sub(r"(^-|-$)", "", s)


def enc(path):
    return urllib.parse.quote(path, safe="/()!_.~-")


def main():
    props = json.load(open(os.path.join(ROOT, "src/_data/properties.json")))
    rename_map = json.load(open(os.path.join(ROOT, "scripts/rename-map.json")))

    lines = [
        "# GENERATED FILE — do not edit by hand.",
        "# Rebuild with: python3 scripts/generate_redirects.py",
        "",
        "# Contact variants",
        "/contact.html            /contact/   301!",
        "/caney-contact-linktree  /contact/   301!",
        "",
        "# Old homepage filename",
        "/Index.html              /           301!",
        "",
        "# Category pages: old spaced filenames -> slugs",
    ]

    areas = {
        "Santo Domingo": ("INMUEBLES SANTO DOMINGO", "inmuebles-santo-domingo"),
        "Punta Cana": ("INMUEBLES PUNTA CANA", "inmuebles-punta-cana"),
        "Juan Dolio": ("INMUEBLES JUAN DOLIO", "inmuebles-juan-dolio"),
        "Solares": ("INMUEBLES SOLARES", "inmuebles-solares"),
        "Otro": ("INMUEBLES OTRO", "inmuebles-otro"),
    }
    counts = {}
    for p in props:
        counts[p["area"]] = counts.get(p["area"], 0) + 1
    for area, (old, new) in areas.items():
        pages = max(1, -(-counts.get(area, 0) // PER_PAGE))
        for i in range(pages):
            osuf = "" if i == 0 else f"-{i + 1}"
            nsuf = "" if i == 0 else f"-{i + 1}"
            lines.append(f"/{enc(old)}{osuf}.html  /{new}{nsuf}  301!")
            # Netlify's Pretty URLs was 301ing the spaced .html to a
            # lowercased spaced extensionless URL; catch that form too.
            lines.append(f"/{enc(old.lower())}{osuf}  /{new}{nsuf}  301!")

    lines += ["", "# Listing pages: .html -> extensionless (generated per listing)"]
    for p in props:
        slug = f"{slugify(p['title'])}-{slugify(p.get('sector') or p.get('area') or '')}"
        lines.append(f"/{slug}.html  /{slug}  301!")

    lines += ["", "# Renamed assets (spaces/parens removed). Netlify SERVES files",
              "# case-insensitively (case-only renames need no rule) but MATCHES",
              "# redirect sources case-sensitively — so each rule is emitted both",
              "# in the on-disk casing and in the 'Images caney' casing that the",
              "# old templates actually put into og:image/HTML."]
    for old, new in sorted(rename_map.items()):
        if old.lower() == new.lower():
            continue
        variants = {old}
        variants.add(old.replace("/CSS/Images Caney/", "/CSS/Images caney/"))
        for v in sorted(variants):
            lines.append(f"{enc(v)}  {enc(new)}  301")

    out = os.path.join(ROOT, "src/_redirects")
    with open(out, "w") as fh:
        fh.write("\n".join(lines) + "\n")
    print(f"wrote {out}: {sum(1 for l in lines if l and not l.startswith('#'))} rules")


if __name__ == "__main__":
    main()
