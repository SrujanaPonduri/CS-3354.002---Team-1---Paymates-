# routes/homes.py
# Responsible for: UC02 — creating homes (TC1–TC3), voting to delete a home
# Ashwin Avadhanula
# (TC4–TC5), and listing all homes a user belongs to.
# TC1: valid create → 201
# TC2: missing name → 400 with field-level error
# TC3: duplicate home name under same account → 409
# TC4: delete vote when not all members have voted → 200 {deleted: false}
# TC5: last member votes → home deleted → 200 {deleted: true}
# TC6: leave home is handled in routes/roommates.py

from flask import Blueprint, jsonify, request
from mock_db import DB, new_id
import time

homes_bp = Blueprint("homes", __name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_user(user_id: str):
    return DB["users"].get(user_id)


def _get_home(home_id: str):
    return DB["homes"].get(home_id)


def _user_home_names(user_id: str) -> list[str]:
    """Return lowercased names of all homes the user already belongs to."""
    user = _get_user(user_id)
    if not user:
        return []
    return [
        DB["homes"][hid]["name"].lower()
        for hid in user.get("home_ids", [])
        if hid in DB["homes"]
    ]


def _purge_home(home_id: str):
    """Remove a home and clean up every member's home_ids list."""
    home = DB["homes"].pop(home_id, None)
    if not home:
        return
    for uid in home.get("roommate_ids", []):
        user = DB["users"].get(uid)
        if user and home_id in user["home_ids"]:
            user["home_ids"].remove(home_id)


# ---------------------------------------------------------------------------
# UC02-TC1/TC2/TC3 — Create a new home
# ---------------------------------------------------------------------------
# POST /api/homes
# Body: { creator_id, name, address }
@homes_bp.route("/homes", methods=["POST"])
def create_home():
    """UC02-TC1/TC2/TC3: Create a new shared home.

    TC1 — valid data: returns 201 with the created home object.
    TC2 — incomplete data: returns 400 with a field-level error message
          prompting the user to fill in the required fields.
    TC3 — duplicate name: returns 409 when the user already belongs to a home
          with the same name, prompting them to choose a different name.
    """
    data = request.get_json(silent=True) or {}
    creator_id = (data.get("creator_id") or "").strip()
    name       = (data.get("name") or "").strip()
    address    = (data.get("address") or "").strip()

    # TC2 — validate required fields
    if not name:
        return jsonify({"error": "Home name is required.", "field": "name"}), 400
    if not creator_id:
        return jsonify({"error": "creator_id is required."}), 400

    creator = _get_user(creator_id)
    if not creator:
        return jsonify({"error": "User not found."}), 404

    # TC3 — reject duplicate name within the same user's homes
    if name.lower() in _user_home_names(creator_id):
        return jsonify({
            "error": "You already have a home with that name. Please choose a different name.",
            "field": "name",
        }), 409

    home_id = new_id()
    home = {
        "id":             home_id,
        "name":           name,
        "address":        address,
        "roommate_ids":   [creator_id],
        "creator_id":     creator_id,
        "deletion_votes": [],
        "created_at":     time.time(),
    }
    DB["homes"][home_id] = home
    creator["home_ids"].append(home_id)

    return jsonify({"home": home}), 201


# ---------------------------------------------------------------------------
# UC02 — List all homes for a user
# ---------------------------------------------------------------------------
# GET /api/homes?user_id=<uid>
@homes_bp.route("/homes", methods=["GET"])
def list_homes():
    """UC02: Return all homes the requesting user belongs to.

    Query param: user_id (required).
    Returns 404 if the user does not exist.
    Each home object includes a 'member_count' and 'is_creator' convenience field.
    """
    user_id = (request.args.get("user_id") or "").strip()
    if not user_id:
        return jsonify({"error": "user_id query param is required."}), 400

    user = _get_user(user_id)
    if not user:
        return jsonify({"error": "User not found."}), 404

    homes = []
    for hid in user.get("home_ids", []):
        home = DB["homes"].get(hid)
        if not home:
            continue
        homes.append({
            **home,
            "member_count": len(home["roommate_ids"]),
            "is_creator":   home.get("creator_id") == user_id,
            "votes_cast":   len(home.get("deletion_votes", [])),
        })

    return jsonify({"homes": homes}), 200


# ---------------------------------------------------------------------------
# UC02 — Get a single home with member details
# ---------------------------------------------------------------------------
# GET /api/homes/<home_id>/detail
@homes_bp.route("/homes/<home_id>/detail", methods=["GET"])
def get_home(home_id):
    """UC02: Return a single home plus full user objects for each member."""
    home = _get_home(home_id)
    if not home:
        return jsonify({"error": "Home not found."}), 404

    members = [
        DB["users"][uid]
        for uid in home["roommate_ids"]
        if uid in DB["users"]
    ]
    return jsonify({"home": home, "members": members}), 200


# ---------------------------------------------------------------------------
# UC02-TC4/TC5 — Vote to delete a home (requires unanimous consent)
# ---------------------------------------------------------------------------
# POST /api/homes/<home_id>/delete_vote
# Body: { user_id }
@homes_bp.route("/homes/<home_id>/delete_vote", methods=["POST"])
def vote_to_delete(home_id):
    """UC02-TC4/TC5: Cast a deletion vote for a home.

    TC4 — not yet unanimous: returns 200 { deleted: false, votes_cast, total }
          with a message stating that unanimous consent is required.
    TC5 — all members voted: home is deleted immediately;
          returns 200 { deleted: true }.

    Returns 403 if the user is not a member of the home.
    Returns 400 if the user has already voted.
    """
    home = _get_home(home_id)
    if not home:
        return jsonify({"error": "Home not found."}), 404

    data    = request.get_json(silent=True) or {}
    user_id = (data.get("user_id") or "").strip()

    if not user_id:
        return jsonify({"error": "user_id is required."}), 400
    if user_id not in home["roommate_ids"]:
        return jsonify({"error": "You are not a member of this home."}), 403
    if user_id in home["deletion_votes"]:
        return jsonify({"error": "You have already voted to delete this home."}), 400

    home["deletion_votes"].append(user_id)

    total      = len(home["roommate_ids"])
    votes_cast = len(home["deletion_votes"])

    # TC5 — unanimous consent reached: delete the home
    if votes_cast >= total:
        _purge_home(home_id)
        return jsonify({
            "deleted":    True,
            "message":    "All members agreed. The home has been deleted.",
        }), 200

    # TC4 — waiting for more votes
    return jsonify({
        "deleted":    False,
        "votes_cast": votes_cast,
        "total":      total,
        "message":    f"{votes_cast} of {total} members have voted. Unanimous consent is required to delete the home.",
    }), 200


# ---------------------------------------------------------------------------
# UC02-TC5 — Hard-delete a home (only when sole remaining member)
# ---------------------------------------------------------------------------
# DELETE /api/homes/<home_id>
# Body: { user_id }
@homes_bp.route("/homes/<home_id>", methods=["DELETE"])
def delete_home(home_id):
    """UC02-TC5 (sole-member shortcut): Immediately delete a home when only
    one member remains — no vote required since there is no one else to consult.

    Returns 403 if the user is not the creator or not the sole member.
    Returns 400 if more than one member remains (use delete_vote instead).
    """
    home = _get_home(home_id)
    if not home:
        return jsonify({"error": "Home not found."}), 404

    data    = request.get_json(silent=True) or {}
    user_id = (data.get("user_id") or "").strip()

    if user_id not in home["roommate_ids"]:
        return jsonify({"error": "You are not a member of this home."}), 403
    if len(home["roommate_ids"]) > 1:
        return jsonify({
            "error": "Cannot delete home directly — use the delete vote process. Unanimous consent from all members is required.",
        }), 400

    _purge_home(home_id)
    return jsonify({"deleted": True, "message": "Home deleted successfully."}), 200
