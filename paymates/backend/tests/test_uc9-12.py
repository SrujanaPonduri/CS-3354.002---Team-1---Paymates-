# tests/test_uc9-12.py
# Test suite for UC-09, UC-10, UC-11, UC-12
#
# UC-09  Log Payments & Upload Proof   (FR-16, FR-22)
# UC-10  View Payment History          (FR-23, NFR-08)
# UC-11  Create/Manage Budget          (FR-04, FR-05, FR-06)
# UC-12  Audit Expenses and Budget     (FR-24, FR-25, FR-26, FR-27)
#
# Run from paymates/backend/:
#   pytest tests/test_uc9-12.py -v

import json
import pytest


# ═══════════════════════════════════════════════════════════════════════════════
# authed_client fixture (appended to conftest.py — defined here as fallback)
# ═══════════════════════════════════════════════════════════════════════════════

class _AuthedClient:
    """Wraps Flask test client; injects Bearer token on every request."""
    def __init__(self, raw, token: str):
        self._c = raw
        self._h = {"Authorization": f"Bearer {token}"}

    def _m(self, kw):
        h = {**self._h, **(kw.pop("headers", {}) or {})}
        kw["headers"] = h
        return kw

    def get(self, *a, **kw):    return self._c.get(*a,    **self._m(kw))
    def post(self, *a, **kw):   return self._c.post(*a,   **self._m(kw))
    def patch(self, *a, **kw):  return self._c.patch(*a,  **self._m(kw))
    def put(self, *a, **kw):    return self._c.put(*a,    **self._m(kw))
    def delete(self, *a, **kw): return self._c.delete(*a, **self._m(kw))


@pytest.fixture
def authed_client(flask_app, monkeypatch):
    """Authenticated test client — auto-sends Bearer session token."""
    monkeypatch.setattr("routes.auth.send_magic_link", lambda *a, **k: None)
    with flask_app.test_client() as raw:
        # Login as seeded user u1
        r1 = raw.post("/api/auth/login", json={"email": "aagam@example.com"})
        assert r1.status_code == 200, f"Login failed: {r1.get_json()}"
        magic_token = r1.get_json()["token"]

        # Verify → get session token
        r2 = raw.get(f"/api/auth/verify/{magic_token}")
        assert r2.status_code == 200, f"Verify failed: {r2.get_json()}"
        session_token = r2.get_json()["token"]

        yield _AuthedClient(raw, session_token)


# ═══════════════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════════════

def mark_due_done(due_id, user_id, authed_client):
    """PATCH a due to status=done."""
    return authed_client.patch(
        f"/api/dues/{due_id}/status",
        json={"user_id": user_id, "status": "done"},
    )


def create_budget(authed_client, **overrides):
    """POST a budget with defaults, allow overrides."""
    payload = {
        "home_id":    "home-demo",
        "category":   "Utilities",
        "limit":      300.0,
        "visibility": "all",
        **overrides,
    }
    return authed_client.post("/api/budgets", json=payload)


# ═══════════════════════════════════════════════════════════════════════════════
# UC-09  Log Payments & Upload Proof
# ═══════════════════════════════════════════════════════════════════════════════

