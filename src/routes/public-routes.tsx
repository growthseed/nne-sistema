import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'
import { RequireSession } from '@/components/auth/RouteGuards'

const CadastroPublicoPage = lazy(() => import('@/pages/cadastro/CadastroPublicoPage'))
const ValidarCartaoPage = lazy(() => import('@/pages/ValidarCartaoPage'))
const DiretorioIgrejasPage = lazy(() => import('@/pages/DiretorioIgrejasPage'))
const EBPublicPage = lazy(() => import('@/pages/public/EBPublicPage'))
const PortalLoginPage = lazy(() => import('@/pages/portal/PortalLoginPage'))
const PortalLandingPage = lazy(() => import('@/pages/portal/PortalLandingPage'))
const PortalDashboardPage = lazy(() => import('@/pages/portal/PortalDashboardPage'))
const PortalPerfilPage = lazy(() => import('@/pages/portal/PortalPerfilPage'))
const Login = lazy(() => import('@/pages/Login'))
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'))

export const publicRoutes: RouteObject[] = [
  { path: '/formulario', element: <CadastroPublicoPage /> },
  { path: '/validar-cartao', element: <ValidarCartaoPage /> },
  { path: '/diretorio', element: <DiretorioIgrejasPage /> },
  { path: '/eb/:classeId', element: <EBPublicPage /> },
  { path: '/portal/login', element: <PortalLoginPage /> },
  { path: '/portal/inicio', element: <PortalLandingPage /> },
  {
    path: '/portal',
    element: (
      <RequireSession redirectTo="/portal/login">
        <PortalDashboardPage />
      </RequireSession>
    ),
  },
  {
    path: '/portal/perfil',
    element: (
      <RequireSession redirectTo="/portal/login">
        <PortalPerfilPage />
      </RequireSession>
    ),
  },
  { path: '/login', element: <Login /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
]
