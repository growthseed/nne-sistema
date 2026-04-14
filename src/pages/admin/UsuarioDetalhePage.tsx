import { useEffect, useState, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@/types'
import { logAudit } from '@/lib/audit'
import { trackError } from '@/lib/observability'
import {
  FiArrowLeft, FiSave, FiUser, FiShield, FiLock, FiKey,
  FiMail, FiCamera, FiEye, FiEyeOff, FiRefreshCw, FiLogIn,
  FiMonitor, FiPhone, FiMapPin, FiCalendar, FiFileText,
} from 'react-icons/fi'

// ── Types ────────────────────────────────────────────────────────────────

interface UsuarioFull {
  id: string
  nome: string
  email: string
  telefone: string | null
  papel: UserRole
  uniao_id: string | null
  associacao_id: string | null
  igreja_id: string | null
  ativo: boolean
  avatar_url: string | null
  cargo: string | null
  data_nascimento: string | null
  sexo: string | null
  cpf: string | null
  endereco_rua: string | null
  endereco_cidade: string | null
  endereco_estado: string | null
  endereco_cep: string | null
  observacoes: string | null
  created_at: string
  updated_at: string
}

interface AssociacaoOpt { id: string; nome: string; sigla: string; uniao_id: string }
interface IgrejaOpt { id: string; nome: string; associacao_id?: string }
interface UniaoOpt { id: string; nome: string; sigla: string }

interface SessaoInfo {
  lastSignIn: string | null
  emailConfirmed: string | null
  createdAt: string | null
  provider: string
}

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
  'admin', 'admin_uniao', 'admin_associacao', 'diretor_es',
  'professor_es', 'secretario_es', 'tesoureiro', 'secretario_igreja', 'membro',
]

const ESTADOS_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
]

type Tab = 'perfil' | 'acesso' | 'seguranca' | 'sessoes'

