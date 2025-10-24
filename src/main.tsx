// Import process polyfill FIRST before any other imports
import './polyfills/process'

// Register all UTCP protocol plugins BEFORE app renders
// This ensures serializers are registered before config validation
// Note: @utcp/file and @utcp/mcp are Node.js-only and not imported in browser environment
import '@utcp/http'
import '@utcp/text'
import '@utcp/direct-call'

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
