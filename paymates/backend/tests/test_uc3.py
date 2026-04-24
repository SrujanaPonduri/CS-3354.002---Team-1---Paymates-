# tests/test_uc3.py
# Test suite for UC-03 — Add Roommate (Actor: User)
#
# Covers inviting a roommate to a home by email across four scenarios:
#
#   TC1 — Successfully added roommate
#         Email: "joseph.botros@utdallas.edu" (new, non-member user)
#         Expected: invite token issued (emails a link to join the Home)
#
#   TC2 — User does not exist; unsuccessful
#         Email: "rob.johnson@gmail.com" (not registered in the system)
#         Expected: invite token issued (emails a link to sign up and join)
#
#   TC3 — User is already a roommate; idempotent
#         Email: "joseph@example.com" (seeded u2, already in home-demo)
#         Expected: 409 error — user is already a roommate
#
#   TC4 — Invalid email
#         Email: "invalidemail" (no @ sign)
#         Expected: 400 error — prompts user to input a valid email
#
# Functional Requirements exercised:
#   FR-02 — Invite roommate by email
#
# Run from paymates/backend/:
#   pytest tests/test_uc3.py -v

import pytest

from mock_db import DB
from services.email_service import EmailSendError


class TestUC03AddRoommate:

    # -----------------------------------------------------------------------
    # TC1 — Successfully added roommate
    # -----------------------------------------------------------------------
    def test_TC1_successfully_added_roommate(self, authed_client):
        """UC03-TC1 — Inviting a valid email that is NOT already a roommate.

        Description:
            u1 (an existing home member) invites "joseph.botros@utdallas.edu",
            an email address that belongs to a registered user who is NOT yet
            in the home. The API must issue an invite token, which the backend
            would email as a link to join the Home.

        Inputs:
            POST /api/homes/home-demo/invite
            body={ "inviter_id": "u1", "invitee_email": "joseph.botros@utdallas.edu" }

        Expected Output:
            200 OK with body containing an "invite_token".
            (Backend emails a link to join the Home.)
        """
        rv = authed_client.post(
            "/api/homes/home-demo/invite",
            json={
                "inviter_id":    "u1",
                "invitee_email": "joseph.botros@utdallas.edu",
            },
        )
        assert rv.status_code == 200
        body = rv.get_json()
        assert "invite_token" in body, "An invite token should be returned"
        assert body["invite_token"], "Invite token must not be empty"

    # -----------------------------------------------------------------------
    # TC2 — User does not exist; unsuccessful (sign-up invite)
    # -----------------------------------------------------------------------
    def test_TC2_user_does_not_exist_sends_signup_invite(self, authed_client):
        """UC03-TC2 — Inviting an email that is NOT registered in the system.

        Description:
            u1 invites "rob.johnson@gmail.com", which has no existing account.
            The system should still issue an invite token so the backend can
            email a link letting the recipient sign up AND join the Home in
            one flow.

        Inputs:
            POST /api/homes/home-demo/invite
            body={ "inviter_id": "u1", "invitee_email": "rob.johnson@gmail.com" }

        Expected Output:
            200 OK with body containing an "invite_token".
            (Backend emails a link to sign up for the application and join the Home.)
        """
        rv = authed_client.post(
            "/api/homes/home-demo/invite",
            json={
                "inviter_id":    "u1",
                "invitee_email": "rob.johnson@gmail.com",
            },
        )
        assert rv.status_code == 200
        body = rv.get_json()
        assert "invite_token" in body, "A sign-up invite token should be returned"
        assert body["invite_token"], "Invite token must not be empty"

    # -----------------------------------------------------------------------
    # TC3 — User is already a roommate; idempotent → 409
    # -----------------------------------------------------------------------
    def test_TC3_user_already_roommate_returns_409(self, authed_client):
        """UC03-TC3 — Inviting an email that already belongs to a home member.

        Description:
            u1 tries to invite "joseph@example.com" (seeded as u2, who is
            already in home-demo). The API must reject this with 409 and
            display an error that the user is already a roommate.

        Inputs:
            POST /api/homes/home-demo/invite
            body={ "inviter_id": "u1", "invitee_email": "joseph@example.com" }

        Expected Output:
            409 Conflict.
            body.error indicates the person is already a member of this home.
        """
        rv = authed_client.post(
            "/api/homes/home-demo/invite",
            json={
                "inviter_id":    "u1",
                "invitee_email": "joseph@example.com",   # u2 — already in home-demo
            },
        )
        assert rv.status_code == 409
        error_msg = rv.get_json().get("error", "").lower()
        assert "already" in error_msg, (
            f"Error message should mention 'already': got '{error_msg}'"
        )

    # -----------------------------------------------------------------------
    # TC4 — Invalid email → 400
    # -----------------------------------------------------------------------
    def test_TC4_invalid_email_returns_400(self, authed_client):
        """UC03-TC4 — Inviting with a malformed email address.

        Description:
            u1 submits "invalidemail" (no '@' sign) as the invitee_email.
            The API must reject it with 400, prompting the user to input a
            valid email address.

        Inputs:
            POST /api/homes/home-demo/invite
            body={ "inviter_id": "u1", "invitee_email": "invalidemail" }

        Expected Output:
            400 Bad Request.
            body.error prompts user to provide a valid email.
        """
        rv = authed_client.post(
            "/api/homes/home-demo/invite",
            json={
                "inviter_id":    "u1",
                "invitee_email": "invalidemail",
            },
        )
        assert rv.status_code == 400

    def test_invite_email_failure_returns_503_and_removes_stored_token(
        self, authed_client, monkeypatch
    ):
        """If home invite email cannot be sent, the invite row must be rolled back."""

        def _boom(*a, **k):
            raise EmailSendError("smtp unavailable")

        monkeypatch.setattr("routes.roommates.send_home_invite", _boom)
        assert authed_client.post(
            "/api/homes/home-demo/invite",
            json={
                "inviter_id": "u1",
                "invitee_email": "roll.back@example.com",
            },
        ).status_code == 503
        for inv in DB["invites"].values():
            assert inv["email"] != "roll.back@example.com"
