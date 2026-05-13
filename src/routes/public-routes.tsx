import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'
import { RequireSession } from '@/components/auth/RouteGuards'
import DownloadsShell from '@/components/downloads/DownloadsShell'

const CadastroPublicoPage = lazy(() => import('@/pages/cadastro/CadastroPublicoPage'))
const ValidarCartaoPage = lazy(() => import('@/pages/ValidarCartaoPage'))
const DiretorioIgrejasPage = lazy(() => import('@/pages/DiretorioIgrejasPage'))
const EBPublicPage = lazy(() => import('@/pages/public/EBPublicPage'))
const FichaPublicaPage = lazy(() => import('@/pages/public/FichaPublicaPage'))
const DownloadsHomePagePublic = lazy(() => import('@/pages/downloads/DownloadsHomePage'))
const DownloadsCategoriaPagePublic = lazy(() => import('@/pages/downloads/DownloadsCategoriaPage'))
const DownloadsItemPagePublic = lazy(() => import('@/pages/downloads/DownloadsItemPage'))
const PortalLoginPage = lazy(() => import('@/pages/portal/PortalLoginPage'))
const PortalLandingPage = lazy(() => import('@/pages/portal/PortalLandingPage'))
const PortalDashboardPage = lazy(() => import('@/pages/portal/PortalDashboardPage'))
const PortalPerfilPage = lazy(() => import('@/pages/portal/PortalPerfilPage'))
const Login = lazy(() => import('@/pages/Login'))
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'))

export const publicRoutes: RouteObject[] = [
  { path: '/formulario', element: <CadastroPublicoPage /> },
  { path: '/ficha/:id', element: <FichaPublicaPage /> },
  { path: '/validar-cartao', element: <ValidarCartaoPage /> },
  { path: '/diretorio', element: <DiretorioIgrejasPage /> },
  { path: '/eb/:classeId', element: <EBPublicPage /> },
  // Downloads — sistema público independente com layout próprio
  {
    path: '/downloads',
    element: <DownloadsShell />,
    children: [
      { index: true, element: <DownloadsHomePagePublic /> },
      { path: ':slug', element: <DownloadsCategoriaPagePublic /> },
      { path: ':categoria_slug/:item_slug', element: <DownloadsItemPagePublic /> },
    ],
  },
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
