// Shared magic-link verification: GET /api/auth/verify/<token> then route by user presence.
import client from "../api/client.js";

const PENDING_INVITE_KEY = "paymates_pending_home_invite";

function readPendingInvite() {
    try {
        const raw = localStorage.getItem(PENDING_INVITE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.homeId || !parsed?.inviteToken) return null;
        return parsed;
    } catch {
        return null;
    }
}

/**
 * @param {object} opts
 * @param {string} opts.token
 * @param {import('react-router-dom').NavigateFunction} opts.navigate
 * @param {function} opts.setCurrentUser
 */
export async function verifyMagicLinkAndRoute({
    token,
    navigate,
    setCurrentUser,
}) {
    const res = await client.get(`/auth/verify/${encodeURIComponent(token)}`);
    const { email, user, token: sessionToken } = res.data;
    if (user) {
        if (sessionToken) localStorage.setItem("paymates_token", sessionToken);
        setCurrentUser(user);
        const pendingInvite = readPendingInvite();
        if (pendingInvite) {
            navigate(
                `/accept-home-invite?home_id=${encodeURIComponent(pendingInvite.homeId)}&invite_token=${encodeURIComponent(pendingInvite.inviteToken)}`
            );
            return;
        }
        navigate("/homes");
    } else {
        navigate("/account-setup", { state: { token, email } });
    }
}
