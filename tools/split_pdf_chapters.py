#!/usr/bin/env python
"""Split kaja_detailled.pdf into chapter-aligned chunks for AI extraction."""

import json
import sys
from pathlib import Path
from PyPDF2 import PdfReader, PdfWriter

PROJECT = Path(__file__).resolve().parent.parent
SOURCE_PDF = PROJECT / "kaja_detailled.pdf"
DISCOVERY_DIR = PROJECT / "extraction_data" / "discovery"
CHAPTERS_DIR = PROJECT / "extraction_data" / "chapters"
MAPPING_FILE = PROJECT / "extraction_data" / "pdf_to_book_mapping.json"
MANIFEST_FILE = PROJECT / "extraction_data" / "chunk_manifest.json"

CHAPTER_RANGES = {
    "ch0_part1": {"name": "Hangeul - Voyelles", "start": 7, "end": 17},
    "ch0_part2": {"name": "Hangeul - Consonnes", "start": 18, "end": 28},
    "ch0_part3": {"name": "Hangeul - Syllabes/Batchim", "start": 29, "end": 39},
    "ch0_part4": {"name": "Hangeul - Prononciation", "start": 40, "end": 51},
    "ch1": {"name": "Se présenter", "start": 52, "end": 71},
    "ch2": {"name": "Mon sac à dos", "start": 72, "end": 91},
    "ch3": {"name": "Aujourd'hui", "start": 92, "end": 111},
    "ch4": {"name": "Où est-ce ?", "start": 112, "end": 131},
    "ch5": {"name": "Bon appétit !", "start": 132, "end": 151},
    "ch6": {"name": "Chuseok", "start": 152, "end": 171},
    "lexique": {"name": "Lexique", "start": 172, "end": 999},
}


def discover():
    """Split PDF into 20-page batches for page number identification."""
    reader = PdfReader(str(SOURCE_PDF))
    total = len(reader.pages)
    batch_size = 20

    DISCOVERY_DIR.mkdir(parents=True, exist_ok=True)
    template = {}

    for start in range(0, total, batch_size):
        end = min(start + batch_size, total)
        filename = f"batch_{start:03d}_{end - 1:03d}.pdf"
        writer = PdfWriter()
        for i in range(start, end):
            writer.add_page(reader.pages[i])
        with open(DISCOVERY_DIR / filename, "wb") as f:
            writer.write(f)
        for i in range(start, end):
            template[str(i)] = None

    with open(DISCOVERY_DIR / "mapping_template.json", "w", encoding="utf-8") as f:
        json.dump(template, f, indent=2)

    batches = (total + batch_size - 1) // batch_size
    print(f"Created {batches} discovery batches ({total} pages) in {DISCOVERY_DIR}")
    print(f"Template: {DISCOVERY_DIR / 'mapping_template.json'}")
    return batches


def split():
    """Split PDF into chapter-aligned chunks using the page mapping."""
    if not MAPPING_FILE.exists():
        print(f"ERROR: {MAPPING_FILE} not found. Run --discover first, then fill the mapping.")
        sys.exit(1)

    with open(MAPPING_FILE, "r", encoding="utf-8") as f:
        raw_mapping = json.load(f)

    # Build reverse mapping: book_page -> list of pdf_page_indices
    book_to_pdf = {}
    for pdf_idx_str, book_page in raw_mapping.items():
        if book_page is None or book_page in ("cover", "blank", "duplicate", "skip"):
            continue
        book_page = int(book_page)
        book_to_pdf.setdefault(book_page, []).append(int(pdf_idx_str))

    reader = PdfReader(str(SOURCE_PDF))
    CHAPTERS_DIR.mkdir(parents=True, exist_ok=True)
    manifest = {"source": str(SOURCE_PDF), "total_pdf_pages": len(reader.pages), "chunks": []}

    for chunk_key, info in CHAPTER_RANGES.items():
        pdf_indices = []
        seen_pages = set()
        for book_page in range(info["start"], info["end"] + 1):
            if book_page in book_to_pdf:
                # Keep only the first (best) scan of each page
                best = book_to_pdf[book_page][0]
                if best not in seen_pages:
                    pdf_indices.append(best)
                    seen_pages.add(best)

        if not pdf_indices:
            print(f"WARNING: No pages for {chunk_key} ({info['name']}, pp {info['start']}-{info['end']})")
            continue

        pdf_indices.sort()
        filename = f"{chunk_key}.pdf"
        writer = PdfWriter()
        for idx in pdf_indices:
            writer.add_page(reader.pages[idx])
        with open(CHAPTERS_DIR / filename, "wb") as f:
            writer.write(f)

        size = (CHAPTERS_DIR / filename).stat().st_size
        manifest["chunks"].append({
            "filename": filename,
            "chapter_key": chunk_key,
            "name": info["name"],
            "book_pages": f"{info['start']}-{info['end']}",
            "pdf_page_indices": pdf_indices,
            "num_pages": len(pdf_indices),
            "size_mb": round(size / 1024 / 1024, 1),
        })
        print(f"  {filename}: {len(pdf_indices)} pages, {size / 1024 / 1024:.1f}MB")

    with open(MANIFEST_FILE, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    print(f"\nCreated {len(manifest['chunks'])} chapter chunks in {CHAPTERS_DIR}")
    print(f"Manifest: {MANIFEST_FILE}")


if __name__ == "__main__":
    if "--discover" in sys.argv:
        discover()
    elif "--split" in sys.argv:
        split()
    else:
        print("Usage:")
        print("  python tools/split_pdf_chapters.py --discover   # Step 1: create batches")
        print("  python tools/split_pdf_chapters.py --split      # Step 2: split by chapter")