class TestUC09LogPayments:

    # TC01 — valid payment marks due as done
    def test_TC01_valid_full_payment(self, authed_client):
        """u2 marks their own pending due as paid."""
        rv = mark_due_done("due-2", "u2", authed_client)
        assert rv.status_code == 200
        assert rv.get_json()["due"]["status"] == "done"

    # TC02 — pending due starts as pending
    def test_TC02_pending_due_starts_pending(self, authed_client):
        """due-2 is seeded as pending."""
        rv = authed_client.get("/api/dues/due-2")
        assert rv.status_code == 200
        assert rv.get_json()["due"]["status"] == "pending"

    # TC03 — receipt with empty URL returns 400
    def test_TC03_payment_without_proof_rejected(self, authed_client):
        """POST receipt with blank URL is rejected."""
        rv = authed_client.post(
            "/api/bills/bill-demo/receipt",
            json={"receipt_url": ""},
        )
        assert rv.status_code == 400

    # TC04 — valid proof URL attaches to bill
    def test_TC04_upload_valid_proof_url(self, authed_client):
        """Attaching a valid receipt URL to a bill succeeds."""
        rv = authed_client.post(
            "/api/bills/bill-demo/receipt",
            json={"receipt_url": "https://example.com/receipt.png"},
        )
        assert rv.status_code == 200
        assert rv.get_json()["receipt_url"] == "https://example.com/receipt.png"

    # TC05 — wrong user cannot mark another's due
    def test_TC05_wrong_user_cannot_mark_paid(self, authed_client):
        """u3 tries to mark u2's due — must get 403."""
        rv = authed_client.patch(
            "/api/dues/due-2/status",
            json={"user_id": "u3", "status": "done"},
        )
        assert rv.status_code == 403

    # TC06 — missing user_id returns 400
    def test_TC06_missing_user_id_returns_400(self, authed_client):
        rv = authed_client.patch(
            "/api/dues/due-2/status",
            json={"status": "done"},
        )
        assert rv.status_code == 400

    # TC07 — invalid status value returns 400
    def test_TC07_invalid_status_value(self, authed_client):
        rv = authed_client.patch(
            "/api/dues/due-2/status",
            json={"user_id": "u2", "status": "paid"},
        )
        assert rv.status_code == 400

    # TC08 — non-existent due returns 404
    def test_TC08_nonexistent_due_returns_404(self, authed_client):
        rv = authed_client.patch(
            "/api/dues/does-not-exist/status",
            json={"user_id": "u1", "status": "done"},
        )
        assert rv.status_code == 404

    # TC09 — revert a paid due back to pending
    def test_TC09_revert_paid_due_to_pending(self, authed_client):
        """due-1 is seeded as done; u1 can revert it to pending."""
        rv = authed_client.patch(
            "/api/dues/due-1/status",
            json={"user_id": "u1", "status": "pending"},
        )
        assert rv.status_code == 200
        assert rv.get_json()["due"]["status"] == "pending"

    # TC10 — dues list reflects payment after update
    def test_TC10_dues_list_reflects_payment(self, authed_client):
        """After marking due-2 done, it shows as done in the list."""
        mark_due_done("due-2", "u2", authed_client)
        rv = authed_client.get("/api/homes/home-demo/dues?user_id=u2")
        assert rv.status_code == 200
        dues = rv.get_json()["dues"]
        u2_dues = [d for d in dues if d["user_id"] == "u2"]
        assert all(d["status"] == "done" for d in u2_dues)

    # TC11 — receipt on non-existent bill returns 404
    def test_TC11_receipt_on_missing_bill(self, authed_client):
        rv = authed_client.post(
            "/api/bills/no-such-bill/receipt",
            json={"receipt_url": "https://example.com/r.png"},
        )
        assert rv.status_code == 404


# ═══════════════════════════════════════════════════════════════════════════════
# UC-10  View Payment History
# ═══════════════════════════════════════════════════════════════════════════════

