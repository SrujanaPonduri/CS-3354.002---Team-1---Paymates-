# routes/history.py
# Responsible for: UC-10 — View Payment History.
# Kavya Seenuvasan
#
# FR-23: Allow users to view resolved Dues, past Budgets and past Expenses.
# NFR-08: Search bills, roommates, items, reports within 2 seconds.
#
# Endpoints:
#   GET  /api/homes/<home_id>/history          — paginated list of resolved dues
#   GET  /api/homes/<home_id>/history/summary  — aggregate totals for the home

from flask import Blueprint, jsonify, request
from mock_db import DB

history_bp = Blueprint("history", __name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _enrich_history_record(due: dict) -> dict:
    """Return a resolved due enriched with display-friendly fields.

    Adds:
      source_title   — title of the parent bill or expense
      source_type    — "bill" | "expense"
      source_category— category of the parent bill (or None for expenses)
      user_name      — display name of the user who paid
      user_email     — email of the payer
      created_by     — user ID who created the bill/expense
      created_by_name— display name of the bill/expense creator
      proof_url      — payment proof URL (stored on the due, falls back to
                       bill receipt_url)
    """
    parent_id = due.get("expense_id_or_bill_id", "")
    source_title    = "—"
    source_type     = "unknown"
    source_category = None
    created_by      = None
    created_by_name = None
    proof_url       = due.get("proof_url")

    if parent_id in DB["bills"]:
        bill            = DB["bills"][parent_id]
        source_title    = bill.get("title", "—")
        source_type     = "bill"
        source_category = bill.get("category")
        created_by      = bill.get("created_by")
        # Fall back to receipt_url if no per-due proof stored
        if not proof_url:
            proof_url = bill.get("receipt_url")
    elif parent_id in DB["expenses"]:
        exp             = DB["expenses"][parent_id]
        source_title    = exp.get("title", "—")
        source_type     = "expense"
        source_category = exp.get("expense_type")   # one_time / recurring
        created_by      = exp.get("creator_id")

    if created_by:
        creator = DB["users"].get(created_by, {})
        created_by_name = creator.get("name", "Unknown")

    payer = DB["users"].get(due.get("user_id", ""), {})
    return {
        **due,
        "source_title":    source_title,
        "source_type":     source_type,
        "source_category": source_category,
        "user_name":       payer.get("name", "Unknown"),
        "user_email":      payer.get("email", ""),
        "created_by":      created_by,
        "created_by_name": created_by_name,
        "proof_url":       proof_url,
    }


# ---------------------------------------------------------------------------
# UC-10 FR-23 — Paginated payment history (resolved dues only)
# ---------------------------------------------------------------------------
# GET /api/homes/<home_id>/history
#
# Query params:
#   q          — keyword search in source_title, user_name, user_email
#   type       — "bill" | "expense" | "" (all)
#   start_date — ISO date string (inclusive lower bound on due_date)
#   end_date   — ISO date string (inclusive upper bound on due_date)
#   paid_by    — user_id filter (which roommate paid)
#   page       — 1-based page number (default 1)
#   per_page   — records per page (default 20, max 100)
@history_bp.route("/homes/<home_id>/history", methods=["GET"])
def list_history(home_id):
    """UC-10 FR-23: Return paginated, searchable payment history.

    Only dues with status == 'done' are returned.  Results are sorted newest
    due_date first.  Supports keyword search (q), type, date-range, and
    paid_by filters.

    Returns 404 if home does not exist.
    """
    if home_id not in DB["homes"]:
        return jsonify({"error": "Home not found"}), 404

    home       = DB["homes"][home_id]
    member_ids = set(home["roommate_ids"])

    # ── Query params ──────────────────────────────────────────────────────
    q          = (request.args.get("q") or "").strip().lower()
    type_f     = (request.args.get("type") or "").strip().lower()
    start_date = (request.args.get("start_date") or "").strip()
    end_date   = (request.args.get("end_date") or "").strip()
    paid_by    = (request.args.get("paid_by") or "").strip()

    try:
        page     = max(1, int(request.args.get("page", 1)))
        per_page = min(100, max(1, int(request.args.get("per_page", 20))))
    except (TypeError, ValueError):
        page, per_page = 1, 20

    # ── Collect & filter ──────────────────────────────────────────────────
    results = []
    for due in DB["dues"].values():
        # Only resolved dues for this home's members
        if due.get("status") != "done":
            continue
        if due["user_id"] not in member_ids:
            continue

        pid = due.get("expense_id_or_bill_id", "")
        if pid in DB["bills"] and DB["bills"][pid]["home_id"] != home_id:
            continue
        if pid in DB["expenses"] and DB["expenses"][pid]["home_id"] != home_id:
            continue

        record = _enrich_history_record(due)

        # paid_by filter
        if paid_by and due["user_id"] != paid_by:
            continue

        # type filter
        if type_f and record["source_type"] != type_f:
            continue

        # date range filter (on due_date)
        d = due.get("due_date", "")
        if start_date and d and d < start_date:
            continue
        if end_date and d and d > end_date:
            continue

        # keyword search
        if q:
            haystack = " ".join([
                record["source_title"],
                record["user_name"],
                record["user_email"],
                record.get("source_category") or "",
            ]).lower()
            if q not in haystack:
                continue

        results.append(record)

    # ── Sort newest first ─────────────────────────────────────────────────
    results.sort(key=lambda r: r.get("due_date", ""), reverse=True)

    # ── Pagination ────────────────────────────────────────────────────────
    total      = len(results)
    total_pages = max(1, -(-total // per_page))   # ceiling division
    start       = (page - 1) * per_page
    page_items  = results[start: start + per_page]

    # ── Aggregate totals (unfiltered by page) ─────────────────────────────
    total_paid = round(sum(r["amount"] for r in results), 2)

    return jsonify({
        "history":     page_items,
        "total":       total,
        "total_paid":  total_paid,
        "page":        page,
        "per_page":    per_page,
        "total_pages": total_pages,
    }), 200


# ---------------------------------------------------------------------------
# UC-10 helper — Get a single history record detail
# ---------------------------------------------------------------------------
# GET /api/dues/<due_id>/detail
@history_bp.route("/dues/<due_id>/detail", methods=["GET"])
def get_history_detail(due_id):
    """UC-10: Return a single enriched resolved-due detail view."""
    due = DB["dues"].get(due_id)
    if not due:
        return jsonify({"error": "Record not found"}), 404
    if due.get("status") != "done":
        return jsonify({"error": "This due has not been paid yet"}), 400
    return jsonify({"record": _enrich_history_record(due)}), 200


# ---------------------------------------------------------------------------
# UC-10 summary card
# ---------------------------------------------------------------------------
# GET /api/homes/<home_id>/history/summary
@history_bp.route("/homes/<home_id>/history/summary", methods=["GET"])
def history_summary(home_id):
    """UC-10: Return aggregate stats for the home's resolved dues.

    Returns:
      total_paid      — sum of all resolved dues
      resolved_count  — number of resolved dues
      owed_to_you     — amount others paid TO the current user's bills
                        (pass ?current_user_id=<id> to compute)
    """
    if home_id not in DB["homes"]:
        return jsonify({"error": "Home not found"}), 404

    home       = DB["homes"][home_id]
    member_ids = set(home["roommate_ids"])
    current_uid = (request.args.get("current_user_id") or "").strip()

    total_paid     = 0.0
    resolved_count = 0
    you_paid       = 0.0
    owed_to_you    = 0.0

    for due in DB["dues"].values():
        if due.get("status") != "done":
            continue
        if due["user_id"] not in member_ids:
            continue
        pid = due.get("expense_id_or_bill_id", "")
        if pid in DB["bills"] and DB["bills"][pid]["home_id"] != home_id:
            continue
        if pid in DB["expenses"] and DB["expenses"][pid]["home_id"] != home_id:
            continue

        total_paid     += due["amount"]
        resolved_count += 1

        if current_uid:
            if due["user_id"] == current_uid:
                you_paid += due["amount"]
            else:
                # Check if the bill/expense was created by current user
                creator = None
                if pid in DB["bills"]:
                    creator = DB["bills"][pid].get("created_by")
                elif pid in DB["expenses"]:
                    creator = DB["expenses"][pid].get("creator_id")
                if creator == current_uid:
                    owed_to_you += due["amount"]

    return jsonify({
        "total_paid":     round(total_paid, 2),
        "resolved_count": resolved_count,
        "you_paid":       round(you_paid, 2),
        "owed_to_you":    round(owed_to_you, 2),
    }), 200