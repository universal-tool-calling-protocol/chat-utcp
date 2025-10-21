// Import process polyfill FIRST before any other imports
import './polyfills/process'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Suppress browser extension errors (Grammarly, etc.)
window.addEventListener('error', (e) => {
  if (e.message?.includes('disconnected port') || e.message?.includes('Extension context')) {
    e.preventDefault();
    console.warn('Browser extension error suppressed:', e.message);
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