class TestUC10PaymentHistory:

    # TC01 — history only shows resolved dues
    def test_TC01_only_resolved_dues_appear(self, authed_client):
        """Seed has due-1 (done) and due-2/3 (pending). Only due-1 shows."""
        rv = authed_client.get("/api/homes/home-demo/history")
        assert rv.status_code == 200
        history = rv.get_json()["history"]
        assert all(r["status"] == "done" for r in history)
        ids = [r["id"] for r in history]
        assert "due-1" in ids
        assert "due-2" not in ids
        assert "due-3" not in ids

    # TC02 — keyword search by title
    def test_TC02_keyword_search_by_title(self, authed_client):
        rv = authed_client.get("/api/homes/home-demo/history?q=April")
        assert rv.status_code == 200
        results = rv.get_json()["history"]
        assert len(results) >= 1
        assert all("april" in r["source_title"].lower() for r in results)

    # TC03 — search with no match returns empty
    def test_TC03_keyword_search_no_match(self, authed_client):
        rv = authed_client.get("/api/homes/home-demo/history?q=ZZZNOEXIST")
        assert rv.status_code == 200
        assert rv.get_json()["history"] == []

    # TC04 — filter by paid_by user
    def test_TC04_filter_by_paid_by_user(self, authed_client):
        rv = authed_client.get("/api/homes/home-demo/history?paid_by=u1")
        assert rv.status_code == 200
        history = rv.get_json()["history"]
        assert all(r["user_id"] == "u1" for r in history)

    # TC05 — non-existent home returns 404
    def test_TC05_nonexistent_home_returns_404(self, authed_client):
        rv = authed_client.get("/api/homes/no-home/history")
        assert rv.status_code == 404

    # TC06 — user with no resolved dues returns empty
    def test_TC06_empty_history_no_resolved_dues(self, authed_client):
        rv = authed_client.get("/api/homes/home-demo/history?paid_by=u2")
        assert rv.status_code == 200
        assert rv.get_json()["history"] == []

    # TC07 — history updates after payment
    def test_TC07_history_updates_after_payment(self, authed_client):
        mark_due_done("due-2", "u2", authed_client)
        rv = authed_client.get("/api/homes/home-demo/history?paid_by=u2")
        assert rv.status_code == 200
        assert any(r["id"] == "due-2" for r in rv.get_json()["history"])

    # TC08 — type filter for bills only
    def test_TC08_type_filter_bill(self, authed_client):
        rv = authed_client.get("/api/homes/home-demo/history?type=bill")
        assert rv.status_code == 200
        history = rv.get_json()["history"]
        assert all(r["source_type"] == "bill" for r in history)

    # TC09 — detail endpoint for a resolved due
    def test_TC09_detail_endpoint_resolved_due(self, authed_client):
        rv = authed_client.get("/api/dues/due-1/detail")
        assert rv.status_code == 200
        record = rv.get_json()["record"]
        assert record["id"] == "due-1"
        assert record["status"] == "done"
        assert "source_title" in record

    # TC10 — detail endpoint for pending due returns 400
    def test_TC10_detail_endpoint_pending_due_returns_400(self, authed_client):
        rv = authed_client.get("/api/dues/due-2/detail")
        assert rv.status_code == 400

    # TC11 — detail endpoint for non-existent due returns 404
    def test_TC11_detail_nonexistent_returns_404(self, authed_client):
        rv = authed_client.get("/api/dues/ghost/detail")
        assert rv.status_code == 404

    # TC12 — summary endpoint returns correct totals
    def test_TC12_summary_totals(self, authed_client):
        rv = authed_client.get(
            "/api/homes/home-demo/history/summary?current_user_id=u1"
        )
        assert rv.status_code == 200
        body = rv.get_json()
        assert body["resolved_count"] >= 1
        assert body["total_paid"] >= 30.0
        assert body["you_paid"] >= 30.0

    # TC13 — pagination returns correct page size
    def test_TC13_pagination(self, authed_client):
        mark_due_done("due-2", "u2", authed_client)
        mark_due_done("due-3", "u3", authed_client)
        rv = authed_client.get("/api/homes/home-demo/history?per_page=1&page=1")
        assert rv.status_code == 200
        body = rv.get_json()
        assert len(body["history"]) == 1
        assert body["total_pages"] >= 3

    # TC14 — special characters in search don't crash
    def test_TC14_special_chars_search_safe(self, authed_client):
        rv = authed_client.get("/api/homes/home-demo/history?q=%40%23%24%25")
        assert rv.status_code == 200

    # TC15 — date range filter works
    def test_TC15_date_range_filter(self, authed_client):
        rv = authed_client.get(
            "/api/homes/home-demo/history"
            "?start_date=2025-01-01&end_date=2025-12-31"
        )
        assert rv.status_code == 200
        ids = [r["id"] for r in rv.get_json()["history"]]
        assert "due-1" in ids


# ═══════════════════════════════════════════════════════════════════════════════
# UC-11  Create / Manage Budget
# Uses budgets.py blueprint: POST /api/budgets  { home_id, category, limit }
# Seeded budget: budget-1 (Groceries, limit=500, current_balance=90)
# ═══════════════════════════════════════════════════════════════════════════════

