#!/usr/bin/env python3
"""Link checker for caneyinmobiliaria.com (Python 3, no dependencies).

Two modes:

  1. Filesystem mode — walk a built publish directory (Netlify's `_site`):
       python3 scripts/check_links.py --dir _site

  2. URL mode — crawl a deployed site or deploy preview (this machine has no
     Node, so built output is usually only available on Netlify):
       python3 scripts/check_links.py --base-url https://deploy-preview-1--caneyinmobiliaria.netlify.app
       python3 scripts/check_links.py --base-url https://caneyinmobiliaria.com

What it does:
  - Collects every .html and .css file (or crawls pages starting from /,
    /contact/ and sitemap.xml in URL mode).
  - Extracts src, href, srcset, poster, data-full, data-thumb, meta content
    (og:image / twitter:image), <link rel=preload> href, and CSS url() values.
  - Percent-decodes each reference; skips external URLs, mailto:, tel:,
    javascript:, data: URIs and pure #anchors. Absolute URLs on the canonical
    host (caneyinmobiliaria.com) are treated as internal, and in URL mode are
    checked against the crawled base (so previews validate prod-absolute URLs).
  - Resolves each remaining path and asserts the target exists (filesystem
    stat in dir mode, HTTP status < 400 in URL mode).
  - Prints every failure with source file, line number and the raw value;
    exits non-zero on any failure.
  - Naming audit: flags any referenced internal path containing a literal
    space, %20, parenthesis, or uppercase letter. Informational by default;
    --strict-naming makes violations fail the run (enable after Phase 1).
  - In dir mode, path resolution is case-SENSITIVE even on macOS (each
    component is matched against real directory entries), so case-only
    mismatches that Netlify happens to tolerate are still reported.
"""

import argparse
import os
import posixpath
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict

CANONICAL_HOSTS = {"caneyinmobiliaria.com", "www.caneyinmobiliaria.com"}
SKIP_SCHEMES = ("mailto:", "tel:", "javascript:", "data:")

ATTR_RE = re.compile(
    r"""(?:\b(src|href|poster|data-full|data-thumb)\s*=\s*["']([^"']+)["'])""",
    re.IGNORECASE,
)
SRCSET_RE = re.compile(r"""\bsrcset\s*=\s*["']([^"']+)["']""", re.IGNORECASE)
META_IMG_RE = re.compile(
    r"""<meta[^>]+(?:property|name)\s*=\s*["'](?:og:image|og:image:url|twitter:image)["'][^>]*
        \bcontent\s*=\s*["']([^"']+)["']""",
    re.IGNORECASE | re.VERBOSE,
)
CSS_URL_RE = re.compile(r"""url\(\s*(?:'([^']*)'|"([^"]*)"|([^'")]+))\s*\)""")

NAMING_BAD = re.compile(r"[ ()]|%20|[A-Z]")


def is_external(ref):
    p = urllib.parse.urlparse(ref)
    if p.scheme in ("http", "https"):
        return p.hostname not in CANONICAL_HOSTS
    return False


def normalize(ref, page_dir):
    """Return site-absolute decoded path for an internal ref, or None to skip."""
    ref = ref.strip()
    if not ref or ref.startswith("#") or ref.lower().startswith(SKIP_SCHEMES):
        return None
    if "${" in ref:
        return None  # JS template literal inside an inline script, not a real ref
    if ref.startswith("//"):
        return None  # protocol-relative external
    p = urllib.parse.urlparse(ref)
    if p.scheme in ("http", "https"):
        if p.hostname not in CANONICAL_HOSTS:
            return None
        path = p.path or "/"
    else:
        path = p.path
        if not path:
            return None
        if not path.startswith("/"):
            path = posixpath.normpath(posixpath.join(page_dir, path))
    path = urllib.parse.unquote(path)
    return posixpath.normpath("/" + path.lstrip("/"))


COMMENT_RE = re.compile(r"<!--.*?-->", re.DOTALL)


def extract_refs(text, is_css):
    """Yield (lineno, raw_ref) pairs."""
    if not is_css:
        # Blank out HTML comments, preserving line numbers.
        text = COMMENT_RE.sub(lambda m: "\n" * m.group(0).count("\n"), text)
    for lineno, line in enumerate(text.splitlines(), 1):
        if is_css:
            for m in CSS_URL_RE.finditer(line):
                ref = next(g for g in m.groups() if g is not None)
                yield lineno, ref.replace("\\", "")
            continue
        for m in ATTR_RE.finditer(line):
            yield lineno, m.group(2)
        for m in SRCSET_RE.finditer(line):
            for cand in m.group(1).split(","):
                url = cand.strip().split()[0] if cand.strip() else ""
                if url:
                    yield lineno, url
        for m in META_IMG_RE.finditer(line):
            yield lineno, m.group(1)
        for m in CSS_URL_RE.finditer(line):  # inline <style>
            ref = next(g for g in m.groups() if g is not None)
            yield lineno, ref.replace("\\", "")


# ---------------- filesystem mode ----------------

def exists_case_sensitive(root, site_path):
    """Resolve /a/b/c against root, matching each component exactly.
    Returns (exists, case_mismatch)."""
    cur = root
    for comp in [c for c in site_path.split("/") if c]:
        if not os.path.isdir(cur):
            return False, False
        entries = os.listdir(cur)
        if comp in entries:
            cur = os.path.join(cur, comp)
        elif comp.lower() in {e.lower() for e in entries}:
            return True, True  # exists only under different casing
        else:
            return False, False
    return True, False


