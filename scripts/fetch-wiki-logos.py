#!/usr/bin/env python3
"""Fetch university logos from Wikipedia's pageimages API and update Supabase."""

import json
import re
import sys
import time
import urllib.request
import urllib.parse

SUPABASE_URL = "https://qfmiilxytmccuihbyvga.supabase.co"
# We'll use the SQL endpoint via the MCP tool instead - this script just generates the mapping

def wiki_title(name):
    """Convert university name to likely Wikipedia article title."""
    return name.replace(" ", "_")

def fetch_wiki_images(titles):
    """Fetch pageimages for up to 50 Wikipedia titles at once."""
    joined = "|".join(titles)
    url = (
        f"https://en.wikipedia.org/w/api.php?"
        f"action=query&titles={urllib.parse.quote(joined)}"
        f"&prop=pageimages&format=json&pithumbsize=200&redirects=1"
    )
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "ScholarPath/1.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
    except Exception as e:
        print(f"  ERROR fetching batch: {e}", file=sys.stderr)
        return {}

    results = {}
    pages = data.get("query", {}).get("pages", {})

    # Build redirect map
    redirects = {}
    for r in data.get("query", {}).get("redirects", []):
        redirects[r["to"]] = r["from"]
    normalized = {}
    for n in data.get("query", {}).get("normalized", []):
        normalized[n["to"]] = n["from"]

    for page_id, page in pages.items():
        title = page.get("title", "")
        thumb = page.get("thumbnail", {}).get("source", "")

        # Trace back to original title
        orig = title
        if title in redirects:
            orig = redirects[title]
        if orig in normalized:
            orig = normalized[orig]
        elif title in normalized:
            orig = normalized[title]

        if thumb:
            # Upgrade to 200px if smaller
            thumb = re.sub(r'/\d+px-', '/200px-', thumb)
            results[orig] = thumb
            results[title] = thumb

    return results

def main():
    # Read university names from stdin (one per line, tab-separated: name\twiki_title)
    universities = []
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        parts = line.split("\t")
        name = parts[0]
        wt = parts[1] if len(parts) > 1 else wiki_title(name)
        universities.append((name, wt))

    print(f"Processing {len(universities)} universities...", file=sys.stderr)

    # Process in batches of 50
    all_results = {}
    for i in range(0, len(universities), 50):
        batch = universities[i:i+50]
        titles = [wt for _, wt in batch]
        print(f"  Batch {i//50 + 1}: {len(batch)} titles...", file=sys.stderr)

        results = fetch_wiki_images(titles)

        for name, wt in batch:
            img = results.get(wt, results.get(wt.replace("_", " "), ""))
            if img:
                all_results[name] = img

        time.sleep(0.5)  # Be nice to Wikipedia

    # Output as JSON
    print(json.dumps(all_results, indent=2))

    found = len(all_results)
    total = len(universities)
    print(f"\nFound logos for {found}/{total} universities ({found*100//total}%)", file=sys.stderr)

if __name__ == "__main__":
    main()
