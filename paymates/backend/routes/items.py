# routes/items.py
# Responsible for: UC07 (shared inventory — list, add, retrieve items) and
# UC08 (item ownership — add or remove owner claims on an item).
# UC08 - Srujana Ponduri 
# UC07 - Kavya Seenuvasan 

from flask import Blueprint, jsonify, request
from mock_db import DB, new_id

items_bp = Blueprint("items", __name__)


# ---------------------------------------------------------------------------
# UC07-FR15 — List inventory items for a home (with filtering/sorting)
# ---------------------------------------------------------------------------
# GET /api/homes/<home_id>/items
# Query params: search, category, owner_id, sort_by (default "name")
@items_bp.route("/homes/<home_id>/items", methods=["GET"])
def list_items(home_id):
    """UC07-FR15: Return all inventory items in a home with optional filters.

    Query params:
    - search    : case-insensitive substring match against item name
    - category  : exact category filter (e.g. "Groceries")
    - owner_id  : only include items where this user_id is in owners
    - sort_by   : field to sort by (default "name"; also accepts "unit_price",
                  "quantity", "purchased_on")

    Returns 404 if the home does not exist.
    Returns { items: [...], total: int }.
    """
    if home_id not in DB["homes"]:
        return jsonify({"error": "Home not found"}), 404

    search   = (request.args.get("search") or "").strip().lower()
    category = (request.args.get("category") or "").strip()
    owner_id = (request.args.get("owner_id") or "").strip()
    sort_by  = (request.args.get("sort_by") or "name").strip()

    results = [i for i in DB["items"].values() if i["home_id"] == home_id]

    if search:
        results = [i for i in results if search in i["name"].lower()]

    if category:
        results = [i for i in results if i["category"] == category]

    if owner_id:
        results = [i for i in results if owner_id in i["owners"]]

    # Sort — default to "name" for any unrecognised sort_by value
    valid_sort_fields = {"name", "unit_price", "quantity", "purchased_on"}
    sort_key = sort_by if sort_by in valid_sort_fields else "name"
    results.sort(key=lambda i: (i.get(sort_key) or ""))

    return jsonify({"items": results, "total": len(results)}), 200


# ---------------------------------------------------------------------------
# UC07-FR16 — Add a new item to the home inventory
# ---------------------------------------------------------------------------
# POST /api/homes/<home_id>/items
# Body: { added_by, name, category, quantity, unit_price, purchased_on }
@items_bp.route("/homes/<home_id>/items", methods=["POST"])
def add_item(home_id):
    """UC07-FR16: Create a new inventory item owned by the adding user.

    The person who adds the item (added_by) is set as the sole initial owner.
    Returns 404 if the home does not exist.
    Returns 201 with the new item on success.
    """
    if home_id not in DB["homes"]:
        return jsonify({"error": "Home not found"}), 404

    data = request.get_json(silent=True) or {}
    added_by     = (data.get("added_by") or "").strip()
    name         = (data.get("name") or "").strip()
    category     = (data.get("category") or "").strip()
    purchased_on = (data.get("purchased_on") or "").strip()

    try:
        quantity   = float(data.get("quantity", 1))
        unit_price = float(data.get("unit_price", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "quantity and unit_price must be numbers"}), 400

    if not name:
        return jsonify({"error": "name is required"}), 400
    if not added_by:
        return jsonify({"error": "added_by is required"}), 400

    item_id = new_id()
    item = {
        "id":          item_id,
        "name":        name,
        "category":    category,
        "quantity":    quantity,
        "unit_price":  unit_price,
        # UC07/UC08: the person who adds the item is automatically the
        # first (and sole) owner.  Additional owners can be added later
        # via POST /items/<id>/owners (UC08-FR18).
        "owners":      [added_by],
        "home_id":     home_id,
        "purchased_on": purchased_on,
    }
    DB["items"][item_id] = item
    return jsonify({"item": item}), 201


# ---------------------------------------------------------------------------
# UC07-FR17 — Get a single item with full owner details
# ---------------------------------------------------------------------------
# GET /api/items/<item_id>
@items_bp.route("/items/<item_id>", methods=["GET"])
def get_item(item_id):
    """UC07-FR17: Return a single item plus full user objects for each owner.

    The response includes an "owner_details" list so the frontend can display
    owner names without a separate lookup.
    Returns 404 if the item does not exist.
    """
    item = DB["items"].get(item_id)
    if not item:
        return jsonify({"error": "Item not found"}), 404

    owner_details = [
        DB["users"][uid]
        for uid in item["owners"]
        if uid in DB["users"]
    ]
    return jsonify({**item, "owner_details": owner_details}), 200


# ---------------------------------------------------------------------------
# UC08-FR18 — Add a co-owner to an item
# ---------------------------------------------------------------------------
# POST /api/items/<item_id>/owners
# Body: { requester_id, new_owner_id }
# Allows an existing owner to add another user as a co-owner of the item.
@items_bp.route("/items/<item_id>/owners", methods=["POST"])
def add_owner(item_id):
    """UC08-FR18: Allow an existing owner to add another user as a co-owner.

    Returns 404 if the item does not exist.
    Returns 403 if requester_id is not already in item["owners"].
    Returns 409 if new_owner_id is already an owner.
    Returns 200 with the updated item on success.
    """
    item = DB["items"].get(item_id)
    if not item:
        return jsonify({"error": "Item not found"}), 404

    data = request.get_json(silent=True) or {}
    requester_id = (data.get("requester_id") or "").strip()
    new_owner_id = (data.get("new_owner_id") or "").strip()

    if not requester_id or not new_owner_id:
        return jsonify({"error": "requester_id and new_owner_id are required"}), 400

    if requester_id not in item["owners"]:
        return jsonify({"error": "Only an existing owner can add a new owner"}), 403

    if new_owner_id in item["owners"]:
        return jsonify({"error": "User is already an owner of this item"}), 409

    if new_owner_id not in DB["users"]:
        return jsonify({"error": "New owner user not found"}), 404

    item["owners"].append(new_owner_id)
    return jsonify({"item": item}), 200


# ---------------------------------------------------------------------------
# UC08-FR19 — Remove an owner from an item
# ---------------------------------------------------------------------------
# DELETE /api/items/<item_id>/owners/<owner_id>
# Body: { requester_id }
# Allows an existing owner to remove another owner from the item, as long as one user remainds after deletion 
@items_bp.route("/items/<item_id>/owners/<owner_id>", methods=["DELETE"])
def remove_owner(item_id, owner_id):
    """UC08-FR19: Remove a co-owner from an item.

    Returns 404 if the item does not exist.
    Returns 403 if requester_id is not an existing owner.
    Returns 400 if removing owner_id would leave the item with zero owners.
    Returns 200 with the updated item on success.
    """
    item = DB["items"].get(item_id)
    if not item:
        return jsonify({"error": "Item not found"}), 404

    data = request.get_json(silent=True) or {}
    requester_id = (data.get("requester_id") or "").strip()

    if not requester_id:
        return jsonify({"error": "requester_id is required"}), 400

    if requester_id not in item["owners"]:
        return jsonify({"error": "Only an existing owner can modify ownership"}), 403

    if owner_id not in item["owners"]:
        return jsonify({"error": "That user is not an owner of this item"}), 400

    # UC08-FR19 invariant: an item must always have at least one owner.
    # This prevents "orphaned" items that no one is responsible for.
    if len(item["owners"]) <= 1:
        return jsonify({"error": "Cannot remove the last owner — item must have at least one owner"}), 400

    item["owners"].remove(owner_id)
    return jsonify({"item": item}), 200
