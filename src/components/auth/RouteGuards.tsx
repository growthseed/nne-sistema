import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import PageLoader from '@/components/ui/PageLoader'
import SessionExpired from '@/components/ui/SessionExpired'
import type { UserRole } from '@/types'
import { getAccessRule, canAccessWithPermissions, type AccessRuleKey } from '@/lib/access'
import { canAccessDomain, type AppDomain } from '@/lib/permissions'

interface GuardProps {
  children?: ReactNode
}

interface SessionGuardProps extends GuardProps {
  redirectTo?: string
  preserveRedirect?: boolean
}

interface RoleGuardProps extends GuardProps {
  roles: readonly UserRole[]
  redirectTo?: string
}

interface AccessGuardProps extends GuardProps {
  accessKey: AccessRuleKey
  redirectTo?: string
}

interface DomainGuardProps extends GuardProps {
  domain: AppDomain
  redirectTo?: string
}

function GuardOutlet({ children }: GuardProps) {
  return <>{children ?? <Outlet />}</>
}

export function RequireSession({ children, redirectTo = '/login', preserveRedirect = true }: SessionGuardProps) {
  const { session, loading, sessionExpired } = useAuth()
  const location = useLocation()

  if (loading) return <PageLoader />

  if (!session) {
    if (sessionExpired) return <SessionExpired />

    const destination = preserveRedirect
      ? `${redirectTo}${redirectTo.includes('?') ? '&' : '?'}redirect=${encodeURIComponent(location.pathname + location.search)}`
      : redirectTo

    return <Navigate to={destination} replace />
  }

  return <GuardOutlet>{children}</GuardOutlet>
}

export function RequireRoles({ children, roles, redirectTo = '/' }: RoleGuardProps) {
  const { session, loading, hasRole } = useAuth()

  if (loading) return <PageLoader />
  if (!session) return <Navigate to="/login" replace />
  if (!hasRole(roles)) return <Navigate to={redirectTo} replace />

  return <GuardOutlet>{children}</GuardOutlet>
}

export function RequireAccess({ children, accessKey, redirectTo }: AccessGuardProps) {
  const { profile, session, loading } = useAuth()
  const rule = getAccessRule(accessKey)

  if (!rule.roles) return <GuardOutlet>{children}</GuardOutlet>
  if (loading) return <PageLoader />
  if (!session) return <Navigate to="/login" replace />
  if (!canAccessWithPermissions(profile, accessKey)) {
    return <Navigate to={redirectTo ?? rule.redirectTo ?? '/'} replace />
  }
  return <GuardOutlet>{children}</GuardOutlet>
}

export function RequireDomain({ children, domain, redirectTo = '/' }: DomainGuardProps) {
  const { profile, loading } = useAuth()

  if (loading) return <PageLoader />
  if (!profile) return <Navigate to="/login" replace />
  if (!canAccessDomain(profile.papel, domain)) return <Navigate to={redirectTo} replace />

  return <GuardOutlet>{children}</GuardOutlet>
}