// ── Helpers ──────────────────────────────────────────────────────────────

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-5">
        <div className="text-primary-500">{icon}</div>
        <h3 className="text-base font-semibold text-gray-800">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function Field({ label, children, span2 }: { label: string; children: React.ReactNode; span2?: boolean }) {
  return (
    <div className={span2 ? 'sm:col-span-2' : ''}>
      <label className="label-field">{label}</label>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-primary-500' : 'bg-gray-300'}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

function Msg({ msg }: { msg: { type: 'success' | 'error'; text: string } | null }) {
  if (!msg) return null
  return (
    <div className={`text-sm px-4 py-2.5 rounded-lg ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
      {msg.text}
    </div>
  )
}

// ── MAIN PAGE ────────────────────────────────────────────────────────────

export default function UsuarioDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { hasRole, user: actorUser } = useAuth()
  const canManage = hasRole(['admin', 'admin_uniao', 'admin_associacao'])

  const [usuario, setUsuario] = useState<UsuarioFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('perfil')

  // Dropdowns
  const [unioes, setUnioes] = useState<UniaoOpt[]>([])
  const [associacoes, setAssociacoes] = useState<AssociacaoOpt[]>([])
  const [igrejas, setIgrejas] = useState<IgrejaOpt[]>([])

  // ── PERFIL state ───────────────────────────────────────────────────────
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [cargo, setCargo] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [sexo, setSexo] = useState('')
  const [cpf, setCpf] = useState('')
  const [enderecoRua, setEnderecoRua] = useState('')
  const [enderecoCidade, setEnderecoCidade] = useState('')
  const [enderecoEstado, setEnderecoEstado] = useState('')
  const [enderecoCep, setEnderecoCep] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [avatarPreview, setAvatarPreview] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const avatarRef = useRef<HTMLInputElement>(null)
  const [savingPerfil, setSavingPerfil] = useState(false)
  const [msgPerfil, setMsgPerfil] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // ── ACESSO state ───────────────────────────────────────────────────────
  const [papel, setPapel] = useState<UserRole>('membro')
  const [uniaoId, setUniaoId] = useState('')
  const [associacaoId, setAssociacaoId] = useState('')
  const [igrejaId, setIgrejaId] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [savingAcesso, setSavingAcesso] = useState(false)
  const [msgAcesso, setMsgAcesso] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // ── SEGURANÇA state ────────────────────────────────────────────────────
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const [enviandoReset, setEnviandoReset] = useState(false)
  const [definindoSenha, setDefinindoSenha] = useState(false)
  const [msgSeg, setMsgSeg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // ── SESSÕES state ──────────────────────────────────────────────────────
  const [sessao, setSessao] = useState<SessaoInfo | null>(null)
  const [loadingSessao, setLoadingSessao] = useState(false)
  const [sessaoCarregada, setSessaoCarregada] = useState(false)

  const igrejasFiltradas = useMemo(
    () => associacaoId ? igrejas.filter(ig => ig.associacao_id === associacaoId) : igrejas,
    [igrejas, associacaoId]
  )

  // ── Load data ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!id) return
    loadUsuario()
    loadDropdowns()
  }, [id])

  async function loadUsuario() {
    setLoading(true)
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', id!)
      .single()

    if (error || !data) { navigate('/configuracoes'); return }

    const u = data as UsuarioFull
    setUsuario(u)

    // Populate perfil fields
    setNome(u.nome || '')
    setTelefone(u.telefone || '')
    setCargo(u.cargo || '')
    setDataNascimento(u.data_nascimento || '')
    setSexo(u.sexo || '')
    setCpf(u.cpf || '')
    setEnderecoRua(u.endereco_rua || '')
    setEnderecoCidade(u.endereco_cidade || '')
    setEnderecoEstado(u.endereco_estado || '')
    setEnderecoCep(u.endereco_cep || '')
    setObservacoes(u.observacoes || '')
    setAvatarPreview(u.avatar_url || '')

    // Populate acesso fields
    setPapel(u.papel)
    setUniaoId(u.uniao_id || '')
    setAssociacaoId(u.associacao_id || '')
    setIgrejaId(u.igreja_id || '')
    setAtivo(u.ativo)

    setLoading(false)
  }

  async function loadDropdowns() {
    const [un, as_, ig] = await Promise.all([
      supabase.from('unioes').select('id,nome,sigla').eq('ativo', true).order('sigla'),
      supabase.from('associacoes').select('id,nome,sigla,uniao_id').eq('ativo', true).order('sigla'),
      supabase.from('igrejas').select('id,nome,associacao_id').eq('ativo', true).order('nome'),
    ])
    setUnioes(un.data || [])
    setAssociacoes(as_.data || [])
    setIgrejas(ig.data || [])
  }

  // ── Avatar upload ──────────────────────────────────────────────────────

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { alert('Foto deve ter no máximo 2MB'); return }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function uploadAvatar(): Promise<string | null> {
    if (!avatarFile || !usuario) return usuario?.avatar_url || null
    const ext = avatarFile.name.split('.').pop() || 'jpg'
    const path = `${usuario.id}.${ext}`
    const { error } = await supabase.storage.from('avatars-nne').upload(path, avatarFile, { upsert: true })
    if (error) return usuario.avatar_url || null
    const { data } = supabase.storage.from('avatars-nne').getPublicUrl(path)
    return data.publicUrl + `?t=${Date.now()}`
  }

  // ── Save Perfil ────────────────────────────────────────────────────────

  async function handleSalvarPerfil() {
    if (!nome.trim()) { setMsgPerfil({ type: 'error', text: 'Nome é obrigatório' }); return }
    setSavingPerfil(true); setMsgPerfil(null)
    try {
      const avatarUrl = await uploadAvatar()
      const update: Record<string, any> = {
        nome: nome.trim(),
        telefone: telefone.trim() || null,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      }
      // Campos opcionais (existem somente após migration)
      if (cargo !== undefined) update.cargo = cargo.trim() || null
      if (dataNascimento !== undefined) update.data_nascimento = dataNascimento || null
      if (sexo !== undefined) update.sexo = sexo || null
      if (cpf !== undefined) update.cpf = cpf.trim() || null
      if (enderecoRua !== undefined) update.endereco_rua = enderecoRua.trim() || null
      if (enderecoCidade !== undefined) update.endereco_cidade = enderecoCidade.trim() || null
      if (enderecoEstado !== undefined) update.endereco_estado = enderecoEstado || null
      if (enderecoCep !== undefined) update.endereco_cep = enderecoCep.trim() || null
      if (observacoes !== undefined) update.observacoes = observacoes.trim() || null

      const { error } = await supabase.from('usuarios').update(update).eq('id', usuario!.id)
      if (error) throw error
      if (actorUser) {
        await logAudit('USER_PERFIL_UPDATED', { target_id: usuario!.id, fields: Object.keys(update).filter(k => k !== 'updated_at') }, actorUser.id)
      }
      setMsgPerfil({ type: 'success', text: 'Perfil atualizado com sucesso!' })
    } catch (err: any) {
      setMsgPerfil({ type: 'error', text: 'Erro: ' + err.message })
    } finally { setSavingPerfil(false) }
  }

  // ── Save Acesso ────────────────────────────────────────────────────────

  async function handleSalvarAcesso() {
    setSavingAcesso(true); setMsgAcesso(null)
    try {
      const prev = { papel: usuario!.papel, uniao_id: usuario!.uniao_id, associacao_id: usuario!.associacao_id, igreja_id: usuario!.igreja_id, ativo: usuario!.ativo }
      const { error } = await supabase.from('usuarios').update({
        papel, uniao_id: uniaoId || null, associacao_id: associacaoId || null,
        igreja_id: igrejaId || null, ativo,
      }).eq('id', usuario!.id)
      if (error) throw error

      if (actorUser) {
        const actorId = actorUser.id
        const targetId = usuario!.id
        if (prev.papel !== papel) {
          await logAudit('USER_ROLE_CHANGED', { target_id: targetId, from: prev.papel, to: papel }, actorId)
        }
        if (prev.ativo !== ativo) {
          await logAudit(ativo ? 'USER_ENABLED' : 'USER_DISABLED', { target_id: targetId }, actorId)
        }
        if (prev.uniao_id !== (uniaoId || null) || prev.associacao_id !== (associacaoId || null) || prev.igreja_id !== (igrejaId || null)) {
          await logAudit('USER_LOTACAO_CHANGED', { target_id: targetId, from: { uniao_id: prev.uniao_id, associacao_id: prev.associacao_id, igreja_id: prev.igreja_id }, to: { uniao_id: uniaoId || null, associacao_id: associacaoId || null, igreja_id: igrejaId || null } }, actorId)
        }
      }

      setUsuario(u => u ? { ...u, papel, uniao_id: uniaoId || null, associacao_id: associacaoId || null, igreja_id: igrejaId || null, ativo } : u)
      setMsgAcesso({ type: 'success', text: 'Acesso atualizado!' })
    } catch (err: any) {
      trackError(err, { context: 'admin_salvar_acesso', target_id: usuario?.id })
      setMsgAcesso({ type: 'error', text: 'Erro: ' + err.message })
    } finally { setSavingAcesso(false) }
  }

  // ── Segurança ──────────────────────────────────────────────────────────

  async function handleResetSenha() {
    setEnviandoReset(true); setMsgSeg(null)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(usuario!.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      if (actorUser) await logAudit('USER_RESET_PASSWORD', { target_id: usuario!.id, email: usuario!.email }, actorUser.id)
      setMsgSeg({ type: 'success', text: `Link enviado para ${usuario!.email}` })
    } catch (err) {
      trackError(err, { context: 'admin_reset_senha', target_id: usuario?.id })
      setMsgSeg({ type: 'error', text: 'Erro ao enviar email' })
    } finally { setEnviandoReset(false) }
  }

  async function handleDefinirSenha() {
    if (novaSenha.length < 6) { setMsgSeg({ type: 'error', text: 'Mín. 6 caracteres' }); return }
    if (novaSenha !== confirmarSenha) { setMsgSeg({ type: 'error', text: 'Senhas não conferem' }); return }
    setDefinindoSenha(true); setMsgSeg(null)
    try {
      const { data, error } = await supabase.functions.invoke('admin-manage-user-nne', {
        body: { action: 'set_password', userId: usuario!.id, password: novaSenha },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      if (actorUser) await logAudit('USER_SET_PASSWORD', { target_id: usuario!.id }, actorUser.id)
      setMsgSeg({ type: 'success', text: 'Senha definida!' })
      setNovaSenha(''); setConfirmarSenha('')
    } catch (err: any) {
      trackError(err, { context: 'admin_definir_senha', target_id: usuario?.id })
      setMsgSeg({ type: 'error', text: 'Erro: ' + (err.message || '') })
    } finally { setDefinindoSenha(false) }
  }

  // ── Sessões ────────────────────────────────────────────────────────────

  async function carregarSessao() {
    if (sessaoCarregada) return
    setLoadingSessao(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-manage-user-nne', {
        body: { action: 'get_sessions', userId: usuario!.id },
      })
      if (error) throw error
      setSessao(data); setSessaoCarregada(true)
    } catch { setSessao(null) }
    finally { setLoadingSessao(false) }
  }

  // ── Guards ─────────────────────────────────────────────────────────────

  if (!canManage) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <FiShield className="mx-auto w-12 h-12 text-red-500" />
          <h2 className="mt-4 text-xl font-bold text-gray-900">Acesso Restrito</h2>
          <p className="mt-2 text-gray-500">Apenas administradores podem editar usuários.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!usuario) return null

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'perfil', label: 'Dados Pessoais', icon: <FiUser className="w-4 h-4" /> },
    { key: 'acesso', label: 'Permissões', icon: <FiShield className="w-4 h-4" /> },
    { key: 'seguranca', label: 'Segurança', icon: <FiLock className="w-4 h-4" /> },
    { key: 'sessoes', label: 'Sessões', icon: <FiMonitor className="w-4 h-4" /> },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/configuracoes')}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700">
          <FiArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-4 flex-1">
          <div className="w-14 h-14 rounded-full bg-primary-100 overflow-hidden flex items-center justify-center shrink-0">
            {avatarPreview
              ? <img src={avatarPreview} alt={nome} className="w-full h-full object-cover" />
              : <span className="text-2xl font-bold text-primary-700">{nome.charAt(0).toUpperCase()}</span>}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">{usuario.nome}</h1>
            <p className="text-sm text-gray-500">{usuario.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full">
                <FiShield className="w-3 h-3" />{roleLabels[usuario.papel] || usuario.papel}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${usuario.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {usuario.ativo ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 -mb-px">
          {tabs.map(t => (
            <button key={t.key}
              onClick={() => { setTab(t.key); if (t.key === 'sessoes') carregarSessao() }}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}>
              {t.icon}{t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ═══ TAB PERFIL ═══ */}
      {tab === 'perfil' && (
        <div className="space-y-6">
          {/* Avatar */}
          <SectionCard title="Foto de Perfil" icon={<FiCamera className="w-5 h-5" />}>
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-primary-100 overflow-hidden flex items-center justify-center">
                  {avatarPreview
                    ? <img src={avatarPreview} alt={nome} className="w-full h-full object-cover" />
                    : <span className="text-4xl font-bold text-primary-700">{nome.charAt(0).toUpperCase()}</span>}
                </div>
                <button onClick={() => avatarRef.current?.click()}
                  className="absolute -bottom-1 -right-1 rounded-full bg-primary-500 p-2 text-white hover:bg-primary-600 shadow-lg">
                  <FiCamera className="w-4 h-4" />
                </button>
                <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Alterar foto</p>
                <p className="text-xs text-gray-400">JPG, PNG ou WEBP. Máx. 2MB</p>
              </div>
            </div>
          </SectionCard>

          {/* Dados Pessoais */}
          <SectionCard title="Dados Pessoais" icon={<FiUser className="w-5 h-5" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nome completo *" span2>
                <input type="text" value={nome} onChange={e => setNome(e.target.value)} className="input-field" />
              </Field>
              <Field label="E-mail">
                <input type="email" value={usuario.email} disabled className="input-field bg-gray-50 text-gray-500 cursor-not-allowed" />
              </Field>
              <Field label="Telefone">
                <div className="relative">
                  <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input type="tel" value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(00) 00000-0000" className="input-field pl-9" />
                </div>
              </Field>
              <Field label="CPF">
                <input type="text" value={cpf} onChange={e => setCpf(e.target.value)} placeholder="000.000.000-00" className="input-field" />
              </Field>
              <Field label="Data de Nascimento">
                <div className="relative">
                  <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input type="date" value={dataNascimento} onChange={e => setDataNascimento(e.target.value)} className="input-field pl-9" />
                </div>
              </Field>
              <Field label="Sexo">
                <select value={sexo} onChange={e => setSexo(e.target.value)} className="input-field">
                  <option value="">-- Selecione --</option>
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                </select>
              </Field>
              <Field label="Cargo / Função">
                <input type="text" value={cargo} onChange={e => setCargo(e.target.value)} placeholder="Ex: Tesoureiro, Secretário..." className="input-field" />
              </Field>
            </div>
          </SectionCard>

          {/* Endereço */}
          <SectionCard title="Endereço" icon={<FiMapPin className="w-5 h-5" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Rua / Logradouro" span2>
                <input type="text" value={enderecoRua} onChange={e => setEnderecoRua(e.target.value)} placeholder="Rua, Av, etc." className="input-field" />
              </Field>
              <Field label="Cidade">
                <input type="text" value={enderecoCidade} onChange={e => setEnderecoCidade(e.target.value)} className="input-field" />
              </Field>
              <Field label="Estado">
                <select value={enderecoEstado} onChange={e => setEnderecoEstado(e.target.value)} className="input-field">
                  <option value="">-- UF --</option>
                  {ESTADOS_BR.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </Field>
              <Field label="CEP">
                <input type="text" value={enderecoCep} onChange={e => setEnderecoCep(e.target.value)} placeholder="00000-000" className="input-field" />
              </Field>
            </div>
          </SectionCard>

          {/* Observações */}
          <SectionCard title="Observações" icon={<FiFileText className="w-5 h-5" />}>
            <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={4}
              className="input-field" placeholder="Anotações internas sobre este usuário..." />
          </SectionCard>

          <Msg msg={msgPerfil} />

          <div className="flex justify-end">
            <button onClick={handleSalvarPerfil} disabled={savingPerfil}
              className="btn-primary inline-flex items-center gap-2">
              <FiSave className="w-4 h-4" />{savingPerfil ? 'Salvando...' : 'Salvar Dados Pessoais'}
            </button>
          </div>
        </div>
      )}

      {/* ═══ TAB ACESSO ═══ */}
      {tab === 'acesso' && (
        <div className="space-y-6">
          <SectionCard title="Permissões e Vínculo" icon={<FiShield className="w-5 h-5" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Papel / Nível de Acesso" span2>
                <select value={papel} onChange={e => setPapel(e.target.value as UserRole)} className="input-field">
                  {allRoles.map(r => <option key={r} value={r}>{roleLabels[r]}</option>)}
                </select>
              </Field>
              <Field label="União">
                <select value={uniaoId} onChange={e => { setUniaoId(e.target.value); setAssociacaoId(''); setIgrejaId('') }} className="input-field">
                  <option value="">-- Nenhuma --</option>
                  {unioes.map(un => <option key={un.id} value={un.id}>{un.sigla} - {un.nome}</option>)}
                </select>
              </Field>
              <Field label="Associação / Campo / Missão">
                <select value={associacaoId} onChange={e => {
                  const v = e.target.value; setAssociacaoId(v); setIgrejaId('')
                  if (v) { const a = associacoes.find(x => x.id === v); if (a?.uniao_id && !uniaoId) setUniaoId(a.uniao_id) }
                }} className="input-field">
                  <option value="">-- Nenhuma --</option>
                  {(uniaoId ? associacoes.filter(a => a.uniao_id === uniaoId) : associacoes).map(a => (
                    <option key={a.id} value={a.id}>{a.sigla} - {a.nome}</option>
                  ))}
                </select>
              </Field>
              <Field label="Igreja">
                <select value={igrejaId} onChange={e => setIgrejaId(e.target.value)} className="input-field">
                  <option value="">-- Nenhuma --</option>
                  {igrejasFiltradas.map(ig => <option key={ig.id} value={ig.id}>{ig.nome}</option>)}
                </select>
              </Field>
              <div className="sm:col-span-2 flex items-center justify-between p-4 rounded-lg border border-gray-200">
                <div>
                  <p className="text-sm font-medium text-gray-700">Usuário ativo</p>
                  <p className="text-xs text-gray-500">Inativos não podem fazer login</p>
                </div>
                <Toggle checked={ativo} onChange={setAtivo} />
              </div>
            </div>

            {papel === 'admin_associacao' && !associacaoId && (
              <p className="text-xs text-amber-600 mt-3">⚠ Admin Associação precisa ter uma associação vinculada.</p>
            )}
          </SectionCard>

          <Msg msg={msgAcesso} />

          <div className="flex justify-end">
            <button onClick={handleSalvarAcesso} disabled={savingAcesso}
              className="btn-primary inline-flex items-center gap-2">
              <FiSave className="w-4 h-4" />{savingAcesso ? 'Salvando...' : 'Salvar Permissões'}
            </button>
          </div>
        </div>
      )}

      {/* ═══ TAB SEGURANÇA ═══ */}
      {tab === 'seguranca' && (
        <div className="space-y-6">
          {/* Reset por email */}
          <SectionCard title="Redefinição por E-mail" icon={<FiRefreshCw className="w-5 h-5" />}>
            <p className="text-sm text-gray-600 mb-4">Envia um link para o usuário criar uma nova senha.</p>
            <button onClick={handleResetSenha} disabled={enviandoReset}
              className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50">
              <FiMail className="w-4 h-4" />
              {enviandoReset ? 'Enviando...' : `Enviar para ${usuario.email}`}
            </button>
          </SectionCard>

          {/* Definir senha diretamente */}
          <SectionCard title="Definir Senha Diretamente" icon={<FiKey className="w-5 h-5" />}>
            <p className="text-sm text-gray-600 mb-4">Redefine a senha sem notificar o usuário por email.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
              <Field label="Nova senha" span2>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input type={showSenha ? 'text' : 'password'} value={novaSenha}
                    onChange={e => setNovaSenha(e.target.value)}
                    placeholder="Mín. 6 caracteres" className="input-field pl-9 pr-10" />
                  <button type="button" onClick={() => setShowSenha(!showSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showSenha ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                </div>
              </Field>
              <Field label="Confirmar senha" span2>
                <input type={showSenha ? 'text' : 'password'} value={confirmarSenha}
                  onChange={e => setConfirmarSenha(e.target.value)}
                  placeholder="Repita a senha" className="input-field" />
              </Field>
            </div>
            {novaSenha && confirmarSenha && novaSenha !== confirmarSenha && (
              <p className="text-xs text-red-500 mt-2">As senhas não conferem</p>
            )}
            <div className="mt-4">
              <button onClick={handleDefinirSenha}
                disabled={definindoSenha || novaSenha.length < 6 || novaSenha !== confirmarSenha}
                className="btn-primary inline-flex items-center gap-2 disabled:opacity-50">
                <FiKey className="w-4 h-4" />{definindoSenha ? 'Definindo...' : 'Definir Senha'}
              </button>
            </div>
          </SectionCard>

          <Msg msg={msgSeg} />
        </div>
      )}

      {/* ═══ TAB SESSÕES ═══ */}
      {tab === 'sessoes' && (
        <SectionCard title="Informações de Sessão" icon={<FiMonitor className="w-5 h-5" />}>
          {loadingSessao ? (
            <div className="py-8 text-center text-gray-400">Carregando...</div>
          ) : sessao ? (
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
              {[
                { icon: <FiLogIn className="w-4 h-4 text-green-600" />, label: 'Último acesso', value: sessao.lastSignIn ? new Date(sessao.lastSignIn).toLocaleString('pt-BR') : 'Nunca acessou' },
                { icon: <FiMail className="w-4 h-4 text-blue-600" />, label: 'Email confirmado', value: sessao.emailConfirmed ? new Date(sessao.emailConfirmed).toLocaleString('pt-BR') : 'Não confirmado' },
                { icon: <FiMonitor className="w-4 h-4 text-gray-500" />, label: 'Conta criada', value: sessao.createdAt ? new Date(sessao.createdAt).toLocaleString('pt-BR') : '—' },
                { icon: <FiShield className="w-4 h-4 text-purple-500" />, label: 'Provedor', value: sessao.provider === 'email' ? 'Email e senha' : sessao.provider },
              ].map((row, i) => (
                <div key={i} className="flex items-center gap-3 p-4">
                  {row.icon}
                  <div>
                    <p className="text-xs text-gray-400">{row.label}</p>
                    <p className="text-sm font-medium text-gray-800">{row.value}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-8 text-gray-400">
              <FiMonitor className="w-10 h-10 opacity-30" />
              <p className="text-sm">Informações não disponíveis</p>
              <button onClick={carregarSessao} className="text-sm text-primary-600 hover:underline">Tentar novamente</button>
            </div>
          )}
        </SectionCard>
      )}
    </div>
  )
}
