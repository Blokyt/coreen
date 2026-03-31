#!/usr/bin/env python
"""Merge all raw chapter extractions into a single unified course_data.json."""

import json
import os
from pathlib import Path
from collections import defaultdict

PROJECT = Path(__file__).resolve().parent.parent
RAW_DIR = PROJECT / "extraction_data" / "raw"
OUTPUT = PROJECT / "data" / "course_data.json"

# Category prefixes for stable IDs
PREFIXES = {
    "hangeul": "han", "vocabulary": "voc", "verbs": "vrb", "grammar": "grm",
    "particles": "ptc", "connectors": "con", "expressions": "exp",
    "dialogues": "dlg", "numbers": "num", "adjectives": "adj", "adverbs": "adv",
    "classifiers": "clf", "pronunciation_rules": "pron", "culture": "cul",
    "time_expressions": "time",
}

CHAPTERS_META = [
    {"number": 0, "title_fr": "J'apprends le Hangeul", "title_ko": "한글", "pages": "7-51",
     "topics": ["voyelles", "consonnes", "syllabes", "batchim", "prononciation", "premiers mots"]},
    {"number": 1, "title_fr": "Se présenter", "title_ko": "만나서 반가워!", "pages": "52-71",
     "topics": ["identité", "nationalités", "이다/아니다", "은/는", "이/가", "politesse"]},
    {"number": 2, "title_fr": "Mon sac à dos", "title_ko": "내 가방에...", "pages": "72-91",
     "topics": ["objets", "있다/없다", "에", "도", "possessifs"]},
    {"number": 3, "title_fr": "Aujourd'hui", "title_ko": "오늘 뭐 해?", "pages": "92-111",
     "topics": ["activités", "présent 아요/어요/해요", "하다", "안", "을/를", "에서", "하고"]},
    {"number": 4, "title_fr": "Où est-ce ?", "title_ko": "어디에 있어?", "pages": "112-131",
     "topics": ["lieux", "directions", "으로/로", "에서...까지", "이/그/저", "위/아래/옆/앞/뒤"]},
    {"number": 5, "title_fr": "Bon appétit !", "title_ko": "맛있게 먹어!", "pages": "132-151",
     "topics": ["nourriture", "goûts", "-고 싶다", "classificateurs", "으로/로", "saveurs"]},
    {"number": 6, "title_fr": "Chuseok", "title_ko": "추석에 가족 집에 갔어!", "pages": "152-171",
     "topics": ["passé 았/었/했", "nombres", "heure", "date", "fêtes", "sports"]},
]

ALL_CATEGORIES = list(PREFIXES.keys())


def dedup_key(item, category):
    """Generate a deduplication key for an item."""
    if category == "hangeul":
        return (item.get("letter", ""), item.get("type", ""))
    elif category == "verbs":
        return (item.get("infinitive", ""), item.get("chapter", 0))
    elif category == "grammar":
        return (item.get("title", ""), item.get("chapter", 0))
    elif category == "particles":
        return (item.get("particle", ""), item.get("chapter", 0))
    elif category == "dialogues":
        return (item.get("title_fr", ""), item.get("chapter", 0))
    elif category == "culture":
        return (item.get("title", ""), item.get("chapter", 0))
    elif category == "pronunciation_rules":
        return (item.get("title", ""), item.get("chapter", 0))
    elif category == "numbers":
        return (item.get("korean", ""), item.get("system", ""))
    elif category == "classifiers":
        return (item.get("korean", ""),)
    elif category == "expressions":
        french = item.get("french", "")
        polite = item.get("polite", {})
        if isinstance(polite, dict):
            korean = polite.get("korean", "")
        else:
            korean = ""
        informal = item.get("informal", {})
        if isinstance(informal, dict):
            korean2 = informal.get("korean", "")
        else:
            korean2 = ""
        return (french, korean or korean2)
    else:
        return (item.get("korean", ""), item.get("chapter", 0))


def get_chapter(item, file_chapter):
    """Determine item chapter, defaulting to file chapter."""
    ch = item.get("chapter", file_chapter)
    if ch == "lexique":
        return -1  # Special handling
    try:
        return int(ch)
    except (ValueError, TypeError):
        return int(file_chapter) if file_chapter != "lexique" else -1


def merge():
    """Main merge logic."""
    merged = {cat: [] for cat in ALL_CATEGORIES}
    seen = {cat: set() for cat in ALL_CATEGORIES}

    # Load all raw files
    raw_files = sorted(RAW_DIR.glob("*_extracted.json"))
    print(f"Found {len(raw_files)} raw extraction files")

    for raw_file in raw_files:
        with open(raw_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        file_chapter = data.get("chapter", 0)
        print(f"\n  Processing {raw_file.name} (chapter {file_chapter})...")

        for category in ALL_CATEGORIES:
            items = data.get(category, [])
            if not isinstance(items, list):
                continue

            added = 0
            for item in items:
                # Normalize chapter
                if "chapter" not in item:
                    item["chapter"] = get_chapter(item, file_chapter)
                else:
                    item["chapter"] = get_chapter(item, file_chapter)

                # Dedup
                key = dedup_key(item, category)
                if key in seen[category]:
                    continue
                seen[category].add(key)

                merged[category].append(item)
                added += 1

            if added > 0:
                print(f"    {category}: +{added} items")

    # Sort each category by chapter then page
    for category in ALL_CATEGORIES:
        merged[category].sort(key=lambda x: (
            x.get("chapter", 0) if isinstance(x.get("chapter", 0), int) else 999,
            x.get("page", 0) if isinstance(x.get("page", 0), int) else 0,
        ))

    # Assign stable IDs
    id_counters = defaultdict(lambda: defaultdict(int))
    for category in ALL_CATEGORIES:
        prefix = PREFIXES[category]
        for item in merged[category]:
            ch = item.get("chapter", 0)
            ch_str = f"ch{ch}" if isinstance(ch, int) and ch >= 0 else "lex"
            id_counters[category][ch_str] += 1
            seq = id_counters[category][ch_str]
            item["id"] = f"{prefix}_{ch_str}_{seq:03d}"

    # Build stats
    stats = {cat: len(items) for cat, items in merged.items()}
    total = sum(stats.values())

    # Build final structure
    output = {
        "meta": {
            "version": "1.0.0",
            "source": "Kaja Hanguk - Belin A1",
            "extracted": "2026-03-31",
            "total_items": total,
            "stats": stats,
        },
        "chapters": CHAPTERS_META,
    }
    output.update(merged)

    # Write output
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\n{'='*50}")
    print(f"MERGE COMPLETE: {OUTPUT}")
    print(f"Total items: {total}")
    for cat, count in sorted(stats.items(), key=lambda x: -x[1]):
        if count > 0:
            print(f"  {cat}: {count}")


if __name__ == "__main__":
    merge()
