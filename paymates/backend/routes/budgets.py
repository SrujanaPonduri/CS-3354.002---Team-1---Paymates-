# routes/budgets.py
# Responsible for: UC-12 — Create/Manage Budget.
# Kavya Seenuvasan
#
# FR-04: Allow users to add a Budget to their Home (amount allocated to expenses).
# FR-05: Allow users to create Budgets for various categories (e.g. groceries, utilities).
# FR-06: Allow users to add a balance to a Budget.
#
# Endpoints:
#   POST  /api/budgets                          — FR-04/05: Create a budget (standalone)
#   PATCH /api/budgets/<budget_id>/add-balance  — FR-06:    Add spending to a budget

from flask import Blueprint, jsonify, request
from mock_db import DB, new_id

budgets_bp = Blueprint("budgets", __name__)

@budgets_bp.route("/budgets", methods=["POST"])
def create_budget():
    """FR-04/05: Create a new budget category and limit."""
    data = request.get_json(silent=True) or {}
    home_id = data.get("home_id")
    category = data.get("category", "").strip()
    limit = data.get("limit")

    if not home_id or not category or limit is None:
        return jsonify({"error": "home_id, category, and limit are required"}), 400

    try:
        limit_val = float(limit)
        if limit_val <= 0:
            return jsonify({"error": "Limit must be a positive number"}), 400
    except ValueError:
        return jsonify({"error": "Limit must be a number"}), 400

    # FR-05: Prevent duplicate categories within the same Home (TC8 logic).
    existing = [b for b in DB["budgets"].values() if b["home_id"] == home_id and b["category"] == category]
    if existing:
        return jsonify({"error": "Budget category already exists for this home"}), 409

    budget_id = new_id()
    new_budget = {
        "id": budget_id,
        "home_id": home_id,
        "category": category,
        "limit": limit_val,
        "current_balance": 0.0,
        "visibility": data.get("visibility", "all") 
    }
    
    DB["budgets"][budget_id] = new_budget
    return jsonify({"budget": new_budget}), 201

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

    budget["current_balance"] += amount_val
    return jsonify({"budget": budget}), 200