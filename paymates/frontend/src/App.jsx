// src/App.jsx
// Defines all client-side routes using React Router v6.
// HomeProvider is provided by main.jsx — App only handles routing.

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import RequireAuth from './components/RequireAuth.jsx';
import SignUpPage from './pages/SignUpPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import MagicLinkSentPage from './pages/MagicLinkSentPage.jsx';
import AccountSetupPage from './pages/AccountSetupPage.jsx';
import AcceptHomeInvitePage from './pages/AcceptHomeInvitePage.jsx';
import HomesPage from './pages/HomesPage.jsx';
import CreateHomePage from './pages/CreateHomePage.jsx';
import RoommatesPage from './pages/RoommatesPage.jsx';
import BillsPage from './pages/BillsPage.jsx';
import CreateEditBillPage from './pages/CreateEditBillPage.jsx';
import ExpensesPage from './pages/ExpensesPage.jsx';
import CreateEditExpensePage from './pages/CreateEditExpensePage.jsx';
import InventoryPage from './pages/InventoryPage.jsx';
import DuesPage from './pages/DuesPage.jsx';
import BudgetsPage from './pages/BudgetsPage.jsx';   // UC-12
import AuditPage from './pages/AuditPage.jsx';         // UC-13

export default function App() {
  return (
    <Routes>
      {/* ── Public routes (no auth required) ── */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/magic-link-sent" element={<MagicLinkSentPage />} />
      <Route path="/account-setup" element={<AccountSetupPage />} />
      <Route path="/accept-home-invite" element={<AcceptHomeInvitePage />} />

      {/* ── Protected routes (RequireAuth redirects to /login if no user) ── */}
      <Route element={<RequireAuth />}>
        {/* UC02 — home management */}
        <Route path="/homes" element={<HomesPage />} />
        <Route path="/homes/new" element={<CreateHomePage />} />
        {/* UC03–UC13 — home-scoped pages */}
        <Route path="/homes/:homeId/roommates" element={<RoommatesPage />} />
        <Route path="/homes/:homeId/bills" element={<BillsPage />} />
        <Route path="/homes/:homeId/bills/new" element={<CreateEditBillPage />} />
        <Route path="/homes/:homeId/bills/:billId/edit" element={<CreateEditBillPage />} />
        <Route path="/homes/:homeId/expenses" element={<ExpensesPage />} />
        <Route path="/homes/:homeId/expenses/new" element={<CreateEditExpensePage />} />
        <Route path="/homes/:homeId/expenses/:expId/edit" element={<CreateEditExpensePage />} />
        <Route path="/homes/:homeId/inventory" element={<InventoryPage />} />
        <Route path="/homes/:homeId/dues" element={<DuesPage />} />
        <Route path="/homes/:homeId/budgets" element={<BudgetsPage />} />   {/* UC-12 */}
        <Route path="/homes/:homeId/audit" element={<AuditPage />} />       {/* UC-13 */}
      </Route>
    </Routes>
  );
}
