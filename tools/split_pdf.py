"""Split kaja_detailled.pdf into 20-page chunks for OCR extraction."""
import fitz
import os

SRC = os.path.join(os.path.dirname(__file__), "..", "kaja_detailled.pdf")
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "pdf_chunks")
CHUNK_SIZE = 20

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    doc = fitz.open(SRC)
    total = len(doc)
    print(f"Source: {total} pages, {os.path.getsize(SRC) / 1e6:.1f} MB")

    chunk_idx = 0
    for start in range(0, total, CHUNK_SIZE):
        chunk_idx += 1
        end = min(start + CHUNK_SIZE, total)
        out_path = os.path.join(OUT_DIR, f"kaja_{chunk_idx:03d}.pdf")

        chunk = fitz.open()
        chunk.insert_pdf(doc, from_page=start, to_page=end - 1)
        chunk.save(out_path, garbage=4, deflate=True)
        size_mb = os.path.getsize(out_path) / 1e6
        print(f"  kaja_{chunk_idx:03d}.pdf  pages {start+1:3d}-{end:3d}  ({size_mb:.1f} MB)")
        chunk.close()

    doc.close()
    print(f"\nDone: {chunk_idx} chunks in {OUT_DIR}")

if __name__ == "__main__":
    main()
