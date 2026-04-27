// src/components/ErrorBanner.jsx

import React from 'react';

function WarningTriangle() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <path d="M7 1L13 13H1L7 1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <line x1="7" y1="5.5" x2="7" y2="8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <circle cx="7" cy="10.5" r="0.6" fill="currentColor"/>
    </svg>
  );
}

export default function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="error-banner" role="alert">
      <WarningTriangle />
      <span style={{ flex: 1 }}>{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} aria-label="Dismiss error">✕</button>
      )}
    </div>
  );
}