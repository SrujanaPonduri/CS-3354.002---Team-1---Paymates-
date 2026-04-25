# routes/roommates.py
# Responsible for: UC03 — managing roommate membership within a home.
# Joseph Botros and Aagam Shah
# Covers inviting a new roommate, accepting an invite, listing current
# roommates, and leaving a home.

import time # for invite expiration timestamps
import secrets # for secure invite token generation

# Flask imports for defining routes and handling JSON requests/responses
from flask import Blueprint, g, jsonify, request
from mock_db import DB, new_id
from services.email_service import EmailSendError, send_home_invite

# Blueprint for roommate-related routes, to be registered in the main app
roommates_bp = Blueprint("roommates", __name__)


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

# Helper functions to retrieve home and user records, and to find a user by email.
# Looks up a home by its ID. Returns the home if found or none otherwise. 
def _get_home(home_id: str):
    """Return home record or None."""
    return DB["homes"].get(home_id)

# Looks up a user by their ID. Returns the user if found or none otherwise.
def _get_user(user_id: str):
    """Return user record or None."""
    return DB["users"].get(user_id)

# Loops through every user in DB["users"] and returns the first user whose email matches.
# if no user is found, returns none.
def _find_user_by_email(email: str):
    """Return user record matching email, or None."""
    return next(
        (u for u in DB["users"].values() if u["email"].lower() == email.lower()),
        None,
    )


# ---------------------------------------------------------------------------
# UC03-FR01 — List roommates in a home
# ---------------------------------------------------------------------------
# GET /api/homes/<home_id>/roommates
@roommates_bp.route("/<home_id>/roommates", methods=["GET"])
def list_roommates(home_id):
    """UC03-FR01: Return full user objects for every member of the home.

    Returns 404 if the home_id does not exist.
    """
    home = _get_home(home_id)
    if not home:
        return jsonify({"error": "Home not found"}), 404

    roommates = [
        DB["users"][uid]
        for uid in home["roommate_ids"]
        if uid in DB["users"]
    ]
    return jsonify({"roommates": roommates}), 200


# ---------------------------------------------------------------------------
# UC03-FR02 — Invite a new roommate by email
# ---------------------------------------------------------------------------
# POST /api/homes/<home_id>/invite
# Body: { inviter_id, invitee_email }
@roommates_bp.route("/<home_id>/invite", methods=["POST"])
def invite_roommate(home_id):
    """UC03-FR02: Generate an invite token for a prospective roommate.

    Validates that the inviter belongs to the home, that the invitee is not
    already a member, and stores an invite record expiring in 24 hours.
    Returns 404 if home not found.
    Returns 403 if inviter_id is not a member of the home.
    Returns 409 if invitee_email already belongs to a current member.
    Returns 200 { invite_token } on success (invite email is sent).
    Returns 500 if email URL configuration is invalid; 503 if email delivery fails.
    """
    home = _get_home(home_id)
    if not home:
        return jsonify({"error": "Home not found"}), 404

    data = request.get_json(silent=True) or {}
    inviter_id = (data.get("inviter_id") or "").strip()
    invitee_email = (data.get("invitee_email") or "").strip().lower()

    if not inviter_id or not invitee_email:
        return jsonify({"error": "inviter_id and invitee_email are required"}), 400

    # Validate email format — must contain '@' and a '.' after the '@'
    at_idx = invitee_email.find("@")
    if at_idx < 1 or "." not in invitee_email[at_idx:]:
        return jsonify({"error": "Please enter a valid email address"}), 400

    if inviter_id not in home["roommate_ids"]:
        return jsonify({"error": "You are not a member of this home"}), 403

    # Check if invitee is already a member
    for uid in home["roommate_ids"]:
        user = DB["users"].get(uid)
        if user and user["email"].lower() == invitee_email:
            return jsonify({"error": "That person is already a member of this home"}), 409

    # Generate a cryptographically secure invite token.
    # 24-hour expiry mirrors real-world invite link conventions.
    invite_token = secrets.token_urlsafe(32)
    DB["invites"][invite_token] = {
        "email":      invitee_email,
        "home_id":    home_id,
        "invited_by": inviter_id,
        "expires_at": time.time() + 86400,  # 86 400 s = 24 hours
    }

    inviter = _get_user(inviter_id)
    home_name = (home.get("name") or "").strip() or "your home"
    if inviter:
        inviter_label = (
            (inviter.get("name") or "").strip()
            or (inviter.get("email") or "").strip()
            or "A roommate"
        )
    else:
        inviter_label = "A roommate"

    try:
        send_home_invite(
            invitee_email,
            home_id,
            invite_token,
            home_name=home_name,
            inviter_label=inviter_label,
        )
    except ValueError as exc:
        DB["invites"].pop(invite_token, None)
        return jsonify({"error": str(exc)}), 500
    except EmailSendError:
        DB["invites"].pop(invite_token, None)
        return (
            jsonify({"error": "Unable to send invite email. Please try again later."}),
            503,
        )

    return jsonify({"invite_token": invite_token}), 200


