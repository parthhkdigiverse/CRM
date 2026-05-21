import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Apply saved theme before React renders (prevents flash)
try {
  const stored = JSON.parse(localStorage.getItem('crm-theme') || '{}');
  if (stored?.state?.isDark) {
    document.documentElement.classList.add('dark');
  }
} catch {}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
