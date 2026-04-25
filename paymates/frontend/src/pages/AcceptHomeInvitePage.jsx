import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import client from '../api/client.js';
import { useHome } from '../context/HomeContext.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';

const PENDING_INVITE_KEY = 'paymates_pending_home_invite';

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

function writePendingInvite(homeId, inviteToken) {
  localStorage.setItem(PENDING_INVITE_KEY, JSON.stringify({ homeId, inviteToken }));
}

function clearPendingInvite() {
  localStorage.removeItem(PENDING_INVITE_KEY);
}

export default function AcceptHomeInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useHome();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const invite = useMemo(() => {
    const homeIdFromUrl = (searchParams.get('home_id') || '').trim();
    const tokenFromUrl = (searchParams.get('invite_token') || '').trim();
    if (homeIdFromUrl && tokenFromUrl) {
      return { homeId: homeIdFromUrl, inviteToken: tokenFromUrl };
    }
    return readPendingInvite();
  }, [searchParams]);

  useEffect(() => {
    if (invite?.homeId && invite?.inviteToken) {
      writePendingInvite(invite.homeId, invite.inviteToken);
    }
  }, [invite]);

  useEffect(() => {
    if (!currentUser || !invite?.homeId || !invite?.inviteToken) return;

    const joinHome = async () => {
      setLoading(true);
      setError('');
      try {
        await client.post(`/homes/${invite.homeId}/accept_invite`, {
          invite_token: invite.inviteToken,
          user_id: currentUser.id,
        });
        clearPendingInvite();
        navigate(`/homes/${invite.homeId}/roommates`, { replace: true });
      } catch (err) {
        const status = err.response?.status;
        if (status === 401) {
          clearPendingInvite();
          setError('This invite link is invalid or expired.');
        } else if (status === 403) {
          setError('This invite belongs to a different email. Sign in with the invited account.');
        } else if (status === 404) {
          clearPendingInvite();
          setError('We could not find this home or your account.');
        } else {
          setError(err.response?.data?.error || 'Could not join this home.');
        }
      } finally {
        setLoading(false);
      }
    };

    joinHome();
  }, [currentUser, invite, navigate]);

  if (!invite?.homeId || !invite?.inviteToken) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="auth-title" style={{ textAlign: 'center' }}>Invalid Invite Link</h1>
          <p className="auth-subtitle" style={{ textAlign: 'center' }}>
            This invite URL is missing required details.
          </p>
          <p className="auth-footer" style={{ textAlign: 'center' }}>
            <Link to="/homes" className="auth-link">Go to homes</Link>
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="auth-title" style={{ textAlign: 'center' }}>Home Invite</h1>
          <p className="auth-subtitle" style={{ textAlign: 'center' }}>
            Sign in (or sign up) to join this home. We saved your invite and will continue after verification.
          </p>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <Link to="/login" className="btn btn-primary btn-full">SIGN IN TO CONTINUE</Link>
            <Link to="/signup" className="btn btn-secondary btn-full">CREATE ACCOUNT</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title" style={{ textAlign: 'center' }}>Joining Home...</h1>
        <p className="auth-subtitle" style={{ textAlign: 'center' }}>
          {loading ? 'Please wait while we accept your invite.' : 'Finalizing your invite.'}
        </p>
        <ErrorBanner message={error} onDismiss={() => setError('')} />
        {error && (
          <p className="auth-footer" style={{ textAlign: 'center' }}>
            <Link to="/login" className="auth-link">Sign in with different account</Link>
          </p>
        )}
      </div>
    </div>
  );
}
