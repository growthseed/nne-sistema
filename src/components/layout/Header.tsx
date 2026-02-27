import { useAuth } from '@/contexts/AuthContext'
import { HiOutlineLogout, HiOutlineBell } from 'react-icons/hi'

export default function Header() {
  const { profile, signOut } = useAuth()

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">
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

      <div className="flex items-center gap-4">
        <button className="relative p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
          <HiOutlineBell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <div className="h-8 w-px bg-gray-200" />

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-700">{profile?.nome}</p>
            <p className="text-xs text-gray-500">{profile?.email}</p>
          </div>
          <button
            onClick={signOut}
            className="p-2 text-gray-500 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            title="Sair"
          >
            <HiOutlineLogout className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  )
}
