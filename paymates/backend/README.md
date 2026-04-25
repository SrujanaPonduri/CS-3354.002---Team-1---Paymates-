# Paymates Backend Setup

This guide covers local setup and running the Flask backend in `paymates/backend`.

## Prerequisites

- Python 3.9+
- `pip`

## 1) Create and activate virtual environment

From the repo root:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

## 2) Install backend dependencies

```bash
cd paymates/backend
pip install -r requirements.txt
```

## 3) Configure environment variables

Create `.env` in `paymates/backend` (or copy from `.env.example`):

```bash
cp .env.example .env
```

Minimum required for local development:

- `FRONTEND_BASE_URL="http://localhost:3000"` (or your frontend URL)

Optional:

- `MAGIC_LINK_RETURN_TOKEN=true` for easier local testing
- SMTP variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_USE_TLS`, `SMTP_USE_SSL`, `EMAIL_FROM`) for real email delivery
- If `SMTP_HOST` is empty, emails are logged in console mode

## 4) Run backend server

From `paymates/backend` with venv active:

```bash
python app.py
```

Backend runs at:

- `http://127.0.0.1:5001`

Health check:

```bash
curl http://127.0.0.1:5001/api/health
```

## Quick start script (alternative)

From repo root:

```bash
bash setup_backend.sh
```

This script creates/uses `.venv`, installs requirements, and starts the backend.

## Running tests

From repo root with venv active:

```bash
python -m pytest paymates/backend/tests -q
```

