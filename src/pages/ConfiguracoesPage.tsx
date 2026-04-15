import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { UserProfile, UserRole, TermoCompromissoContent } from '@/types'
import { FiUser, FiSettings, FiSave, FiShield, FiInfo, FiSearch, FiX, FiFileText, FiTag, FiPlus, FiTrash2, FiEdit } from 'react-icons/fi'
import { DEFAULT_TERMO, invalidateTermoCache } from '@/components/missoes/TermoCompromissoDisplay'
import { CARGO_LABELS, STATUS_LABELS } from '@/lib/missoes-constants'
import { useCargoLabels, useStatusLabels } from '@/hooks/useCargoLabels'

// ========== CONSTANTS ==========

type Tab = 'perfil' | 'usuarios' | 'documentos' | 'categorias' | 'sobre'

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  admin_uniao: 'Admin União',
  admin_associacao: 'Admin Associação',
  diretor_es: 'Diretor ES',
  professor_es: 'Professor ES',
  secretario_es: 'Secretário ES',
  tesoureiro: 'Tesoureiro',
  secretario_igreja: 'Secretário Igreja',
  membro: 'Membro',
}

const allRoles: UserRole[] = [
  'admin',
  'admin_uniao',
  'admin_associacao',
  'diretor_es',
  'professor_es',
  'secretario_es',
  'tesoureiro',
  'secretario_igreja',
  'membro',
]

interface IgrejaOption {
  id: string
  nome: string
  associacao_id?: string
}

interface AssociacaoOption {
  id: string
  nome: string
  sigla: string
  uniao_id: string
}

interface UniaoOption {
  id: string
  nome: string
  sigla: string
}

interface UsuarioComIgreja extends UserProfile {
  igreja?: { nome: string } | null
  associacao?: { nome: string; sigla: string } | null
  uniao?: { nome: string; sigla: string } | null
}

// ========== COMPONENT ==========

export default function ConfiguracoesPage() {
  const navigate = useNavigate()
  const { hasRole } = useAuth()
  // Qualquer nível de admin (global, união, associação) pode gerenciar usuários.
  // A RPC admin_create_user no banco garante a hierarquia: admin_uniao não cria
  // admin global, admin_associacao não cria admin_uniao, etc.
  const canManageUsers = hasRole(['admin', 'admin_uniao', 'admin_associacao'])
  // Apenas admin global tem acesso a documentos/categorias (config da plataforma)
  const isMasterAdmin = hasRole(['admin'])

  const [activeTab, setActiveTab] = useState<Tab>('perfil')

  const tabs: { key: Tab; label: string; icon: typeof FiUser; visible: boolean }[] = [
    { key: 'perfil', label: 'Meu Perfil', icon: FiUser, visible: true },
    { key: 'documentos', label: 'Documentos', icon: FiFileText, visible: isMasterAdmin },
    { key: 'categorias', label: 'Categorias', icon: FiTag, visible: isMasterAdmin },
    { key: 'sobre', label: 'Sobre', icon: FiInfo, visible: true },
  ]

  const visibleTabs = tabs.filter((t) => t.visible)

  // Redireciona admins para a nova página /usuarios se ainda clicarem na antiga aba
  useEffect(() => {
    if (activeTab === 'usuarios') {
      if (canManageUsers) navigate('/usuarios', { replace: true })
      else setActiveTab('perfil')
    }
    if ((activeTab === 'documentos' || activeTab === 'categorias') && !isMasterAdmin) setActiveTab('perfil')
  }, [canManageUsers, isMasterAdmin, activeTab, navigate])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="bg-primary-500 p-3 rounded-xl text-white">
          <FiSettings className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Configurações</h1>
          <p className="text-gray-500 mt-0.5">Gerencie seu perfil e o sistema</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 -mb-px">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'perfil' && <MeuPerfilSection />}
      {activeTab === 'usuarios' && canManageUsers && <GerenciarUsuariosSection />}
      {activeTab === 'documentos' && isMasterAdmin && <DocumentosSection />}
      {activeTab === 'categorias' && isMasterAdmin && <CategoriasSection />}
      {activeTab === 'sobre' && <SobreSection />}
    </div>
  )
}

// ========== MEU PERFIL ==========

