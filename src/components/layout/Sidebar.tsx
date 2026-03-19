import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  HiOutlineHome,
  HiOutlineUserGroup,
  HiOutlineCurrencyDollar,
  HiOutlineAcademicCap,
  HiOutlineMap,
  HiOutlineChartBar,
  HiOutlineDocumentReport,
  HiOutlineGlobe,
  HiOutlineCog,
  HiOutlineOfficeBuilding,
  HiOutlineDocumentText,
  HiOutlineLightBulb,
  HiOutlineUsers,
  HiOutlineBriefcase,
  HiOutlineClipboardCheck,
  HiOutlineCalendar,
  HiOutlinePresentationChartBar,
  HiOutlineChevronUp,
  HiOutlineChevronDown,
  HiOutlineSearchCircle,
  HiOutlineLibrary,
} from 'react-icons/hi'
import type { IconType } from 'react-icons'

interface MenuItem {
  to: string
  label: string
  icon: IconType
  roles: string[] | null
}

interface MenuGroup {
  key: string
  label: string
  items: MenuItem[]
}

const SEC_ROLES = ['admin', 'admin_uniao', 'admin_associacao', 'secretario_igreja']
const ADMIN_ROLES = ['admin', 'admin_uniao', 'admin_associacao']
const FIN_ROLES = ['admin', 'admin_uniao', 'admin_associacao', 'tesoureiro']
const ES_ROLES = ['admin', 'admin_uniao', 'admin_associacao', 'diretor_es', 'professor_es', 'secretario_es']

const menuGroups: MenuGroup[] = [
  {
    key: 'inicio',
    label: 'Início',
    items: [
      { to: '/', label: 'Painel Geral', icon: HiOutlineHome, roles: null },
    ],
  },
  {
    key: 'secretaria',
    label: 'Secretaria',
    items: [
      { to: '/secretaria', label: 'Painel', icon: HiOutlineDocumentText, roles: SEC_ROLES },
      { to: '/membros', label: 'Membros', icon: HiOutlineUserGroup, roles: SEC_ROLES },
      { to: '/membros/familias', label: 'Famílias', icon: HiOutlineUsers, roles: SEC_ROLES },
      { to: '/secretaria/contagem', label: 'Contagem Mensal', icon: HiOutlineClipboardCheck, roles: SEC_ROLES },
      { to: '/secretaria/transferencias', label: 'Transferências', icon: HiOutlineDocumentReport, roles: SEC_ROLES },
      { to: '/secretaria/aniversariantes', label: 'Aniversariantes', icon: HiOutlineCalendar, roles: SEC_ROLES },
      { to: '/secretaria/qualidade-dados', label: 'Qualidade de Dados', icon: HiOutlineSearchCircle, roles: ADMIN_ROLES },
      { to: '/secretaria/duplicados', label: 'Duplicados', icon: HiOutlineUsers, roles: ADMIN_ROLES },
    ],
  },
  {
    key: 'missoes',
    label: 'Missões',
    items: [
      { to: '/missoes', label: 'Dashboard', icon: HiOutlineLightBulb, roles: [...ADMIN_ROLES, 'secretario_igreja', 'membro'] },
      { to: '/missoes/meu-painel', label: 'Meu Painel', icon: HiOutlineBriefcase, roles: ADMIN_ROLES },
      { to: '/missoes/relatorio', label: 'Relatório Mensal', icon: HiOutlineDocumentText, roles: ADMIN_ROLES },
      { to: '/missoes/inventario', label: 'Ficha de Campo', icon: HiOutlineClipboardCheck, roles: ADMIN_ROLES },
      { to: '/missoes/planejador-visitas', label: 'Planejador de Visitas', icon: HiOutlineCalendar, roles: [...ADMIN_ROLES, 'secretario_igreja'] },
      { to: '/missoes/metas', label: 'Metas e KPIs', icon: HiOutlinePresentationChartBar, roles: ADMIN_ROLES },
      { to: '/missoes/relatorio-campo', label: 'Relatório do Campo', icon: HiOutlineDocumentReport, roles: ADMIN_ROLES },
      { to: '/missoes/diagnostico', label: 'Diagnóstico', icon: HiOutlineSearchCircle, roles: ADMIN_ROLES },
      { to: '/missoes/painel-geral', label: 'Painel Geral', icon: HiOutlineChartBar, roles: ADMIN_ROLES },
    ],
  },
  {
    key: 'financeiro',
    label: 'Financeiro',
    items: [
      { to: '/financeiro', label: 'Painel', icon: HiOutlineCurrencyDollar, roles: FIN_ROLES },
      { to: '/financeiro/lancamentos', label: 'Lançamentos', icon: HiOutlineDocumentText, roles: FIN_ROLES },
      { to: '/financeiro/receita-campo', label: 'Contribuições', icon: HiOutlinePresentationChartBar, roles: FIN_ROLES },
    ],
  },
  {
    key: 'escola-sabatina',
    label: 'Escola Sabatina',
    items: [
      { to: '/escola-sabatina', label: 'Classes', icon: HiOutlineAcademicCap, roles: ES_ROLES },
      { to: '/escola-sabatina/batismais', label: 'Classes Batismais', icon: HiOutlineLibrary, roles: ES_ROLES },
      { to: '/escola-sabatina/presenca', label: 'Presença', icon: HiOutlineClipboardCheck, roles: ES_ROLES },
    ],
  },
  {
    key: 'organizacao',
    label: 'Organização',
    items: [
      { to: '/organizacao/igrejas', label: 'Igrejas', icon: HiOutlineOfficeBuilding, roles: ADMIN_ROLES },
      { to: '/organizacao/associacoes', label: 'Associações', icon: HiOutlineOfficeBuilding, roles: ADMIN_ROLES },
    ],
  },
  {
    key: 'inteligencia',
    label: 'Inteligência',
    items: [
      { to: '/mapas', label: 'Mapa Territorial', icon: HiOutlineMap, roles: [...ADMIN_ROLES, 'secretario_igreja'] },
      { to: '/ibge', label: 'Dados IBGE', icon: HiOutlineGlobe, roles: ADMIN_ROLES },
      { to: '/relatorios', label: 'Relatórios', icon: HiOutlineDocumentReport, roles: [...ADMIN_ROLES, 'secretario_igreja', 'tesoureiro'] },
      { to: '/analytics', label: 'Análises', icon: HiOutlineChartBar, roles: ADMIN_ROLES },
      { to: '/secretaria/funil', label: 'Funil de Conversão', icon: HiOutlinePresentationChartBar, roles: ADMIN_ROLES },
      { to: '/secretaria/saude', label: 'Saúde dos Membros', icon: HiOutlineSearchCircle, roles: ADMIN_ROLES },
    ],
  },
  {
    key: 'admin',
    label: 'Administração',
    items: [
      { to: '/configuracoes', label: 'Configurações', icon: HiOutlineCog, roles: ['admin'] },
      { to: '/cadastro', label: 'Cadastro Público', icon: HiOutlineClipboardCheck, roles: ADMIN_ROLES },
      { to: '/organizacao/unioes', label: 'Uniões', icon: HiOutlineOfficeBuilding, roles: ['admin', 'admin_uniao'] },
    ],
  },
]

