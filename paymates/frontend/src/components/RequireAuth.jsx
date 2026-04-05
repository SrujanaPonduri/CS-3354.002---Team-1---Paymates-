// src/components/RequireAuth.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Dual-purpose component used by React Router v6 as a layout route:
//
//  1. AUTH GUARD — If the user is not logged in (currentUser is null),
//     immediately redirect to /login.  This protects every protected route
//     without repeating the check in each individual page.
//
//  2. SIDEBAR LAYOUT — Renders the persistent sidebar navigation and wraps
//     the active page via React Router's <Outlet />.
//
// How it is used in App.jsx:
//   <Route element={<RequireAuth />}>
//     <Route path="/homes/:homeId/inventory" element={<InventoryPage />} />
//     ...
//   </Route>
//
// The sidebar is "context-aware":
//   • "🏠 My Homes"  — always shown (links to /homes, no homeId required)
//   • Section divider + home-specific links (Inventory, Bills, Expenses, Dues,
//     Roommates) — only shown when the URL contains a :homeId segment
//     (i.e., when useMatch('/homes/:homeId/*') returns a match).
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { Navigate, Outlet, NavLink, useMatch, useNavigate } from 'react-router-dom';
import { useHome } from '../context/HomeContext.jsx';

export default function RequireAuth() {
  // Pull the logged-in user and the setter (needed for sign-out).
  const { currentUser, setCurrentUser } = useHome();

  // Detect if the current URL contains a home ID
  // e.g., /homes/home-demo/inventory → homeId = "home-demo"
  //       /homes or /homes/new       → no match  → homeId = null
  const match  = useMatch('/homes/:homeId/*');
  const homeId = match?.params?.homeId ?? null;

  const navigate = useNavigate();

  // ── Auth guard ─────────────────────────────────────────────────────────────
  // React Router's <Navigate> performs an immediate redirect.
  // `replace` prevents the protected route from being added to browser history,
  // so pressing Back after login doesn't bounce the user back to /login.
  if (!currentUser) return <Navigate to="/login" replace />;

  // ── Build the home-scoped navigation links ─────────────────────────────────
  // These links are only meaningful when we know which home the user is in.
  // homeId being null (on /homes or /homes/new) causes this array to be empty,
  // which hides the divider and per-home links from the sidebar.
  const links = [
    ...(homeId ? [
      { to: `/homes/${homeId}/inventory`,  label: '📦 Inventory' },
      { to: `/homes/${homeId}/bills`,      label: '🧾 Bills' },
      { to: `/homes/${homeId}/expenses`,   label: '💸 Expenses' },
      { to: `/homes/${homeId}/dues`,       label: '💳 Dues' },
      { to: `/homes/${homeId}/roommates`,  label: '👥 Roommates' },
    ] : []),
  ];

  // NavLink style function — React Router calls this with { isActive } to
  // let us highlight whichever link matches the current URL.
  const navLinkStyle = ({ isActive }) => ({
    display: 'block',
    padding: '.55rem .85rem',
    borderRadius: 8,
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 500,
    transition: 'all .15s',
    color:      isActive ? '#a78bfa' : '#94a3b8',
    background: isActive ? 'rgba(124,58,237,.15)' : 'transparent',
  });

  // ── Render layout ──────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f1017' }}>

      {/* ── Sidebar (fixed, 240px wide) ────────────────────────────────── */}
      <aside style={S.sidebar}>

        {/* App branding */}
        <div style={S.brand}>
          <span style={{ fontSize: 22 }}>🏠</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>Paymates</span>
        </div>

        {/* Logged-in user chip — shows first initial as an avatar */}
        <div style={S.userCard}>
          <div className="avatar avatar-lg" style={{ flexShrink: 0 }}>
            {(currentUser.name || '?').charAt(0).toUpperCase()}
          </div>
          <div style={{ overflow: 'hidden' }}>
            {/* Truncate long names/emails with ellipsis */}
            <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentUser.name}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentUser.email}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* "My Homes" is always visible — it's the top-level dashboard */}
          <NavLink to="/homes" style={navLinkStyle}>🏠 My Homes</NavLink>

          {/* Home-specific section — only rendered when inside a home URL */}
          {homeId && links.length > 0 && (
            <>
              {/* Visual separator between global and home-scoped links */}
              <div style={{ height: 1, background: '#2d2d4a', margin: '.5rem .25rem' }} />
              {links.map(l => (
                <NavLink key={l.to} to={l.to} style={navLinkStyle}>{l.label}</NavLink>
              ))}
            </>
          )}
        </nav>

        {/* Sign-out: clears context + localStorage, redirects to /login */}
        <button
          onClick={() => { setCurrentUser(null); navigate('/login'); }}
          style={S.logoutBtn}
        >
          ← Sign out
        </button>
      </aside>

      {/* ── Main content area ──────────────────────────────────────────── */}
      {/* <Outlet /> renders whichever child route is currently active     */}
      <main style={{ marginLeft: 240, flex: 1, padding: '2rem', minHeight: '100vh' }}>
        <Outlet />
      </main>
    </div>
  );
}

// ── Shared inline style objects ────────────────────────────────────────────
// Extracted to reduce JSX noise.  All values use the same dark-theme tokens
// defined in index.css.
const S = {
  sidebar: {
    width: 240, background: '#1c1c2e', borderRight: '1px solid #2d2d4a',
    display: 'flex', flexDirection: 'column', padding: '1.5rem 1rem',
    position: 'fixed', top: 0, left: 0, bottom: 0, // pinned to viewport
  },
  brand: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.75rem' },
  userCard: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '.65rem .85rem', background: '#252540',
    borderRadius: 10, marginBottom: '1.5rem', overflow: 'hidden',
  },
  logoutBtn: {
    marginTop: '1rem', padding: '.55rem .85rem', background: 'transparent',
    border: '1px solid #2d2d4a', borderRadius: 8, color: '#64748b',
    cursor: 'pointer', fontSize: 13, textAlign: 'left', transition: 'all .15s',
  },
};
