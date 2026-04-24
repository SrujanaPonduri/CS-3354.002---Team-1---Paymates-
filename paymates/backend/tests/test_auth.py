# tests/test_auth.py
# Automated test suite for the Paymates auth REST API.
# Aagam Shah
# Covers UC01 (Sign Up) per the course test matrix, plus login, magic-link
# verification, account setup, and the bearer-token middleware that guards
# non-public /api/* endpoints.
#
# Each test function's docstring follows a standard format:
#
#     Description     : what the scenario exercises
#     Inputs          : HTTP method + path + body/headers (and any precondition)
#     Expected Output : HTTP status + JSON body + any side effects on DB state
#
# Run from paymates/backend/:
#     pytest tests/ -v

import time

import pytest

from services.email_service import EmailSendError

SEED_EMAIL = "aagam@example.com"  # user "u1" is pre-seeded in mock_db.seed()


# ---------------------------------------------------------------------------
# UC01. Sign Up — course test matrix
# ---------------------------------------------------------------------------


class TestUC01SignUp:
    """UC01 Sign Up test cases, mapped to the course-supplied matrix."""

    def test_tc1_valid_email_and_valid_setup_creates_user(self, client, signup_and_get_token):
        """UC01-TC1 — Valid email + valid setup details.

        Description:
            Exercises the full happy-path sign-up flow end-to-end: request a
            magic link, "click" it by hitting /verify, then submit the full
            profile via /setup.
        Inputs:
            1) POST /api/auth/signup   body={"email": "alice@example.com"}
            2) GET  /api/auth/verify/<token>
            3) POST /api/auth/setup    body={"token", "name": "Alice",
                                              "phone": "555-1111",
                                              "address": "1 Main St"}
        Expected Output:
            1) 200 OK with a magic-link token in the body.
            2) 200 OK, body.valid=true, body.user=None (account not set up yet).
            3) 201 Created, body.user populated with the submitted fields,
               body.token (session token) issued. Side effect: user exists in
               DB["users"] and the magic-link token is removed from DB["tokens"].
        """
        token = signup_and_get_token("alice@example.com")

        verify_resp = client.get(f"/api/auth/verify/{token}")
        assert verify_resp.status_code == 200
        verify_body = verify_resp.get_json()
        assert verify_body["valid"] is True
        assert verify_body["email"] == "alice@example.com"
        assert verify_body["user"] is None

        setup_resp = client.post(
            "/api/auth/setup",
            json={
                "token": token,
                "name": "Alice",
                "phone": "555-1111",
                "address": "1 Main St",
            },
        )
        assert setup_resp.status_code == 201
        body = setup_resp.get_json()
        assert body["user"]["email"] == "alice@example.com"
        assert body["user"]["name"] == "Alice"
        assert body["user"]["phone"] == "555-1111"
        assert body["user"]["address"] == "1 Main St"
        assert body["token"], "session token should be issued"

        from mock_db import DB

        assert any(u["email"] == "alice@example.com" for u in DB["users"].values())
        assert token not in DB["tokens"], "magic-link token must be consumed"

    def test_tc2_valid_email_invalid_setup_rejected(self, client, signup_and_get_token):
        """UC01-TC2 — Valid email + invalid setup details (blank name).

        Description:
            Sign-up succeeds, but the account-setup step is rejected because
            the required 'name' field is blank. User must retry with valid
            input; the magic-link token is NOT consumed so the retry works.
        Inputs:
            1) POST /api/auth/signup   body={"email": "bob@example.com"}
            2) POST /api/auth/setup    body={"token": <valid>, "name": "   "}
        Expected Output:
            1) 200 OK with token.
            2) 400 Bad Request, body={"error": "name is required"}.
               Side effect: no user created; magic-link token still present
               in DB["tokens"] so the user can retry.
        """
        token = signup_and_get_token("bob@example.com")

        resp = client.post("/api/auth/setup", json={"token": token, "name": "   "})
        assert resp.status_code == 400
        assert resp.get_json()["error"] == "name is required"

        from mock_db import DB

        assert not any(u["email"] == "bob@example.com" for u in DB["users"].values())
        assert token in DB["tokens"], "token should remain valid so user can retry"

    def test_tc3_valid_email_missing_optional_fields_creates_user(
        self, client, signup_and_get_token
    ):
        """UC01-TC3 — Valid email + missing optional setup fields.

        Description:
            Phone and address are optional per the spec. Submitting only the
            required 'name' must still create the account successfully.
        Inputs:
            1) POST /api/auth/signup   body={"email": "carol@example.com"}
            2) POST /api/auth/setup    body={"token": <valid>, "name": "Carol"}
        Expected Output:
            1) 200 OK with token.
            2) 201 Created, body.user.name="Carol", body.user.phone="",
               body.user.address="".
        """
        token = signup_and_get_token("carol@example.com")

        resp = client.post("/api/auth/setup", json={"token": token, "name": "Carol"})
        assert resp.status_code == 201
        user = resp.get_json()["user"]
        assert user["name"] == "Carol"
        assert user["phone"] == ""
        assert user["address"] == ""

    def test_tc4_duplicate_email_returns_409(self, client):
        """UC01-TC4 — Email already registered.

        Description:
            Attempting to sign up with an email that is already in the system
            must be rejected with 409 so the frontend can redirect to login.
        Inputs:
            POST /api/auth/signup   body={"email": "aagam@example.com"}
            (user "u1" for this email is pre-seeded by mock_db.seed()).
        Expected Output:
            409 Conflict, body={"error": "Email already registered"}.
        """
        resp = client.post("/api/auth/signup", json={"email": SEED_EMAIL})
        assert resp.status_code == 409
        assert resp.get_json()["error"] == "Email already registered"

    def test_tc4_duplicate_email_is_case_insensitive(self, client):
        """UC01-TC4b — Duplicate detection is case-insensitive.

        Description:
            A different-case variant of an existing email must still be
            recognized as the same account.
        Inputs:
            POST /api/auth/signup   body={"email": "AAGAM@Example.COM"}
        Expected Output:
            409 Conflict (email matches seeded user 'aagam@example.com').
        """
        resp = client.post("/api/auth/signup", json={"email": "AAGAM@Example.COM"})
        assert resp.status_code == 409

    def test_tc5_invalid_email_format_returns_400(self, client):
        """UC01-TC5 — Invalid email format.

        Description:
            Strings that don't look like an email (no '@' or no domain) must
            be rejected before any token is issued.
        Inputs:
            POST /api/auth/signup   body={"email": "not-an-email"}
        Expected Output:
            400 Bad Request, body={"error": "Invalid email format"}.
        """
        resp = client.post("/api/auth/signup", json={"email": "not-an-email"})
        assert resp.status_code == 400
        assert resp.get_json()["error"] == "Invalid email format"

    def test_tc5_empty_email_returns_400(self, client):
        """UC01-TC5b — Empty / missing email field.

        Description:
            An entirely missing or empty 'email' field must yield a distinct
            'email is required' error (different from the format error).
        Inputs:
            POST /api/auth/signup   body={}
        Expected Output:
            400 Bad Request, body={"error": "email is required"}.
        """
        resp = client.post("/api/auth/signup", json={})
        assert resp.status_code == 400
        assert resp.get_json()["error"] == "email is required"

    def test_smtp_failure_rolls_back_token(self, client, flask_app, monkeypatch):
        """Supporting case — Email delivery failure rolls back the token.

        Description:
            If the mailer raises EmailSendError, the API must return 503 and
            must NOT leave a dangling token in DB["tokens"] (the user should
            be able to retry from scratch).
        Inputs:
            - send_magic_link monkeypatched to raise EmailSendError.
            - POST /api/auth/signup   body={"email": "dave@example.com"}
        Expected Output:
            503 Service Unavailable. Side effect: DB["tokens"] is empty.
        """

        def _boom(*a, **k):
            raise EmailSendError("simulated SMTP outage")

        monkeypatch.setattr("routes.auth.send_magic_link", _boom)

        resp = client.post("/api/auth/signup", json={"email": "dave@example.com"})
        assert resp.status_code == 503

        from mock_db import DB

        assert DB["tokens"] == {}, "failed signup must not leave a dangling token"


