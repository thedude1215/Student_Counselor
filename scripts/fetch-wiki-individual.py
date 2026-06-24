#!/usr/bin/env python3
"""Fetch Wikipedia logos individually for each university."""

import json
import re
import ssl
import sys
import time
import urllib.request
import urllib.parse

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def load_overrides():
    with open("scripts/wiki-title-overrides.json") as f:
        return json.load(f)

def wiki_title(name):
    return name.replace(" ", "_")

def fetch_one(title):
    url = (
        f"https://en.wikipedia.org/w/api.php?"
        f"action=query&titles={urllib.parse.quote(title)}"
        f"&prop=pageimages&format=json&pithumbsize=200&redirects=1"
    )
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "ScholarPath/1.0 (arnavcollegee@gmail.com)"})
        with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
            data = json.loads(resp.read().decode())
        pages = data.get("query", {}).get("pages", {})
        for pid, page in pages.items():
            if int(pid) < 0:
                continue
            thumb = page.get("thumbnail", {}).get("source", "")
            if thumb:
                return re.sub(r'/\d+px-', '/200px-', thumb)
    except Exception as e:
        print(f"  ERROR {title}: {e}", file=sys.stderr)
    return None

def main():
    overrides = load_overrides()
    with open("scripts/uni-names.txt") as f:
        names = [line.strip() for line in f if line.strip()]

    results = {}
    missing = []

    for i, name in enumerate(names):
        title = overrides.get(name, wiki_title(name))
        img = fetch_one(title)
        if img:
            results[name] = img
        else:
            missing.append(name)

        if (i + 1) % 50 == 0:
            print(f"  {i+1}/{len(names)} done, {len(results)} found...", file=sys.stderr)
        time.sleep(0.15)

    output = {
        "found": len(results),
        "total": len(names),
        "missing": missing,
        "logos": results,
    }
    print(json.dumps(output, indent=2))
    print(f"\nFound: {len(results)}/{len(names)} ({len(results)*100//len(names)}%)", file=sys.stderr)
    print(f"Missing ({len(missing)}):", file=sys.stderr)
    for m in missing:
        print(f"  - {m}", file=sys.stderr)

if __name__ == "__main__":
    main()
