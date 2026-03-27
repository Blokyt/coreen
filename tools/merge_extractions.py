"""Merge all extraction_NNN.json files into a single unified_data.json."""
import json
import os
import re

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "extraction_data")
CATEGORIES = [
    "vocabulary", "expressions", "grammar", "verbs", "phrases",
    "culture", "hangeul", "numbers", "connectors", "other"
]

def load_extractions():
    files = sorted(f for f in os.listdir(DATA_DIR) if re.match(r"extraction_\d{3}\.json", f))
    print(f"Found {len(files)} extraction files")
    all_data = {cat: [] for cat in CATEGORIES}
    all_meta = []
    for fname in files:
        path = os.path.join(DATA_DIR, fname)
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        all_meta.append(data.get("meta", {}))
        for cat in CATEGORIES:
            items = data.get(cat, [])
            if items:
                all_data[cat].extend(items)
    return all_data, all_meta

def dedup_vocabulary(items):
    seen = {}
    for item in items:
        key = item.get("korean", "").strip()
        if not key:
            continue
        if key in seen:
            existing = seen[key]
            # Keep the one with more fields filled
            new_score = sum(1 for v in item.values() if v)
            old_score = sum(1 for v in existing.values() if v)
            if new_score > old_score:
                seen[key] = item
        else:
            seen[key] = item
    return list(seen.values())

def dedup_grammar(items):
    seen = {}
    for item in items:
        key = item.get("title", "").strip().lower()
        if not key:
            continue
        if key in seen:
            existing = seen[key]
            # Merge examples
            existing_examples = existing.get("examples", [])
            new_examples = item.get("examples", [])
            existing_ex_set = {e.get("korean", "") for e in existing_examples}
            for ex in new_examples:
                if ex.get("korean", "") not in existing_ex_set:
                    existing_examples.append(ex)
            existing["examples"] = existing_examples
            # Merge rules
            existing_rules = existing.get("rules", [])
            new_rules = item.get("rules", [])
            existing_rule_set = set()
            for r in existing_rules:
                if isinstance(r, dict):
                    existing_rule_set.add(r.get("form", "") + r.get("context", ""))
                else:
                    existing_rule_set.add(str(r))
            for rule in new_rules:
                if isinstance(rule, dict):
                    key_r = rule.get("form", "") + rule.get("context", "")
                else:
                    key_r = str(rule)
                if key_r not in existing_rule_set:
                    existing_rules.append(rule)
            existing["rules"] = existing_rules
        else:
            seen[key] = item
    return list(seen.values())

def dedup_verbs(items):
    seen = {}
    for item in items:
        key = item.get("infinitive", "").strip()
        if not key:
            continue
        if key in seen:
            existing = seen[key]
            # Keep the one with more conjugation forms
            new_score = sum(1 for k in ["polite_present", "informal_present", "polite_past"] if item.get(k))
            old_score = sum(1 for k in ["polite_present", "informal_present", "polite_past"] if existing.get(k))
            if new_score > old_score:
                seen[key] = item
        else:
            seen[key] = item
    return list(seen.values())

def dedup_expressions(items):
    seen = {}
    for item in items:
        key = (item.get("polite_korean", "").strip(), item.get("french", "").strip())
        if not key[0] and not key[1]:
            continue
        if key not in seen:
            seen[key] = item
    return list(seen.values())

def dedup_phrases(items):
    seen = {}
    for item in items:
        key = item.get("korean", "").strip()
        if not key:
            continue
        if key not in seen:
            seen[key] = item
    return list(seen.values())

def dedup_hangeul(items):
    seen = {}
    for item in items:
        key = item.get("letter", "").strip()
        if not key:
            continue
        if key not in seen:
            seen[key] = item
    return list(seen.values())

def dedup_generic(items, key_field="korean"):
    seen = {}
    for item in items:
        key = item.get(key_field, "").strip()
        if not key:
            continue
        if key not in seen:
            seen[key] = item
    return list(seen.values())

def main():
    all_data, all_meta = load_extractions()

    # Print raw counts
    print("\n--- RAW counts (before dedup) ---")
    for cat in CATEGORIES:
        print(f"  {cat}: {len(all_data[cat])}")

    # Deduplicate
    all_data["vocabulary"] = dedup_vocabulary(all_data["vocabulary"])
    all_data["grammar"] = dedup_grammar(all_data["grammar"])
    all_data["verbs"] = dedup_verbs(all_data["verbs"])
    all_data["expressions"] = dedup_expressions(all_data["expressions"])
    all_data["phrases"] = dedup_phrases(all_data["phrases"])
    all_data["hangeul"] = dedup_hangeul(all_data["hangeul"])
    all_data["numbers"] = dedup_generic(all_data["numbers"])
    all_data["connectors"] = dedup_generic(all_data["connectors"])
    all_data["culture"] = dedup_generic(all_data["culture"], key_field="title")

    print("\n--- DEDUPED counts ---")
    total = 0
    for cat in CATEGORIES:
        count = len(all_data[cat])
        total += count
        print(f"  {cat}: {count}")
    print(f"  TOTAL: {total}")

    # Validate Korean text
    hangul_pattern = re.compile(r"[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]")
    missing_korean = 0
    for cat in ["vocabulary", "verbs", "phrases", "connectors"]:
        for item in all_data[cat]:
            korean_field = item.get("korean") or item.get("infinitive") or ""
            if korean_field and not hangul_pattern.search(korean_field):
                missing_korean += 1
    print(f"\n  Items missing Hangul characters: {missing_korean}")

    # Save
    output = {"meta_log": all_meta, **all_data}
    out_path = os.path.join(DATA_DIR, "unified_data.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    size_kb = os.path.getsize(out_path) / 1024
    print(f"\nSaved: {out_path} ({size_kb:.0f} KB)")

if __name__ == "__main__":
    main()
