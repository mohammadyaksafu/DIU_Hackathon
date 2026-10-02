"""Closed-loop load test for POST /api/v1/score (no external tools needed).

    python tests/load/bench.py --url http://localhost:8000 --users 10 --seconds 20

Reports throughput and client-side latency percentiles. Report what you measure;
results depend on hardware and on whether the API runs with several workers.
"""
from __future__ import annotations

import argparse
import random
import statistics
import threading
import time

import httpx


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://localhost:8000")
    ap.add_argument("--users", type=int, default=10)
    ap.add_argument("--seconds", type=int, default=20)
    a = ap.parse_args()
    tok = httpx.post(f"{a.url}/api/v1/auth/login", json={"username": "customer", "password": "demo123"}).json()["access_token"]
    headers = {"Authorization": f"Bearer {tok}"}
    lat: list[float] = []
    errors = 0
    lock = threading.Lock()
    stop = time.time() + a.seconds

    def worker(seed: int) -> None:
        nonlocal errors
        rng = random.Random(seed)
        with httpx.Client(base_url=a.url, headers=headers, timeout=10) as c:
            while time.time() < stop:
                body = {"type": rng.choice(["send_money", "payment", "cash_out"]), "amount": rng.choice([200, 500, 1500, 5000]),
                        "sender": f"C{rng.randint(1, 1900):05d}", "receiver": f"C{rng.randint(1, 1900):05d}"}
                t = time.perf_counter()
                r = c.post("/api/v1/score", json=body)
                dt = (time.perf_counter() - t) * 1000
                with lock:
                    lat.append(dt)
                    errors += r.status_code != 200

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(a.users)]
    started = time.time()
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    elapsed = time.time() - started
    lat.sort()
    pct = lambda q: lat[min(len(lat) - 1, int(q * len(lat)))]
    print(f"users={a.users} requests={len(lat)} errors={errors} duration={elapsed:.1f}s")
    print(f"throughput={len(lat) / elapsed:.1f} req/s  p50={pct(0.5):.1f}ms  p95={pct(0.95):.1f}ms  p99={pct(0.99):.1f}ms  mean={statistics.mean(lat):.1f}ms")


if __name__ == "__main__":
    main()
