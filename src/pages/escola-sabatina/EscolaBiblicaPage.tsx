import { Suspense, lazy, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  HiOutlineBookOpen,
  HiOutlineUserGroup,
  HiOutlineAcademicCap,
  HiOutlineClipboardCheck,
} from 'react-icons/hi'

const EscolaBiblicaRespostasTab = lazy(() => import('@/components/escola-biblica/RespostasTab'))
const EscolaBiblicaTurmasTab = lazy(() => import('@/components/escola-biblica/TurmasTab'))
const EscolaBiblicaConteudoTab = lazy(() => import('@/components/escola-biblica/ConteudoTab'))

type TabType = 'conteudo' | 'turmas' | 'respostas'

function isMaster(papel: string) {
  return ['admin', 'admin_uniao'].includes(papel)
}

function canManage(papel: string) {
  return ['admin', 'admin_uniao', 'admin_associacao', 'secretario_igreja', 'diretor_es', 'professor_es'].includes(papel)
}

export default function EscolaBiblicaPage() {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('conteudo')
  const userPapel = profile?.papel || 'membro'
  const master = isMaster(userPapel)
  const manager = canManage(userPapel)

  const tabs: { id: TabType; label: string; icon: any; visible: boolean }[] = [
    { id: 'conteudo', label: 'ConteÃºdo', icon: HiOutlineBookOpen, visible: true },
    { id: 'turmas', label: 'Turmas & Alunos', icon: HiOutlineUserGroup, visible: manager },
    { id: 'respostas', label: 'Respostas', icon: HiOutlineClipboardCheck, visible: manager },
  ]

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header premium */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-700 via-primary-600 to-emerald-500 p-6 text-white shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djJoLTR2LTJoNHptMC0zMHYyaC00VjRoNHpNNiAzNHYySDJ2LTJoNHptMC0zMHYySDJWNGg0eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <HiOutlineAcademicCap className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Escola BÃ­blica</h1>
              <p className="text-white/80 text-sm">
                {master ? 'Gerencie mÃ³dulos, conteÃºdo e turmas' : 'Gerencie turmas e acompanhe alunos'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {tabs.filter(t => t.visible).map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4.5 h-4.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'conteudo' && (
        <Suspense fallback={<div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">Carregando conteudo...</div>}>
          <EscolaBiblicaConteudoTab canEdit={master} />
        </Suspense>
      )}
      {activeTab === 'turmas' && manager && (
        <Suspense fallback={<div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">Carregando turmas...</div>}>
          <EscolaBiblicaTurmasTab />
        </Suspense>
      )}
      {activeTab === 'respostas' && manager && (
        <Suspense fallback={<div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">Carregando respostas da turma...</div>}>
          <EscolaBiblicaRespostasTab />
        </Suspense>
      )}
    </div>
  )
}
