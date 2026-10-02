"""Minimal Prometheus-compatible metrics (no external dependency).

Exposed at GET /metrics in the Prometheus text exposition format.
"""
from __future__ import annotations

import bisect
import threading
from collections import defaultdict, deque

_LATENCY_BUCKETS_MS = [5, 10, 25, 50, 75, 100, 150, 250, 500, 1000, 2500]


class Metrics:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self.counters: dict[tuple[str, tuple], float] = defaultdict(float)
        self.hist_counts: dict[str, list[int]] = {}
        self.hist_sum: dict[str, float] = defaultdict(float)
        self.recent: dict[str, deque] = defaultdict(lambda: deque(maxlen=5000))

    def inc(self, name: str, value: float = 1.0, **labels) -> None:
        key = (name, tuple(sorted(labels.items())))
        with self._lock:
            self.counters[key] += value

    def observe_ms(self, name: str, value_ms: float) -> None:
        with self._lock:
            counts = self.hist_counts.setdefault(name, [0] * (len(_LATENCY_BUCKETS_MS) + 1))
            counts[bisect.bisect_left(_LATENCY_BUCKETS_MS, value_ms)] += 1
            self.hist_sum[name] += value_ms
            self.recent[name].append(value_ms)

    def percentile(self, name: str, q: float) -> float | None:
        with self._lock:
            values = sorted(self.recent.get(name, []))
        if not values:
            return None
        idx = min(len(values) - 1, int(round(q * (len(values) - 1))))
        return round(values[idx], 2)

    def counter_value(self, name: str, **labels) -> float:
        return self.counters.get((name, tuple(sorted(labels.items()))), 0.0)

    def counters_by_label(self, name: str, label: str) -> dict[str, float]:
        out: dict[str, float] = {}
        with self._lock:
            for (n, labels), v in self.counters.items():
                if n == name:
                    out[dict(labels).get(label, "")] = out.get(dict(labels).get(label, ""), 0) + v
        return out

    def render(self) -> str:
        lines: list[str] = []
        with self._lock:
            for (name, labels), value in sorted(self.counters.items()):
                lbl = ",".join(f'{k}="{v}"' for k, v in labels)
                lines.append(f"shurokkha_{name}{{{lbl}}} {value}")
            for name, counts in self.hist_counts.items():
                cumulative = 0
                for bound, c in zip(_LATENCY_BUCKETS_MS + ["+Inf"], counts):
                    cumulative += c
                    lines.append(f'shurokkha_{name}_bucket{{le="{bound}"}} {cumulative}')
                lines.append(f"shurokkha_{name}_sum {self.hist_sum[name]}")
                lines.append(f"shurokkha_{name}_count {cumulative}")
        return "\n".join(lines) + "\n"


metrics = Metrics()
