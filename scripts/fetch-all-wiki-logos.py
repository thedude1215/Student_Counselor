#!/usr/bin/env python3
"""Batch-fetch university logos from Wikipedia and output SQL UPDATE statements."""

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

OVERRIDES_FILE = "scripts/wiki-title-overrides.json"

def load_overrides():
    with open(OVERRIDES_FILE) as f:
        return json.load(f)

def wiki_title(name):
    return name.replace(" ", "_")

def fetch_wiki_batch(titles_list):
    joined = "|".join(titles_list)
    url = (
        f"https://en.wikipedia.org/w/api.php?"
        f"action=query&titles={urllib.parse.quote(joined, safe='|')}"
        f"&prop=pageimages&format=json&pithumbsize=200&redirects=1"
    )
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "ScholarPath/1.0 (arnavcollegee@gmail.com)"})
        with urllib.request.urlopen(req, timeout=20, context=ctx) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        print(f"  ERROR: {e}", file=sys.stderr)
        return {"query": {"pages": {}}}

def main():
    overrides = load_overrides()

    # Read university names from file
    with open("scripts/uni-names.txt") as f:
        names = [line.strip() for line in f if line.strip()]

    print(f"Processing {len(names)} universities...", file=sys.stderr)

    # Build title -> name mapping
    title_to_names = {}
    all_titles = []
    for name in names:
        t = overrides.get(name, wiki_title(name))
        title_to_names.setdefault(t, []).append(name)
        all_titles.append(t)

    # Deduplicate titles
    unique_titles = list(dict.fromkeys(all_titles))

    results = {}  # name -> image_url

    for i in range(0, len(unique_titles), 50):
        batch = unique_titles[i:i+50]
        print(f"  Batch {i//50 + 1}/{(len(unique_titles)+49)//50}: {len(batch)} titles...", file=sys.stderr)

        data = fetch_wiki_batch(batch)
        pages = data.get("query", {}).get("pages", {})

        # Build reverse maps for redirects and normalization
        redirect_map = {}
        for r in data.get("query", {}).get("redirects", []):
            redirect_map[r["to"]] = r["from"]
        norm_map = {}
        for n in data.get("query", {}).get("normalized", []):
            norm_map[n["to"]] = n["from"]

        for page_id, page in pages.items():
            if int(page_id) < 0:
                continue
            title = page.get("title", "")
            thumb = page.get("thumbnail", {}).get("source", "")
            if not thumb:
                continue

            # Upgrade to 200px
            thumb = re.sub(r'/\d+px-', '/200px-', thumb)

            # Try to match back to original title
            candidates = set()
            candidates.add(title.replace(" ", "_"))
            if title in redirect_map:
                candidates.add(redirect_map[title].replace(" ", "_"))
            if title in norm_map:
                candidates.add(norm_map[title])
            # Also try the title as-is with spaces
            candidates.add(title)

            for c in candidates:
                if c in title_to_names:
                    for name in title_to_names[c]:
                        results[name] = thumb

        time.sleep(0.3)

    # For titles that didn't match back, try direct lookup
    missing = [n for n in names if n not in results]
    if missing:
        print(f"\n  {len(missing)} still missing, trying individual lookups...", file=sys.stderr)
        for name in missing[:100]:  # Cap at 100 individual lookups
            t = overrides.get(name, wiki_title(name))
            data = fetch_wiki_batch([t])
            pages = data.get("query", {}).get("pages", {})
            for page_id, page in pages.items():
                if int(page_id) < 0:
                    continue
                thumb = page.get("thumbnail", {}).get("source", "")
                if thumb:
                    thumb = re.sub(r'/\d+px-', '/200px-', thumb)
                    results[name] = thumb
            time.sleep(0.2)

    # Output results as JSON
    output = {
        "found": len(results),
        "total": len(names),
        "missing": [n for n in names if n not in results],
        "logos": results,
    }
    print(json.dumps(output, indent=2))
    print(f"\nFound: {len(results)}/{len(names)} ({len(results)*100//len(names)}%)", file=sys.stderr)
    print(f"Missing: {len(names) - len(results)}", file=sys.stderr)

if __name__ == "__main__":
    main()
