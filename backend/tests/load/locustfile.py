"""Optional Locust scenario:  pip install locust && locust -f tests/load/locustfile.py --host http://localhost:8000"""
import random

from locust import HttpUser, between, task


class Customer(HttpUser):
    wait_time = between(0.05, 0.2)

    def on_start(self):
        r = self.client.post("/api/v1/auth/login", json={"username": "customer", "password": "demo123"})
        self.client.headers["Authorization"] = f"Bearer {r.json()['access_token']}"

    @task
    def score(self):
        self.client.post("/api/v1/score", json={
            "type": random.choice(["send_money", "payment", "cash_out"]), "amount": random.choice([200, 500, 1500, 5000]),
            "sender": f"C{random.randint(1, 1900):05d}", "receiver": f"C{random.randint(1, 1900):05d}"})
