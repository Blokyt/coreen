#!/usr/bin/env python3
"""
Transforme extraction_data/unified_data.json en data.js
avec normalisation des thèmes, nettoyage des romanisations,
assignation des chapitres manquants, consolidation des verbes.
"""

import json
import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

# ── Paths ──────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
INPUT_PATH = os.path.join(PROJECT_DIR, "extraction_data", "unified_data.json")
OUTPUT_PATH = os.path.join(PROJECT_DIR, "data.js")

# ── 1. Theme normalisation mapping (~195 → ~25) ───────
THEME_RULES = [
    # (list of substrings to match case-insensitively, normalized name)
    (["ecole", "salle de classe", "lycée", "lycee", "matière", "matiere", "scolaire"], "École"),
    (["famille", "parasite"], "Famille"),
    (["pays", "nationalité", "nationalite", "continent"], "Pays"),
    (["objet"], "Objets"),
    (["chambre", "mobilier"], "Chambre"),
    (["ingredient", "légume", "legume", "fruit"], "Nourriture"),
    (["plat", "menu"], "Plats"),
    (["boisson"], "Boissons"),
    (["dessert"], "Desserts"),
    (["sport"], "Sports"),
    (["loisir", "activit"], "Loisirs"),
    (["transport"], "Transports"),
    (["quartier", "géograph", "geograph", "lieu", "ville", "province", "seoul"], "Lieux"),
    (["maison", "pièce", "piece"], "Maison"),
    (["temps", "semaine", "jour"], "Temps"),
    (["mois", "date", "nombre", "chiffre"], "Nombres"),
    (["couleur"], "Couleurs"),
    (["verbe"], "Verbes"),
    (["lexique"], "Lexique"),
    (["fête", "fete", "calendrier", "culture"], "Culture"),
    (["saison"], "Saisons"),
    (["consonn", "voyell", "batchim", "syllabe", "hangeul"], "Hangeul"),
    (["animal"], "Animaux"),
    (["vêtement", "vetement"], "Vêtements"),
    (["corps"], "Corps"),
    (["salut", "express", "présen", "presen"], "Expressions"),
    (["position", "direction", "préposi", "preposi"], "Position"),
]

def normalize_theme(raw_theme):
    """Map a raw theme string to a normalized theme name."""
    if not raw_theme:
        return "Divers"
    low = raw_theme.lower()
    for keywords, normalized in THEME_RULES:
        for kw in keywords:
            if kw.lower() in low:
                return normalized
    return "Divers"

# ── 2. Clean romanisation ──────────────────────────────
def clean_rom(val):
    """Remove '[auto] ' prefix from romanisation strings."""
    if not val:
        return val
    if isinstance(val, str) and val.startswith("[auto] "):
        return val[7:]
    return val

# ── 3. Assign missing chapters based on page ranges ───
PAGE_TO_CHAPTER = [
    (7, 51, 0),    # Hangeul
    (52, 69, 1),
    (72, 89, 2),
    (92, 109, 3),
    (112, 129, 4),
    (132, 149, 5),
    (152, 169, 6),
    (172, 9999, 0),  # Lexique at the end
]

def assign_chapter(page, current_chapter):
    """If chapter is 0 or None, try to infer from page number."""
    if current_chapter and current_chapter != 0:
        return current_chapter
    if not page:
        return 0
    for lo, hi, ch in PAGE_TO_CHAPTER:
        if lo <= page <= hi:
            return ch
    return 0

# ── Chapters definition ───────────────────────────────
CHAPTERS = [
    {"id": 0, "title_kr": "한글", "title_fr": "J'apprends le Hangeul", "color": "var(--hangeul)"},
    {"id": 1, "title_kr": "안녕, 나는 알리스야.", "title_fr": "Se présenter", "color": "var(--ch1)"},
    {"id": 2, "title_kr": "내 가방에...", "title_fr": "Mon sac à dos", "color": "var(--ch2)"},
    {"id": 3, "title_kr": "오늘 뭐 해?", "title_fr": "Aujourd'hui", "color": "var(--ch3)"},
    {"id": 4, "title_kr": "북촌이 어디예요?", "title_fr": "Où est-ce ?", "color": "var(--ch4)"},
    {"id": 5, "title_kr": "맛있게 먹어!", "title_fr": "Bon appétit !", "color": "var(--ch5)"},
    {"id": 6, "title_kr": "추석에 가족 집에 갔어!", "title_fr": "Chuseok", "color": "var(--ch6)"},
]


