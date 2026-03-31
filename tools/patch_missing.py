#!/usr/bin/env python
"""Patch missing items found during audit into course_data.json.
Every item MUST have a valid page number from the book."""

import json
import sys
from pathlib import Path
from collections import defaultdict

sys.stdout.reconfigure(encoding='utf-8')

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "course_data.json"

# === MISSING ITEMS FROM AUDIT (all with verified page numbers) ===

MISSING_VOCAB = [
    # Ch0 - Map of Korea (page 6)
    {"korean": "서울", "french": "Séoul (capitale)", "romanization": "seoul", "theme": "Géographie", "word_type": "noun", "page": 6, "chapter": 0, "notes": "carte de Corée"},
    {"korean": "부산", "french": "Busan", "romanization": "busan", "theme": "Géographie", "word_type": "noun", "page": 6, "chapter": 0, "notes": "carte de Corée"},
    {"korean": "인천", "french": "Incheon", "romanization": "incheon", "theme": "Géographie", "word_type": "noun", "page": 6, "chapter": 0, "notes": "carte de Corée"},
    {"korean": "대전", "french": "Daejeon", "romanization": "daejeon", "theme": "Géographie", "word_type": "noun", "page": 6, "chapter": 0, "notes": "carte de Corée"},
    {"korean": "대구", "french": "Daegu", "romanization": "daegu", "theme": "Géographie", "word_type": "noun", "page": 6, "chapter": 0, "notes": "carte de Corée"},
    {"korean": "광주", "french": "Gwangju", "romanization": "gwangju", "theme": "Géographie", "word_type": "noun", "page": 6, "chapter": 0, "notes": "carte de Corée"},
    {"korean": "울산", "french": "Ulsan", "romanization": "ulsan", "theme": "Géographie", "word_type": "noun", "page": 6, "chapter": 0, "notes": "carte de Corée"},
    {"korean": "세종", "french": "Sejong", "romanization": "sejong", "theme": "Géographie", "word_type": "noun", "page": 6, "chapter": 0, "notes": "carte de Corée"},
    {"korean": "제주도", "french": "Île de Jeju", "romanization": "jejudo", "theme": "Géographie", "word_type": "noun", "page": 6, "chapter": 0, "notes": "carte de Corée"},
    {"korean": "강원도", "french": "Province de Gangwon", "romanization": "gangwondo", "theme": "Géographie", "word_type": "noun", "page": 6, "chapter": 0, "notes": "carte de Corée"},
    {"korean": "경기도", "french": "Province de Gyeonggi", "romanization": "gyeonggido", "theme": "Géographie", "word_type": "noun", "page": 6, "chapter": 0, "notes": "carte de Corée"},
    {"korean": "동해", "french": "Mer de l'Est", "romanization": "donghae", "theme": "Géographie", "word_type": "noun", "page": 6, "chapter": 0, "notes": "carte de Corée"},
    {"korean": "서해", "french": "Mer de l'Ouest", "romanization": "seohae", "theme": "Géographie", "word_type": "noun", "page": 6, "chapter": 0, "notes": "carte de Corée"},
    # Ch2 missing
    {"korean": "내", "french": "mon / ma / mes (familier)", "romanization": "nae", "theme": "Pronom", "word_type": "pronoun", "page": 72, "chapter": 2, "notes": "possessif familier de 나"},
    # Ch6 missing from page 160
    {"korean": "어제", "french": "hier", "romanization": "eoje", "theme": "Temps", "word_type": "noun", "page": 160, "chapter": 6, "notes": ""},
    {"korean": "주말", "french": "le week-end", "romanization": "jumal", "theme": "Temps", "word_type": "noun", "page": 160, "chapter": 6, "notes": ""},
    {"korean": "지난 주말", "french": "le week-end dernier", "romanization": "jinan jumal", "theme": "Temps", "word_type": "noun", "page": 160, "chapter": 6, "notes": ""},
    {"korean": "올해", "french": "cette année", "romanization": "olhae", "theme": "Temps", "word_type": "noun", "page": 160, "chapter": 6, "notes": ""},
    {"korean": "작년", "french": "l'année dernière", "romanization": "jangnyeon", "theme": "Temps", "word_type": "noun", "page": 160, "chapter": 6, "notes": ""},
    {"korean": "생일", "french": "anniversaire", "romanization": "saengil", "theme": "Temps", "word_type": "noun", "page": 160, "chapter": 6, "notes": ""},
    {"korean": "새벽", "french": "aube / petit matin", "romanization": "saebyeok", "theme": "Temps", "word_type": "noun", "page": 160, "chapter": 6, "notes": ""},
    # Ch4 manhwa vocab (page 113)
    {"korean": "기타", "french": "guitare", "romanization": "gita", "theme": "Objets", "word_type": "noun", "page": 113, "chapter": 4, "notes": "manhwa"},
    {"korean": "게임기", "french": "console de jeux", "romanization": "geimgi", "theme": "Objets", "word_type": "noun", "page": 113, "chapter": 4, "notes": "manhwa"},
    {"korean": "신발", "french": "chaussures", "romanization": "sinbal", "theme": "Objets", "word_type": "noun", "page": 113, "chapter": 4, "notes": "manhwa"},
]