class TestUC11Budget:

    # TC01 — valid budget creation
    def test_TC01_valid_budget_created(self, authed_client):
        rv = create_budget(authed_client, category="Utilities", limit=300.0)
        assert rv.status_code == 201
        body = rv.get_json()["budget"]
        assert body["category"] == "Utilities"
        assert body["limit"] == 300.0
        assert body["home_id"] == "home-demo"

    # TC02 — missing required field returns 400
    def test_TC02_missing_category_returns_400(self, authed_client):
        rv = create_budget(authed_client, category="")
        assert rv.status_code == 400

    # TC03 — negative limit returns 400
    def test_TC03_negative_limit_returns_400(self, authed_client):
        rv = create_budget(authed_client, limit=-50)
        assert rv.status_code == 400

    # TC04 — non-numeric limit returns 400
    def test_TC04_non_numeric_limit_returns_400(self, authed_client):
        rv = create_budget(authed_client, limit="lots")
        assert rv.status_code == 400

    # TC05 — duplicate category in same home returns 409
    def test_TC05_duplicate_category_returns_409(self, authed_client):
        """Groceries is already seeded for home-demo — duplicate should fail."""
        rv = create_budget(authed_client, category="Groceries")
        assert rv.status_code == 409

    # TC06 — valid decimal limit accepted
    def test_TC06_valid_decimal_limit(self, authed_client):
        rv = create_budget(authed_client, category="Snacks", limit=125.75)
        assert rv.status_code == 201
        assert rv.get_json()["budget"]["limit"] == 125.75

    # TC07 — add balance to existing budget
    def test_TC07_add_balance_to_budget(self, authed_client):
        rv = authed_client.patch(
            "/api/budgets/budget-1/add-balance",
            json={"amount": 50.0},
        )
        assert rv.status_code == 200
        assert rv.get_json()["budget"]["current_balance"] == 140.0  # 90 + 50

    # TC08 — add invalid balance returns 400
    def test_TC08_invalid_balance_returns_400(self, authed_client):
        rv = authed_client.patch(
            "/api/budgets/budget-1/add-balance",
            json={"amount": "notanumber"},
        )
        assert rv.status_code == 400

    # TC09 — add balance to non-existent budget returns 404
    def test_TC09_balance_nonexistent_budget_returns_404(self, authed_client):
        rv = authed_client.patch(
            "/api/budgets/ghost-budget/add-balance",
            json={"amount": 10.0},
        )
        assert rv.status_code == 404

    # TC10 — zero limit is rejected
    def test_TC10_zero_limit_returns_400(self, authed_client):
        rv = create_budget(authed_client, category="Entertainment", limit=0)
        assert rv.status_code == 400

    # TC11 — private visibility stored correctly
    def test_TC11_private_visibility(self, authed_client):
        rv = create_budget(authed_client, category="Personal", visibility="private")
        assert rv.status_code == 201
        assert rv.get_json()["budget"]["visibility"] == "private"

    # TC12 — multiple budgets for same home stored independently
    def test_TC12_multiple_budgets_independent(self, authed_client):
        create_budget(authed_client, category="Cleaning", limit=100)
        create_budget(authed_client, category="Internet", limit=60)
        from mock_db import DB
        home_budgets = [b for b in DB["budgets"].values() if b["home_id"] == "home-demo"]
        cats = [b["category"] for b in home_budgets]
        assert "Cleaning" in cats
        assert "Internet" in cats

    # TC13 — missing home_id returns 400
    def test_TC13_missing_home_id_returns_400(self, authed_client):
        rv = authed_client.post(
            "/api/budgets",
            json={"category": "Food", "limit": 100},
        )
        assert rv.status_code == 400


# ═══════════════════════════════════════════════════════════════════════════════
# UC-12  Audit Expenses and Budget
# ═══════════════════════════════════════════════════════════════════════════════