# ---------------------------------------------------------------------------
# Login — UC01-FR03
# ---------------------------------------------------------------------------


class TestLogin:
    """POST /api/auth/login — issue a magic link for an existing user."""

    def test_login_happy_path(self, client):
        """LI-01 — Login for an existing, seeded user.

        Description:
            A known email triggers a magic-link token and a success message.
        Inputs:
            POST /api/auth/login   body={"email": "aagam@example.com"}
        Expected Output:
            200 OK with body.token populated (because
            MAGIC_LINK_RETURN_TOKEN=true in the test env).
        """
        resp = client.post("/api/auth/login", json={"email": SEED_EMAIL})
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["token"], "magic-link token should be exposed via MAGIC_LINK_RETURN_TOKEN"

    def test_login_missing_email(self, client):
        """LI-02 — Login with missing email field.

        Inputs:
            POST /api/auth/login   body={}
        Expected Output:
            400 Bad Request, body={"error": "email is required"}.
        """
        resp = client.post("/api/auth/login", json={})
        assert resp.status_code == 400
        assert resp.get_json()["error"] == "email is required"

    def test_login_invalid_email_format(self, client):
        """LI-03 — Login with malformed email.

        Inputs:
            POST /api/auth/login   body={"email": "nope"}
        Expected Output:
            400 Bad Request, body={"error": "Invalid email format"}.
        """
        resp = client.post("/api/auth/login", json={"email": "nope"})
        assert resp.status_code == 400
        assert resp.get_json()["error"] == "Invalid email format"

    def test_login_unknown_email_returns_404(self, client):
        """LI-04 — Login with an email that is not registered.

        Inputs:
            POST /api/auth/login   body={"email": "ghost@example.com"}
        Expected Output:
            404 Not Found, body={"error": "No account found with that email"}.
        """
        resp = client.post("/api/auth/login", json={"email": "ghost@example.com"})
        assert resp.status_code == 404
        assert resp.get_json()["error"] == "No account found with that email"