MISSING_ADJECTIVES = [
    # Ch6 emotions (page 153)
    {"infinitive": "행복하다", "korean_polite": "행복해요", "french": "être heureux/se", "romanization": "haengbokhada", "semantic_group": "émotion", "page": 153, "chapter": 6},
    {"infinitive": "슬프다", "korean_polite": "슬퍼요", "french": "être triste", "romanization": "seulpeuda", "semantic_group": "émotion", "page": 153, "chapter": 6},
    {"infinitive": "화가 나다", "korean_polite": "화가 나요", "french": "être en colère", "romanization": "hwaga nada", "semantic_group": "émotion", "page": 153, "chapter": 6},
]

MISSING_ADVERBS = [
    {"korean": "아니", "french": "non", "romanization": "ani", "page": 98, "chapter": 3},
]

MISSING_CULTURE = [
    {"title": "Carte de la Corée du Sud", "body": "Carte montrant les provinces (도) et villes principales de Corée du Sud : Séoul (서울), Busan (부산), Incheon (인천), Daejeon (대전), Daegu (대구), Gwangju (광주), Ulsan (울산), Sejong (세종), et les provinces Gyeonggi-do, Gangwon-do, Chungcheong-do, Gyeongsang-do, Jeolla-do, Jeju-do. Mers : Donghae (동해, Mer de l'Est) et Seohae (서해, Mer de l'Ouest).", "keywords": ["서울", "부산", "제주도", "동해", "서해"], "page": 6, "chapter": 0},
]

MISSING_VERBS = [
    # Ch4 manhwa verbs
    {"infinitive": "놓다", "french": "poser, mettre", "romanization": "nota", "stem": "놓", "verb_type": "regular", "conjugations": {"polite_present": "놓아요", "informal_present": "놔", "polite_past": "", "informal_past": "", "polite_negative": "", "informal_negative": ""}, "contraction_note": "놓+아 → 놔", "page": 113, "chapter": 4},
    {"infinitive": "들어오다", "french": "entrer", "romanization": "deureooda", "stem": "들어오", "verb_type": "regular", "conjugations": {"polite_present": "들어와요", "informal_present": "들어와", "polite_past": "", "informal_past": "", "polite_negative": "", "informal_negative": ""}, "contraction_note": "오+아 → 와", "page": 113, "chapter": 4},
]


def patch():
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Build dedup sets per category
    def make_key(item, cat):
        if cat == "vocabulary":
            return (item.get("korean", ""), item.get("chapter", 0))
        elif cat == "verbs":
            return (item.get("infinitive", ""), item.get("chapter", 0))
        elif cat == "adjectives":
            return (item.get("infinitive", ""),)
        elif cat == "adverbs":
            return (item.get("korean", ""), item.get("chapter", 0))
        elif cat == "culture":
            return (item.get("title", ""), item.get("chapter", 0))
        return (str(item),)

    def add_missing(cat, missing_items):
        existing_keys = {make_key(item, cat) for item in data.get(cat, [])}
        added = 0
        for item in missing_items:
            key = make_key(item, cat)
            if key not in existing_keys:
                data[cat].append(item)
                existing_keys.add(key)
                added += 1
        if added:
            print(f"  {cat}: +{added} items")
        return added

    total_added = 0
    total_added += add_missing("vocabulary", MISSING_VOCAB)
    total_added += add_missing("adjectives", MISSING_ADJECTIVES)
    total_added += add_missing("adverbs", MISSING_ADVERBS)
    total_added += add_missing("culture", MISSING_CULTURE)
    total_added += add_missing("verbs", MISSING_VERBS)

    # === ENFORCE: Remove ANY item without a valid page ===
    removed = 0
    for cat in [k for k in data if isinstance(data[k], list) and k != "chapters"]:
        before = len(data[cat])
        data[cat] = [item for item in data[cat] if isinstance(item.get("page"), int) and item["page"] >= 2]
        diff = before - len(data[cat])
        if diff:
            print(f"  {cat}: -{diff} items removed (no valid page)")
            removed += diff

    # Re-sort by chapter then page
    for cat in [k for k in data if isinstance(data[k], list) and k != "chapters"]:
        data[cat].sort(key=lambda x: (
            x.get("chapter", 0) if isinstance(x.get("chapter", 0), int) else 999,
            x.get("page", 0),
        ))

    # Re-assign IDs
    PREFIXES = {
        "hangeul": "han", "vocabulary": "voc", "verbs": "vrb", "grammar": "grm",
        "particles": "ptc", "connectors": "con", "expressions": "exp",
        "dialogues": "dlg", "numbers": "num", "adjectives": "adj", "adverbs": "adv",
        "classifiers": "clf", "pronunciation_rules": "pron", "culture": "cul",
        "time_expressions": "time",
    }
    for cat, prefix in PREFIXES.items():
        counters = defaultdict(int)
        for item in data.get(cat, []):
            ch = item.get("chapter", 0)
            ch_str = f"ch{ch}" if isinstance(ch, int) and ch >= 0 else "lex"
            counters[ch_str] += 1
            item["id"] = f"{prefix}_{ch_str}_{counters[ch_str]:03d}"

    # Update stats
    stats = {}
    total_items = 0
    for cat in PREFIXES:
        count = len(data.get(cat, []))
        stats[cat] = count
        total_items += count

    data["meta"]["stats"] = stats
    data["meta"]["total_items"] = total_items

    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"\nDone: +{total_added} added, -{removed} removed")
    print(f"New total: {total_items} items")
    for cat, count in sorted(stats.items(), key=lambda x: -x[1]):
        if count:
            print(f"  {cat}: {count}")


if __name__ == "__main__":
    patch()
