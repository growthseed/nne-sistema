import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { UserProfile, UserRole, TermoCompromissoContent } from '@/types'
import { FiUser, FiUsers, FiSettings, FiSave, FiEdit, FiShield, FiInfo, FiSearch, FiX, FiFileText, FiTag, FiPlus, FiTrash2 } from 'react-icons/fi'
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
}

interface UsuarioComIgreja extends UserProfile {
  igreja?: { nome: string } | null
}

// ========== COMPONENT ==========

export default function ConfiguracoesPage() {
  const { hasRole } = useAuth()
  const isAdmin = hasRole(['admin'])

  const [activeTab, setActiveTab] = useState<Tab>('perfil')

  const tabs: { key: Tab; label: string; icon: typeof FiUser; adminOnly?: boolean }[] = [
    { key: 'perfil', label: 'Meu Perfil', icon: FiUser },
    { key: 'usuarios', label: 'Usuários', icon: FiUsers, adminOnly: true },
    { key: 'documentos', label: 'Documentos', icon: FiFileText, adminOnly: true },
    { key: 'categorias', label: 'Categorias', icon: FiTag, adminOnly: true },
    { key: 'sobre', label: 'Sobre', icon: FiInfo },
  ]

  const visibleTabs = tabs.filter((t) => !t.adminOnly || isAdmin)

  // Reset tab if admin-only tab is selected but user is not admin
  useEffect(() => {
    if ((activeTab === 'usuarios' || activeTab === 'documentos' || activeTab === 'categorias') && !isAdmin) {
      setActiveTab('perfil')
    }
  }, [isAdmin, activeTab])

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
      {activeTab === 'usuarios' && isAdmin && <GerenciarUsuariosSection />}
      {activeTab === 'documentos' && isAdmin && <DocumentosSection />}
      {activeTab === 'categorias' && isAdmin && <CategoriasSection />}
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

// ========== GERENCIAR USUARIOS ==========

function GerenciarUsuariosSection() {
  const [usuarios, setUsuarios] = useState<UsuarioComIgreja[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const PAGE_SIZE = 20

  // Modal state
  const [editUser, setEditUser] = useState<UsuarioComIgreja | null>(null)
  const [editPapel, setEditPapel] = useState<UserRole>('membro')
  const [editIgrejaId, setEditIgrejaId] = useState<string>('')
  const [editAtivo, setEditAtivo] = useState(true)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editMessage, setEditMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Churches list for dropdown
  const [igrejas, setIgrejas] = useState<IgrejaOption[]>([])

  useEffect(() => {
    fetchIgrejas()
  }, [])

  useEffect(() => {
    fetchUsuarios()
  }, [page])

  async function fetchIgrejas() {
    const { data } = await supabase
      .from('igrejas')
      .select('id, nome')
      .eq('ativo', true)
      .order('nome')
    setIgrejas(data || [])
  }

  async function fetchUsuarios() {
    setLoading(true)
    try {
      let query = supabase
        .from('usuarios')
        .select('*, igreja:igrejas(nome)', { count: 'exact' })
        .order('nome')
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (busca.trim()) {
        query = query.or(`nome.ilike.%${busca.trim()}%,email.ilike.%${busca.trim()}%`)
      }

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

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(0)
    fetchUsuarios()
  }

  function openEditModal(u: UsuarioComIgreja) {
    setEditUser(u)
    setEditPapel(u.papel)
    setEditIgrejaId(u.igreja_id || '')
    setEditAtivo(u.ativo)
    setEditMessage(null)
  }

  function closeEditModal() {
    setEditUser(null)
    setEditMessage(null)
  }

  async function handleSaveUser() {
    if (!editUser) return
    setSavingEdit(true)
    setEditMessage(null)

    try {
      const { error } = await supabase
        .from('usuarios')
        .update({
          papel: editPapel,
          igreja_id: editIgrejaId || null,
          ativo: editAtivo,
        })
        .eq('id', editUser.id)

      if (error) throw error

      setEditMessage({ type: 'success', text: 'Usuário atualizado com sucesso!' })
      // Refresh list
      fetchUsuarios()
      // Close modal after short delay so user sees success message
      setTimeout(() => closeEditModal(), 1200)
    } catch (err: any) {
      console.error('Erro ao atualizar usuário:', err)
      setEditMessage({ type: 'error', text: 'Erro ao salvar. Tente novamente.' })
    } finally {
      setSavingEdit(false)
    }
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="card">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="input-field pl-10"
              placeholder="Buscar por nome ou e-mail..."
            />
          </div>
          <button type="submit" className="btn-primary inline-flex items-center gap-2 w-fit">
            <FiSearch className="w-4 h-4" />
            Buscar
          </button>
        </form>
      </div>

      {/* Users table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Carregando usuários...</div>
        ) : usuarios.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Nenhum usuário encontrado</div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">E-mail</th>
                    <th className="px-4 py-3">Papel</th>
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
                          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold shrink-0">
                            {u.nome?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <span className="font-medium text-gray-800">{u.nome}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full">
                          <FiShield className="w-3 h-3" />
                          {roleLabels[u.papel] || u.papel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {u.igreja?.nome || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            u.ativo
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {u.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-primary-600"
                          title="Editar usuário"
                        >
                          <FiEdit className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {usuarios.map((u) => (
                <div key={u.id} className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold shrink-0">
                    {u.nome?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{u.nome}</p>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-medium text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full">
                        {roleLabels[u.papel] || u.papel}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          u.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => openEditModal(u)}
                    className="p-2 rounded hover:bg-gray-100 text-gray-400 hover:text-primary-600 shrink-0"
                  >
                    <FiEdit className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="btn-secondary text-xs disabled:opacity-40"
                >
                  Anterior
                </button>
                <span className="text-gray-500">
                  Página {page + 1} de {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="btn-secondary text-xs disabled:opacity-40"
                >
                  Próxima
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Editar Usuário</h3>
                <p className="text-sm text-gray-500">{editUser.nome}</p>
              </div>
              <button
                onClick={closeEditModal}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 space-y-4">
              {/* E-mail (read-only) */}
              <div>
                <label className="label-field">E-mail</label>
                <input
                  type="email"
                  value={editUser.email || ''}
                  disabled
                  className="input-field bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>

              {/* Papel */}
              <div>
                <label className="label-field">Papel</label>
                <select
                  value={editPapel}
                  onChange={(e) => setEditPapel(e.target.value as UserRole)}
                  className="input-field"
                >
                  {allRoles.map((r) => (
                    <option key={r} value={r}>
                      {roleLabels[r]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Igreja */}
              <div>
                <label className="label-field">Igreja</label>
                <select
                  value={editIgrejaId}
                  onChange={(e) => setEditIgrejaId(e.target.value)}
                  className="input-field"
                >
                  <option value="">-- Nenhuma --</option>
                  {igrejas.map((ig) => (
                    <option key={ig.id} value={ig.id}>
                      {ig.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ativo toggle */}
              <div className="flex items-center justify-between">
                <label className="label-field mb-0">Ativo</label>
                <button
                  type="button"
                  onClick={() => setEditAtivo(!editAtivo)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    editAtivo ? 'bg-primary-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      editAtivo ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Message */}
              {editMessage && (
                <div
                  className={`text-sm px-4 py-2.5 rounded-lg ${
                    editMessage.type === 'success'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {editMessage.text}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={closeEditModal} className="btn-secondary">
                Cancelar
              </button>
              <button
                onClick={handleSaveUser}
                disabled={savingEdit}
                className="btn-primary inline-flex items-center gap-2"
              >
                <FiSave className="w-4 h-4" />
                {savingEdit ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
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
    if (!confirm(`Remover "${edited[key]}"?`)) return
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