# ---------------------------------------------------------------------------
# Magic-link verification — UC01-FR04
# ---------------------------------------------------------------------------


class TestVerify:
    """GET /api/auth/verify/<token> — validate a magic-link token."""

    def test_verify_existing_user_issues_session_token(self, client):
        """VE-01 — Verify a login token for an existing user.

        Description:
            For returning users, /verify must both validate the magic-link
            token AND issue a long-lived session token so the frontend can
            authenticate subsequent API calls.
        Inputs:
            1) POST /api/auth/login    body={"email": "aagam@example.com"}
            2) GET  /api/auth/verify/<magic_token>
        Expected Output:
            2) 200 OK. Body: valid=true, email="aagam@example.com",
               user=<full user object>, token=<session token>.
        """
        login_resp = client.post("/api/auth/login", json={"email": SEED_EMAIL})
        token = login_resp.get_json()["token"]

        resp = client.get(f"/api/auth/verify/{token}")
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["valid"] is True
        assert body["email"] == SEED_EMAIL
        assert body["user"] is not None
        assert body["user"]["email"] == SEED_EMAIL
        assert body["token"], "session token should be issued for returning users"

    def test_verify_new_user_returns_null_user(self, client, signup_and_get_token):
        """VE-02 — Verify a signup token for a brand-new email.

        Description:
            For new users, /verify must confirm the token but return user=None
            and NOT issue a session token yet — account setup is still required.
        Inputs:
            1) POST /api/auth/signup   body={"email": "newbie@example.com"}
            2) GET  /api/auth/verify/<signup_token>
        Expected Output:
            2) 200 OK. Body: valid=true, user=None, no 'token' key present.
        """
        token = signup_and_get_token("newbie@example.com")
        resp = client.get(f"/api/auth/verify/{token}")
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["user"] is None
        assert "token" not in body, "no session token before account setup"

    def test_verify_unknown_token_returns_401(self, client):
        """VE-03 — Verify an unknown / forged token.

        Inputs:
            GET /api/auth/verify/not-a-real-token
        Expected Output:
            401 Unauthorized, body={"error": "Token is invalid or has expired"}.
        """
        resp = client.get("/api/auth/verify/not-a-real-token")
        assert resp.status_code == 401
        assert resp.get_json()["error"] == "Token is invalid or has expired"

    def test_verify_expired_token_returns_401_and_cleans_up(self, client, signup_and_get_token):
        """VE-04 — Verify a token whose expiration has passed.

        Description:
            Expired tokens must be rejected AND removed from DB so they don't
            accumulate.
        Inputs:
            1) POST /api/auth/signup   body={"email": "expired@example.com"}
            2) (set DB["tokens"][token]["expires_at"] to time.time()-1)
            3) GET /api/auth/verify/<token>
        Expected Output:
            3) 401 Unauthorized. Side effect: token removed from DB["tokens"].
        """
        from mock_db import DB

        token = signup_and_get_token("expired@example.com")
        DB["tokens"][token]["expires_at"] = time.time() - 1  # force expiry

        resp = client.get(f"/api/auth/verify/{token}")
        assert resp.status_code == 401
        assert token not in DB["tokens"], "expired token should be removed"


