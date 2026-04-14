import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { HiOutlineLogout, HiOutlineBell, HiOutlineMenu, HiOutlineSun, HiOutlineMoon } from 'react-icons/hi'

interface HeaderProps {
  onMenuToggle: () => void
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const { profile, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="h-14 lg:h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-3 sm:px-4 lg:px-6">
      <div className="flex items-center gap-3">
        {/* Hamburger menu - mobile only */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <HiOutlineMenu className="w-5 h-5" />
        </button>

        <h2 className="text-sm lg:text-lg font-semibold text-gray-800 dark:text-gray-100 truncate">
          {profile?.papel === 'admin' && 'Administração Geral'}
          {profile?.papel === 'admin_uniao' && 'União Norte Nordeste'}
          {profile?.papel === 'admin_associacao' && 'Associação / Campo'}
          {profile?.papel === 'secretario_igreja' && 'Secretaria da Igreja'}
          {profile?.papel === 'tesoureiro' && 'Tesouraria'}
          {profile?.papel === 'diretor_es' && 'Escola Sabatina'}
          {profile?.papel === 'professor_es' && 'Escola Sabatina'}
          {profile?.papel === 'secretario_es' && 'Escola Sabatina'}
          {profile?.papel === 'membro' && 'Área do Membro'}
        </h2>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <button
          onClick={toggleTheme}
          className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-primary-700 dark:hover:text-primary-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
          aria-label="Alternar tema"
        >
          {theme === 'dark'
            ? <HiOutlineSun className="w-5 h-5" />
            : <HiOutlineMoon className="w-5 h-5" />}
        </button>

        <button className="relative p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <HiOutlineBell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <div className="hidden sm:block h-8 w-px bg-gray-200 dark:bg-gray-700" />

        <div className="hidden sm:flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{profile?.nome}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{profile?.email}</p>
          </div>
        </div>

        <button
          onClick={signOut}
          className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          title="Sair"
        >
          <HiOutlineLogout className="w-5 h-5" />
        </button>
      </div>
    </header>
  )
}
