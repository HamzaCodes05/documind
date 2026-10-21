"""Word-window chunking with overlap. Splits on paragraphs first so chunks
rarely cut a thought in half."""
import re


def chunk_text(text: str, size: int = 220, overlap: int = 40) -> list[str]:
    if size <= overlap:
        raise ValueError("size must be greater than overlap")

    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    words: list[str] = []
    for p in paragraphs:
        words.extend(p.split())
        words.append("\n\n")  # paragraph marker, stripped below

    chunks: list[str] = []
    step = size - overlap
    i = 0
    while i < len(words):
        window = words[i : i + size]
        chunk = " ".join(window).replace(" \n\n ", "\n\n").replace(" \n\n", "").strip()
        if chunk:
            chunks.append(chunk)
        if i + size >= len(words):
            break
        i += step
    return chunks
