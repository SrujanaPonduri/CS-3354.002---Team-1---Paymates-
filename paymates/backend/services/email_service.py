# services/email_service.py
# Aagam Shah
# Sends magic-link emails (SMTP) or logs them to the console (local dev).
#
# Environment variables:
#   FRONTEND_BASE_URL   (required) — e.g. http://localhost:5173 — base for magic URLs
#   EMAIL_FROM          (required for SMTP) — From: address
#
# When SMTP_HOST is set, mail is sent via SMTP; otherwise "console" mode logs the link.
#
# SMTP (optional, used when SMTP_HOST is non-empty):
#   SMTP_HOST           — server hostname
#   SMTP_PORT           — default 587
#   SMTP_USER           — auth username (optional for open relays)
#   SMTP_PASSWORD       — auth password
#   SMTP_USE_TLS        — default true — STARTTLS after connect (typical on 587)
#   SMTP_USE_SSL        — default false — use SMTP_SSL (typical on 465)

from __future__ import annotations

import logging
import os
import smtplib
import ssl
from email.message import EmailMessage
from urllib.parse import urlencode

logger = logging.getLogger(__name__)


class EmailSendError(Exception):
    """Raised when SMTP delivery fails."""


def build_magic_link_url(token: str) -> str:
    """Return the full magic-link URL embedded in emails."""
    base = (os.environ.get("FRONTEND_BASE_URL") or "").strip().rstrip("/")
    if not base:
        raise ValueError("FRONTEND_BASE_URL must be set to send magic links")
    q = urlencode({"token": token})
    return f"{base}/magic-link?{q}"


def _email_from() -> str:
    return (os.environ.get("EMAIL_FROM") or "").strip()


def _send_console(to_email: str, subject: str, plain: str, magic_url: str) -> None:
    block = (
        f"\n{'=' * 60}\n"
        f"[Paymates magic link — console mode]\n"
        f"To: {to_email}\n"
        f"Subject: {subject}\n\n{plain}\n\nLink:\n{magic_url}\n"
        f"{'=' * 60}\n"
    )
    print(block, flush=True)
    logger.info("Magic link (console) for %s — %s", to_email, magic_url)


def _send_smtp(to_email: str, subject: str, plain: str, html: str) -> None:
    email_from = _email_from()
    if not email_from:
        raise ValueError("EMAIL_FROM is required when SMTP_HOST is set")

    host = os.environ["SMTP_HOST"].strip()
    port = int(os.environ.get("SMTP_PORT") or "587")
    user = (os.environ.get("SMTP_USER") or "").strip()
    password = (os.environ.get("SMTP_PASSWORD") or "").strip()
    use_tls = os.environ.get("SMTP_USE_TLS", "true").lower() in ("1", "true", "yes")
    use_ssl = os.environ.get("SMTP_USE_SSL", "false").lower() in ("1", "true", "yes")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = email_from
    msg["To"] = to_email
    msg.set_content(plain)
    msg.add_alternative(html, subtype="html")

    try:
        if use_ssl:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(host, port, context=context) as server:
                if user:
                    server.login(user, password)
                server.send_message(msg)
        else:
            with smtplib.SMTP(host, port) as server:
                server.ehlo()
                if use_tls:
                    context = ssl.create_default_context()
                    server.starttls(context=context)
                    server.ehlo()
                if user:
                    server.login(user, password)
                server.send_message(msg)
    except Exception as exc:
        raise EmailSendError(f"SMTP error: {exc}") from exc


def send_magic_link(to_email: str, token: str, *, signup: bool) -> None:
    """
    Deliver a magic link for *to_email* using *token* (already stored server-side).

    Raises ValueError for configuration problems, EmailSendError on SMTP failure.
    Console mode never raises for I/O (only ValueError if FRONTEND_BASE_URL missing).
    """
    magic_url = build_magic_link_url(token)
    subject = "Sign in to Paymates" if not signup else "Finish setting up your Paymates account"
    plain = (
        f"{subject}\n\n"
        f"Open this link to continue (expires in 15 minutes):\n{magic_url}\n"
    )
    html = (
        f"<p>{subject}</p>"
        f'<p><a href="{magic_url}">Click here to continue</a></p>'
        f"<p>Or copy this URL:</p><p>{magic_url}</p>"
    )

    smtp_host = (os.environ.get("SMTP_HOST") or "").strip()
    if smtp_host:
        _send_smtp(to_email, subject, plain, html)
    else:
        _send_console(to_email, subject, plain, magic_url)
