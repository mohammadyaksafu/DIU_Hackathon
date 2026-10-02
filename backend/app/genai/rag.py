"""Retrieval over SOP documents (knowledge/sop/*.md).

BM25 lexical retrieval: no model download, deterministic, works for English and Bangla
tokens, and fast enough for a few hundred chunks. The `Retriever` interface lets a
vector store (FAISS/Chroma + multilingual embeddings) replace it without touching callers.
"""
from __future__ import annotations

import math
import re
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

_TOKEN = re.compile(r"\w+", re.UNICODE)
_STOP = {"the", "a", "an", "of", "to", "and", "or", "in", "on", "for", "is", "are", "be", "with", "by", "if", "it", "this", "that", "as", "at"}


def tokenize(text: str) -> list[str]:
    return [t for t in _TOKEN.findall(text.lower()) if t not in _STOP and len(t) > 1]


@dataclass
class Chunk:
    id: str
    doc: str
    title: str
    text: str


class BM25Retriever:
    def __init__(self, sop_dir: Path, k1: float = 1.4, b: float = 0.75) -> None:
        self.k1, self.b = k1, b
        self.chunks: list[Chunk] = []
        for path in sorted(Path(sop_dir).glob("*.md")):
            self._index_doc(path)
        self.tfs = [Counter(tokenize(c.title + " " + c.text)) for c in self.chunks]
        self.lens = [sum(tf.values()) for tf in self.tfs]
        self.avg = (sum(self.lens) / len(self.lens)) if self.lens else 1.0
        df: Counter = Counter()
        for tf in self.tfs:
            df.update(tf.keys())
        n = len(self.chunks)
        self.idf = {t: math.log(1 + (n - d + 0.5) / (d + 0.5)) for t, d in df.items()}

    def _index_doc(self, path: Path) -> None:
        text = path.read_text(encoding="utf-8")
        doc_id = path.stem.split("_")[0].upper()  # e.g. SOP-01
        doc_title = text.splitlines()[0].lstrip("# ").strip() if text else path.stem
        sections = re.split(r"\n(?=## )", text)
        for i, sec in enumerate(sections):
            lines = sec.strip().splitlines()
            if not lines:
                continue
            heading = lines[0].lstrip("# ").strip()
            body = "\n".join(lines[1:]).strip() if i else "\n".join(lines[1:]).strip()
            if not body:
                continue
            self.chunks.append(Chunk(id=f"{doc_id}#{i}", doc=doc_title, title=heading, text=body))

    def search(self, query: str, k: int = 4) -> list[dict]:
        q = tokenize(query)
        scored = []
        for idx, tf in enumerate(self.tfs):
            s = 0.0
            for t in q:
                if t in tf:
                    f = tf[t]
                    s += self.idf.get(t, 0.0) * f * (self.k1 + 1) / (f + self.k1 * (1 - self.b + self.b * self.lens[idx] / self.avg))
            if s > 0:
                scored.append((s, idx))
        scored.sort(reverse=True)
        return [{"id": self.chunks[i].id, "doc": self.chunks[i].doc, "title": self.chunks[i].title,
                 "text": self.chunks[i].text, "score": round(s, 3)} for s, i in scored[:k]]