# ---------------------------------------------------------------------------
# Account setup — UC01-FR05
# ---------------------------------------------------------------------------


class TestSetup:
    """POST /api/auth/setup — create profile after magic-link verification."""

    def test_setup_happy_path(self, client, signup_and_get_token):
        """SE-01 — Setup with valid token and a non-empty name.

        Inputs:
            1) POST /api/auth/signup   body={"email": "eve@example.com"}
            2) POST /api/auth/setup    body={"token": <valid>, "name": "Eve"}
        Expected Output:
            2) 201 Created.
        """
        token = signup_and_get_token("eve@example.com")
        resp = client.post(
            "/api/auth/setup", json={"token": token, "name": "Eve"}
        )
        assert resp.status_code == 201

    def test_setup_missing_token(self, client):
        """SE-02 — Setup body missing 'token'.

        Inputs:
            POST /api/auth/setup   body={"name": "Frank"}
        Expected Output:
            400 Bad Request, body={"error": "token is required"}.
        """
        resp = client.post("/api/auth/setup", json={"name": "Frank"})
        assert resp.status_code == 400
        assert resp.get_json()["error"] == "token is required"

    def test_setup_missing_name(self, client, signup_and_get_token):
        """SE-03 — Setup body missing 'name'.

        Inputs:
            1) POST /api/auth/signup   body={"email": "grace@example.com"}
            2) POST /api/auth/setup    body={"token": <valid>}
        Expected Output:
            2) 400 Bad Request, body={"error": "name is required"}.
        """
        token = signup_and_get_token("grace@example.com")
        resp = client.post("/api/auth/setup", json={"token": token})
        assert resp.status_code == 400
        assert resp.get_json()["error"] == "name is required"

    def test_setup_expired_token(self, client, signup_and_get_token):
        """SE-04 — Setup with an expired token.

        Inputs:
            1) POST /api/auth/signup   body={"email": "henry@example.com"}
            2) (set DB["tokens"][token]["expires_at"] to time.time()-1)
            3) POST /api/auth/setup    body={"token": <expired>, "name": "Henry"}
        Expected Output:
            3) 401 Unauthorized.
        """
        from mock_db import DB

        token = signup_and_get_token("henry@example.com")
        DB["tokens"][token]["expires_at"] = time.time() - 1

        resp = client.post("/api/auth/setup", json={"token": token, "name": "Henry"})
        assert resp.status_code == 401

    def test_setup_already_registered_email_returns_409(self, client):
        """SE-05 — Setup using a token whose email already has an account.

        Description:
            Protects against re-initializing an already-setup account. Uses
            the internal _generate_token helper to mint a token for the seeded
            user's email directly.
        Inputs:
            1) _generate_token("aagam@example.com")  (internal helper)
            2) POST /api/auth/setup    body={"token": <valid>, "name": "Dup"}
        Expected Output:
            2) 409 Conflict, body={"error": "Account already set up for this email"}.
        """
        from mock_db import DB
        from routes.auth import _generate_token

        token = _generate_token(SEED_EMAIL)
        resp = client.post("/api/auth/setup", json={"token": token, "name": "Dup"})
        assert resp.status_code == 409
        assert resp.get_json()["error"] == "Account already set up for this email"

    def test_setup_token_is_single_use(self, client, signup_and_get_token):
        """SE-06 — Magic-link tokens are single-use.

        Description:
            After a successful /setup, the same token must not be accepted
            again (prevents replay attacks).
        Inputs:
            1) POST /api/auth/signup   body={"email": "ivy@example.com"}
            2) POST /api/auth/setup    body={"token": <valid>, "name": "Ivy"}
            3) POST /api/auth/setup    body={"token": <same>, "name": "Ivy2"}
        Expected Output:
            2) 201 Created.
            3) 401 Unauthorized (token already consumed).
        """
        token = signup_and_get_token("ivy@example.com")

        first = client.post("/api/auth/setup", json={"token": token, "name": "Ivy"})
        assert first.status_code == 201

        second = client.post("/api/auth/setup", json={"token": token, "name": "Ivy2"})
        assert second.status_code == 401, "magic-link token must be one-time use"


