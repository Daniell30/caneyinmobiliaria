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
import subprocess
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


# Mirrors src/_utils/sectors.js (the build-time source of truth). verify_zone_slugs()
# executes that JS and aborts if the two disagree, because a stale mapping here
# would leave a zone page 404-ing.
FAMILY = {"apartamento": "Apartamentos", "penthouse": "Apartamentos",
          "villa": "Villas", "casa": "Casas", "solar": "Solares"}
NON_PLACE_AREAS = {"solares", "otro"}
MIN_LISTINGS = 2


def _types(p):
    t = p.get("type")
    return [str(x).strip().lower() for x in (t if isinstance(t, list) else [t]) if str(x).strip()]


def _is_lease(p):
    price = str(p.get("price") or "")
    return not re.search(r"venta", price, re.I) and bool(re.search(r"alquiler|renta", price, re.I))


def _operation(p):
    explicit = str(p.get("operation") or "").strip().lower()
    if explicit:
        return "alquiler" if re.match(r"^(alq|rent)", explicit) else "venta"
    return "alquiler" if _is_lease(p) else "venta"


def sector_pages(props):
    """Active zone pages, plus the slug each one would have under the opposite
    sale/rental mix — that alternative is what must 301 to the live page."""
    groups = {}
    for p in props:
        sector, area = str(p.get("sector") or "").strip(), str(p.get("area") or "").strip()
        if sector and area:
            groups.setdefault((area, sector), []).append(p)

    pages = []
    for (area, sector), items in groups.items():
        if len(items) < MIN_LISTINGS:
            continue
        labels = set()
        generic = False
        for p in items:
            for t in _types(p):
                if t not in FAMILY:
                    generic = True
                else:
                    labels.add(FAMILY[t])
        label = "Propiedades" if (generic or len(labels) != 1) else next(iter(labels))
        all_sale = all(_operation(p) == "venta" for p in items)
        slug = slugify(f"{label}{' en venta' if all_sale else ''} {sector}")
        alt = slugify(f"{label}{'' if all_sale else ' en venta'} {sector}")
        pages.append({"slug": slug, "alt": alt})
    return pages


def verify_zone_slugs(props, computed):
    """Run the real sectors.js and abort if this file's mirror has drifted.
    Uses JavaScriptCore via osascript (macOS); skipped elsewhere."""
    js_path = os.path.join(ROOT, "src/_utils/sectors.js")
    slug_path = os.path.join(ROOT, "src/_utils/slugify.js")
    driver = (
        "var SLUG=%s, SECT=%s;\n"
        "function req(n){ if(n.indexOf('slugify')>=0){var m={exports:{}};"
        "(new Function('module',SLUG))(m);return m.exports;} throw new Error('x'); }\n"
        "var m={exports:{}};(new Function('require','module','exports',SECT))(req,m,m.exports);\n"
        "JSON.stringify(m.exports.sectorPages(%s).map(function(p){return p.slug;}));"
        % (json.dumps(open(slug_path).read()), json.dumps(open(js_path).read()),
           json.dumps(props))
    )
    try:
        out = subprocess.run(["osascript", "-l", "JavaScript", "-e", driver],
                             capture_output=True, text=True, timeout=120)
    except (FileNotFoundError, subprocess.TimeoutExpired):
        print("  (aviso: no se pudo verificar contra sectors.js; se omite el chequeo)")
        return
    if out.returncode != 0:
        print("  (aviso: sectors.js no se pudo ejecutar; se omite el chequeo)")
        return
    from_js = set(json.loads(out.stdout))
    from_py = {z["slug"] for z in computed}
    if from_js != from_py:
        print("ERROR: este script y src/_utils/sectors.js no coinciden en las páginas de zona.")
        print(f"  solo en sectors.js: {sorted(from_js - from_py)}")
        print(f"  solo aquí:          {sorted(from_py - from_js)}")
        sys.exit(1)


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

    # Zone pages: the slug carries "en venta" only while every listing in the
    # sector is a sale. Adding one rental flips the URL, so the previous form
    # must keep resolving.
    zone = sector_pages(props)
    verify_zone_slugs(props, zone)
    active = {z["slug"] for z in zone}
    zone_lines = [f"/{z['alt']}  /{z['slug']}  301!"
                  for z in zone if z["alt"] != z["slug"] and z["alt"] not in active]
    if zone_lines:
        lines += ["", "# Zone pages: previous slug -> current slug"] + zone_lines

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
