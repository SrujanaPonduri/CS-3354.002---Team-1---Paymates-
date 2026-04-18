# routes/auth.py
# Responsible for: UC01 — user registration (sign-up), login, magic-link token
# Joseph Botros and Aagam Shah
# verification, and account-setup (profile creation after first login).

import os
import time # for token expiration timestamps
import secrets # for secure token generation

from flask import Blueprint, jsonify, request # for defining routes and handling JSON requests/responses
from mock_db import DB, new_id # mock in-memory database and ID generator
from services.email_service import EmailSendError, send_magic_link

auth_bp = Blueprint("auth", __name__) # Blueprint for auth-related routes, to be registered in the main app


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

# Loops through every user in DB["users"] and returns the first user whose email matches. 
# if no user is found, returns none. 
# This method is also used to check if an user is already registered in the app. 
def _find_user_by_email(email: str):
    """Return the user record matching *email*, or None."""
    return next(
        (u for u in DB["users"].values() if u["email"].lower() == email.lower()),
        None,
    )

# Generates 32 random buytes encoded as a URL-safe string which is sent to the user for verification. 
# This is what stimulates the magic-link that the user receives when he/she tries to log in. 
def _generate_token(email: str) -> str:
    """Create a URL-safe token, store it in DB["tokens"], and return it.

    Token expires in 900 seconds (15 minutes).  The link is emailed via
    services.email_service; set MAGIC_LINK_RETURN_TOKEN=true to also return
    the token in the JSON body (local dev / automated tests).
    """
    # secrets.token_urlsafe(32) generates 43 characters of base64url-encoded
    # random bytes — cryptographically secure and collision-resistant.
    token = secrets.token_urlsafe(32)
    DB["tokens"][token] = {
        "email": email,
        "expires_at": time.time() + 900,  # 15-minute window
    }
    return token

# Checks if the token exists in the DB and if it has not expired. If valid, returns the token record (which includes the associated email and expiration timestamp). 
# If the token is missing or has expired, returns None. Expired tokens are also cleaned up from the DB.
def _verify_token(token: str):
    """Return the token record if valid, or None if missing / expired."""
    record = DB["tokens"].get(token)
    if not record:
        return None
    if time.time() > record["expires_at"]:
        DB["tokens"].pop(token, None)   # clean up expired token
        return None
    return record


def _magic_link_return_token() -> bool:
    return os.environ.get("MAGIC_LINK_RETURN_TOKEN", "").lower() in ("1", "true", "yes")


def _issue_magic_link(email: str, token: str, *, signup: bool):
    """Send the magic-link email; on failure revoke *token* and return (response, status)."""
    try:
        send_magic_link(email, token, signup=signup)
    except ValueError as exc:
        DB["tokens"].pop(token, None)
        return jsonify({"error": str(exc)}), 500
    except EmailSendError:
        DB["tokens"].pop(token, None)
        return jsonify({"error": "Unable to send email. Please try again later."}), 503
    payload = {
        "message": (
            "Check your email for a link to finish creating your account."
            if signup
            else "Check your email for a link to sign in."
        ),
    }
    if _magic_link_return_token():
        payload["token"] = token
    return jsonify(payload), 200


# ---------------------------------------------------------------------------
# UC01-FR01 / UC01-FR02 — Sign up (initiate magic-link flow for new users)
# ---------------------------------------------------------------------------
# POST /api/auth/signup
# Body: { "email": str }
# Sends magic-link email; optional MAGIC_LINK_RETURN_TOKEN includes token in JSON.
@auth_bp.route("/signup", methods=["POST"])
def signup():
    """UC01-FR01: Register a new user by email and issue a magic-link token.

    Returns 409 if email is already registered.
    Sends email with embedded link; see MAGIC_LINK_RETURN_TOKEN for dev-only token in body.
    """
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()

    if not email:
        return jsonify({"error": "email is required"}), 400

    if _find_user_by_email(email):
        return jsonify({"error": "Email already registered"}), 409

    token = _generate_token(email)
    return _issue_magic_link(email, token, signup=True)


# ---------------------------------------------------------------------------
# UC01-FR03 — Login (magic-link flow for existing users)
# ---------------------------------------------------------------------------
# POST /api/auth/login
# Body: { "email": str }
# Sends magic-link email; optional MAGIC_LINK_RETURN_TOKEN includes token in JSON.
@auth_bp.route("/login", methods=["POST"])
def login():
    """UC01-FR03: Issue a magic-link token for an existing user.

    Returns 404 if the email is not yet registered.
    Sends email with embedded link; see MAGIC_LINK_RETURN_TOKEN for dev-only token in body.
    """
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()

    if not email:
        return jsonify({"error": "email is required"}), 400

    user = _find_user_by_email(email)
    if not user:
        return jsonify({"error": "No account found with that email"}), 404

    token = _generate_token(email)
    return _issue_magic_link(email, token, signup=False)


# ---------------------------------------------------------------------------
# UC01-FR04 — Verify magic-link token
# ---------------------------------------------------------------------------
# GET /api/auth/verify/<token>
# Returns { valid: true, email } if valid, 401 otherwise.
@auth_bp.route("/verify/<token>", methods=["GET"])
def verify(token):
    """UC01-FR04: Validate a magic-link token and return the associated email.

    Returns 401 if the token is missing or has expired.
    """
    record = _verify_token(token)
    if not record:
        return jsonify({"error": "Token is invalid or has expired"}), 401

    # Look up whether a full account already exists for this email.
    # The frontend (MagicLinkSentPage) checks: if user is non-null, the
    # account is already set up → skip AccountSetupPage → go to /homes.
    # If user is null, the frontend navigates to AccountSetupPage instead.
    user = _find_user_by_email(record["email"])
    return jsonify({
        "valid": True,
        "email": record["email"],
        "user":  user,   # None for brand-new users; full object for returning users
    }), 200


# ---------------------------------------------------------------------------
# UC01-FR05 — Complete account setup (first-time profile creation)
# ---------------------------------------------------------------------------
# POST /api/auth/setup
# Body: { token, name, phone, address }
# Verifies the one-time token, creates the user record, deletes the token.
@auth_bp.route("/setup", methods=["POST"])
def setup():
    """UC01-FR05: Create a user profile after magic-link verification.

    Accepts the magic-link token plus profile fields; creates the user record
    in DB["users"], then invalidates the token (one-time use).
    Returns 401 if the token is invalid/expired.
    Returns 409 if a user with that email already exists (setup already done).
    Returns 201 with the newly created user object.
    """
    data = request.get_json(silent=True) or {}
    token = (data.get("token") or "").strip()
    name = (data.get("name") or "").strip()
    phone = (data.get("phone") or "").strip()
    address = (data.get("address") or "").strip()

    if not token:
        return jsonify({"error": "token is required"}), 400
    if not name:
        return jsonify({"error": "name is required"}), 400

    record = _verify_token(token)
    if not record:
        return jsonify({"error": "Token is invalid or has expired"}), 401

    email = record["email"]

    if _find_user_by_email(email):
        return jsonify({"error": "Account already set up for this email"}), 409
    user_id = new_id()
    user = {
        "id": user_id,
        "email": email,
        "name": name,
        "phone": phone,
        "address": address,
        "home_ids": [],
        "created_at": time.time(),
    }
    DB["users"][user_id] = user

    # Invalidate the token — it's single-use
    DB["tokens"].pop(token, None)

    return jsonify({"user": user}), 201
