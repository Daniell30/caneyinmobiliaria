#!/usr/bin/env python3
"""Verify every rule in src/_redirects against a deployed site.

Usage:
    python3 scripts/check_redirects.py --base-url https://deploy-preview-2--caneyinmobiliaria.netlify.app

For each non-comment rule `from  to  status`, requests `from` and asserts:
  - the response status matches the rule (redirects: 301/302; a trailing
    `!` is Netlify's force marker, not part of the status)
  - the Location header path equals the rule's `to` (compared
    percent-decoded and case-insensitively)
Reports every mismatch with the rule's line number; exits non-zero on any.
"""
import argparse
import sys
import urllib.parse
import urllib.request

ROOT = __file__.rsplit("/", 2)[0]


def head(url):
    req = urllib.request.Request(url, method="HEAD",
                                 headers={"User-Agent": "caney-redirect-check"})

    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *a, **k):
            return None

    opener = urllib.request.build_opener(NoRedirect)
    try:
        with opener.open(req, timeout=20) as resp:
            return resp.status, resp.headers.get("Location", "")
    except urllib.error.HTTPError as e:
        return e.code, e.headers.get("Location", "")
    except Exception as e:
        return -1, str(e)


def norm(path):
    return urllib.parse.unquote(path or "").rstrip("/").lower() or "/"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base-url", required=True)
    args = ap.parse_args()
    base = args.base_url.rstrip("/")

    failures = checked = 0
    for lineno, raw in enumerate(open(f"{ROOT}/src/_redirects"), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split()
        if len(parts) < 3:
            print(f"  line {lineno}: unparseable rule: {line}")
            failures += 1
            continue
        src, dst, status = parts[0], parts[1], parts[2].rstrip("!")
        checked += 1
        code, location = head(base + src)
        loc_path = urllib.parse.urlparse(location).path if location else ""
        if str(code) != status:
            print(f"  line {lineno}: {src} -> HTTP {code}, expected {status}")
            failures += 1
        elif norm(loc_path) != norm(dst):
            print(f"  line {lineno}: {src} -> Location {loc_path!r}, expected {dst!r}")
            failures += 1

    print(f"\nchecked {checked} rules, {failures} failures")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
