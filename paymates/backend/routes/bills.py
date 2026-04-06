# routes/bills.py
# Responsible for: UC04 — creating and editing itemized bills, calculating
# Srujana Ponduri - UC04.
# per-roommate splits (evenly / by_item / fixed_amount), and attaching
# receipt URLs (FR-14).

# Flask imports for defining routes and handling JSON requests/responses
from flask import Blueprint, jsonify, request
from mock_db import DB, new_id

bills_bp = Blueprint("bills", __name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# Takes a list of items and a tax amount and calculates the total price. 
def _calc_total(items: list, tax: float) -> float:
    """Sum all line-item subtotals and add tax."""
    subtotal = sum(
        float(item.get("quantity", 1)) * float(item.get("unit_price", 0))
        for item in items
    )
    return round(subtotal + float(tax or 0), 2)

# This method takes a bill and figures out how much each person owes based on the split parameters. 
def _build_dues(bill_id: str, split_type: str, items: list, total: float,
                assigned_roommates: list, fixed_amounts: dict, date: str) -> list:
    """Return a list of due records based on the split strategy.

    split_type == "evenly":
        Divide total equally among all assigned roommates.

    split_type == "by_item":
        Each user owes the sum of items where their user_id appears in
        the item's owner_ids list.  The cost of each item is split equally
        among that item's owners.

    split_type == "fixed_amount":
        Use the provided fixed_amounts dict {user_id: amount}.
        Validates that the values sum to within $0.01 of total.
    """
    dues = []

    if split_type == "evenly": # if bill is split evenly. 
        per_person = round(total / len(assigned_roommates), 2)
        for uid in assigned_roommates:
            due_id = new_id()
            due = {
                "id": due_id,
                "expense_id_or_bill_id": bill_id,
                "user_id": uid,
                "amount": per_person,
                "due_date": date,
                "status": "pending",
            }
            DB["dues"][due_id] = due
            dues.append(due)

    elif split_type == "by_item": # if bill is split by item ownership. 
        user_totals: dict = {uid: 0.0 for uid in assigned_roommates}
        for item in items:
            owner_ids = item.get("owner_ids", [])
            if not owner_ids:
                continue
            item_subtotal = float(item.get("quantity", 1)) * float(item.get("unit_price", 0))
            share = item_subtotal / len(owner_ids)
            for oid in owner_ids:
                if oid in user_totals:
                    user_totals[oid] = round(user_totals[oid] + share, 2)

        for uid, amount in user_totals.items():
            due_id = new_id()
            due = {
                "id": due_id,
                "expense_id_or_bill_id": bill_id,
                "user_id": uid,
                "amount": amount,
                "due_date": date,
                "status": "pending",
            }
            DB["dues"][due_id] = due
            dues.append(due)

    elif split_type == "fixed_amount": # if bill is split by fized amounts. 
        # Validate that fixed amounts sum to total (within $0.01 tolerance)
        provided_sum = round(sum(float(v) for v in fixed_amounts.values()), 2)
        if abs(provided_sum - total) > 0.01:
            raise ValueError(
                f"fixed_amounts sum ({provided_sum}) does not match bill total ({total})"
            )
        for uid, amount in fixed_amounts.items():
            due_id = new_id()
            due = {
                "id": due_id,
                "expense_id_or_bill_id": bill_id,
                "user_id": uid,
                "amount": round(float(amount), 2),
                "due_date": date,
                "status": "pending",
            }
            DB["dues"][due_id] = due
            dues.append(due)

    return dues

# This method deletes all pending dues related to a bill. 
def _delete_pending_dues(bill_id: str):
    """Remove all *pending* due records associated with bill_id."""
    to_remove = [
        did for did, d in DB["dues"].items()
        if d["expense_id_or_bill_id"] == bill_id and d["status"] == "pending"
    ]
    for did in to_remove:
        del DB["dues"][did]


# ---------------------------------------------------------------------------
# UC04-FR06 — List bills for a home
# ---------------------------------------------------------------------------
# GET /api/homes/<home_id>/bills
# Returns all bills belonging to the home, sorted newest-first.
@bills_bp.route("/homes/<home_id>/bills", methods=["GET"])
def list_bills(home_id):
    """UC04-FR06: Return all bills belonging to a home, sorted newest-first.

    Returns 404 if the home does not exist.
    """
    if home_id not in DB["homes"]:
        return jsonify({"error": "Home not found"}), 404

    home_bills = sorted(
        [b for b in DB["bills"].values() if b["home_id"] == home_id],
        key=lambda b: b["date"],
        reverse=True,
    )
    return jsonify({"bills": home_bills}), 200


# ---------------------------------------------------------------------------
# UC04-FR07 — Create an itemized bill
# ---------------------------------------------------------------------------
# POST /api/bills
# Body: { creator_id, title, date, category, split_type, items, tax,
#         assigned_roommates, fixed_amounts (optional), home_id }
# Returns 201 with the created bill and generated dues on success.
@bills_bp.route("/bills", methods=["POST"])
def create_bill():
    """UC04-FR07: Create a new itemized bill and generate per-roommate dues.

    Validates:
    - title and items must not be empty
    - assigned_roommates must not be empty
    - For fixed_amount split: the amounts must sum to the calculated total

    Returns 201 { bill, dues } on success.
    """
    data = request.get_json(silent=True) or {}

    creator_id         = (data.get("creator_id") or "").strip()
    title              = (data.get("title") or "").strip()
    date               = (data.get("date") or "").strip()
    category           = (data.get("category") or "").strip()
    split_type         = (data.get("split_type") or "evenly").strip()
    items              = data.get("items") or []
    tax                = float(data.get("tax") or 0)
    assigned_roommates = data.get("assigned_roommates") or []
    fixed_amounts      = data.get("fixed_amounts") or {}
    home_id            = (data.get("home_id") or "").strip()

    # --- Validation ---
    if not title:
        return jsonify({"error": "title is required"}), 400
    if not items:
        return jsonify({"error": "items list must not be empty"}), 400
    if not assigned_roommates:
        return jsonify({"error": "assigned_roommates must not be empty"}), 400
    if home_id not in DB["homes"]:
        return jsonify({"error": "Home not found"}), 404
    if split_type not in ("evenly", "by_item", "fixed_amount"):
        return jsonify({"error": "split_type must be evenly, by_item, or fixed_amount"}), 400

    total = _calc_total(items, tax)
    bill_id = new_id()
    bill = {
        "id": bill_id,
        "title": title,
        "date": date,
        "category": category,
        "split_type": split_type,
        "items": items,
        "tax": tax,
        "total": total,
        "assigned_roommates": assigned_roommates,
        "receipt_url": None,
        "created_by": creator_id,
        "home_id": home_id,
    }

    try:
        dues = _build_dues(bill_id, split_type, items, total,
                           assigned_roommates, fixed_amounts, date)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    DB["bills"][bill_id] = bill
    return jsonify({"bill": bill, "dues": dues}), 201


# ---------------------------------------------------------------------------
# UC04-FR08 — Update an existing bill
# ---------------------------------------------------------------------------
# PUT /api/bills/<bill_id>
# Body: partial update fields; must include editor_id
# If items, tax, or split_type are updated, all pending dues are deleted and
@bills_bp.route("/bills/<bill_id>", methods=["PUT"])
def update_bill(bill_id):
    """UC04-FR08: Edit a bill's fields and recalculate pending dues.

    Only the original creator may edit the bill (returns 403 otherwise).
    If items, tax, or split_type changed, all *pending* dues are removed and
    regenerated.  Dues with status "done" are left unchanged.
    Returns 200 with the updated bill on success.
    """
    bill = DB["bills"].get(bill_id)
    if not bill:
        return jsonify({"error": "Bill not found"}), 404

    data = request.get_json(silent=True) or {}
    editor_id = (data.get("editor_id") or "").strip()

    if editor_id != bill["created_by"]:
        return jsonify({"error": "Only the bill creator can edit this bill"}), 403

    # Apply partial field updates
    updatable = ("title", "date", "category", "split_type",
                 "items", "tax", "assigned_roommates")
    changed_split_fields = False
    for field in updatable:
        if field in data:
            if field in ("items", "tax", "split_type", "assigned_roommates"):
                changed_split_fields = True
            bill[field] = data[field]

    # Recalculate total if line items or tax were touched
    if changed_split_fields:
        bill["total"] = _calc_total(bill["items"], bill["tax"])
        fixed_amounts = data.get("fixed_amounts") or {}
        _delete_pending_dues(bill_id)
        try:
            _build_dues(
                bill_id, bill["split_type"], bill["items"], bill["total"],
                bill["assigned_roommates"], fixed_amounts, bill["date"],
            )
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

    return jsonify({"bill": bill}), 200


# ---------------------------------------------------------------------------
# UC04-FR14 — Attach a receipt URL to a bill
# ---------------------------------------------------------------------------
# POST /api/bills/<bill_id>/receipt
# Body: { receipt_url }
# Simulates image upload (FR-14) — stores a URL string only, no real file
@bills_bp.route("/bills/<bill_id>/receipt", methods=["POST"])
def attach_receipt(bill_id):
    """UC04-FR14: Save a receipt URL on a bill.

    Simulates image upload (FR-14) — stores a URL string only, no real file
    handling.  Returns 200 { message } on success.
    """
    bill = DB["bills"].get(bill_id)
    if not bill:
        return jsonify({"error": "Bill not found"}), 404

    data = request.get_json(silent=True) or {}
    receipt_url = (data.get("receipt_url") or "").strip()

    if not receipt_url:
        return jsonify({"error": "receipt_url is required"}), 400

    bill["receipt_url"] = receipt_url
    return jsonify({"message": "receipt saved", "receipt_url": receipt_url}), 200
