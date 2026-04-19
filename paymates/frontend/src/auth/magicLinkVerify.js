// Shared magic-link verification: GET /api/auth/verify/<token> then route by user presence.
import client from '../api/client.js';

/**
 * @param {object} opts
 * @param {string} opts.token
 * @param {import('react-router-dom').NavigateFunction} opts.navigate
 * @param {function} opts.setCurrentUser
 */
export async function verifyMagicLinkAndRoute({ token, navigate, setCurrentUser }) {
  const res = await client.get(`/auth/verify/${encodeURIComponent(token)}`);
  const { email, user, token: sessionToken } = res.data;
  if (user) {
    if (sessionToken) localStorage.setItem('paymates_token', sessionToken);
    setCurrentUser(user);
    navigate('/homes');
  } else {
    navigate('/account-setup', { state: { token, email } });
  }
}