function MeuPerfilSection() {
  const { profile } = useAuth()

  const [nome, setNome] = useState(profile?.nome || '')
  const [telefone, setTelefone] = useState(profile?.telefone || '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (profile) {
      setNome(profile.nome || '')
      setTelefone(profile.telefone || '')
    }
  }, [profile])

  async function handleSave() {
    if (!profile) return
    if (!nome.trim()) {
      setMessage({ type: 'error', text: 'O nome é obrigatório.' })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ nome: nome.trim(), telefone: telefone.trim() || null })
        .eq('id', profile.id)

      if (error) throw error
      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' })
    } catch (err: any) {
      console.error('Erro ao salvar perfil:', err)
      setMessage({ type: 'error', text: 'Erro ao salvar. Tente novamente.' })
    } finally {
      setSaving(false)
    }
  }

  if (!profile) {
    return <div className="card text-center text-gray-400 py-8">Carregando perfil...</div>
  }

  return (
    <div className="card max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-lg font-bold">
          {profile.nome?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Meu Perfil</h2>
          <p className="text-sm text-gray-500">Atualize suas informações pessoais</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Nome */}
        <div>
          <label className="label-field">Nome</label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="input-field"
            placeholder="Seu nome completo"
          />
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="label-field">E-mail</label>
          <input
            type="email"
            value={profile.email || ''}
            disabled
            className="input-field bg-gray-50 text-gray-500 cursor-not-allowed"
          />
          <p className="text-xs text-gray-400 mt-1">O e-mail não pode ser alterado aqui.</p>
        </div>

        {/* Telefone */}
        <div>
          <label className="label-field">Telefone</label>
          <input
            type="tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            className="input-field"
            placeholder="(00) 00000-0000"
          />
        </div>

        {/* Papel (read-only) */}
        <div>
          <label className="label-field">Papel no Sistema</label>
          <div className="flex items-center gap-2">
            <FiShield className="w-4 h-4 text-primary-500" />
            <span className="text-sm font-medium text-gray-700">
              {roleLabels[profile.papel] || profile.papel}
            </span>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`text-sm px-4 py-2.5 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Save */}
        <div className="pt-2">
          <button onClick={handleSave} disabled={saving} className="btn-primary inline-flex items-center gap-2">
            <FiSave className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ========== GERENCIAR USUARIOS (legado — a página /usuarios é o destino oficial) ==========

function GerenciarUsuariosSection() {
  const navigate = useNavigate()
  const [usuarios, setUsuarios] = useState<UsuarioComIgreja[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const PAGE_SIZE = 20

  const [showCreate, setShowCreate] = useState(false)

  const [igrejas, setIgrejas] = useState<IgrejaOption[]>([])
  const [associacoes, setAssociacoes] = useState<AssociacaoOption[]>([])
  const [unioes, setUnioes] = useState<UniaoOption[]>([])

  useEffect(() => { fetchIgrejas(); fetchAssociacoes(); fetchUnioes() }, [])
  useEffect(() => { fetchUsuarios() }, [page])

  async function fetchIgrejas() {
    const { data } = await supabase.from('igrejas').select('id, nome, associacao_id').eq('ativo', true).order('nome')
    setIgrejas(data || [])
  }
  async function fetchAssociacoes() {
    const { data } = await supabase.from('associacoes').select('id, nome, sigla, uniao_id').eq('ativo', true).order('sigla')
    setAssociacoes(data || [])
  }
  async function fetchUnioes() {
    const { data } = await supabase.from('unioes').select('id, nome, sigla').eq('ativo', true).order('sigla')
    setUnioes(data || [])
  }

  async function fetchUsuarios() {
    setLoading(true)
    try {
      let query = supabase
        .from('usuarios')
        .select('*, igreja:igrejas(nome), associacao:associacoes(nome, sigla), uniao:unioes(nome, sigla)', { count: 'exact' })
        .order('nome')
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      if (busca.trim()) query = query.or(`nome.ilike.%${busca.trim()}%,email.ilike.%${busca.trim()}%`)
      const { data, count, error } = await query
      if (error) throw error
      setUsuarios((data || []) as UsuarioComIgreja[])
      setTotalCount(count || 0)
    } catch (err) {
      console.error('Erro ao buscar usuários:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(e: React.FormEvent) { e.preventDefault(); setPage(0); fetchUsuarios() }
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="space-y-4">
      {/* Barra de busca + botão novo */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex flex-1 gap-3">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} className="input-field pl-10" placeholder="Buscar por nome ou e-mail..." />
            </div>
            <button type="submit" className="btn-secondary inline-flex items-center gap-2 w-fit">
              <FiSearch className="w-4 h-4" /> Buscar
            </button>
          </form>
          <button type="button" onClick={() => setShowCreate(true)} className="btn-primary inline-flex items-center gap-2 w-fit">
            <FiPlus className="w-4 h-4" /> Novo Usuário
          </button>
        </div>
      </div>

      {showCreate && (
        <CreateUserModal igrejas={igrejas} associacoes={associacoes} unioes={unioes}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchUsuarios() }}
        />
      )}

      {/* Tabela */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Carregando usuários...</div>
        ) : usuarios.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Nenhum usuário encontrado</div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">E-mail</th>
                    <th className="px-4 py-3">Papel</th>
                    <th className="px-4 py-3">Associação</th>
                    <th className="px-4 py-3">Igreja</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {usuarios.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold shrink-0 overflow-hidden">
                            {(u as any).avatar_url
                              ? <img src={(u as any).avatar_url} alt={u.nome} className="w-full h-full object-cover" />
                              : u.nome?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <span className="font-medium text-gray-800">{u.nome}</span>
                            {u.telefone && <p className="text-xs text-gray-400">{u.telefone}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full">
                          <FiShield className="w-3 h-3" />{roleLabels[u.papel] || u.papel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{u.associacao?.sigla || '-'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{u.igreja?.nome || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {u.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => navigate(`/configuracoes/usuario/${u.id}`)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-primary-600" title="Editar">
                          <FiEdit className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-gray-100">
              {usuarios.map((u) => (
                <div key={u.id} className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold shrink-0 overflow-hidden">
                    {(u as any).avatar_url
                      ? <img src={(u as any).avatar_url} alt={u.nome} className="w-full h-full object-cover" />
                      : u.nome?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{u.nome}</p>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs font-medium text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full">{roleLabels[u.papel] || u.papel}</span>
                      {u.associacao?.sigla && <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">{u.associacao.sigla}</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => navigate(`/configuracoes/usuario/${u.id}`)} className="p-2 rounded hover:bg-gray-100 text-gray-400 hover:text-primary-600 shrink-0">
                    <FiEdit className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm">
                <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="btn-secondary text-xs disabled:opacity-40">Anterior</button>
                <span className="text-gray-500">Página {page + 1} de {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="btn-secondary text-xs disabled:opacity-40">Próxima</button>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  )
}


// ========== DOCUMENTOS (Termo de Compromisso) ==========

function DocumentosSection() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [templateId, setTemplateId] = useState<string | null>(null)

  // Termo fields
  const [lema, setLema] = useState('')
  const [citacao, setCitacao] = useState('')
  const [citacaoRef, setCitacaoRef] = useState('')
  const [declaracaoIntro, setDeclaracaoIntro] = useState('')
  const [declaracaoCorpo, setDeclaracaoCorpo] = useState('')
  const [diretrizes, setDiretrizes] = useState<string[]>([''])
  const [declaracaoFinal, setDeclaracaoFinal] = useState('')

  useEffect(() => {
    fetchTermo()
  }, [])

  async function fetchTermo() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('documento_templates')
        .select('*')
        .eq('tipo', 'termo_compromisso')
        .eq('ativo', true)
        .single()

      if (!error && data) {
        setTemplateId(data.id)
        try {
          const parsed: TermoCompromissoContent = JSON.parse(data.conteudo)
          setLema(parsed.lema || '')
          setCitacao(parsed.citacao || '')
          setCitacaoRef(parsed.citacao_ref || '')
          setDeclaracaoIntro(parsed.declaracao_intro || '')
          setDeclaracaoCorpo(parsed.declaracao_corpo || '')
          setDiretrizes(parsed.diretrizes?.length ? parsed.diretrizes : [''])
          setDeclaracaoFinal(parsed.declaracao_final || '')
        } catch {
          // If JSON parse fails, load defaults
          loadDefaults()
        }
      } else {
        // No record found, load defaults
        loadDefaults()
      }
    } catch (err) {
      console.error('Erro ao buscar termo:', err)
      loadDefaults()
    } finally {
      setLoading(false)
    }
  }

  function loadDefaults() {
    const d = DEFAULT_TERMO
    setLema(d.lema)
    setCitacao(d.citacao)
    setCitacaoRef(d.citacao_ref)
    setDeclaracaoIntro(d.declaracao_intro)
    setDeclaracaoCorpo(d.declaracao_corpo)
    setDiretrizes(d.diretrizes)
    setDeclaracaoFinal(d.declaracao_final)
  }

  async function handleSave() {
    setSaving(true)
    setMessage(null)

    const content: TermoCompromissoContent = {
      lema,
      citacao,
      citacao_ref: citacaoRef,
      declaracao_intro: declaracaoIntro,
      declaracao_corpo: declaracaoCorpo,
      diretrizes: diretrizes.filter(d => d.trim()),
      declaracao_final: declaracaoFinal,
    }

    try {
      if (templateId) {
        const { error } = await supabase
          .from('documento_templates')
          .update({
            conteudo: JSON.stringify(content),
            updated_at: new Date().toISOString(),
          })
          .eq('id', templateId)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('documento_templates')
          .insert({
            tipo: 'termo_compromisso',
            titulo: 'TERMO DE COMPROMISSO MISSIONÁRIO (QUADRIÊNIO 2026-2029)',
            conteudo: JSON.stringify(content),
            ativo: true,
            created_by: profile?.id || null,
          })
          .select('id')
          .single()
        if (error) throw error
        if (data) setTemplateId(data.id)
      }

      invalidateTermoCache()
      setMessage({ type: 'success', text: 'Termo de Compromisso salvo com sucesso!' })
    } catch (err: any) {
      console.error('Erro ao salvar termo:', err)
      setMessage({ type: 'error', text: 'Erro ao salvar. Tente novamente.' })
    } finally {
      setSaving(false)
    }
  }

  function addDiretriz() {
    setDiretrizes([...diretrizes, ''])
  }

  function removeDiretriz(index: number) {
    setDiretrizes(diretrizes.filter((_, i) => i !== index))
  }

  function updateDiretriz(index: number, value: string) {
    const updated = [...diretrizes]
    updated[index] = value
    setDiretrizes(updated)
  }

  if (loading) {
    return <div className="card text-center text-gray-400 py-8">Carregando documentos...</div>
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-lg">
            <FiFileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Termo de Compromisso Missionário</h2>
            <p className="text-sm text-gray-500">Edite o texto que aparece na página e no PDF dos missionários</p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Lema */}
          <div>
            <label className="label-field">Lema</label>
            <input
              type="text"
              value={lema}
              onChange={e => setLema(e.target.value)}
              className="input-field"
              placeholder="Ex: Féis até o Fim: Gerindo para a Eternidade"
            />
          </div>

          {/* Citação */}
          <div>
            <label className="label-field">Citação</label>
            <textarea
              value={citacao}
              onChange={e => setCitacao(e.target.value)}
              className="input-field min-h-[100px]"
              placeholder="Texto da citação..."
            />
          </div>

          {/* Referência da Citação */}
          <div>
            <label className="label-field">Referência da Citação</label>
            <input
              type="text"
              value={citacaoRef}
              onChange={e => setCitacaoRef(e.target.value)}
              className="input-field"
              placeholder="Ex: Ellen G. White, Obreiros Evangélicos, pág. 273."
            />
          </div>

          {/* Declaração Intro */}
          <div>
            <label className="label-field">Declaração Introdutória</label>
            <p className="text-xs text-gray-400 mb-1">Aparece após "Eu, [nome do missionário],"</p>
            <textarea
              value={declaracaoIntro}
              onChange={e => setDeclaracaoIntro(e.target.value)}
              className="input-field min-h-[80px]"
              placeholder="diante de Deus e da liderança desta União..."
            />
          </div>

          {/* Declaração Corpo */}
          <div>
            <label className="label-field">Texto de Transição (antes das diretrizes)</label>
            <textarea
              value={declaracaoCorpo}
              onChange={e => setDeclaracaoCorpo(e.target.value)}
              className="input-field min-h-[60px]"
              placeholder="Pelo presente termo, comprometo-me..."
            />
          </div>

          {/* Diretrizes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label-field mb-0">Diretrizes</label>
              <button
                type="button"
                onClick={addDiretriz}
                className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
              >
                + Adicionar Diretriz
              </button>
            </div>
            <div className="space-y-3">
              {diretrizes.map((d, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-sm font-bold text-gray-500 mt-2 shrink-0 w-6">{i + 1}.</span>
                  <textarea
                    value={d}
                    onChange={e => updateDiretriz(i, e.target.value)}
                    className="input-field min-h-[60px] flex-1"
                    placeholder={`Diretriz ${i + 1}: Título: Descrição detalhada...`}
                  />
                  {diretrizes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDiretriz(i)}
                      className="text-red-400 hover:text-red-600 mt-2 shrink-0"
                      title="Remover diretriz"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Declaração Final */}
          <div>
            <label className="label-field">Declaração Final</label>
            <textarea
              value={declaracaoFinal}
              onChange={e => setDeclaracaoFinal(e.target.value)}
              className="input-field min-h-[80px]"
              placeholder="Ao assinar este compromisso..."
            />
          </div>

          {/* Message */}
          {message && (
            <div
              className={`text-sm px-4 py-2.5 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Save */}
          <div className="pt-2">
            <button onClick={handleSave} disabled={saving} className="btn-primary inline-flex items-center gap-2">
              <FiSave className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar Termo de Compromisso'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ========== CATEGORIAS (Cargos + Status Dinâmicos) ==========

