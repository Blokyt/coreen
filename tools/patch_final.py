#!/usr/bin/env python
"""Final patch: integrate all missing items from the audit pass."""

import json
import sys
from pathlib import Path
from collections import defaultdict

sys.stdout.reconfigure(encoding='utf-8')

PROJECT = Path(__file__).resolve().parent.parent
DATA_PATH = PROJECT / "data" / "course_data.json"
RAW = PROJECT / "extraction_data" / "raw"

PREFIXES = {
    "hangeul": "han", "vocabulary": "voc", "verbs": "vrb", "grammar": "grm",
    "particles": "ptc", "connectors": "con", "expressions": "exp",
    "dialogues": "dlg", "numbers": "num", "adjectives": "adj", "adverbs": "adv",
    "classifiers": "clf", "pronunciation_rules": "pron", "culture": "cul",
    "time_expressions": "time",
}

ALL_CATEGORIES = list(PREFIXES.keys())


def dedup_key(item, cat):
    if cat == "hangeul": return (item.get("letter", ""), item.get("type", ""))
    if cat == "verbs": return (item.get("infinitive", ""),)
    if cat == "grammar": return (item.get("title", ""), item.get("chapter", 0))
    if cat == "particles": return (item.get("particle", ""), item.get("chapter", 0))
    if cat == "dialogues": return (item.get("title_fr", ""), item.get("chapter", 0))
    if cat == "culture": return (item.get("title", ""), item.get("chapter", 0))
    if cat == "pronunciation_rules": return (item.get("title", ""), item.get("chapter", 0))
    if cat == "numbers": return (item.get("korean", ""), item.get("system", ""))
    if cat == "classifiers": return (item.get("korean", ""),)
    if cat == "expressions":
        fr = item.get("french", "")
        pol = item.get("polite", {})
        inf = item.get("informal", {})
        kr = (pol.get("korean", "") if isinstance(pol, dict) else "") or (inf.get("korean", "") if isinstance(inf, dict) else "")
        return (fr, kr)
    return (item.get("korean", ""), item.get("chapter", 0))


def load_patch(filename):
    path = RAW / filename
    if not path.exists():
        print(f"  SKIP: {filename} not found")
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def add_items(data, seen, cat, items, source):
    added = 0
    for item in items:
        if not isinstance(item.get("page"), int) or item["page"] < 2:
            continue  # ENFORCE: no item without valid page
        key = dedup_key(item, cat)
        if key not in seen[cat]:
            seen[cat].add(key)
            data[cat].append(item)
            added += 1
    if added:
        print(f"  {source} → {cat}: +{added}")
    return added


def main():
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Build dedup sets from existing data
    seen = {cat: set() for cat in ALL_CATEGORIES}
    for cat in ALL_CATEGORIES:
        for item in data.get(cat, []):
            seen[cat].add(dedup_key(item, cat))

    total_added = 0

    # === 1. Ch2 pages 80-82 ===
    print("\n--- Ch2 pages 80-82 ---")
    d = load_patch("ch2_pages80_89.json")
    if d:
        for cat in ALL_CATEGORIES:
            items = d.get(cat, [])
            if items:
                for item in items:
                    if "chapter" not in item: item["chapter"] = 2
                total_added += add_items(data, seen, cat, items, "ch2_p80-82")

    # === 2. Ch2 pages 83-89 ===
    print("\n--- Ch2 pages 83-89 ---")
    d = load_patch("ch2_pages83_89.json")
    if d:
        for cat in ALL_CATEGORIES:
            items = d.get(cat, [])
            if items:
                for item in items:
                    if "chapter" not in item: item["chapter"] = 2
                total_added += add_items(data, seen, cat, items, "ch2_p83-89")

    # === 3. Ch3/Ch4 missing pages ===
    print("\n--- Ch3/Ch4 missing pages ---")
    d = load_patch("ch3_ch4_missing_pages.json")
    if d:
        for ch_key in ["ch3_new", "ch4_new"]:
            ch_data = d.get(ch_key, {})
            ch_num = 3 if "ch3" in ch_key else 4
            for cat in ALL_CATEGORIES:
                items = ch_data.get(cat, [])
                if items:
                    for item in items:
                        if "chapter" not in item: item["chapter"] = ch_num
                    total_added += add_items(data, seen, cat, items, ch_key)

    # === 4. Lexique orphans → add to vocabulary with proper chapter ===
    print("\n--- Lexique orphans ---")
    d = load_patch("lexique_orphans.json")
    if d:
        orphans = d.get("orphans", [])
        # These are words only in the glossary. Keep them with chapter=-1 (lexique).
        # They already exist in vocabulary as chapter=-1 items, so nothing to add.
        # But let's verify and report.
        orphan_koreans = {o["korean"] for o in orphans}
        existing_lex = {item["korean"] for item in data["vocabulary"] if item.get("chapter") == -1}
        truly_missing = orphan_koreans - existing_lex
        if truly_missing:
            print(f"  {len(truly_missing)} orphans truly missing from lexique vocab")
            for kr in truly_missing:
                orphan = next(o for o in orphans if o["korean"] == kr)
                item = {
                    "korean": orphan["korean"],
                    "french": orphan.get("french", ""),
                    "romanization": orphan.get("romanization", ""),
                    "theme": orphan.get("theme", ""),
                    "word_type": orphan.get("word_type", "noun"),
                    "page": orphan.get("page", 175),
                    "chapter": -1,
                    "notes": "glossaire uniquement",
                }
                if isinstance(item["page"], int) and item["page"] >= 2:
                    data["vocabulary"].append(item)
                    total_added += 1
        else:
            print("  All orphans already in vocabulary (ch=-1)")

    # === ENFORCE: Remove items without valid page ===
    removed = 0
    for cat in ALL_CATEGORIES:
        before = len(data[cat])
        data[cat] = [item for item in data[cat] if isinstance(item.get("page"), int) and item["page"] >= 2]
        diff = before - len(data[cat])
        if diff:
            print(f"  REMOVED {diff} items from {cat} (no valid page)")
            removed += diff

    # === Re-sort ===
    for cat in ALL_CATEGORIES:
        data[cat].sort(key=lambda x: (
            x.get("chapter", 0) if isinstance(x.get("chapter", 0), int) else 999,
            x.get("page", 0),
        ))

    # === Re-assign IDs ===
    for cat, prefix in PREFIXES.items():
        counters = defaultdict(int)
        for item in data.get(cat, []):
            ch = item.get("chapter", 0)
            ch_str = f"ch{ch}" if isinstance(ch, int) and ch >= 0 else "lex"
            counters[ch_str] += 1
            item["id"] = f"{prefix}_{ch_str}_{counters[ch_str]:03d}"

    # === Update stats ===
    stats = {}
    total_items = 0
    for cat in ALL_CATEGORIES:
        count = len(data.get(cat, []))
        stats[cat] = count
        total_items += count
    data["meta"]["stats"] = stats
    data["meta"]["total_items"] = total_items

    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"\n{'='*50}")
    print(f"PATCH COMPLETE: +{total_added} added, -{removed} removed")
    print(f"NEW TOTAL: {total_items} items")
    for cat, count in sorted(stats.items(), key=lambda x: -x[1]):
        if count:
            print(f"  {cat}: {count}")


if __name__ == "__main__":
    main()
