# routes/dues.py
# Responsible for: UC06 — Assign Dues for Settlement.\
# Ashwin Avadhanula
# FR-15: View dues generated from bills.
# FR-16: View dues generated from shared expenses.
# FR-21: Filter dues by status (pending / done) and by user.
# FR-22: Mark a due as paid (status → "done") or revert to pending.
# NFR-04: All operations complete in constant time (in-memory dict lookups).
#
# Note: Due *creation* is handled automatically by routes/bills.py (_build_dues)
# and routes/expenses.py (_build_expense_dues) when a bill or expense is saved.
# This blueprint only exposes read and status-update endpoints.

from flask import Blueprint, jsonify, request
from mock_db import DB

dues_bp = Blueprint("dues", __name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _enrich_due(due: dict) -> dict:
    """Return a due with extra display-friendly fields attached.

    Adds:
      source_title  — title of the parent bill or expense
      source_type   — "bill" | "expense"
      user_name     — display name of the user who owes the amount
      user_email    — email of the user who owes the amount
    """
    parent_id = due.get("expense_id_or_bill_id", "")
    source_title = "—"
    source_type  = "unknown"

    if parent_id in DB["bills"]:
        source_title = DB["bills"][parent_id].get("title", "—")
        source_type  = "bill"
    elif parent_id in DB["expenses"]:
        source_title = DB["expenses"][parent_id].get("title", "—")
        source_type  = "expense"

    user = DB["users"].get(due.get("user_id", ""), {})
    return {
        **due,
        "source_title": source_title,
        "source_type":  source_type,
        "user_name":    user.get("name", "Unknown"),
        "user_email":   user.get("email", ""),
    }


# ---------------------------------------------------------------------------
# UC06-FR15/FR16 — List all dues for a home
# ---------------------------------------------------------------------------
# GET /api/homes/<home_id>/dues
# Optional query params:
#   status  — "pending" | "done"        (default: all)
#   user_id — show only dues for this user
@dues_bp.route("/homes/<home_id>/dues", methods=["GET"])
def list_dues(home_id):
    """UC06-FR15/FR16: Return all dues for bills and expenses in a home.

    Query params:
      status  — filter by "pending" or "done" (omit for all)
      user_id — filter to a specific user's dues

    The response includes enriched fields (source_title, source_type,
    user_name) so the frontend can display dues without extra round-trips.

    Returns 404 if home does not exist.
    """
    if home_id not in DB["homes"]:
        return jsonify({"error": "Home not found"}), 404

    home         = DB["homes"][home_id]
    member_ids   = set(home["roommate_ids"])
    status_filter  = request.args.get("status", "").strip().lower()
    user_filter    = request.args.get("user_id", "").strip()

    # Collect dues whose user_id is a member of this home
    results = []
    for due in DB["dues"].values():
        if due["user_id"] not in member_ids:
            continue
        # Also check the parent bill/expense belongs to this home
        pid = due.get("expense_id_or_bill_id", "")
        if pid in DB["bills"] and DB["bills"][pid]["home_id"] != home_id:
            continue
        if pid in DB["expenses"] and DB["expenses"][pid]["home_id"] != home_id:
            continue

        if status_filter and due["status"] != status_filter:
            continue
        if user_filter and due["user_id"] != user_filter:
            continue

        results.append(_enrich_due(due))

    # Sort: pending first, then by due_date ascending
    results.sort(key=lambda d: (d["status"] != "pending", d.get("due_date", "")))

    total_pending = sum(d["amount"] for d in results if d["status"] == "pending")
    total_paid    = sum(d["amount"] for d in results if d["status"] == "done")

    return jsonify({
        "dues":          results,
        "total_count":   len(results),
        "total_pending": round(total_pending, 2),
        "total_paid":    round(total_paid, 2),
    }), 200


# ---------------------------------------------------------------------------
# UC06-FR22 — Mark a due as paid or revert to pending
# ---------------------------------------------------------------------------
# PATCH /api/dues/<due_id>/status
# Body: { user_id, status }   status must be "done" | "pending"
@dues_bp.route("/dues/<due_id>/status", methods=["PATCH"])
def update_due_status(due_id):
    """UC06-FR22: Toggle a due between 'pending' and 'done'.

    Rules:
    - The requesting user must be the one who owes the due (user_id == due.user_id).
    - status must be "done" or "pending".

    Returns 200 with the updated enriched due on success.
    Returns 403 if user_id does not match the due owner.
    Returns 404 if due_id does not exist.
    """
    due = DB["dues"].get(due_id)
    if not due:
        return jsonify({"error": "Due not found"}), 404

    data    = request.get_json(silent=True) or {}
    user_id = (data.get("user_id") or "").strip()
    status  = (data.get("status") or "").strip().lower()

    if not user_id:
        return jsonify({"error": "user_id is required"}), 400
    if status not in ("done", "pending"):
        return jsonify({"error": "status must be 'done' or 'pending'"}), 400
    if due["user_id"] != user_id:
        return jsonify({"error": "You can only update your own dues"}), 403

    due["status"] = status
    return jsonify({"due": _enrich_due(due)}), 200


# ---------------------------------------------------------------------------
# UC06 — Get a single due with full detail
# ---------------------------------------------------------------------------
# GET /api/dues/<due_id>
@dues_bp.route("/dues/<due_id>", methods=["GET"])
def get_due(due_id):
    """UC06: Return a single enriched due record."""
    due = DB["dues"].get(due_id)
    if not due:
        return jsonify({"error": "Due not found"}), 404
    return jsonify({"due": _enrich_due(due)}), 200
