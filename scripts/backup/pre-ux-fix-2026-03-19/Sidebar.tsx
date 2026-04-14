import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  HiOutlineHome,
  HiOutlineUserGroup,
  HiOutlineClipboardList,
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
  HiOutlineIdentification,
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

const isMVP = import.meta.env.VITE_MVP_ONLY === 'true'

interface MenuItem {
  to: string
  label: string
  icon: IconType
  roles: string[] | null
  mvp?: boolean // true = show in MVP mode
}

interface MenuGroup {
  key: string
  label: string
  items: MenuItem[]
  mvp?: boolean // true = show entire group in MVP mode
}

const menuGroups: MenuGroup[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    mvp: true,
    items: [
      { to: '/', label: 'Painel Geral', icon: HiOutlineHome, roles: null, mvp: true },
    ],
  },
  {
    key: 'cadastro',
    label: 'Censo / Pesquisa',
    mvp: true,
    items: [
      { to: '/cadastro', label: 'Novo Cadastro', icon: HiOutlineClipboardList, roles: ['admin', 'admin_uniao', 'admin_associacao', 'secretario_igreja'], mvp: true },
      { to: '/cadastro/dashboard', label: 'Pesquisa Analytics', icon: HiOutlineChartBar, roles: ['admin', 'admin_uniao', 'admin_associacao', 'secretario_igreja'], mvp: true },
    ],
  },
  {
    key: 'secretaria',
    label: 'Secretaria',
    mvp: true,
    items: [
      { to: '/secretaria', label: 'Painel Secretaria', icon: HiOutlineDocumentText, roles: ['admin', 'admin_uniao', 'admin_associacao', 'secretario_igreja'], mvp: true },
      { to: '/membros', label: 'Membros', icon: HiOutlineUserGroup, roles: ['admin', 'admin_uniao', 'admin_associacao', 'secretario_igreja'], mvp: true },
      { to: '/membros/cartao', label: 'Cartao de Membro', icon: HiOutlineIdentification, roles: ['admin', 'admin_uniao', 'admin_associacao', 'secretario_igreja'], mvp: true },
      { to: '/membros/familias', label: 'Familias', icon: HiOutlineUsers, roles: ['admin', 'admin_uniao', 'admin_associacao', 'secretario_igreja'], mvp: true },
      { to: '/secretaria/contagem', label: 'Contagem Mensal', icon: HiOutlineClipboardCheck, roles: ['admin', 'admin_uniao', 'admin_associacao', 'secretario_igreja'], mvp: true },
      { to: '/secretaria/transferencias', label: 'Transferencias', icon: HiOutlineDocumentReport, roles: ['admin', 'admin_uniao', 'admin_associacao', 'secretario_igreja'], mvp: true },
      { to: '/secretaria/aniversariantes', label: 'Aniversariantes', icon: HiOutlineCalendar, roles: ['admin', 'admin_uniao', 'admin_associacao', 'secretario_igreja'], mvp: true },
      { to: '/secretaria/funil', label: 'Funil Conversão', icon: HiOutlinePresentationChartBar, roles: ['admin', 'admin_uniao', 'admin_associacao', 'secretario_igreja'], mvp: true },
      { to: '/secretaria/saude', label: 'Saúde Membros', icon: HiOutlineSearchCircle, roles: ['admin', 'admin_uniao', 'admin_associacao', 'secretario_igreja'], mvp: true },
      { to: '/secretaria/classes-biblicas', label: 'Classes Bíblicas', icon: HiOutlineAcademicCap, roles: ['admin', 'admin_uniao', 'admin_associacao', 'secretario_igreja'], mvp: true },
    ],
  },
  {
    key: 'financeiro',
    label: 'Financeiro',
    mvp: true,
    items: [
      { to: '/financeiro', label: 'Dashboard', icon: HiOutlineCurrencyDollar, roles: ['admin', 'admin_uniao', 'admin_associacao', 'tesoureiro'], mvp: true },
      { to: '/financeiro/lancamentos', label: 'Lancamentos', icon: HiOutlineDocumentText, roles: ['admin', 'admin_uniao', 'admin_associacao', 'tesoureiro'], mvp: true },
      { to: '/financeiro/receita-campo', label: 'Contribuicoes', icon: HiOutlinePresentationChartBar, roles: ['admin', 'admin_uniao', 'admin_associacao', 'tesoureiro'], mvp: true },
    ],
  },
  {
    key: 'escola-sabatina',
    label: 'Escola Sabatina',
    mvp: true,
    items: [
      { to: '/escola-sabatina', label: 'Classes', icon: HiOutlineAcademicCap, roles: ['admin', 'admin_uniao', 'admin_associacao', 'diretor_es', 'professor_es', 'secretario_es'], mvp: true },
      { to: '/escola-sabatina/batismais', label: 'Classes Batismais', icon: HiOutlineLibrary, roles: ['admin', 'admin_uniao', 'admin_associacao', 'diretor_es', 'professor_es', 'secretario_es'], mvp: true },
      { to: '/escola-sabatina/presenca', label: 'Presenca', icon: HiOutlineClipboardCheck, roles: ['admin', 'admin_uniao', 'admin_associacao', 'diretor_es', 'professor_es', 'secretario_es'], mvp: true },
    ],
  },
  {
    key: 'missoes',
    label: 'Missoes',
    mvp: true,
    items: [
      { to: '/missoes', label: 'Dashboard', icon: HiOutlineLightBulb, roles: ['admin', 'admin_uniao', 'admin_associacao', 'secretario_igreja', 'membro'], mvp: true },
      { to: '/missoes/inventario', label: 'Ficha de Campo', icon: HiOutlineClipboardCheck, roles: ['admin', 'admin_uniao', 'admin_associacao'], mvp: true },
      { to: '/missoes/meu-painel', label: 'Meu Painel', icon: HiOutlineBriefcase, roles: ['admin', 'admin_uniao', 'admin_associacao'], mvp: true },
      { to: '/missoes/metas', label: 'Metas e KPIs', icon: HiOutlinePresentationChartBar, roles: ['admin', 'admin_uniao', 'admin_associacao'], mvp: true },
      { to: '/missoes/planejador-visitas', label: 'Planejador Visitas', icon: HiOutlineCalendar, roles: ['admin', 'admin_uniao', 'admin_associacao', 'secretario_igreja'], mvp: true },
      { to: '/missoes/relatorio-campo', label: 'Relatorio Campo', icon: HiOutlineDocumentReport, roles: ['admin', 'admin_uniao', 'admin_associacao'], mvp: true },
      { to: '/missoes/diagnostico', label: 'Diagnostico', icon: HiOutlineSearchCircle, roles: ['admin', 'admin_uniao', 'admin_associacao'], mvp: true },
      { to: '/missoes/painel-geral', label: 'Painel Geral', icon: HiOutlineChartBar, roles: ['admin', 'admin_uniao', 'admin_associacao'], mvp: true },
    ],
  },
  {
    key: 'organizacao',
    label: 'Organizacao',
    mvp: true,
    items: [
      { to: '/organizacao/igrejas', label: 'Igrejas', icon: HiOutlineOfficeBuilding, roles: ['admin', 'admin_uniao', 'admin_associacao'], mvp: true },
      { to: '/organizacao/unioes', label: 'Unioes', icon: HiOutlineOfficeBuilding, roles: ['admin', 'admin_uniao'], mvp: true },
      { to: '/organizacao/associacoes', label: 'Associacoes', icon: HiOutlineOfficeBuilding, roles: ['admin', 'admin_uniao', 'admin_associacao'], mvp: true },
    ],
  },
  {
    key: 'inteligencia',
    label: 'Inteligencia',
    mvp: true,
    items: [
      { to: '/mapas', label: 'Mapas', icon: HiOutlineMap, roles: ['admin', 'admin_uniao', 'admin_associacao', 'secretario_igreja'], mvp: true },
      { to: '/ibge', label: 'Dados Territoriais', icon: HiOutlineGlobe, roles: ['admin', 'admin_uniao', 'admin_associacao'], mvp: true },
      { to: '/relatorios', label: 'Relatorios', icon: HiOutlineDocumentReport, roles: ['admin', 'admin_uniao', 'admin_associacao', 'secretario_igreja', 'tesoureiro'], mvp: true },
      { to: '/analytics', label: 'Analises', icon: HiOutlineChartBar, roles: ['admin', 'admin_uniao', 'admin_associacao'], mvp: true },
    ],
  },
  {
    key: 'admin',
    label: 'Administracao',
    mvp: true,
    items: [
      { to: '/configuracoes', label: 'Configuracoes', icon: HiOutlineCog, roles: ['admin'], mvp: true },
    ],
  },
]

const STORAGE_KEY = 'nne-sidebar-groups'

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

  // Auto-expand group that contains active route
  useEffect(() => {
    const activeGroup = getGroupForPath(location.pathname)
    if (activeGroup && !openGroups.includes(activeGroup)) {
      setOpenGroups(prev => [...prev, activeGroup])
    }
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(openGroups))
  }, [openGroups])

  const toggleGroup = (key: string) => {
    setOpenGroups(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  // Filter groups by MVP mode + RBAC
  const visibleGroups = menuGroups
    .filter(group => !isMVP || group.mvp) // In MVP mode, only show groups marked as mvp
    .map(group => ({
      ...group,
      items: group.items.filter(item => {
        // In MVP mode, only show items marked as mvp
        if (isMVP && !item.mvp) return false
        if (!item.roles) return true
        return hasRole(item.roles as any)
      }),
    }))
    .filter(group => group.items.length > 0)

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-primary-600">NNE Sistema</h1>
        <p className="text-xs text-gray-500 mt-1">Uniao Norte Nordeste Brasileira</p>
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
