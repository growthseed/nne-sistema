import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  HiOutlineHome,
  HiOutlineUserGroup,
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
import {
  getSidebarGroupForPath,
  getVisibleSidebarGroups,
  type SidebarIconKey,
} from '@/lib/access'

interface SidebarProps {
  onClose?: () => void
}

const STORAGE_KEY = 'nne-sidebar-groups-v2'

const iconMap: Record<SidebarIconKey, IconType> = {
  home: HiOutlineHome,
  'user-group': HiOutlineUserGroup,
  'academic-cap': HiOutlineAcademicCap,
  map: HiOutlineMap,
  'chart-bar': HiOutlineChartBar,
  'document-report': HiOutlineDocumentReport,
  globe: HiOutlineGlobe,
  cog: HiOutlineCog,
  'office-building': HiOutlineOfficeBuilding,
  'document-text': HiOutlineDocumentText,
  'light-bulb': HiOutlineLightBulb,
  users: HiOutlineUsers,
  briefcase: HiOutlineBriefcase,
  'clipboard-check': HiOutlineClipboardCheck,
  calendar: HiOutlineCalendar,
  'presentation-chart-bar': HiOutlinePresentationChartBar,
  'search-circle': HiOutlineSearchCircle,
  library: HiOutlineLibrary,
}

export default function Sidebar({ onClose }: SidebarProps) {
  const { profile } = useAuth()
  const location = useLocation()
  const visibleGroups = getVisibleSidebarGroups(profile)

  const [openGroups, setOpenGroups] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : visibleGroups.map(group => group.key)
    } catch {
      return visibleGroups.map(group => group.key)
    }
  })

  useEffect(() => {
    const allowedKeys = new Set(visibleGroups.map(group => group.key))
    const nextOpenGroups = openGroups.filter(key => allowedKeys.has(key))

    if (nextOpenGroups.length !== openGroups.length) {
      setOpenGroups(nextOpenGroups.length > 0 ? nextOpenGroups : visibleGroups.map(group => group.key))
    }
  }, [openGroups, visibleGroups])

  useEffect(() => {
    const activeGroup = getSidebarGroupForPath(location.pathname, visibleGroups)
    if (activeGroup && !openGroups.includes(activeGroup)) {
      setOpenGroups(prev => [...prev, activeGroup])
    }
  }, [location.pathname, openGroups, visibleGroups])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(openGroups))
  }, [openGroups])

  const toggleGroup = (key: string) => {
    setOpenGroups(prev =>
      prev.includes(key) ? prev.filter(groupKey => groupKey !== key) : [...prev, key],
    )
  }

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
              : location.pathname.startsWith(item.to),
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
                  {group.items.map(item => {
                    const Icon = iconMap[item.icon]

                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) => (isActive ? 'sidebar-subitem-active' : 'sidebar-subitem')}
                        onClick={() => onClose?.()}
                      >
                        <Icon className="w-4.5 h-4.5" />
                        {item.label}
                      </NavLink>
                    )
                  })}
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