def target_variants(site_path):
    """URL path -> candidate file paths (extensionless and directory URLs)."""
    if site_path.endswith("/"):
        return [site_path + "index.html"]
    if posixpath.splitext(site_path)[1]:
        return [site_path]
    return [site_path + ".html", site_path + "/index.html", site_path]


def run_dir_mode(root):
    failures, case_flags, naming = [], [], defaultdict(list)
    sources = []
    for dirpath, _dirs, files in os.walk(root):
        for f in files:
            if f.lower().endswith((".html", ".css")):
                sources.append(os.path.join(dirpath, f))
    print(f"Scanning {len(sources)} HTML/CSS files under {root}\n")
    for src_file in sorted(sources):
        rel = os.path.relpath(src_file, root)
        page_dir = "/" + os.path.dirname(rel).replace(os.sep, "/")
        text = open(src_file, encoding="utf-8", errors="replace").read()
        for lineno, raw in extract_refs(text, src_file.lower().endswith(".css")):
            site_path = normalize(raw, page_dir)
            if site_path is None:
                continue
            if NAMING_BAD.search(site_path):
                naming[site_path].append(f"{rel}:{lineno}")
            ok = False
            mismatch = False
            for cand in target_variants(site_path):
                ex, mm = exists_case_sensitive(root, cand)
                if ex and not mm:
                    ok = True
                    break
                if ex and mm:
                    mismatch = True
            if ok:
                continue
            if mismatch:
                case_flags.append((rel, lineno, raw))
            else:
                failures.append((rel, lineno, raw))
    return failures, case_flags, naming


# ---------------- URL mode ----------------

def http_status(url, cache):
    if url in cache:
        return cache[url]
    status = None
    for method in ("HEAD", "GET"):
        req = urllib.request.Request(url, method=method,
                                     headers={"User-Agent": "caney-link-check"})
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                status = resp.status
            break
        except urllib.error.HTTPError as e:
            status = e.code
            if status == 405 and method == "HEAD":
                continue
            break
        except Exception:
            status = -1
            break
    cache[url] = status
    return status


def fetch_text(url):
    req = urllib.request.Request(url, headers={"User-Agent": "caney-link-check"})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return resp.read().decode("utf-8", errors="replace"), resp.status
    except urllib.error.HTTPError as e:
        return "", e.code
    except Exception:
        return "", -1


def run_url_mode(base):
    base = base.rstrip("/")
    failures, naming = [], defaultdict(list)
    cache = {}
    seen_pages, queue = set(), ["/", "/contact/"]

    smap, st = fetch_text(base + "/sitemap.xml")
    if st == 200:
        for loc in re.findall(r"<loc>([^<]+)</loc>", smap):
            path = urllib.parse.urlparse(loc.strip()).path or "/"
            queue.append(urllib.parse.unquote(path))
    else:
        print(f"note: sitemap.xml returned {st}; crawling from / only")

    css_seen = set()
    while queue and len(seen_pages) < 500:
        page = queue.pop(0)
        if page in seen_pages:
            continue
        seen_pages.add(page)
        page_url = base + urllib.parse.quote(page)
        text, st = fetch_text(page_url)
        if st >= 400 or st < 0:
            failures.append((page, 0, f"(page itself returned HTTP {st})"))
            continue
        page_dir = posixpath.dirname(page) or "/"
        for lineno, raw in extract_refs(text, False):
            site_path = normalize(raw, page_dir)
            if site_path is None:
                continue
            if NAMING_BAD.search(site_path):
                naming[site_path].append(f"{page}:{lineno}")
            status = http_status(base + urllib.parse.quote(site_path), cache)
            if status >= 400 or status < 0:
                failures.append((page, lineno, f"{raw}  [HTTP {status}]"))
            if site_path.lower().endswith(".css") and site_path not in css_seen:
                css_seen.add(site_path)
                css_text, cst = fetch_text(base + urllib.parse.quote(site_path))
                if cst == 200:
                    css_dir = posixpath.dirname(site_path)
                    for cl, cref in extract_refs(css_text, True):
                        cpath = normalize(cref, css_dir)
                        if cpath is None:
                            continue
                        if NAMING_BAD.search(cpath):
                            naming[cpath].append(f"{site_path}:{cl}")
                        cstatus = http_status(base + urllib.parse.quote(cpath), cache)
                        if cstatus >= 400 or cstatus < 0:
                            failures.append((site_path, cl, f"{cref}  [HTTP {cstatus}]"))
    print(f"Crawled {len(seen_pages)} pages, {len(css_seen)} stylesheets\n")
    return failures, [], naming


# ---------------- main ----------------

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--dir", help="built publish directory (e.g. _site)")
    g.add_argument("--base-url", help="deployed site URL to crawl")
    ap.add_argument("--strict-naming", action="store_true",
                    help="fail on paths with spaces/%%20/parens/uppercase")
    args = ap.parse_args()

    if args.dir:
        failures, case_flags, naming = run_dir_mode(args.dir)
    else:
        failures, case_flags, naming = run_url_mode(args.base_url)

    if failures:
        print(f"BROKEN REFERENCES: {len(failures)}")
        for src, line, raw in failures:
            print(f"  {src}:{line}  ->  {raw}")
    else:
        print("BROKEN REFERENCES: 0")

    if case_flags:
        print(f"\nCASE-ONLY MISMATCHES (work on Netlify today, broken anywhere case-sensitive): {len(case_flags)}")
        for src, line, raw in case_flags:
            print(f"  {src}:{line}  ->  {raw}")

    print(f"\nNAMING AUDIT (space / %20 / parens / uppercase): {len(naming)} distinct paths")
    for p in sorted(naming):
        print(f"  {p}   (referenced from {len(naming[p])} places)")

    if failures or (args.strict_naming and naming):
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
