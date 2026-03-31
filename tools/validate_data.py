#!/usr/bin/env python
"""Validate course_data.json integrity."""

import json
import sys
from pathlib import Path
from collections import Counter

sys.stdout.reconfigure(encoding='utf-8')

DATA = Path(__file__).resolve().parent.parent / "data" / "course_data.json"

def validate():
    with open(DATA, "r", encoding="utf-8") as f:
        data = json.load(f)

    errors = []
    warnings = []

    # 1. Check all IDs are unique
    all_ids = []
    categories = [k for k in data if isinstance(data[k], list) and k != "chapters"]
    for cat in categories:
        for item in data[cat]:
            if "id" in item:
                all_ids.append(item["id"])

    id_counts = Counter(all_ids)
    dupes = {k: v for k, v in id_counts.items() if v > 1}
    if dupes:
        errors.append(f"Duplicate IDs: {dupes}")
    else:
        print(f"✓ All {len(all_ids)} IDs are unique")

    # 2. Check page coverage (book pages 7-171)
    all_pages = set()
    for cat in categories:
        for item in data[cat]:
            page = item.get("page", 0)
            if isinstance(page, int) and page > 0:
                all_pages.add(page)

    expected = set(range(7, 172))
    missing = expected - all_pages
    if missing:
        warnings.append(f"Missing page coverage ({len(missing)} pages): {sorted(missing)[:20]}{'...' if len(missing)>20 else ''}")
    else:
        print(f"✓ Full page coverage (pages 7-171)")

    covered_pct = (len(expected) - len(missing)) / len(expected) * 100
    print(f"  Page coverage: {covered_pct:.0f}% ({len(expected) - len(missing)}/{len(expected)} pages)")

    # 3. Check chapter distribution
    chapter_counts = Counter()
    for cat in categories:
        for item in data[cat]:
            ch = item.get("chapter", "?")
            chapter_counts[ch] += 1

    print(f"\n  Chapter distribution:")
    for ch in sorted(chapter_counts.keys(), key=lambda x: (isinstance(x, str), x)):
        print(f"    Ch {ch}: {chapter_counts[ch]} items")

    # 4. Check required fields per category
    required = {
        "vocabulary": ["korean", "french"],
        "verbs": ["infinitive", "french"],
        "grammar": ["title", "explanation"],
        "particles": ["particle", "function_fr"],
        "hangeul": ["letter", "type"],
        "expressions": ["french"],
        "culture": ["title", "body"],
        "numbers": ["korean", "system"],
        "pronunciation_rules": ["title", "explanation_fr"],
        "time_expressions": ["korean", "french"],
        "classifiers": ["korean", "french"],
        "connectors": ["korean", "french"],
        "dialogues": ["title_fr", "lines"],
        "adjectives": ["french"],
        "adverbs": ["korean", "french"],
    }

    for cat, fields in required.items():
        items = data.get(cat, [])
        for i, item in enumerate(items):
            for field in fields:
                val = item.get(field)
                if val is None or val == "":
                    warnings.append(f"{cat}[{i}] ({item.get('id','?')}): empty required field '{field}'")

    # 5. Stats summary
    stats = data.get("meta", {}).get("stats", {})
    total = data.get("meta", {}).get("total_items", 0)
    print(f"\n  Total items: {total}")

    # 6. Check for Korean text in vocabulary
    no_korean = 0
    for item in data.get("vocabulary", []):
        if not item.get("korean"):
            no_korean += 1
    if no_korean:
        warnings.append(f"{no_korean} vocabulary items have no Korean text")

    # Results
    print(f"\n{'='*40}")
    print(f"ERRORS: {len(errors)}")
    for e in errors:
        print(f"  ✗ {e}")
    print(f"WARNINGS: {len(warnings)}")
    for w in warnings[:30]:
        print(f"  ⚠ {w}")
    if len(warnings) > 30:
        print(f"  ... and {len(warnings)-30} more")

    return len(errors)

if __name__ == "__main__":
    exit(validate())
