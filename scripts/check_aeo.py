#!/usr/bin/env python3
"""AEO (AI/answer-engine optimization) readiness audit for a deployed site.

    python3 scripts/check_aeo.py --base-url https://caneyinmobiliaria.com

Checks what actually determines whether an answer engine can find, fetch,
parse and quote this site. Everything is evaluated against the RAW HTML —
no JavaScript — because most retrieval crawlers do not execute scripts.

Exit code 0 when there are no FAILs.
"""
import argparse, json, re, sys, urllib.parse, urllib.request
from collections import Counter

UA = {"User-Agent": "caney-aeo-audit"}
AI_AGENTS = ["OAI-SearchBot", "ChatGPT-User", "Claude-SearchBot", "Claude-User",
             "PerplexityBot", "GPTBot", "ClaudeBot", "Googlebot", "Bingbot"]

results = []
def ok(m):   results.append(("PASS", m))
def warn(m): results.append(("WARN", m))
def bad(m):  results.append(("FAIL", m))

def get(url):
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=25) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except Exception as e:
        return getattr(e, "code", -1), ""

def jsonld(html):
    out = []
    for m in re.finditer(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>', html, re.S | re.I):
        try: out.append(json.loads(m.group(1)))
        except json.JSONDecodeError: out.append({"_invalid": True})
    return out

def nodes(blocks):
    """Flatten @graph blocks into a list of typed nodes."""
    res = []
    for b in blocks:
        res.extend(b.get("@graph", [b]) if isinstance(b, dict) else [])
    return res

def text_of(html):
    body = re.sub(r"(?is)<(script|style|noscript)[^>]*>.*?</\1>", " ", html)
    return re.sub(r"\s+", " ", re.sub(r"(?s)<[^>]+>", " ", body)).strip()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base-url", required=True)
    a = ap.parse_args()
    base = a.base_url.rstrip("/")

    # ---------- 1. crawler access ----------
    st, robots = get(base + "/robots.txt")
    if st != 200:
        bad(f"robots.txt returns HTTP {st} — crawlers get no policy")
    else:
        missing = [ag for ag in AI_AGENTS if not re.search(rf"(?im)^user-agent:\s*{re.escape(ag)}\s*$", robots)]
        if missing: warn(f"robots.txt has no explicit rule for: {', '.join(missing)}")
        else: ok(f"robots.txt explicitly allows all {len(AI_AGENTS)} search/AI agents")
        if re.search(r"(?im)^disallow:\s*/\s*$", robots): bad("robots.txt contains a site-wide Disallow: /")
        sm = re.search(r"(?im)^sitemap:\s*(\S+)", robots)
        if not sm: bad("robots.txt declares no Sitemap")
        elif sm.group(1).rstrip("/").endswith(".xml"): ok(f"robots.txt declares sitemap {sm.group(1)}")
        else: bad(f"robots.txt Sitemap is not an XML sitemap: {sm.group(1)}")

    # ---------- 2. sitemap ----------
    st, sx = get(base + "/sitemap.xml")
    urls = re.findall(r"<loc>([^<]+)</loc>", sx) if st == 200 else []
    if st != 200: bad(f"sitemap.xml returns HTTP {st}")
    else:
        ok(f"sitemap.xml lists {len(urls)} URLs")
        badf = [u for u in urls if u.endswith(".html") or " " in u or "%20" in u]
        if badf: bad(f"{len(badf)} sitemap URLs are not canonical form (e.g. {badf[0]})")
        else: ok("all sitemap URLs use the canonical extensionless form")

    # Fetch every sitemap URL once and classify by CONTENT, never by URL
    # shape (listing slugs can legitimately start with "solares-").
    pages = {}
    for u in urls:
        st, html = get(u)
        pages[u] = (st, html)
    dead = [u for u, (st, _) in pages.items() if st != 200]
    if dead: bad(f"{len(dead)} sitemap URLs do not return 200 (e.g. {dead[0]})")
    else: ok(f"all {len(urls)} sitemap URLs return 200")

    listing, sector, other = [], [], []
    for u, (st, html) in pages.items():
        if st != 200: continue
        types = {n.get("@type") for n in nodes(jsonld(html))}
        if "RealEstateListing" in types: listing.append(u)
        elif "ItemList" in types: sector.append(u)
        else: other.append(u)
    cat = [u for u in other if "/inmuebles-" in u]
    if sector: ok(f"{len(sector)} sector aggregate pages (detected by ItemList schema)")
    else: warn("no sector aggregate pages found — one fetch cannot answer a whole sector query")
    ok(f"page mix: {len(listing)} listings, {len(sector)} sector pages, {len(other)} other")

    # ---------- 3. per-page fundamentals (raw HTML, no JS) ----------
    sample = [base + "/", base + "/contact/"] + cat[:2] + sector[:3] + listing[:6]
    org_ids, problems = Counter(), 0
    for u in sample:
        st, html = pages.get(u) or get(u)
        path = urllib.parse.urlparse(u).path or "/"
        if st != 200:
            bad(f"{path} returns HTTP {st}"); problems += 1; continue
        if not re.search(r"<title>[^<]{10,}</title>", html): bad(f"{path} has no usable <title>")
        if not re.search(r'<meta[^>]+name=["\']description["\'][^>]+content=["\'][^"\']{50,}', html):
            bad(f"{path} has no meta description")
        if not re.search(r"<h1[^>]*>.*?</h1>", html, re.S): bad(f"{path} has no <h1>")
        c = re.search(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']*)', html)
        if not c or not c.group(1).strip(): bad(f"{path} has an empty or missing canonical")
        blocks = jsonld(html)
        if not blocks: bad(f"{path} has no JSON-LD")
        if any(b.get("_invalid") for b in blocks): bad(f"{path} has invalid JSON-LD")
        for n in nodes(blocks):
            if n.get("@type") in ("RealEstateAgent", "Organization"):
                org_ids[n.get("@id")] += 1
        wc = len(text_of(html).split())
        if wc < 120: warn(f"{path} has only {wc} words of extractable text")

    if len(org_ids) == 1 and None not in org_ids:
        ok(f"one organization @id across all page types: {list(org_ids)[0]}")
    elif org_ids: bad(f"organization @id is not consistent: {dict(org_ids)}")

    # ---------- 4. listing pages: the facts a property query filters on ----------
    checked = 0
    facts = Counter()
    for u in listing:
        st, html = pages[u]
        if st != 200: continue
        checked += 1
        ns = nodes(jsonld(html))
        types = {n.get("@type") for n in ns}
        if "RealEstateListing" not in types: bad(f"{urllib.parse.urlparse(u).path} has no RealEstateListing"); continue
        if "Product" in types: bad(f"{urllib.parse.urlparse(u).path} still carries the old Product schema")
        L = next(n for n in ns if n.get("@type") == "RealEstateListing")
        res = next((n for n in ns if n.get("@type") in
                   ("Apartment","House","Place","ApartmentComplex","Hotel","Residence","SingleFamilyResidence")), {})
        off = next((n for n in ns if n.get("@type") == "Offer"), {})
        for k, cond in [("price", off.get("price") or off.get("priceSpecification")),
                        ("currency", off.get("priceCurrency")), ("availability", off.get("availability")),
                        ("address", res.get("address")), ("bedrooms", res.get("numberOfBedrooms")),
                        ("bathrooms", res.get("numberOfBathroomsTotal")), ("floorSize", res.get("floorSize")),
                        ("images>1", len(L.get("image") or []) > 1), ("datePosted", L.get("datePosted")),
                        ("org link", (L.get("provider") or {}).get("@id"))]:
            if cond: facts[k] += 1
        # extractable without JS
        if "<table" not in html: bad(f"{urllib.parse.urlparse(u).path} has no specification table in raw HTML")
        imgs = re.findall(r'<img[^>]+src=["\']([^"\']*)', html)
        if any(not s.strip() or s.startswith("data:") for s in imgs):
            bad(f"{urllib.parse.urlparse(u).path} still has placeholder/empty image src")
    if checked:
        ok(f"listing schema facts across {checked} pages: "
           + ", ".join(f"{k} {v}/{checked}" for k, v in facts.items()))

    # ---------- 5. sector pages ----------
    for u in sector:
        st, html = pages[u]
        p = urllib.parse.urlparse(u).path
        if st != 200: bad(f"{p} returns HTTP {st}"); continue
        ns = nodes(jsonld(html))
        il = next((n for n in ns if n.get("@type") == "ItemList"), None)
        if not il: bad(f"{p} has no ItemList schema"); continue
        refs = [e.get("item", {}).get("@id", "") for e in il.get("itemListElement", [])]
        if not refs or not all(r.endswith("#listing") for r in refs):
            bad(f"{p} ItemList does not reference RealEstateListing @ids")
        if "<table" not in html: bad(f"{p} has no comparison table")
    if sector: ok(f"sector pages carry ItemList schema referencing listing @ids")

    # ---------- report ----------
    print()
    for level in ("FAIL", "WARN", "PASS"):
        for lv, m in results:
            if lv == level: print(f"  {lv}  {m}")
    f = sum(1 for lv, _ in results if lv == "FAIL")
    w = sum(1 for lv, _ in results if lv == "WARN")
    print(f"\n{f} failures, {w} warnings, {sum(1 for lv,_ in results if lv=='PASS')} checks passed")
    sys.exit(1 if f else 0)

if __name__ == "__main__":
    main()