# ---------------------------------------------------------------------------
# Auth middleware — bearer-token guard in app.py
# ---------------------------------------------------------------------------


class TestAuthMiddleware:
    """_require_auth_for_api — guards non-public /api/* endpoints."""

    def test_protected_route_without_header_returns_401(self, client):
        """MW-01 — Protected route with no Authorization header.

        Inputs:
            GET /api/homes   (no Authorization header)
        Expected Output:
            401 Unauthorized, body={"error": "Authentication required"}.
        """
        resp = client.get("/api/homes")
        assert resp.status_code == 401
        assert resp.get_json()["error"] == "Authentication required"

    def test_protected_route_with_bogus_token_returns_401(self, client):
        """MW-02 — Protected route with an invalid bearer token.

        Inputs:
            GET /api/homes   headers={"Authorization": "Bearer totally-fake"}
        Expected Output:
            401 Unauthorized (token not found in DB["tokens"]).
        """
        resp = client.get(
            "/api/homes", headers={"Authorization": "Bearer totally-fake"}
        )
        assert resp.status_code == 401

    def test_protected_route_with_valid_session_token_passes_auth(self, client):
        """MW-03 — Protected route with a legitimately-issued session token.

        Description:
            Performs a full login -> verify flow to obtain a real session
            token, then hits /api/homes with it. The guard must not block
            the request (status may be 200 or any non-401 depending on the
            homes route).
        Inputs:
            1) POST /api/auth/login    body={"email": "aagam@example.com"}
            2) GET  /api/auth/verify/<magic_token>   -> session_token
            3) GET  /api/homes   headers={"Authorization": "Bearer <session>"}
        Expected Output:
            3) status != 401 (the bearer-token guard accepted the request).
        """
        login_resp = client.post("/api/auth/login", json={"email": SEED_EMAIL})
        magic_token = login_resp.get_json()["token"]
        session_token = client.get(f"/api/auth/verify/{magic_token}").get_json()["token"]

        resp = client.get(
            "/api/homes", headers={"Authorization": f"Bearer {session_token}"}
        )
        assert resp.status_code != 401, "valid session token should pass the guard"

    def test_health_endpoint_is_public(self, client):
        """MW-04 — /api/health is in the public allowlist.

        Inputs:
            GET /api/health   (no Authorization header)
        Expected Output:
            200 OK, body={"status": "ok"}.
        """
        resp = client.get("/api/health")
        assert resp.status_code == 200
        assert resp.get_json() == {"status": "ok"}

    def test_options_preflight_is_allowed(self, client):
        """MW-05 — CORS preflight requests bypass the auth guard.

        Description:
            Browsers send OPTIONS preflight without an Authorization header;
            flask-cors must handle them and the guard must not return 401.
        Inputs:
            OPTIONS /api/homes   headers={"Origin": "http://localhost:5173",
                                           "Access-Control-Request-Method": "GET"}
        Expected Output:
            status != 401.
        """
        resp = client.options(
            "/api/homes",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET",
            },
        )
        assert resp.status_code != 401
