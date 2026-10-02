# Convenience targets (Linux/macOS/Git Bash). Windows PowerShell equivalents are in README.
PY ?= backend/.venv/bin/python

setup:
	cd backend && python -m venv .venv && .venv/bin/pip install -r requirements.txt
	cd frontend && npm ci

data-train:        ## generate synthetic data + train + evaluate + register
	cd backend && ../$(PY) -m pipelines.run_all

retrain:           ## retrain on existing data (after adding a feature/detector)
	cd backend && ../$(PY) -m pipelines.run_all --skip-data

api:
	cd backend && ../$(PY) -m uvicorn app.main:app --reload --port 8000

web:
	cd frontend && npm run dev

test:
	cd backend && ../$(PY) -m pytest
	cd frontend && npm run typecheck && npm run build

load:
	cd backend && ../$(PY) tests/load/bench.py --users 10 --seconds 20

up:
	docker compose up --build