function DynamicLabelsEditor({
  title,
  description,
  iconColor,
  labels,
  defaults,
  loading,
  onSave,
}: {
  title: string
  description: string
  iconColor: string
  labels: Record<string, string>
  defaults: Record<string, string>
  loading: boolean
  onSave: (newLabels: Record<string, string>) => Promise<boolean>
}) {
  const [edited, setEdited] = useState<Record<string, string>>({})
  const [newKey, setNewKey] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!loading) setEdited({ ...labels })
  }, [loading, labels])

  const keys = Object.keys(edited)

  function handleChange(key: string, value: string) {
    setEdited(prev => ({ ...prev, [key]: value }))
  }

  function handleRemove(key: string) {
    if (!confirm(`Remover "${edited[key]}"?\n\nMissionários com este valor ficarão sem cargo/status definido.`)) return
    setEdited(prev => {
      const copy = { ...prev }
      delete copy[key]
      return copy
    })
  }

  function handleAdd() {
    const key = newKey.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    const label = newLabel.trim()
    if (!key || !label) return
    if (edited[key]) {
      setMessage({ type: 'error', text: `A chave "${key}" já existe.` })
      return
    }
    setEdited(prev => ({ ...prev, [key]: label }))
    setNewKey('')
    setNewLabel('')
    setMessage(null)
  }

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    const ok = await onSave(edited)
    setMessage(ok
      ? { type: 'success', text: 'Salvo com sucesso!' }
      : { type: 'error', text: 'Erro ao salvar. Tente novamente.' }
    )
    setSaving(false)
  }

  const hasChanges = JSON.stringify(edited) !== JSON.stringify(labels)

  if (loading) return <div className="card text-center text-gray-400 py-8">Carregando...</div>

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-12 h-12 rounded-full ${iconColor} flex items-center justify-center text-lg`}>
          <FiTag className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>

      <div className="space-y-2">
        {/* Header */}
        <div className="hidden sm:grid grid-cols-[1fr_1fr_auto_auto] gap-3 px-1 text-xs font-medium text-gray-500 uppercase tracking-wider">
          <span>Chave (interno)</span>
          <span>Nome de Exibição</span>
          <span className="w-16 text-center">Resetar</span>
          <span className="w-10 text-center">Ação</span>
        </div>

        {keys.map(key => {
          const isDefault = key in defaults
          const isModified = isDefault && edited[key] !== defaults[key]
          const isNew = !isDefault
          return (
            <div
              key={key}
              className={`grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-2 sm:gap-3 items-center p-3 rounded-lg border ${
                isNew ? 'border-green-200 bg-green-50/50' : isModified ? 'border-amber-200 bg-amber-50/50' : 'border-gray-100 bg-gray-50/50'
              }`}
            >
              <div className="text-sm text-gray-500 font-mono">{key}</div>
              <input
                type="text"
                value={edited[key] || ''}
                onChange={e => handleChange(key, e.target.value)}
                className="input-field text-sm"
              />
              <button
                type="button"
                onClick={() => isDefault && setEdited(prev => ({ ...prev, [key]: defaults[key] }))}
                disabled={!isModified}
                className="w-16 text-xs text-gray-400 hover:text-amber-600 disabled:opacity-30 disabled:cursor-not-allowed text-center"
              >
                Resetar
              </button>
              <button
                type="button"
                onClick={() => handleRemove(key)}
                className="w-10 flex items-center justify-center text-gray-400 hover:text-red-600"
                title="Remover"
              >
                <FiTrash2 className="w-4 h-4" />
              </button>
            </div>
          )
        })}
      </div>

      {/* Add new */}
      <div className="mt-4 p-4 border-2 border-dashed border-gray-200 rounded-lg">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Adicionar Novo</p>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div>
            <label className="label-field">Chave (ex: novo_cargo)</label>
            <input
              type="text"
              value={newKey}
              onChange={e => setNewKey(e.target.value)}
              className="input-field text-sm"
              placeholder="chave_interna"
            />
          </div>
          <div>
            <label className="label-field">Nome de Exibição</label>
            <input
              type="text"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              className="input-field text-sm"
              placeholder="Nome Bonito"
            />
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newKey.trim() || !newLabel.trim()}
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-50 h-10"
          >
            <FiPlus className="w-4 h-4" />
            Adicionar
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mt-4 text-sm px-4 py-2.5 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Save */}
      <div className="pt-4 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
        >
          <FiSave className="w-4 h-4" />
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
        {hasChanges && <span className="text-xs text-amber-600">Alterações não salvas</span>}
      </div>
    </div>
  )
}

function CategoriasSection() {
  const cargo = useCargoLabels()
  const status = useStatusLabels()

  return (
    <div className="space-y-6 max-w-3xl">
      <DynamicLabelsEditor
        title="Cargos Ministeriais"
        description="Adicione, edite ou remova cargos. Alterações aparecem nos dropdowns de todo o sistema."
        iconColor="bg-amber-100 text-amber-700"
        labels={cargo.labels}
        defaults={CARGO_LABELS}
        loading={cargo.loading}
        onSave={cargo.updateLabels}
      />
      <DynamicLabelsEditor
        title="Status de Missionário"
        description="Adicione, edite ou remova status. Alterações aparecem nos dropdowns de todo o sistema."
        iconColor="bg-blue-100 text-blue-700"
        labels={status.labels}
        defaults={STATUS_LABELS}
        loading={status.loading}
        onSave={status.updateLabels}
      />
    </div>
  )
}

// ========== SOBRE O SISTEMA ==========

function SobreSection() {
  return (
    <div className="card max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-primary-500 p-3 rounded-xl text-white">
          <FiInfo className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Sobre o Sistema</h2>
        </div>
      </div>

      <div className="space-y-5">
        {/* System name */}
        <div>
          <h3 className="text-xl font-bold text-gray-800">NNE Sistema v1.0</h3>
          <p className="text-gray-500 mt-1">
            Sistema de gestão eclesiástica da União Norte Nordeste Brasileira - IASDMR
          </p>
        </div>

        {/* Tech stack */}
        <div>
          <p className="label-field">Tecnologias</p>
          <div className="flex flex-wrap gap-2">
            {['React', 'TypeScript', 'Supabase'].map((tech) => (
              <span
                key={tech}
                className="text-xs font-medium px-3 py-1 rounded-full bg-primary-50 text-primary-700"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        {/* Divider */}
        <hr className="border-gray-200" />

        {/* Copyright */}
        <p className="text-sm text-gray-400">
          &copy; 2026 União Norte Nordeste Brasileira
        </p>
      </div>
    </div>
  )
}

// ========== CREATE USER MODAL ==========

function CreateUserModal({
  igrejas,
  associacoes,
  unioes,
  onClose,
  onCreated,
}: {
  igrejas: IgrejaOption[]
  associacoes: AssociacaoOption[]
  unioes: UniaoOption[]
  onClose: () => void
  onCreated: () => void
}) {
  const { profile } = useAuth()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [papel, setPapel] = useState<UserRole>('membro')
  const [uniaoId, setUniaoId] = useState<string>('')
  const [associacaoId, setAssociacaoId] = useState<string>('')
  const [igrejaId, setIgrejaId] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const isMaster = profile?.papel === 'admin'
  const availableRoles = isMaster
    ? allRoles
    : allRoles.filter(r => r !== 'admin' && r !== 'admin_uniao')

  // Filter dropdowns based on parent
  const filteredAssociacoes = uniaoId
    ? associacoes.filter(a => a.uniao_id === uniaoId)
    : associacoes
  const filteredIgrejas = associacaoId
    ? igrejas.filter(i => i.associacao_id === associacaoId)
    : igrejas

  function gerarSenhaAleatoria() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    let out = ''
    for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)]
    setPassword(out + '!')
    setShowPwd(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')

    if (password.length < 6) {
      setErr('A senha deve ter ao menos 6 caracteres.')
      return
    }

    setSaving(true)
    const { data, error } = await supabase.rpc('admin_create_user', {
      p_email: email.trim(),
      p_password: password,
      p_nome: nome.trim(),
      p_papel: papel,
      p_associacao_id: associacaoId || null,
      p_uniao_id: uniaoId || null,
      p_igreja_id: igrejaId || null,
    })

    if (error) {
      setErr(error.message || 'Erro ao criar usuário.')
      setSaving(false)
      return
    }

    console.log('Usuário criado:', data)
    setSaving(false)
    onCreated()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm overflow-y-auto p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl my-8"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Novo Usuário</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {err && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm rounded-lg p-3">
              {err}
            </div>
          )}

          <div>
            <label className="label-field">Nome completo *</label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="input-field"
              placeholder="Ex: João da Silva"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="label-field">Email *</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input-field"
              placeholder="joao@exemplo.com"
              required
              autoComplete="off"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label-field !mb-0">Senha provisória *</label>
              <button
                type="button"
                onClick={gerarSenhaAleatoria}
                className="text-xs font-medium text-primary-700 dark:text-primary-400 hover:underline"
              >
                Gerar aleatória
              </button>
            </div>
            <input
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input-field font-mono"
              placeholder="Mín. 6 caracteres"
              required
              minLength={6}
              autoComplete="new-password"
            />
            <label className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-1.5">
              <input
                type="checkbox"
                checked={showPwd}
                onChange={e => setShowPwd(e.target.checked)}
                className="rounded border-gray-300"
              />
              Mostrar senha
            </label>
          </div>

          <div>
            <label className="label-field">Papel (função) *</label>
            <select
              value={papel}
              onChange={e => setPapel(e.target.value as UserRole)}
              className="input-field"
              required
            >
              {availableRoles.map(r => (
                <option key={r} value={r}>{roleLabels[r] || r}</option>
              ))}
            </select>
            {!isMaster && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Apenas admin master pode criar admin global ou admin de união.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-field">União</label>
              <select
                value={uniaoId}
                onChange={e => {
                  setUniaoId(e.target.value)
                  setAssociacaoId('')
                  setIgrejaId('')
                }}
                className="input-field"
              >
                <option value="">— Selecione —</option>
                {unioes.map(u => (
                  <option key={u.id} value={u.id}>{u.sigla} — {u.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label-field">Associação</label>
              <select
                value={associacaoId}
                onChange={e => {
                  setAssociacaoId(e.target.value)
                  setIgrejaId('')
                }}
                className="input-field"
              >
                <option value="">— Selecione —</option>
                {filteredAssociacoes.map(a => (
                  <option key={a.id} value={a.id}>{a.sigla} — {a.nome}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label-field">Igreja</label>
            <select
              value={igrejaId}
              onChange={e => setIgrejaId(e.target.value)}
              className="input-field"
            >
              <option value="">— Selecione —</option>
              {filteredIgrejas.map(i => (
                <option key={i.id} value={i.id}>{i.nome}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary inline-flex items-center gap-2" disabled={saving}>
              <FiSave className="w-4 h-4" />
              {saving ? 'Criando...' : 'Criar usuário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