# ---------------------------------------------------------------------------
# UC03-FR03 — Accept an invite and join the home
# ---------------------------------------------------------------------------
# POST /api/homes/<home_id>/accept_invite
# Body: { invite_token, user_id }
@roommates_bp.route("/<home_id>/accept_invite", methods=["POST"])
def accept_invite(home_id):
    """UC03-FR03: Allow a user to join a home by redeeming an invite token.

    Returns 401 if the invite_token is missing or expired.
    Returns 403 if the invite was sent to a different email account.
    Returns 404 if the home or user does not exist.
    Returns 200 { message } on success; token is deleted after use.
    """
    home = _get_home(home_id)
    if not home:
        return jsonify({"error": "Home not found"}), 404

    data = request.get_json(silent=True) or {}
    invite_token = (data.get("invite_token") or "").strip()
    user_id = (data.get("user_id") or "").strip()

    if not invite_token:
        return jsonify({"error": "invite_token is required"}), 400

    invite = DB["invites"].get(invite_token)
    if not invite:
        return jsonify({"error": "Invite token not found"}), 401
    if time.time() > invite["expires_at"]:
        DB["invites"].pop(invite_token, None)
        return jsonify({"error": "Invite token has expired"}), 401
    if invite["home_id"] != home_id:
        return jsonify({"error": "Invite token is for a different home"}), 401

    auth_email = (getattr(g, "auth_email", "") or "").strip().lower()
    if not auth_email:
        return jsonify({"error": "Authentication required"}), 401
    if invite["email"].lower() != auth_email:
        return jsonify({"error": "This invite was sent to a different email address"}), 403

    user = _find_user_by_email(auth_email)
    if not user:
        return jsonify({"error": "User not found"}), 404
    if user_id and user_id != user["id"]:
        return jsonify({"error": "user_id does not match authenticated user"}), 403
    user_id = user["id"]

    # Idempotent join — if the user is somehow already in the home (e.g., race
    # condition), silently skip the append rather than raising an error.
    if user_id not in home["roommate_ids"]:
        home["roommate_ids"].append(user_id)
    if home_id not in user["home_ids"]:
        user["home_ids"].append(home_id)

    # One-time use: consume the token so it cannot be reused.
    DB["invites"].pop(invite_token, None)

    return jsonify({"message": "joined home", "home": home}), 200


# ---------------------------------------------------------------------------
# UC03-FR04 — Leave a home
# ---------------------------------------------------------------------------
# DELETE /api/homes/<home_id>/leave
# Body: { user_id }
@roommates_bp.route("/<home_id>/leave", methods=["DELETE"])
def leave_home(home_id):
    """UC03-FR04: Remove a user from a home.

    Returns 404 if the home or user does not exist.
    Returns 400 if the user is the only remaining member (home would be empty).
    Returns 200 { message } on success.
    """
    home = _get_home(home_id)
    if not home:
        return jsonify({"error": "Home not found"}), 404

    data = request.get_json(silent=True) or {}
    user_id = (data.get("user_id") or "").strip()

    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    user = _get_user(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    if user_id not in home["roommate_ids"]:
        return jsonify({"error": "User is not a member of this home"}), 400

    # UC02-TC6 guard: the last member cannot leave using this endpoint.
    # They must use the UC02 delete-home flow instead (DELETE /homes/<id>).
    if len(home["roommate_ids"]) <= 1:
        return jsonify({"error": "Cannot leave — you are the only member remaining"}), 400

    # Remove the user from both sides of the relationship.
    home["roommate_ids"].remove(user_id)
    if home_id in user["home_ids"]:
        user["home_ids"].remove(home_id)

    return jsonify({"message": "left home"}), 200