const STORAGE_KEY = 'nne-sidebar-groups-v2'

function getGroupForPath(path: string): string | null {
  for (const group of menuGroups) {
    for (const item of group.items) {
      if (item.to === '/' && path === '/') return group.key
      if (item.to !== '/' && path.startsWith(item.to)) return group.key
    }
  }
  return null
}

export default function Sidebar() {
  const { profile, hasRole } = useAuth()
  const location = useLocation()

  const [openGroups, setOpenGroups] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : menuGroups.map(g => g.key)
    } catch {
      return menuGroups.map(g => g.key)
    }
  })

  useEffect(() => {
    const activeGroup = getGroupForPath(location.pathname)
    if (activeGroup && !openGroups.includes(activeGroup)) {
      setOpenGroups(prev => [...prev, activeGroup])
    }
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(openGroups))
  }, [openGroups])

  const toggleGroup = (key: string) => {
    setOpenGroups(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const visibleGroups = menuGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => {
        if (!item.roles) return true
        return hasRole(item.roles as any)
      }),
    }))
    .filter(group => group.items.length > 0)

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-primary-600">NNE Sistema</h1>
        <p className="text-xs text-gray-500 mt-1">União Norte Nordeste Brasileira</p>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {visibleGroups.map(group => {
          const isOpen = openGroups.includes(group.key)
          const groupHasActive = group.items.some(item =>
            item.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.to)
          )
          const Chevron = isOpen ? HiOutlineChevronUp : HiOutlineChevronDown

          return (
            <div key={group.key}>
              <button
                onClick={() => toggleGroup(group.key)}
                className={groupHasActive ? 'sidebar-group-header-active' : 'sidebar-group-header'}
              >
                <span>{group.label}</span>
                <Chevron className="w-3.5 h-3.5" />
              </button>

              {isOpen && (
                <div className="mt-0.5 space-y-0.5">
                  {group.items.map(item => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/' || item.to === '/financeiro' || item.to === '/escola-sabatina' || item.to === '/secretaria' || item.to === '/missoes'}
                      className={({ isActive }) => isActive ? 'sidebar-subitem-active' : 'sidebar-subitem'}
                    >
                      <item.icon className="w-4.5 h-4.5" />
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {profile && (
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-medium text-sm">
              {profile.nome.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 truncate">{profile.nome}</p>
              <p className="text-xs text-gray-500 truncate">{profile.papel.replace(/_/g, ' ')}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
