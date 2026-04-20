// src/components/ErrorBanner.jsx

import React from 'react';

export default function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="error-banner" role="alert">
      <span>⚠️</span>
      <span style={{ flex: 1 }}>{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} aria-label="Dismiss error">✕</button>
      )}
    </div>
  );
}