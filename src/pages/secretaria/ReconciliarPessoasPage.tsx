import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
  HiOutlineUserGroup, HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineExternalLink,
  HiOutlineLightningBolt, HiOutlineRefresh, HiOutlineFilter, HiOutlineSearch,
  HiOutlineShieldCheck, HiOutlineExclamation,
} from 'react-icons/hi'

interface MatchCandidate {
  canonical_id: string
  canonical_nome: string | null
  canonical_email: string | null
  canonical_telefone: string | null
  canonical_nascimento: string | null
  canonical_igreja_id: string | null
  canonical_cadastro_id: string | null
  duplicate_id: string
  duplicate_nome: string | null
  duplicate_email: string | null
  duplicate_telefone: string | null
  duplicate_nascimento: string | null
  duplicate_igreja_id: string | null
  duplicate_data_batismo: string | null
  duplicate_foto: string | null
  confidence: number
  sinais: Record<string, any>
}

interface IgrejaInfo { id: string; nome: string; sigla?: string }

function fmtDate(s: string | null): string {
  if (!s) return '—'
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`
  }
  return s
}

function ConfidenceBadge({ score }: { score: number }) {
  const cor = score >= 90 ? 'bg-emerald-100 text-emerald-700'
    : score >= 70 ? 'bg-amber-100 text-amber-700'
    : 'bg-orange-100 text-orange-700'
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cor}`}>{score}/100</span>
}

