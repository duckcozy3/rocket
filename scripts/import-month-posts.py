"""Incrementally import an authorized month from discovery metadata without replacing the archive.

Usage: python scripts/import-month-posts.py YYYY-MM path/to/metadata.json
Requires requests and beautifulsoup4, like import-source-posts.py.
"""
import concurrent.futures
import importlib.util
import json
import re
import sys
import unicodedata
from pathlib import Path

spec = importlib.util.spec_from_file_location("source_posts", Path(__file__).with_name("import-source-posts.py"))
source = importlib.util.module_from_spec(spec)
spec.loader.exec_module(source)


def main():
    if len(sys.argv) != 3 or not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", sys.argv[1]):
        raise SystemExit("Usage: python scripts/import-month-posts.py YYYY-MM metadata.json")
    month, metadata_path = sys.argv[1:]
    discovery = json.loads(Path(metadata_path).read_text(encoding="utf-8"))
    selected = [item for item in discovery["articles"] if item["published_at"].startswith(month + "-")]
    if not selected or len({item["slug"] for item in selected}) != len(selected):
        raise ValueError("Empty or duplicate discovery metadata")
    if any(not re.fullmatch(r"[a-z0-9-]{1,200}", item["slug"]) or item["source_url"] != f"{source.BASE}/bai-viet/{item['slug']}" for item in selected):
        raise ValueError("Unexpected source URL or slug")
    old_index = json.loads((source.OUTPUT / "index.json").read_text(encoding="utf-8"))
    previous_report = source.OUTPUT / "import-report.json"
    if previous_report.exists():
        known_missing = json.loads(previous_report.read_text(encoding="utf-8")).get("unavailable_source_images", [])
        source.missing_images[:] = sorted(set(source.missing_images + known_missing))
    print(f"Importing {len(selected)} articles for {month}; retaining {len(old_index)} existing entries", flush=True)
    listings = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for cards in pool.map(source.list_page, sorted({item["source_page"] for item in selected})):
            listings.update({item["slug"]: item for item in cards})
    metadata = []
    for item in selected:
        if item["slug"] not in listings:
            raise ValueError(f"Source listing changed: {item['slug']}")
        metadata.append({**listings[item["slug"]], "expected_date": item["published_at"]})

    def import_and_verify(item):
        post = source.import_post(item)
        if post["published_at"] != item["expected_date"] or not post["published_at"].startswith(month + "-"):
            raise ValueError(f"Article date differs from listing: {item['slug']}")
        if not post.get("content") or not post.get("content_blocks"):
            raise ValueError(f"Empty article: {item['slug']}")
        if not post.get("thumbnail") and post.get("cover"):
            post["thumbnail"] = post["cover"]
            (source.OUTPUT / (post["slug"] + ".json")).write_text(json.dumps(post, ensure_ascii=False), encoding="utf-8")
        return post

    imported = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for number, post in enumerate(pool.map(import_and_verify, metadata), 1):
            imported.append(post)
            if number % 25 == 0 or number == len(metadata):
                print(f"Imported and verified {number}/{len(metadata)}", flush=True)
    # Commit the index only after every requested article has been fetched and validated.
    merged = {post["slug"]: post for post in old_index}
    keys = ("slug", "title", "excerpt", "published_at", "category", "thumbnail", "source_url")
    for post in imported:
        entry = {key: post[key] for key in keys}
        if merged.get(post["slug"], {}).get("duplicate_of"):
            entry["duplicate_of"] = merged[post["slug"]]["duplicate_of"]
        merged[post["slug"]] = entry
    index = sorted(merged.values(), key=lambda post: post["published_at"], reverse=True)
    (source.OUTPUT / "index.json").write_text(json.dumps(index, ensure_ascii=False), encoding="utf-8")
    duplicate_file = source.OUTPUT / "duplicate-report.json"
    duplicates = json.loads(duplicate_file.read_text(encoding="utf-8"))
    groups, seen_slugs, seen_titles = {}, set(), set()
    visible = 0
    for post in index:
        title = re.sub(r"\s+", " ", unicodedata.normalize("NFKC", re.sub(r"locketgold\.app", "locketgold.info", post["title"], flags=re.I)).lower()).strip()
        groups.setdefault(title, []).append(post["slug"])
        slug = post.get("duplicate_of") or post["slug"]
        if slug not in seen_slugs and (not title or title not in seen_titles):
            seen_slugs.add(slug)
            seen_titles.add(title)
            visible += 1
    duplicates["source_duplicate_groups"] = [{"keep": slugs[0], "duplicates": slugs[1:]} for slugs in groups.values() if len(slugs) > 1]
    duplicates["source_duplicate_entries"] = sum(len(slugs) - 1 for slugs in groups.values())
    duplicates["visible_articles"] = visible
    duplicate_file.write_text(json.dumps(duplicates, ensure_ascii=False, indent=2), encoding="utf-8")
    report = {
        "source": source.BASE + "/bai-viet", "month": month,
        "discovered": len(selected), "imported": len(imported),
        "new_entries": len(index) - len(old_index), "archive_entries": len(index),
        "verified_dates": True, "articles": [{"slug": post["slug"], "published_at": post["published_at"], "source_url": post["source_url"], "source_page": post["source_page"]} for post in imported],
    }
    (source.OUTPUT / f"import-{month}-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "articles"}), flush=True)


if __name__ == "__main__":
    main()
