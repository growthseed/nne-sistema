import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { queryClient } from '@/lib/query-client'
import App from './App'
import './index.css'

// ── Sentry — ativo somente quando VITE_SENTRY_DSN está configurado ──────────
const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: (import.meta.env.VITE_APP_ENV as string | undefined) ?? 'production',
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    // 10 % das navegações viram performance traces (ajustar conforme cota do plano)
    tracesSampleRate: 0.1,
    // Não capturar erros em dev a menos que DSN esteja definido explicitamente
    enabled: Boolean(sentryDsn),
  })
}
// ─────────────────────────────────────────────────────────────────────────────

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <App />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: { fontSize: '14px' },
                success: { iconTheme: { primary: '#047857', secondary: '#fff' } },
                error: { duration: 6000 },
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