export default function ReconciliarPessoasPage() {
  const [rows, setRows] = useState<MatchCandidate[]>([])
  const [igrejas, setIgrejas] = useState<Map<string, IgrejaInfo>>(new Map())
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [confidenceFilter, setConfidenceFilter] = useState<'todos' | 'alta' | 'media' | 'baixa'>('todos')
  const [search, setSearch] = useState('')
  const [showAutoMerge, setShowAutoMerge] = useState(false)
  const [autoMergeRunning, setAutoMergeRunning] = useState(false)
  const [autoMergeResult, setAutoMergeResult] = useState<any>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('pessoa_match_candidates')
        .select('*')
        .order('confidence', { ascending: false })
        .limit(500)
      if (error) throw error
      setRows((data || []) as MatchCandidate[])

      const igrejaIds = new Set<string>()
      ;(data || []).forEach((r: any) => {
        if (r.canonical_igreja_id) igrejaIds.add(r.canonical_igreja_id)
        if (r.duplicate_igreja_id) igrejaIds.add(r.duplicate_igreja_id)
      })
      if (igrejaIds.size > 0) {
        const { data: igs } = await supabase
          .from('igrejas')
          .select('id, nome')
          .in('id', Array.from(igrejaIds))
        const m = new Map<string, IgrejaInfo>()
        ;(igs || []).forEach(ig => m.set(ig.id, ig))
        setIgrejas(m)
      }
    } catch (err) {
      console.error('load erro', err)
      setToast({ type: 'error', msg: 'Falha ao carregar candidatos.' })
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => {
    return {
      total: rows.length,
      alta: rows.filter(r => r.confidence >= 90).length,
      media: rows.filter(r => r.confidence >= 70 && r.confidence < 90).length,
      baixa: rows.filter(r => r.confidence < 70).length,
    }
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (confidenceFilter === 'alta' && r.confidence < 90) return false
      if (confidenceFilter === 'media' && (r.confidence < 70 || r.confidence >= 90)) return false
      if (confidenceFilter === 'baixa' && r.confidence >= 70) return false
      if (search.trim()) {
        const t = search.toLowerCase()
        return (r.canonical_nome || '').toLowerCase().includes(t)
          || (r.duplicate_nome || '').toLowerCase().includes(t)
      }
      return true
    })
  }, [rows, confidenceFilter, search])

  async function handleMerge(r: MatchCandidate) {
    if (!confirm(`Confirma mesclar?\n\nO registro do legado "${r.duplicate_nome}" será absorvido pelo do censo "${r.canonical_nome}". Todas as FKs serão movidas para o registro do censo. Esta operação é registrada em audit log e tem trilha de reversão.`)) return
    setBusy(r.duplicate_id)
    try {
      const { data, error } = await supabase.rpc('merge_pessoas', {
        p_canonical_id: r.canonical_id,
        p_duplicate_id: r.duplicate_id,
        p_reason: 'manual_review',
      })
      if (error) throw error
      setToast({ type: 'success', msg: `Mesclado com sucesso (${(data as any)?.fk_moves ? Object.keys((data as any).fk_moves).length : 0} tabelas atualizadas).` })
      setRows(prev => prev.filter(p => p.duplicate_id !== r.duplicate_id))
    } catch (err: any) {
      setToast({ type: 'error', msg: `Falha: ${err?.message || err}` })
    } finally {
      setBusy(null)
    }
  }

  async function handleDismiss(r: MatchCandidate) {
    if (!confirm(`Marcar como pessoas diferentes?\n\nO par "${r.canonical_nome}" × "${r.duplicate_nome}" não aparecerá mais nesta lista.`)) return
    setBusy(r.duplicate_id)
    try {
      const { error } = await supabase.from('pessoa_match_dismissed').insert({
        canonical_id: r.canonical_id,
        duplicate_id: r.duplicate_id,
        reason: 'manual_review',
      })
      if (error) throw error
      setToast({ type: 'success', msg: 'Par marcado como pessoas diferentes.' })
      setRows(prev => prev.filter(p => !(p.canonical_id === r.canonical_id && p.duplicate_id === r.duplicate_id)))
    } catch (err: any) {
      setToast({ type: 'error', msg: `Falha: ${err?.message || err}` })
    } finally {
      setBusy(null)
    }
  }

  async function handleAutoMerge() {
    if (!confirm(`Mesclar automaticamente TODOS os ${stats.alta} pares com confidence ≥ 90?\n\nIsso é seguro porque os critérios são: email exato, OU telefone+nascimento exato, OU nome+nascimento exato.\n\nUma trilha completa de reversão fica em pessoa_merge_log.`)) return
    setAutoMergeRunning(true)
    setAutoMergeResult(null)
    try {
      const { data, error } = await supabase.rpc('auto_merge_high_confidence', { p_threshold: 90, p_limit: 200 })
      if (error) throw error
      setAutoMergeResult(data)
      setToast({ type: 'success', msg: `Auto-merge: ${(data as any).merged} mesclados, ${(data as any).failed} falhas.` })
      await load()
    } catch (err: any) {
      setToast({ type: 'error', msg: `Falha: ${err?.message || err}` })
    } finally {
      setAutoMergeRunning(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 max-w-sm px-4 py-3 rounded-lg shadow-lg ${toast.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
          <div className="flex items-start gap-2">
            <span className="text-sm flex-1">{toast.msg}</span>
            <button onClick={() => setToast(null)} className="text-xs hover:underline">×</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reconciliar duplicatas</h1>
          <p className="text-gray-500 mt-1 text-sm">
            O censo é a fonte canônica. Registros legados que correspondem são absorvidos no registro do censo —
            campos como data de batismo, foto e família ficam preservados.
          </p>
        </div>
        <button onClick={load} className="btn-secondary inline-flex items-center gap-2 text-sm">
          <HiOutlineRefresh className="w-4 h-4" /> Atualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={HiOutlineUserGroup} label="Total" value={stats.total} color="text-gray-800" onClick={() => setConfidenceFilter('todos')} active={confidenceFilter === 'todos'} />
        <StatCard icon={HiOutlineShieldCheck} label="Alta confiança (≥90)" value={stats.alta} color="text-emerald-700" onClick={() => setConfidenceFilter('alta')} active={confidenceFilter === 'alta'} />
        <StatCard icon={HiOutlineFilter} label="Média (70–89)" value={stats.media} color="text-amber-700" onClick={() => setConfidenceFilter('media')} active={confidenceFilter === 'media'} />
        <StatCard icon={HiOutlineExclamation} label="Baixa (<70)" value={stats.baixa} color="text-orange-700" onClick={() => setConfidenceFilter('baixa')} active={confidenceFilter === 'baixa'} />
      </div>

      {/* Auto-merge call to action */}
      {stats.alta > 0 && (
        <div className="card bg-emerald-50 border border-emerald-200">
          <div className="flex items-start gap-3">
            <HiOutlineLightningBolt className="w-6 h-6 text-emerald-700 shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-emerald-900">
                {stats.alta} pares de alta confiança disponíveis para auto-merge
              </h3>
              <p className="text-xs text-emerald-700 mt-1">
                Esses pares têm email exato, telefone+nascimento exato ou nome+nascimento exato — risco mínimo de falso positivo.
                Cada merge é auditado e pode ser revertido manualmente.
              </p>
              <button
                onClick={handleAutoMerge}
                disabled={autoMergeRunning}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50"
              >
                <HiOutlineLightningBolt className="w-4 h-4" />
                {autoMergeRunning ? 'Mesclando em lote...' : `Auto-mesclar ${stats.alta} pares (≥90)`}
              </button>
              {autoMergeResult && (
                <div className="mt-3 text-xs text-emerald-700">
                  <strong>{autoMergeResult.merged}</strong> mesclados ·{' '}
                  <strong>{autoMergeResult.failed}</strong> falhas
                  {autoMergeResult.failed > 0 && autoMergeResult.errors?.length > 0 && (
                    <details className="mt-1">
                      <summary className="cursor-pointer">Ver erros</summary>
                      <pre className="bg-white/60 rounded p-2 mt-1 text-[10px] overflow-auto max-h-32">{JSON.stringify(autoMergeResult.errors, null, 2)}</pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome..."
              className="input-field pl-10"
            />
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            {([['todos', 'Todos'], ['alta', `Alta (${stats.alta})`], ['media', `Média (${stats.media})`], ['baixa', `Baixa (${stats.baixa})`]] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setConfidenceFilter(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md ${confidenceFilter === key ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pairs */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando candidatos...</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <HiOutlineCheckCircle className="w-12 h-12 text-emerald-300 mx-auto mb-2" />
          <p className="text-gray-700 font-medium">Nenhum candidato neste filtro.</p>
          <p className="text-xs text-gray-500 mt-1">Use o botão "Atualizar" se acabou de mesclar pares.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <PairCard
              key={`${r.canonical_id}_${r.duplicate_id}`}
              r={r}
              igrejas={igrejas}
              busy={busy === r.duplicate_id}
              onMerge={() => handleMerge(r)}
              onDismiss={() => handleDismiss(r)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color, onClick, active }: {
  icon: any; label: string; value: number; color: string; onClick?: () => void; active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`card flex items-center gap-3 text-left transition-all hover:ring-2 hover:ring-primary-200 ${active ? 'ring-2 ring-primary-400' : ''}`}
    >
      <Icon className="w-5 h-5 text-gray-400" />
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
      </div>
    </button>
  )
}

function PairCard({ r, igrejas, busy, onMerge, onDismiss }: {
  r: MatchCandidate
  igrejas: Map<string, IgrejaInfo>
  busy: boolean
  onMerge: () => void
  onDismiss: () => void
}) {
  const canonIgreja = r.canonical_igreja_id ? igrejas.get(r.canonical_igreja_id)?.nome : null
  const dupIgreja = r.duplicate_igreja_id ? igrejas.get(r.duplicate_igreja_id)?.nome : null
  const sameIgreja = r.canonical_igreja_id && r.canonical_igreja_id === r.duplicate_igreja_id

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ConfidenceBadge score={r.confidence} />
          <div className="flex items-center gap-1 text-xs">
            <SignalBadge ok={!!r.sinais.email_match} label="email" />
            <SignalBadge ok={!!r.sinais.telefone_match} label="tel" />
            <SignalBadge ok={!!r.sinais.nascimento_match} label="nasc" />
            <SignalBadge ok={!!r.sinais.nome_exato} label="nome=" />
            <SignalBadge ok={(r.sinais.nome_similarity ?? 0) >= 0.65} label={`sim ${r.sinais.nome_similarity}`} />
            <SignalBadge ok={!!sameIgreja} label="igreja" />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onMerge}
            disabled={busy}
            className="text-xs font-medium px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            <HiOutlineCheckCircle className="w-4 h-4" />
            {busy ? 'Mesclando...' : 'Mesclar'}
          </button>
          <button
            onClick={onDismiss}
            disabled={busy}
            className="text-xs font-medium px-3 py-1.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            <HiOutlineXCircle className="w-4 h-4" />
            São diferentes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <PersonPanel
          tag="CENSO (canônica)"
          tagColor="bg-emerald-100 text-emerald-700"
          id={r.canonical_id}
          nome={r.canonical_nome}
          email={r.canonical_email}
          telefone={r.canonical_telefone}
          nascimento={r.canonical_nascimento}
          igreja={canonIgreja}
          extra={r.canonical_cadastro_id ? `Cadastro: ${r.canonical_cadastro_id.slice(0, 8)}` : null}
        />
        <PersonPanel
          tag="LEGADO (será absorvido)"
          tagColor="bg-orange-100 text-orange-700"
          id={r.duplicate_id}
          nome={r.duplicate_nome}
          email={r.duplicate_email}
          telefone={r.duplicate_telefone}
          nascimento={r.duplicate_nascimento}
          igreja={dupIgreja}
          extra={r.duplicate_data_batismo ? `Batismo: ${fmtDate(r.duplicate_data_batismo)}` : null}
          foto={r.duplicate_foto}
        />
      </div>
    </div>
  )
}

function SignalBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
      {label}
    </span>
  )
}

function PersonPanel({ tag, tagColor, id, nome, email, telefone, nascimento, igreja, extra, foto }: {
  tag: string
  tagColor: string
  id: string
  nome: string | null
  email: string | null
  telefone: string | null
  nascimento: string | null
  igreja: string | null | undefined
  extra?: string | null
  foto?: string | null
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <div className="flex items-start gap-3">
        {foto ? (
          <img src={foto} alt={nome || ''} className="w-12 h-12 rounded-full object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-sm font-bold">
            {(nome || '?').slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${tagColor}`}>{tag}</span>
            <Link
              to={`/membros/${id}`}
              target="_blank"
              className="text-[10px] text-primary-600 hover:underline inline-flex items-center gap-0.5"
            >
              ficha <HiOutlineExternalLink className="w-3 h-3" />
            </Link>
          </div>
          <p className="text-sm font-semibold text-gray-800 truncate" title={nome || ''}>{nome || <span className="text-gray-400 italic">sem nome</span>}</p>
          <dl className="mt-1 space-y-0.5 text-xs text-gray-600">
            {email && <div className="flex gap-1"><dt className="text-gray-400 w-16">Email:</dt><dd className="truncate">{email}</dd></div>}
            {telefone && <div className="flex gap-1"><dt className="text-gray-400 w-16">Tel:</dt><dd>{telefone}</dd></div>}
            {nascimento && <div className="flex gap-1"><dt className="text-gray-400 w-16">Nasc:</dt><dd>{fmtDate(nascimento)}</dd></div>}
            {igreja && <div className="flex gap-1"><dt className="text-gray-400 w-16">Igreja:</dt><dd className="truncate">{igreja}</dd></div>}
            {extra && <div className="text-[11px] text-gray-500 mt-1">{extra}</div>}
          </dl>
        </div>
      </div>
    </div>
  )
}
