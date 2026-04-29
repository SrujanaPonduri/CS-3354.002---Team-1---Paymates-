# routes/budgets.py
# Responsible for: UC-12 — Create/Manage Budget.
# Kavya Seenuvasan
#
# FR-04: Allow users to add a Budget to their Home (amount allocated to expenses).
# FR-05: Allow users to create Budgets for various categories (e.g. groceries, utilities).
# FR-06: Allow users to add a balance to a Budget.
#
# Endpoints:
#   GET   /api/homes/<home_id>/budgets              — list budgets for a home
#   POST  /api/homes/<home_id>/budgets              — FR-04/05: Create a budget under a home
#   PATCH /api/budgets/<budget_id>/edit             — edit budget amount, category, visibility, period
#   PATCH /api/budgets/<budget_id>/add-balance      — FR-06: Add spending to a budget

from flask import Blueprint, jsonify, request
from mock_db import DB, new_id

budgets_bp = Blueprint("budgets", __name__)


# ---------------------------------------------------------------------------
# GET /api/homes/<home_id>/budgets — list all budgets for a home
# ---------------------------------------------------------------------------
@budgets_bp.route("/homes/<home_id>/budgets", methods=["GET"])
def list_budgets(home_id):
    """Return all budgets belonging to a home."""
    if home_id not in DB["homes"]:
        return jsonify({"error": "Home not found"}), 404

    home_budgets = [b for b in DB["budgets"].values() if b.get("home_id") == home_id]
    return jsonify({"budgets": home_budgets}), 200


# ---------------------------------------------------------------------------
# POST /api/homes/<home_id>/budgets — create a budget for a home
# ---------------------------------------------------------------------------
@budgets_bp.route("/homes/<home_id>/budgets", methods=["POST"])
def create_budget(home_id):
    """FR-04/05: Create a new budget category and spending limit for a home."""
    if home_id not in DB["homes"]:
        return jsonify({"error": "Home not found"}), 404

    data = request.get_json(silent=True) or {}
    category     = (data.get("category") or "").strip()
    # Accept budget_amount (frontend) or limit (legacy)
    raw_amount   = data.get("budget_amount") if data.get("budget_amount") is not None else data.get("limit")
    visibility   = data.get("visibility", "all")
    month        = data.get("month")
    year         = data.get("year")
    creator_id   = (data.get("creator_id") or "").strip()

    if not category:
        return jsonify({"error": "category is required"}), 400
    if raw_amount is None:
        return jsonify({"error": "budget_amount is required"}), 400

    try:
        budget_amount = float(raw_amount)
        if budget_amount <= 0:
            return jsonify({"error": "budget_amount must be a positive number"}), 400
    except (ValueError, TypeError):
        return jsonify({"error": "budget_amount must be a number"}), 400

    # FR-05: Prevent duplicate categories within the same home
    duplicate = next(
        (b for b in DB["budgets"].values()
         if b["home_id"] == home_id
         and (b.get("category") or "").strip().lower() == category.lower()),
        None,
    )
    if duplicate:
        return jsonify({"error": "A budget for that category already exists in this home"}), 409

    budget_id = new_id()
    new_budget = {
        "id":              budget_id,
        "home_id":         home_id,
        "category":        category,
        "budget_amount":   budget_amount,
        "current_balance": 0.0,
        "visibility":      visibility,
        "month":           month,
        "year":            year,
        "creator_id":      creator_id,
    }

    DB["budgets"][budget_id] = new_budget
    return jsonify({"budget": new_budget}), 201


# ---------------------------------------------------------------------------
# PATCH /api/budgets/<budget_id>/edit — edit a budget
# ---------------------------------------------------------------------------
@budgets_bp.route("/budgets/<budget_id>/edit", methods=["PATCH"])
def edit_budget(budget_id):
    """Update a budget's amount, category, visibility, and/or period."""
    budget = DB["budgets"].get(budget_id)
    if not budget:
        return jsonify({"error": "Budget not found"}), 404

    data = request.get_json(silent=True) or {}

    # --- budget_amount ---
    if "budget_amount" in data:
        try:
            amt = float(data["budget_amount"])
            if amt <= 0:
                return jsonify({"error": "budget_amount must be a positive number"}), 400
            budget["budget_amount"] = amt
        except (ValueError, TypeError):
            return jsonify({"error": "budget_amount must be a number"}), 400

    # --- category ---
    if "category" in data:
        new_cat = (data["category"] or "").strip()
        if not new_cat:
            return jsonify({"error": "category cannot be empty"}), 400
        # Check for duplicate in same home (excluding self)
        conflict = next(
            (b for b in DB["budgets"].values()
             if b["home_id"] == budget["home_id"]
             and (b.get("category") or "").strip().lower() == new_cat.lower()
             and b["id"] != budget_id),
            None,
        )
        if conflict:
            return jsonify({"error": "A budget with that category already exists in this home"}), 409
        budget["category"] = new_cat

    # --- visibility / period ---
    if "visibility" in data:
        budget["visibility"] = data["visibility"]
    if "month" in data:
        budget["month"] = data["month"]
    if "year" in data:
        budget["year"] = data["year"]

    return jsonify({"budget": budget}), 200


# ---------------------------------------------------------------------------
# PATCH /api/budgets/<budget_id>/add-balance — FR-06: add spending to a budget
# ---------------------------------------------------------------------------
@budgets_bp.route("/budgets/<budget_id>/add-balance", methods=["PATCH"])
def add_budget_balance(budget_id):
    """FR-06: Add an amount to the current budget spending."""
    budget = DB["budgets"].get(budget_id)
    if not budget:
        return jsonify({"error": "Budget not found"}), 404

    data = request.get_json(silent=True) or {}
    amount = data.get("amount")

    try:
        amount_val = float(amount)
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid amount"}), 400

    current = float(budget.get("current_balance", 0.0) or 0.0)
    budget["current_balance"] = round(current + amount_val, 2)
    return jsonify({"budget": budget}), 200