class TestUC12Audit:

    # TC01 — summary returns expected keys (FR-26)
    def test_TC01_summary_returns_expected_keys(self, authed_client):
        rv = authed_client.get("/api/homes/home-demo/audit/summary")
        assert rv.status_code == 200
        body = rv.get_json()
        for key in ["total_spending", "total_bills", "total_expenses",
                    "top_category", "category_breakdown", "period"]:
            assert key in body, f"Missing key: {key}"

    # TC02 — summary with no data in period returns zero spend
    def test_TC02_summary_far_future_period_zero(self, authed_client):
        rv = authed_client.get(
            "/api/homes/home-demo/audit/summary"
            "?period=custom&start_date=2099-01-01&end_date=2099-12-31"
        )
        assert rv.status_code == 200
        assert rv.get_json()["total_spending"] == 0

    # TC03 — summary for non-existent home returns 404
    def test_TC03_summary_nonexistent_home(self, authed_client):
        rv = authed_client.get("/api/homes/ghost/audit/summary")
        assert rv.status_code == 404

    # TC04 — trends returns a full date series (FR-24)
    def test_TC04_trends_returns_date_series(self, authed_client):
        rv = authed_client.get(
            "/api/homes/home-demo/audit/trends"
            "?period=custom&start_date=2025-04-01&end_date=2025-04-07"
        )
        assert rv.status_code == 200
        body = rv.get_json()
        assert "trends" in body
        assert len(body["trends"]) == 7  # 7-day range
        for entry in body["trends"]:
            assert "date" in entry
            assert "amount" in entry

    # TC05 — trends zero-fills days with no spending
    def test_TC05_trends_zero_fills_empty_days(self, authed_client):
        rv = authed_client.get(
            "/api/homes/home-demo/audit/trends"
            "?period=custom&start_date=2025-03-01&end_date=2025-03-03"
        )
        assert rv.status_code == 200
        trends = rv.get_json()["trends"]
        assert all(t["amount"] == 0 for t in trends)

    # TC06 — budget vs actual returns rows (FR-25)
    def test_TC06_budget_vs_actual_returns_rows(self, authed_client):
        rv = authed_client.get(
            "/api/homes/home-demo/audit/budget-vs-actual"
            "?period=custom&start_date=2025-04-01&end_date=2025-04-30"
        )
        assert rv.status_code == 200
        body = rv.get_json()
        assert "rows" in body
        assert "total_budget" in body
        assert "total_spent" in body

    # TC07 — budget vs actual flags over-budget categories
    def test_TC07_over_budget_flagged(self, authed_client):
        """Seed bill is $90 Groceries; create a $10 budget → over budget."""
        # First add a small budget via audit route
        authed_client.post(
            "/api/homes/home-demo/budgets",
            json={
                "creator_id": "u1", "category": "Groceries",
                "budget_amount": 10, "month": 4, "year": 2025,
                "visibility": "all",
            },
        )
        rv = authed_client.get(
            "/api/homes/home-demo/audit/budget-vs-actual"
            "?period=custom&start_date=2025-04-01&end_date=2025-04-30"
        )
        assert rv.status_code == 200
        body = rv.get_json()
        groceries = next(
            (r for r in body["rows"] if r["category"] == "Groceries"), None
        )
        assert groceries is not None
        assert groceries["over_budget"] is True

    # TC08 — CSV export returns 200 with correct content-type (FR-27)
    def test_TC08_csv_export_status_and_type(self, authed_client):
        rv = authed_client.get(
            "/api/homes/home-demo/audit/export/csv"
            "?period=custom&start_date=2025-01-01&end_date=2025-12-31"
        )
        assert rv.status_code == 200
        assert "text/csv" in rv.content_type

    # TC09 — CSV export contains header row
    def test_TC09_csv_export_has_header(self, authed_client):
        rv = authed_client.get(
            "/api/homes/home-demo/audit/export/csv"
            "?period=custom&start_date=2025-01-01&end_date=2025-12-31"
        )
        text = rv.data.decode("utf-8")
        assert "Date" in text
        assert "Type" in text
        assert "Amount" in text

    # TC10 — CSV export contains seed bill data
    def test_TC10_csv_export_contains_seed_bill(self, authed_client):
        rv = authed_client.get(
            "/api/homes/home-demo/audit/export/csv"
            "?period=custom&start_date=2025-04-01&end_date=2025-04-30"
        )
        assert "April Groceries" in rv.data.decode("utf-8")

    # TC11 — CSV export for non-existent home returns 404
    def test_TC11_csv_export_nonexistent_home(self, authed_client):
        rv = authed_client.get("/api/homes/ghost/audit/export/csv")
        assert rv.status_code == 404

    # TC12 — XLSX export returns correct MIME type (FR-27)
    def test_TC12_xlsx_export_status_and_type(self, authed_client):
        rv = authed_client.get(
            "/api/homes/home-demo/audit/export/xlsx"
            "?period=custom&start_date=2025-01-01&end_date=2025-12-31"
        )
        assert rv.status_code in (200, 501)  # 501 if openpyxl not installed
        if rv.status_code == 200:
            assert "spreadsheetml" in rv.content_type

    # TC13 — period=last_month works
    def test_TC13_period_last_month(self, authed_client):
        rv = authed_client.get(
            "/api/homes/home-demo/audit/summary?period=last_month"
        )
        assert rv.status_code == 200
        assert "period" in rv.get_json()

    # TC14 — summary correctly counts seed bill
    def test_TC14_summary_bill_count(self, authed_client):
        rv = authed_client.get(
            "/api/homes/home-demo/audit/summary"
            "?period=custom&start_date=2025-04-01&end_date=2025-04-30"
        )
        assert rv.status_code == 200
        assert rv.get_json()["total_bills"] == 1

    # TC15 — trends for non-existent home returns 404
    def test_TC15_trends_nonexistent_home(self, authed_client):
        rv = authed_client.get("/api/homes/ghost/audit/trends")
        assert rv.status_code == 404