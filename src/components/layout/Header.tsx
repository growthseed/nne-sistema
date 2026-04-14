import { useAuth } from '@/contexts/AuthContext'
import { HiOutlineLogout, HiOutlineBell, HiOutlineMenu } from 'react-icons/hi'

interface HeaderProps {
  onMenuToggle: () => void
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const { profile, signOut } = useAuth()

  return (
    <header className="h-14 lg:h-16 bg-white border-b border-gray-200 flex items-center justify-between px-3 sm:px-4 lg:px-6">
      <div className="flex items-center gap-3">
        {/* Hamburger menu - mobile only */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-1.5 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
        >
          <HiOutlineMenu className="w-5 h-5" />
        </button>

        <h2 className="text-sm lg:text-lg font-semibold text-gray-800 truncate">
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
        <button className="relative p-1.5 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
          <HiOutlineBell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <div className="hidden sm:block h-8 w-px bg-gray-200" />

        <div className="hidden sm:flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-700">{profile?.nome}</p>
            <p className="text-xs text-gray-500">{profile?.email}</p>
          </div>
        </div>

        <button
          onClick={signOut}
          className="p-1.5 text-gray-500 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          title="Sair"
        >
          <HiOutlineLogout className="w-5 h-5" />
        </button>
      </div>
    </header>
  )
}
