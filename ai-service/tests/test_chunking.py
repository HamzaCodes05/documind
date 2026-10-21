import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.chunking import chunk_text  # noqa: E402
from app.fusion import rrf_merge  # noqa: E402


def test_chunk_overlap_and_size():
    text = " ".join(f"w{i}" for i in range(500))
    chunks = chunk_text(text, size=100, overlap=20)
    assert len(chunks) >= 5
    assert all(len(c.split()) <= 100 for c in chunks)
    # consecutive chunks share the overlap window
    assert chunks[0].split()[-20:] == chunks[1].split()[:20]


def test_empty_text():
    assert chunk_text("   \n\n  ") == []


def test_rrf_prefers_items_in_both_rankings():
    scores = rrf_merge([[1, 2, 3], [3, 4, 1]])
    ranked = sorted(scores, key=scores.get, reverse=True)
    assert ranked[0] in (1, 3)
    assert set(ranked) == {1, 2, 3, 4}