# ═══════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════
def main():
    # Load source data
    with open(INPUT_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    # ── Process vocabulary ─────────────────────────────
    vocab_items = []
    theme_mapping_log = {}  # raw -> normalized
    for item in data.get("vocabulary", []):
        raw_theme = item.get("theme", "")
        norm_theme = normalize_theme(raw_theme)
        theme_mapping_log[raw_theme] = norm_theme

        page = item.get("page")
        ch = assign_chapter(page, item.get("chapter"))

        vocab_items.append({
            "kr": item.get("korean", ""),
            "fr": item.get("french", ""),
            "rom": clean_rom(item.get("romanization", "")),
            "ch": ch,
            "theme": norm_theme,
        })

    # ── Process verbs ──────────────────────────────────
    verb_infinitives = set()
    verb_items = []
    for item in data.get("verbs", []):
        inf = item.get("infinitive", "")
        verb_infinitives.add(inf)

        page = item.get("page")
        ch = assign_chapter(page, item.get("chapter"))

        # Handle 'forms' field (some verbs use this instead of top-level fields)
        forms = item.get("forms", {})
        polite_present = item.get("polite_present", "") or forms.get("present_poli", "")
        informal_present = item.get("informal_present", "") or forms.get("present_familier", "")
        polite_past = item.get("polite_past", "") or forms.get("passe_poli", "")

        # Clean [auto] from forms too
        polite_present = clean_rom(polite_present) if polite_present and polite_present.startswith("[auto]") else polite_present
        informal_present = clean_rom(informal_present) if informal_present and informal_present.startswith("[auto]") else informal_present
        polite_past = clean_rom(polite_past) if polite_past and polite_past.startswith("[auto]") else polite_past

        verb_entry = {
            "inf": inf,
            "fr": item.get("french", ""),
            "poli": polite_present,
            "fam": informal_present,
            "passe": polite_past,
            "rom": clean_rom(item.get("romanization", "")),
            "ch": ch,
        }
        # Only include irreg if explicitly set
        if "irregular" in item:
            verb_entry["irreg"] = bool(item["irregular"])

        verb_items.append(verb_entry)

    # ── 4. Consolidate: vocab items with theme "Verbes" → add to verbs ──
    verbs_from_vocab = 0
    for v in vocab_items:
        if v["theme"] == "Verbes":
            kr = v["kr"]
            if kr and kr not in verb_infinitives:
                verb_infinitives.add(kr)
                verb_items.append({
                    "inf": kr,
                    "fr": v["fr"],
                    "poli": "",
                    "fam": "",
                    "passe": "",
                    "rom": v["rom"],
                    "ch": v["ch"],
                })
                verbs_from_vocab += 1

    # ── Process expressions ────────────────────────────
    expr_items = []
    for item in data.get("expressions", []):
        page = item.get("page")
        ch = assign_chapter(page, item.get("chapter"))
        expr_items.append({
            "fr": item.get("french", ""),
            "poli": item.get("polite_korean", ""),
            "rp": clean_rom(item.get("polite_romanization", "")),
            "inf": item.get("informal_korean", ""),
            "ri": clean_rom(item.get("informal_romanization", "")),
            "ch": ch,
        })

    # ── Process grammar ────────────────────────────────
    grammar_items = []
    for item in data.get("grammar", []):
        page = item.get("page")
        ch = assign_chapter(page, item.get("chapter"))

        examples = item.get("examples", [])
        # Shorten example keys
        short_examples = []
        for ex in examples:
            if isinstance(ex, dict):
                short_examples.append({
                    "kr": ex.get("korean", ex.get("kr", "")),
                    "fr": ex.get("french", ex.get("fr", "")),
                    "rom": clean_rom(ex.get("romanization", ex.get("rom", ""))),
                })
            elif isinstance(ex, str):
                short_examples.append(ex)

        grammar_items.append({
            "title": item.get("title", ""),
            "ch": ch,
            "expl": item.get("explanation", ""),
            "rules": item.get("rules", []),
            "ex": short_examples,
        })

    # ── Process phrases ────────────────────────────────
    phrase_items = []
    for item in data.get("phrases", []):
        page = item.get("page")
        ch = assign_chapter(page, item.get("chapter"))
        phrase_items.append({
            "kr": item.get("korean", ""),
            "fr": item.get("french", ""),
            "rom": clean_rom(item.get("romanization", "")),
            "ch": ch,
            "cat": item.get("category", ""),
        })

    # ── Process hangeul ────────────────────────────────
    hangeul_items = []
    for item in data.get("hangeul", []):
        hangeul_items.append({
            "type": item.get("type", ""),
            "l": item.get("letter", ""),
            "rom": clean_rom(item.get("romanization", "")),
            "desc": item.get("description", ""),
        })

    # ── Process numbers ────────────────────────────────
    number_items = []
    for item in data.get("numbers", []):
        number_items.append({
            "sys": item.get("system", ""),
            "kr": item.get("korean", ""),
            "val": item.get("value", ""),
            "rom": clean_rom(item.get("romanization", "")),
        })

    # ── Process connectors ─────────────────────────────
    connector_items = []
    for item in data.get("connectors", []):
        page = item.get("page")
        ch = assign_chapter(page, item.get("chapter"))
        connector_items.append({
            "kr": item.get("korean", ""),
            "fr": item.get("french", ""),
            "usage": item.get("usage", ""),
            "rom": clean_rom(item.get("romanization", "")),
            "ch": ch,
        })

    # ── Process particles ──────────────────────────────
    particle_items = []
    for item in data.get("particles", []):
        page = item.get("page")
        ch = assign_chapter(page, item.get("chapter"))

        examples = item.get("examples", [])
        short_examples = []
        for ex in examples:
            if isinstance(ex, dict):
                short_examples.append({
                    "kr": ex.get("korean", ex.get("kr", "")),
                    "fr": ex.get("french", ex.get("fr", "")),
                    "rom": clean_rom(ex.get("romanization", ex.get("rom", ""))),
                })
            elif isinstance(ex, str):
                short_examples.append(ex)

        particle_items.append({
            "p": item.get("particle", ""),
            "name": item.get("name_fr", ""),
            "fn": item.get("function", ""),
            "rule": item.get("rule", ""),
            "av": item.get("after_vowel", ""),
            "ac": item.get("after_consonant", ""),
            "ch": ch,
            "ex": short_examples,
        })

    # ── Process adjectives ─────────────────────────────
    adj_items = []
    for item in data.get("adjectives", []):
        page = item.get("page")
        ch = assign_chapter(page, item.get("chapter"))
        adj_items.append({
            "kr": item.get("korean", ""),
            "fr": item.get("french", ""),
            "rom": clean_rom(item.get("romanization", "")),
            "ch": ch,
        })

    # ── Process adverbs ────────────────────────────────
    adv_items = []
    for item in data.get("adverbs", []):
        page = item.get("page")
        ch = assign_chapter(page, item.get("chapter"))
        adv_items.append({
            "kr": item.get("korean", ""),
            "fr": item.get("french", ""),
            "rom": clean_rom(item.get("romanization", "")),
            "ch": ch,
        })

    # ── Process culture ────────────────────────────────
    culture_items = []
    for item in data.get("culture", []):
        page = item.get("page")
        ch = assign_chapter(page, item.get("chapter"))
        culture_items.append({
            "title": item.get("title", ""),
            "body": item.get("body", ""),
            "kw": item.get("keywords", []),
            "ch": ch,
        })

    # ═══════════════════════════════════════════════════
    #  Generate data.js
    # ═══════════════════════════════════════════════════

    def js_val(val, indent=2):
        """Convert a Python value to a JS literal string."""
        if val is None:
            return "null"
        if isinstance(val, bool):
            return "true" if val else "false"
        if isinstance(val, (int, float)):
            return str(val)
        if isinstance(val, str):
            # Escape backslashes, quotes, and newlines
            escaped = val.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n").replace("\r", "")
            return f'"{escaped}"'
        if isinstance(val, list):
            if len(val) == 0:
                return "[]"
            items = [js_val(v, indent + 2) for v in val]
            # For short arrays of primitives, keep inline
            joined = ", ".join(items)
            if len(joined) < 80 and all(isinstance(v, (str, int, float, bool)) for v in val):
                return f"[{joined}]"
            pad = " " * indent
            inner_pad = " " * (indent + 2)
            return "[\n" + ",\n".join(f"{inner_pad}{i}" for i in items) + f"\n{pad}]"
        if isinstance(val, dict):
            if len(val) == 0:
                return "{}"
            parts = []
            for k, v in val.items():
                js_k = k if re.match(r'^[a-zA-Z_$][a-zA-Z0-9_$]*$', k) else js_val(k)
                parts.append(f"{js_k}:{js_val(v, indent + 2)}")
            joined = ", ".join(parts)
            if len(joined) < 120:
                return "{" + joined + "}"
            pad = " " * indent
            inner_pad = " " * (indent + 2)
            return "{\n" + ",\n".join(f"{inner_pad}{p}" for p in parts) + f"\n{pad}}}"
        return str(val)

    def js_array(arr, indent=2):
        """Render an array of objects, one object per line for compactness."""
        if not arr:
            return "[]"
        lines = []
        for obj in arr:
            # Filter out empty string values to save space
            filtered = {}
            for k, v in obj.items():
                if v == "" or v is None:
                    continue
                if isinstance(v, list) and len(v) == 0:
                    continue
                filtered[k] = v
            lines.append(" " * indent + js_val(filtered, indent))
        return "[\n" + ",\n".join(lines) + "\n  ]"

    # Build the JS file
    js_parts = []
    js_parts.append("// ═══════════════════════════════════════════════════")
    js_parts.append("// DATA - Generated from extraction_data/unified_data.json")
    js_parts.append("// by tools/generate_data.py")
    js_parts.append("// ═══════════════════════════════════════════════════")
    js_parts.append("const DATA = {")

    # chapters
    js_parts.append(f"  chapters: {js_array(CHAPTERS, 4)},")
    js_parts.append("")

    # vocabulary
    js_parts.append(f"  vocabulary: {js_array(vocab_items, 4)},")
    js_parts.append("")

    # verbs
    js_parts.append(f"  verbs: {js_array(verb_items, 4)},")
    js_parts.append("")

    # expressions
    js_parts.append(f"  expressions: {js_array(expr_items, 4)},")
    js_parts.append("")

    # grammar
    js_parts.append(f"  grammar: {js_array(grammar_items, 4)},")
    js_parts.append("")

    # phrases
    js_parts.append(f"  phrases: {js_array(phrase_items, 4)},")
    js_parts.append("")

    # hangeul
    js_parts.append(f"  hangeul: {js_array(hangeul_items, 4)},")
    js_parts.append("")

    # numbers
    js_parts.append(f"  numbers: {js_array(number_items, 4)},")
    js_parts.append("")

    # connectors
    js_parts.append(f"  connectors: {js_array(connector_items, 4)},")
    js_parts.append("")

    # particles
    js_parts.append(f"  particles: {js_array(particle_items, 4)},")
    js_parts.append("")

    # adjectives
    js_parts.append(f"  adjectives: {js_array(adj_items, 4)},")
    js_parts.append("")

    # adverbs
    js_parts.append(f"  adverbs: {js_array(adv_items, 4)},")
    js_parts.append("")

    # culture
    js_parts.append(f"  culture: {js_array(culture_items, 4)},")

    js_parts.append("};")

    output = "\n".join(js_parts) + "\n"

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        f.write(output)

    # ═══════════════════════════════════════════════════
    #  6. Stats
    # ═══════════════════════════════════════════════════
    # Theme stats
    theme_counts = {}
    for v in vocab_items:
        t = v["theme"]
        theme_counts[t] = theme_counts.get(t, 0) + 1

    unique_raw_themes = len(theme_mapping_log)
    unique_norm_themes = len(set(theme_mapping_log.values()))

    print("=" * 60)
    print("  GENERATE DATA.JS - STATS")
    print("=" * 60)
    print()
    print(f"  Source: {INPUT_PATH}")
    print(f"  Output: {OUTPUT_PATH}")
    print(f"  Output size: {len(output):,} chars")
    print()
    print("  ── Sections ──────────────────────────────────")
    print(f"  Vocabulary:   {len(vocab_items):>5} items")
    print(f"  Verbs:        {len(verb_items):>5} items  ({verbs_from_vocab} added from vocab)")
    print(f"  Expressions:  {len(expr_items):>5} items")
    print(f"  Grammar:      {len(grammar_items):>5} items")
    print(f"  Phrases:      {len(phrase_items):>5} items")
    print(f"  Hangeul:      {len(hangeul_items):>5} items")
    print(f"  Numbers:      {len(number_items):>5} items")
    print(f"  Connectors:   {len(connector_items):>5} items")
    print(f"  Particles:    {len(particle_items):>5} items")
    print(f"  Adjectives:   {len(adj_items):>5} items")
    print(f"  Adverbs:      {len(adv_items):>5} items")
    print(f"  Culture:      {len(culture_items):>5} items")
    total = (len(vocab_items) + len(verb_items) + len(expr_items) +
             len(grammar_items) + len(phrase_items) + len(hangeul_items) +
             len(number_items) + len(connector_items) + len(particle_items) +
             len(adj_items) + len(adv_items) + len(culture_items))
    print(f"  {'─'*45}")
    print(f"  TOTAL:        {total:>5} items")
    print()
    print(f"  ── Theme normalisation ───────────────────────")
    print(f"  Raw themes:        {unique_raw_themes:>3}")
    print(f"  Normalized themes: {unique_norm_themes:>3}")
    print()
    print(f"  Theme breakdown (vocabulary):")
    for theme, count in sorted(theme_counts.items(), key=lambda x: -x[1]):
        print(f"    {theme:<20} {count:>4}")

    # Chapter distribution
    print()
    print(f"  ── Chapter distribution (vocabulary) ─────────")
    ch_counts = {}
    for v in vocab_items:
        c = v["ch"]
        ch_counts[c] = ch_counts.get(c, 0) + 1
    for ch_id in sorted(ch_counts.keys()):
        print(f"    Ch {ch_id}: {ch_counts[ch_id]:>4} items")

    print()
    print("  Done!")
    print("=" * 60)


if __name__ == "__main__":
    main()
