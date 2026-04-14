/**
 * Observability — abstração sobre Sentry.
 *
 * Quando VITE_SENTRY_DSN não está configurado, as funções degradam
 * silenciosamente (log no console em dev, no-op em produção).
 *
 * Para ativar: defina VITE_SENTRY_DSN nas variáveis de ambiente da Vercel.
 */
import * as Sentry from '@sentry/react'

const isDev = import.meta.env.DEV
const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined

export const sentryEnabled = Boolean(dsn)

/**
 * Registra um evento personalizado (breadcrumb + contexto extra).
 * Visível em Sentry → Issues → Breadcrumbs.
 */
export function trackEvent(
  name: string,
  payload?: Record<string, unknown>,
): void {
  if (!sentryEnabled) {
    if (isDev) console.info(`[obs] event: ${name}`, payload)
    return
  }

  Sentry.addBreadcrumb({
    category: 'app.event',
    message: name,
    data: payload,
    level: 'info',
  })
}

/**
 * Captura um erro com contexto extra.
 * Aparece em Sentry → Issues.
 */
export function trackError(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (!sentryEnabled) {
    if (isDev) console.error('[obs] error:', error, context)
    return
  }

  Sentry.withScope(scope => {
    if (context) scope.setExtras(context)
    Sentry.captureException(error)
  })
}

/**
 * Associa o usuário autenticado ao contexto do Sentry.
 * Chamar após login bem-sucedido.
 */
export function identifyUser(userId: string, email?: string): void {
  if (!sentryEnabled) return
  Sentry.setUser({ id: userId, email })
}

/**
 * Remove o usuário do contexto (chamar no logout).
 */
export function clearUser(): void {
  if (!sentryEnabled) return
  Sentry.setUser(null)
}
