
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

/**
 * SERVICE WORKER REGISTRATION
 * Note: Cloud-based preview environments (like AI Studio) often block Service Workers 
 * due to origin/sandboxing restrictions. The app's core data-level offline functionality 
 * is handled via offlineApi (LocalStorage) in supabase.ts, which works regardless of SW.
 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Check if we are in a context that typically allows Service Workers
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isSecureContext = window.isSecureContext;
    
    // Only attempt registration if the environment is suitable
    if (isSecureContext || isLocalhost) {
      navigator.serviceWorker.register('./sw.js')
        .then(registration => {
          console.log('SW registered:', registration.scope);
        })
        .catch(err => {
          // Log as warning rather than error to avoid flooding consoles in restricted environments
          console.warn('Service Worker registration skipped (Environment limitation). Offline data still active via LocalStorage.', err.message);
        });
    }
  });
}
