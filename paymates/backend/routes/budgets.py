from flask import Blueprint, jsonify, request
from mock_db import DB, new_id

budgets_bp = Blueprint("budgets", __name__)

@budgets_bp.route("/budgets", methods=["POST"])
def create_budget():
    """UC11-FR04/05: Create a new budget category and limit."""
    data = request.get_json(silent=True) or {}
    home_id = data.get("home_id")
    category = data.get("category", "").strip()
    limit = data.get("limit")

    if not home_id or not category or limit is None:
        return jsonify({"error": "home_id, category, and limit are required"}), 400

    try:
        limit_val = float(limit)
        if limit_val < 0:
            return jsonify({"error": "Limit must be a positive number"}), 400
    except ValueError:
        return jsonify({"error": "Limit must be a number"}), 400

    # Check for duplicates in the specific home (Test Case 5 logic)
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
    """UC11-FR06: Add an amount to the current budget spending."""
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