import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@/types'
import { trackError } from '@/lib/observability'
import {
  FiArrowLeft, FiSave, FiUser, FiShield, FiLock,
  FiMail, FiEye, FiEyeOff, FiKey, FiRefreshCw,
  FiDatabase, FiSearch, FiX,
} from 'react-icons/fi'

interface AssociacaoOpt { id: string; nome: string; sigla: string; uniao_id: string }
interface IgrejaOpt { id: string; nome: string; associacao_id?: string }
interface UniaoOpt { id: string; nome: string; sigla: string }

interface PessoaLookup {
  id: string
  nome: string
  email: string | null
  telefone: string | null
  tipo: string | null
  uniao_id: string | null
  associacao_id: string | null
  igreja_id: string | null
  igreja_nome?: string | null
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
  missionario: 'Missionário',
  membro: 'Membro',
}

// Missionário no topo dos papéis operacionais — é o vínculo mais comum
// criado pela administração da União/Associação no dia-a-dia.
const allRoles: UserRole[] = [
  'admin', 'admin_uniao', 'admin_associacao',
  'missionario',
  'secretario_igreja', 'diretor_es', 'professor_es', 'secretario_es', 'tesoureiro',
  'membro',
]

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

export default function UsuarioNovoPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const isMaster = profile?.papel === 'admin'

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [showSenha, setShowSenha] = useState(false)

  const [papel, setPapel] = useState<UserRole>('membro')
  const [uniaoId, setUniaoId] = useState('')
  const [associacaoId, setAssociacaoId] = useState('')
  const [igrejaId, setIgrejaId] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [enviarEmail, setEnviarEmail] = useState(true)

  const [unioes, setUnioes] = useState<UniaoOpt[]>([])
  const [associacoes, setAssociacoes] = useState<AssociacaoOpt[]>([])
  const [igrejas, setIgrejas] = useState<IgrejaOpt[]>([])

  // "Puxar do banco" — busca em pessoas cadastradas
  const [pessoaBusca, setPessoaBusca] = useState('')
  const [pessoaResultados, setPessoaResultados] = useState<PessoaLookup[]>([])
  const [pessoaLoading, setPessoaLoading] = useState(false)
  const [pessoaSelecionada, setPessoaSelecionada] = useState<PessoaLookup | null>(null)
  const [showLookup, setShowLookup] = useState(false)
  const buscaTimer = useRef<number | null>(null)

  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const availableRoles = isMaster
    ? allRoles
    : allRoles.filter(r => r !== 'admin' && r !== 'admin_uniao')

  const igrejasFiltradas = useMemo(
    () => associacaoId ? igrejas.filter(ig => ig.associacao_id === associacaoId) : igrejas,
    [igrejas, associacaoId],
  )

  useEffect(() => {
    (async () => {
      const [un, as_, ig] = await Promise.all([
        supabase.from('unioes').select('id,nome,sigla').eq('ativo', true).order('sigla'),
        supabase.from('associacoes').select('id,nome,sigla,uniao_id').eq('ativo', true).order('sigla'),
        supabase.from('igrejas').select('id,nome,associacao_id').eq('ativo', true).order('nome'),
      ])
      setUnioes(un.data || [])
      setAssociacoes(as_.data || [])
      setIgrejas(ig.data || [])
    })()
  }, [])

  function gerarSenha() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    let out = ''
    for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)]
    const gerada = out + '!'
    setSenha(gerada)
    setConfirmarSenha(gerada)
    setShowSenha(true)
  }

  function handleBuscaPessoa(term: string) {
    setPessoaBusca(term)
    if (buscaTimer.current) window.clearTimeout(buscaTimer.current)
    if (term.trim().length < 2) { setPessoaResultados([]); return }
    buscaTimer.current = window.setTimeout(async () => {
      setPessoaLoading(true)
      try {
        let query = supabase
          .from('pessoas')
          .select('id, nome, email, telefone, tipo, uniao_id, associacao_id, igreja_id, igreja:igrejas(nome)')
          .ilike('nome', `%${term.trim()}%`)
          .eq('ativo', true)
          .limit(20)

        // Respeita escopo do admin
        if (profile?.papel === 'admin_uniao') query = query.eq('uniao_id', profile.uniao_id!)
        else if (profile?.papel === 'admin_associacao') query = query.eq('associacao_id', profile.associacao_id!)

        const { data } = await query
        const mapped: PessoaLookup[] = (data || []).map((p: any) => ({
          id: p.id,
          nome: p.nome,
          email: p.email,
          telefone: p.telefone,
          tipo: p.tipo,
          uniao_id: p.uniao_id,
          associacao_id: p.associacao_id,
          igreja_id: p.igreja_id,
          igreja_nome: p.igreja?.nome || null,
        }))
        setPessoaResultados(mapped)
      } finally {
        setPessoaLoading(false)
      }
    }, 300)
  }

  function selecionarPessoa(p: PessoaLookup) {
    setPessoaSelecionada(p)
    setShowLookup(false)
    setPessoaBusca('')
    setPessoaResultados([])
    // Auto-preenche dados pessoais
    setNome(p.nome)
    if (p.email) setEmail(p.email)
    if (p.telefone) setTelefone(p.telefone)
    // Auto-preenche vínculo
    if (p.uniao_id) setUniaoId(p.uniao_id)
    if (p.associacao_id) setAssociacaoId(p.associacao_id)
    if (p.igreja_id) setIgrejaId(p.igreja_id)
  }

  function limparPessoa() {
    setPessoaSelecionada(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')

    if (!nome.trim()) return setErr('Nome é obrigatório.')
    if (!email.trim()) return setErr('E-mail é obrigatório.')
    if (senha.length < 6) return setErr('Senha deve ter ao menos 6 caracteres.')
    if (senha !== confirmarSenha) return setErr('As senhas não conferem.')

    setSaving(true)
    try {
      const { data, error } = await supabase.rpc('admin_create_user', {
        p_email: email.trim().toLowerCase(),
        p_password: senha,
        p_nome: nome.trim(),
        p_papel: papel,
        p_associacao_id: associacaoId || null,
        p_uniao_id: uniaoId || null,
        p_igreja_id: igrejaId || null,
      })

      if (error) throw error

      const newUserId = typeof data === 'string' ? data : (data as any)?.id || (data as any)?.user_id
      if (newUserId) {
        const extra: Record<string, any> = {}
        if (!ativo) extra.ativo = false
        if (telefone.trim()) extra.telefone = telefone.trim()
        if (Object.keys(extra).length > 0) {
          await supabase.from('usuarios').update(extra).eq('id', newUserId)
        }
      }

      if (enviarEmail) {
        await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
          redirectTo: `${window.location.origin}/reset-password`,
        })
      }

      if (newUserId) navigate(`/usuarios/${newUserId}`)
      else navigate('/usuarios')
    } catch (e: any) {
      trackError(e, { context: 'admin_criar_usuario' })
      setErr(e.message || 'Erro ao criar usuário.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/usuarios')}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700">
          <FiArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Novo Usuário</h1>
          <p className="text-sm text-gray-500">Cadastre um novo acesso à plataforma</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados pessoais */}
        <SectionCard title="Dados Pessoais" icon={<FiUser className="w-5 h-5" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nome completo *" span2>
              <input type="text" value={nome} onChange={e => setNome(e.target.value)} className="input-field" placeholder="Nome e sobrenome" />
            </Field>
            <Field label="E-mail *" span2>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field pl-9" placeholder="email@dominio.com" />
              </div>
            </Field>
            <Field label="Telefone">
              <input type="tel" value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(00) 00000-0000" className="input-field" />
            </Field>
          </div>
        </SectionCard>

        {/* Senha */}
        <SectionCard title="Senha Inicial" icon={<FiLock className="w-5 h-5" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Senha *" span2>
              <div className="relative">
                <FiKey className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input type={showSenha ? 'text' : 'password'} value={senha} onChange={e => setSenha(e.target.value)} className="input-field pl-9 pr-10" placeholder="Mín. 6 caracteres" />
                <button type="button" onClick={() => setShowSenha(!showSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showSenha ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                </button>
              </div>
            </Field>
            <Field label="Confirmar senha *" span2>
              <input type={showSenha ? 'text' : 'password'} value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)} className="input-field" placeholder="Repita a senha" />
            </Field>
          </div>
          {senha && confirmarSenha && senha !== confirmarSenha && (
            <p className="text-xs text-red-500 mt-2">As senhas não conferem</p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" onClick={gerarSenha}
              className="btn-secondary inline-flex items-center gap-2 text-sm">
              <FiRefreshCw className="w-4 h-4" /> Gerar senha segura
            </button>
            <label className="inline-flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={enviarEmail} onChange={e => setEnviarEmail(e.target.checked)} />
              Enviar e-mail de redefinição para o usuário
            </label>
          </div>
        </SectionCard>

        {/* Permissões */}
        <SectionCard title="Permissões e Vínculo" icon={<FiShield className="w-5 h-5" />}>
          {/* Puxar do banco — busca uma pessoa cadastrada e auto-preenche */}
          <div className="mb-5 rounded-lg border border-primary-100 bg-primary-50/40 p-4">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <FiDatabase className="w-4 h-4 text-primary-600" />
                <p className="text-sm font-medium text-primary-800">Puxar dados do banco</p>
              </div>
              {!showLookup && !pessoaSelecionada && (
                <button type="button" onClick={() => setShowLookup(true)}
                  className="text-xs font-medium text-primary-700 hover:text-primary-900 hover:underline">
                  Buscar pessoa cadastrada
                </button>
              )}
            </div>

            {pessoaSelecionada ? (
              <div className="flex items-center justify-between gap-3 bg-white rounded-lg border border-primary-200 px-3 py-2">
                <div className="text-sm">
                  <p className="font-medium text-gray-800">{pessoaSelecionada.nome}</p>
                  <p className="text-xs text-gray-500">
                    {pessoaSelecionada.tipo === 'membro' ? 'Membro' : 'Interessado'}
                    {pessoaSelecionada.igreja_nome ? ` · ${pessoaSelecionada.igreja_nome}` : ''}
                    {pessoaSelecionada.email ? ` · ${pessoaSelecionada.email}` : ''}
                  </p>
                </div>
                <button type="button" onClick={limparPessoa}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Remover vínculo">
                  <FiX className="w-4 h-4" />
                </button>
              </div>
            ) : showLookup ? (
              <div className="space-y-2">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    autoFocus
                    value={pessoaBusca}
                    onChange={e => handleBuscaPessoa(e.target.value)}
                    placeholder="Digite o nome (mín. 2 caracteres)..."
                    className="input-field pl-9"
                  />
                  <button type="button" onClick={() => { setShowLookup(false); setPessoaBusca(''); setPessoaResultados([]) }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700">
                    <FiX className="w-4 h-4" />
                  </button>
                </div>
                {pessoaLoading && <p className="text-xs text-gray-500 px-1">Buscando...</p>}
                {!pessoaLoading && pessoaBusca.trim().length >= 2 && pessoaResultados.length === 0 && (
                  <p className="text-xs text-gray-500 px-1">Nenhuma pessoa encontrada.</p>
                )}
                {pessoaResultados.length > 0 && (
                  <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
                    {pessoaResultados.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => selecionarPessoa(p)}
                        className="w-full text-left px-3 py-2 hover:bg-primary-50 transition-colors"
                      >
                        <p className="text-sm font-medium text-gray-800">{p.nome}</p>
                        <p className="text-xs text-gray-500">
                          {p.tipo === 'membro' ? 'Membro' : 'Interessado'}
                          {p.igreja_nome ? ` · ${p.igreja_nome}` : ''}
                          {p.email ? ` · ${p.email}` : ''}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-500">
                Selecione uma pessoa já cadastrada no sistema para preencher automaticamente nome, e-mail, telefone e vínculo (união/associação/igreja).
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Papel / Nível de Acesso" span2>
              <select value={papel} onChange={e => setPapel(e.target.value as UserRole)} className="input-field">
                {availableRoles.map(r => <option key={r} value={r}>{roleLabels[r]}</option>)}
              </select>
              <p className="text-xs text-gray-400 mt-1">Permissões extras podem ser concedidas após criar o usuário.</p>
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
        </SectionCard>

        {err && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
            {err}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/usuarios')} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50">
            <FiSave className="w-4 h-4" />{saving ? 'Criando...' : 'Criar Usuário'}
          </button>
        </div>
      </form>
    </div>
  )
}
