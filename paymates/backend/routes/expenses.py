# routes/expenses.py
# Responsible for: UC05 — creating and managing shared expenses (one-time or
# recurring), generating per-user dues, and handling partial updates.

from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from flask import Blueprint, jsonify, request
from mock_db import DB, new_id

expenses_bp = Blueprint("expenses", __name__)


# ---------------------------------------------------------------------------
# Helper — compute next_due_date for recurring expenses
# ---------------------------------------------------------------------------

def _next_due(start_date_str: str, frequency: str) -> str:
    """Return the ISO date string of the next due date after start_date.

    frequency must be "weekly" | "monthly" | "yearly".
    """
    start = date.fromisoformat(start_date_str)
    if frequency == "weekly":
        next_d = start + timedelta(weeks=1)
    elif frequency == "monthly":
        next_d = start + relativedelta(months=1)
    elif frequency == "yearly":
        next_d = start + relativedelta(years=1)
    else:
        next_d = start
    return next_d.isoformat()


def _build_expense_dues(expense_id: str, amount: float,
                        assigned_to: list, due_date: str) -> list:
    """Create one due record per user in assigned_to and store in DB."""
    per_person = round(amount / len(assigned_to), 2)
    dues = []
    for uid in assigned_to:
        due_id = new_id()
        due = {
            "id": due_id,
            "expense_id_or_bill_id": expense_id,
            "user_id": uid,
            "amount": per_person,
            "due_date": due_date,
            "status": "pending",
        }
        DB["dues"][due_id] = due
        dues.append(due)
    return dues


# ---------------------------------------------------------------------------
# UC05-FR09 — List shared expenses for a home
# ---------------------------------------------------------------------------
# GET /api/homes/<home_id>/expenses
@expenses_bp.route("/homes/<home_id>/expenses", methods=["GET"])
def list_expenses(home_id):
    """UC05-FR09: Return all expenses belonging to a home, sorted newest-first.

    Returns 404 if the home does not exist.
    """
    if home_id not in DB["homes"]:
        return jsonify({"error": "Home not found"}), 404

    home_expenses = sorted(
        [e for e in DB["expenses"].values() if e["home_id"] == home_id],
        key=lambda e: e["start_date"],
        reverse=True,
    )
    return jsonify({"expenses": home_expenses}), 200


# ---------------------------------------------------------------------------
# UC05-FR10 — Create a shared expense
# ---------------------------------------------------------------------------
# POST /api/expenses
# Body: { creator_id, title, amount, expense_type, frequency (if recurring),
#         start_date, assigned_to, home_id }
@expenses_bp.route("/expenses", methods=["POST"])
def create_expense():
    """UC05-FR10: Create a new shared expense and generate per-user dues.

    Validates:
    - title must not be empty
    - amount must be > 0
    - assigned_to must not be empty
    - For recurring: frequency must be provided

    Computes next_due_date for recurring expenses.
    Returns 201 { expense, dues } on success.
    """
    data = request.get_json(silent=True) or {}

    creator_id   = (data.get("creator_id") or "").strip()
    title        = (data.get("title") or "").strip()
    expense_type = (data.get("expense_type") or "one_time").strip()
    frequency    = (data.get("frequency") or "").strip()
    start_date   = (data.get("start_date") or "").strip()
    assigned_to  = data.get("assigned_to") or []
    home_id      = (data.get("home_id") or "").strip()

    try:
        amount = float(data.get("amount", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "amount must be a number"}), 400

    # --- Validation ---
    if not title:
        return jsonify({"error": "title is required"}), 400
    if amount <= 0:
        return jsonify({"error": "amount must be greater than 0"}), 400
    if not assigned_to:
        return jsonify({"error": "assigned_to must not be empty"}), 400
    if home_id not in DB["homes"]:
        return jsonify({"error": "Home not found"}), 404
    if expense_type not in ("one_time", "recurring"):
        return jsonify({"error": "expense_type must be one_time or recurring"}), 400
    if expense_type == "recurring" and frequency not in ("weekly", "monthly", "yearly"):
        return jsonify({"error": "frequency must be weekly, monthly, or yearly"}), 400

    next_due_date = None
    if expense_type == "recurring" and start_date:
        next_due_date = _next_due(start_date, frequency)

    expense_id = new_id()
    expense = {
        "id": expense_id,
        "title": title,
        "amount": amount,
        "expense_type": expense_type,
        "frequency": frequency or None,
        "start_date": start_date,
        "next_due_date": next_due_date,
        "assigned_to": assigned_to,
        "creator_id": creator_id,
        "home_id": home_id,
    }
    DB["expenses"][expense_id] = expense

    dues = _build_expense_dues(expense_id, amount, assigned_to,
                               next_due_date or start_date)
    return jsonify({"expense": expense, "dues": dues}), 201


# ---------------------------------------------------------------------------
# UC05-FR11 — Update a shared expense
# ---------------------------------------------------------------------------
# PUT /api/expenses/<expense_id>
# Body: { editor_id, <partial fields to update> }
@expenses_bp.route("/expenses/<expense_id>", methods=["PUT"])
def update_expense(expense_id):
    """UC05-FR11: Partially update an expense and recalculate pending dues.

    editor_id must appear in the expense's assigned_to list (returns 403).
    If the amount is changed, all *pending* dues are updated to the new
    per-person share.  Dues with status "done" are left unchanged.
    Returns 200 with the updated expense on success.
    """
    expense = DB["expenses"].get(expense_id)
    if not expense:
        return jsonify({"error": "Expense not found"}), 404

    data = request.get_json(silent=True) or {}
    editor_id = (data.get("editor_id") or "").strip()

    if editor_id not in expense["assigned_to"]:
        return jsonify({"error": "Only an assigned user can edit this expense"}), 403

    amount_changed = "amount" in data
    new_amount = float(data["amount"]) if amount_changed else expense["amount"]

    # Apply partial field updates
    updatable = ("title", "amount", "expense_type", "frequency",
                 "start_date", "assigned_to")
    for field in updatable:
        if field in data:
            expense[field] = data[field]

    # Recompute next_due_date if start/frequency changed
    if expense["expense_type"] == "recurring" and expense.get("start_date"):
        expense["next_due_date"] = _next_due(
            expense["start_date"], expense.get("frequency") or "monthly"
        )

    # Update pending dues if amount changed
    if amount_changed and new_amount > 0:
        assigned = expense["assigned_to"]
        per_person = round(new_amount / len(assigned), 2)
        for due in DB["dues"].values():
            if (due["expense_id_or_bill_id"] == expense_id
                    and due["status"] == "pending"):
                due["amount"] = per_person

    return jsonify({"expense": expense}), 200
