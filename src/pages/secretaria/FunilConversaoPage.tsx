import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { ETAPA_FUNIL_LABELS, ETAPA_FUNIL_COLORS, formatDateBR } from '@/lib/secretaria-constants'
import {
  HiOutlineUserAdd, HiOutlinePhone, HiOutlineClock,
  HiOutlineChevronRight, HiOutlineChevronLeft,
  HiOutlineEye, HiOutlinePlus, HiOutlineX,
  HiOutlineFilter, HiOutlineRefresh, HiOutlineTrendingUp,
  HiOutlineChat
} from 'react-icons/hi'

const ETAPAS_ORDEM = ['contato', 'classe_biblica', 'estudos_regulares', 'decisao', 'batismo', 'integracao'] as const
type Etapa = typeof ETAPAS_ORDEM[number]

interface PessoaFunil {
  id: string
  nome: string
  celular: string | null
  telefone: string | null
  email: string | null
  etapa_funil: string
  score_engajamento: number | null
  data_ultimo_contato: string | null
  observacoes_funil: string | null
  created_at: string
  igreja: { nome: string } | null
  responsavel: { nome: string } | null
}

interface Interacao {
  id: string
  tipo: string
  descricao: string | null
  data: string
  resultado: string | null
  realizado_por_nome?: string
}

const TIPO_INTERACAO_LABELS: Record<string, string> = {
  visita: 'Visita',
  estudo_biblico: 'Estudo Bíblico',
  ligacao: 'Ligação',
  whatsapp: 'WhatsApp',
  evento: 'Evento',
  classe_biblica: 'Classe Bíblica',
  culto: 'Culto',
  es: 'Escola Sabatina',
  outro: 'Outro',
}

const RESULTADO_COLORS: Record<string, string> = {
  positivo: 'text-green-600',
  neutro: 'text-gray-500',
  negativo: 'text-red-500',
}

export default function FunilConversaoPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [pessoas, setPessoas] = useState<PessoaFunil[]>([])
  const [loading, setLoading] = useState(true)
  const [moving, setMoving] = useState<string | null>(null)

  // Drawer for person details
  const [drawerPessoa, setDrawerPessoa] = useState<PessoaFunil | null>(null)
  const [interacoes, setInteracoes] = useState<Interacao[]>([])
  const [loadingInteracoes, setLoadingInteracoes] = useState(false)

  // New interaction form
  const [showNovaInteracao, setShowNovaInteracao] = useState(false)
  const [novaInteracao, setNovaInteracao] = useState({
    tipo: 'visita',
    descricao: '',
    resultado: 'positivo',
    proxima_acao: '',
    data_proxima_acao: '',
  })

  // Mobile: which column is visible
  const [mobileEtapa, setMobileEtapa] = useState(0)

  function buildScopeFilter(query: any) {
    if (!profile) return query
    if (profile.papel === 'admin') return query
    if (profile.papel === 'admin_uniao') return query.eq('uniao_id', profile.uniao_id!)
    if (profile.papel === 'admin_associacao') return query.eq('associacao_id', profile.associacao_id!)
    return query.eq('igreja_id', profile.igreja_id!)
  }

  useEffect(() => {
    if (profile) fetchPessoas()
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchPessoas() {
    setLoading(true)
    try {
      let query = supabase
        .from('pessoas')
        .select('id, nome, celular, telefone, email, etapa_funil, score_engajamento, data_ultimo_contato, observacoes_funil, created_at, igreja:igrejas(nome), responsavel:usuarios!responsavel_id(nome)')
        .eq('tipo', 'interessado')
        .in('situacao', ['ativo', 'inativo'])
        .order('score_engajamento', { ascending: false, nullsFirst: false })

      query = buildScopeFilter(query)

      const { data, error } = await query
      if (error) {
        // Fallback without responsavel join if usuarios table doesn't exist
        const fallback = await buildScopeFilter(
          supabase
            .from('pessoas')
            .select('id, nome, celular, telefone, email, etapa_funil, score_engajamento, data_ultimo_contato, observacoes_funil, created_at, igreja:igrejas(nome)')
            .eq('tipo', 'interessado')
            .in('situacao', ['ativo', 'inativo'])
            .order('score_engajamento', { ascending: false, nullsFirst: false })
        )
        setPessoas((fallback.data || []).map(p => ({ ...p, responsavel: null })))
        return
      }

      setPessoas(data || [])
    } catch (err) {
      console.error('Erro ao buscar funil:', err)
    } finally {
      setLoading(false)
    }
  }

  async function moverEtapa(pessoaId: string, novaEtapa: string) {
    setMoving(pessoaId)
    try {
      const { error } = await supabase
        .from('pessoas')
        .update({
          etapa_funil: novaEtapa,
          data_ultimo_contato: new Date().toISOString().slice(0, 10),
        })
        .eq('id', pessoaId)

      if (error) throw error

      setPessoas(prev => prev.map(p =>
        p.id === pessoaId ? { ...p, etapa_funil: novaEtapa, data_ultimo_contato: new Date().toISOString().slice(0, 10) } : p
      ))

      // If moved to batismo, also convert tipo to membro
      if (novaEtapa === 'batismo') {
        await supabase
          .from('pessoas')
          .update({ tipo: 'membro', situacao: 'ativo', data_batismo: new Date().toISOString().slice(0, 10) })
          .eq('id', pessoaId)
      }

      // Update drawer if open
      if (drawerPessoa?.id === pessoaId) {
        setDrawerPessoa(prev => prev ? { ...prev, etapa_funil: novaEtapa } : null)
      }
    } catch (err) {
      console.error('Erro ao mover etapa:', err)
    } finally {
      setMoving(null)
    }
  }

  async function openDrawer(pessoa: PessoaFunil) {
    setDrawerPessoa(pessoa)
    setShowNovaInteracao(false)
    setLoadingInteracoes(true)
    try {
      const { data } = await supabase
        .from('interacoes')
        .select('id, tipo, descricao, data, resultado')
        .eq('pessoa_id', pessoa.id)
        .order('data', { ascending: false })
        .limit(20)

      setInteracoes(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingInteracoes(false)
    }
  }

  async function salvarInteracao() {
    if (!drawerPessoa || !profile) return
    try {
      const { error } = await supabase.from('interacoes').insert({
        pessoa_id: drawerPessoa.id,
        tipo: novaInteracao.tipo,
        descricao: novaInteracao.descricao || null,
        data: new Date().toISOString().slice(0, 10),
        resultado: novaInteracao.resultado,
        realizado_por: profile.id,
        igreja_id: profile.igreja_id,
        proxima_acao: novaInteracao.proxima_acao || null,
        data_proxima_acao: novaInteracao.data_proxima_acao || null,
      })

      if (error) throw error

      // Update score
      const newScore = (drawerPessoa.score_engajamento || 0) + (novaInteracao.resultado === 'positivo' ? 10 : novaInteracao.resultado === 'neutro' ? 5 : -5)
      await supabase
        .from('pessoas')
        .update({
          score_engajamento: Math.max(0, newScore),
          data_ultimo_contato: new Date().toISOString().slice(0, 10),
        })
        .eq('id', drawerPessoa.id)

      // Refresh
      setShowNovaInteracao(false)
      setNovaInteracao({ tipo: 'visita', descricao: '', resultado: 'positivo', proxima_acao: '', data_proxima_acao: '' })
      openDrawer({ ...drawerPessoa, score_engajamento: Math.max(0, newScore), data_ultimo_contato: new Date().toISOString().slice(0, 10) })
      fetchPessoas()
    } catch (err) {
      console.error('Erro ao salvar interação:', err)
    }
  }

  // Group by etapa
  const colunas = useMemo(() => {
    const grouped: Record<string, PessoaFunil[]> = {}
    ETAPAS_ORDEM.forEach(e => { grouped[e] = [] })
    pessoas.forEach(p => {
      const etapa = p.etapa_funil || 'contato'
      if (grouped[etapa]) {
        grouped[etapa].push(p)
      } else {
        grouped['contato'].push(p)
      }
    })
    return grouped
  }, [pessoas])

  // Stats
  const totalInteressados = pessoas.length
  const taxaConversao = totalInteressados > 0
    ? ((colunas['batismo'].length + colunas['integracao'].length) / totalInteressados * 100).toFixed(1)
    : '0'

  // Days since last contact helper
  function diasSemContato(data: string | null): number | null {
    if (!data) return null
    const d = new Date(data + 'T00:00:00')
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    return Math.floor((hoje.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  }

  function getWhatsAppLink(pessoa: PessoaFunil) {
    const phone = (pessoa.celular || pessoa.telefone || '').replace(/\D/g, '')
    if (!phone) return null
    const phoneWithCountry = phone.startsWith('55') ? phone : `55${phone}`
    return `https://wa.me/${phoneWithCountry}`
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-200 rounded-lg animate-pulse" />)}
        </div>
        <div className="grid grid-cols-6 gap-3">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-64 bg-gray-100 rounded-lg animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Funil de Conversão</h1>
          <p className="text-gray-500 mt-1">Pipeline de interessados até o batismo</p>
        </div>
        <button onClick={fetchPessoas} className="btn-secondary inline-flex items-center gap-2 text-sm w-fit">
          <HiOutlineRefresh className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card py-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{totalInteressados}</p>
          <p className="text-xs text-gray-500">No Pipeline</p>
        </div>
        <div className="card py-3 text-center">
          <p className="text-2xl font-bold text-amber-600">{colunas['classe_biblica'].length + colunas['estudos_regulares'].length}</p>
          <p className="text-xs text-gray-500">Em Estudo</p>
        </div>
        <div className="card py-3 text-center">
          <p className="text-2xl font-bold text-orange-600">{colunas['decisao'].length}</p>
          <p className="text-xs text-gray-500">Em Decisão</p>
        </div>
        <div className="card py-3 text-center">
          <p className="text-2xl font-bold text-green-600">{taxaConversao}%</p>
          <p className="text-xs text-gray-500">Taxa Conversão</p>
        </div>
      </div>

      {/* Mobile column selector */}
      <div className="flex sm:hidden items-center justify-between">
        <button
          onClick={() => setMobileEtapa(Math.max(0, mobileEtapa - 1))}
          disabled={mobileEtapa === 0}
          className="p-2 rounded-lg bg-gray-100 disabled:opacity-30"
        >
          <HiOutlineChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold" style={{ color: ETAPA_FUNIL_COLORS[ETAPAS_ORDEM[mobileEtapa]] }}>
            {ETAPA_FUNIL_LABELS[ETAPAS_ORDEM[mobileEtapa]]}
          </p>
          <p className="text-xs text-gray-400">{colunas[ETAPAS_ORDEM[mobileEtapa]].length} pessoas</p>
        </div>
        <button
          onClick={() => setMobileEtapa(Math.min(ETAPAS_ORDEM.length - 1, mobileEtapa + 1))}
          disabled={mobileEtapa === ETAPAS_ORDEM.length - 1}
          className="p-2 rounded-lg bg-gray-100 disabled:opacity-30"
        >
          <HiOutlineChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Kanban Board */}
      <div className="hidden sm:grid grid-cols-6 gap-3 items-start">
        {ETAPAS_ORDEM.map(etapa => (
          <KanbanColumn
            key={etapa}
            etapa={etapa}
            pessoas={colunas[etapa]}
            onOpenDrawer={openDrawer}
            onMover={moverEtapa}
            moving={moving}
            diasSemContato={diasSemContato}
          />
        ))}
      </div>

      {/* Mobile: single column */}
      <div className="sm:hidden">
        <KanbanColumn
          etapa={ETAPAS_ORDEM[mobileEtapa]}
          pessoas={colunas[ETAPAS_ORDEM[mobileEtapa]]}
          onOpenDrawer={openDrawer}
          onMover={moverEtapa}
          moving={moving}
          diasSemContato={diasSemContato}
          fullWidth
        />
      </div>

      {/* Drawer overlay */}
      {drawerPessoa && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerPessoa(null)} />
          <div className="relative w-full max-w-md bg-white shadow-xl overflow-y-auto">
            {/* Drawer header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800 truncate">{drawerPessoa.nome}</h2>
              <button onClick={() => setDrawerPessoa(null)} className="p-1 rounded hover:bg-gray-100">
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-5">
              {/* Person info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: ETAPA_FUNIL_COLORS[drawerPessoa.etapa_funil] + '20', color: ETAPA_FUNIL_COLORS[drawerPessoa.etapa_funil] }}>
                    {ETAPA_FUNIL_LABELS[drawerPessoa.etapa_funil] || drawerPessoa.etapa_funil}
                  </span>
                  {drawerPessoa.score_engajamento != null && (
                    <span className="text-xs text-gray-400">Score: {drawerPessoa.score_engajamento}</span>
                  )}
                </div>
                {(drawerPessoa.celular || drawerPessoa.telefone) && (
                  <p className="text-sm text-gray-600 flex items-center gap-1.5">
                    <HiOutlinePhone className="w-4 h-4 shrink-0" />
                    {drawerPessoa.celular || drawerPessoa.telefone}
                    {getWhatsAppLink(drawerPessoa) && (
                      <a href={getWhatsAppLink(drawerPessoa)!} target="_blank" rel="noopener noreferrer"
                        className="ml-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full hover:bg-green-200">
                        WhatsApp
                      </a>
                    )}
                  </p>
                )}
                {(drawerPessoa.igreja as any)?.nome && (
                  <p className="text-sm text-gray-500">{(drawerPessoa.igreja as any).nome}</p>
                )}
                {drawerPessoa.data_ultimo_contato && (
                  <p className="text-xs text-gray-400">Último contato: {formatDateBR(drawerPessoa.data_ultimo_contato)}</p>
                )}
                {drawerPessoa.observacoes_funil && (
                  <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded">{drawerPessoa.observacoes_funil}</p>
                )}
              </div>

              {/* Move buttons */}
              <div>
                <p className="text-xs text-gray-400 mb-2">Mover para:</p>
                <div className="flex flex-wrap gap-1.5">
                  {ETAPAS_ORDEM.filter(e => e !== drawerPessoa.etapa_funil).map(e => (
                    <button
                      key={e}
                      onClick={() => moverEtapa(drawerPessoa.id, e)}
                      disabled={moving === drawerPessoa.id}
                      className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 hover:border-gray-400 transition-colors disabled:opacity-40"
                      style={{ color: ETAPA_FUNIL_COLORS[e] }}
                    >
                      {ETAPA_FUNIL_LABELS[e]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/membros/${drawerPessoa.id}`)}
                  className="btn-secondary text-xs flex items-center gap-1.5 flex-1 justify-center"
                >
                  <HiOutlineEye className="w-3.5 h-3.5" /> Ver Perfil
                </button>
                <button
                  onClick={() => setShowNovaInteracao(!showNovaInteracao)}
                  className="btn-primary text-xs flex items-center gap-1.5 flex-1 justify-center"
                >
                  <HiOutlinePlus className="w-3.5 h-3.5" /> Nova Interação
                </button>
              </div>

              {/* New interaction form */}
              {showNovaInteracao && (
                <div className="border border-primary-200 rounded-lg p-3 space-y-3 bg-primary-50/30">
                  <p className="text-sm font-medium text-gray-700">Registrar Interação</p>
                  <select
                    value={novaInteracao.tipo}
                    onChange={e => setNovaInteracao(prev => ({ ...prev, tipo: e.target.value }))}
                    className="input-field text-sm"
                  >
                    {Object.entries(TIPO_INTERACAO_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <textarea
                    value={novaInteracao.descricao}
                    onChange={e => setNovaInteracao(prev => ({ ...prev, descricao: e.target.value }))}
                    placeholder="Descrição..."
                    className="input-field text-sm"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    {(['positivo', 'neutro', 'negativo'] as const).map(r => (
                      <button
                        key={r}
                        onClick={() => setNovaInteracao(prev => ({ ...prev, resultado: r }))}
                        className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${
                          novaInteracao.resultado === r
                            ? r === 'positivo' ? 'border-green-400 bg-green-50 text-green-700'
                              : r === 'neutro' ? 'border-gray-400 bg-gray-50 text-gray-700'
                              : 'border-red-400 bg-red-50 text-red-700'
                            : 'border-gray-200 text-gray-500'
                        }`}
                      >
                        {r === 'positivo' ? 'Positivo' : r === 'neutro' ? 'Neutro' : 'Negativo'}
                      </button>
                    ))}
                  </div>
                  <input
                    value={novaInteracao.proxima_acao}
                    onChange={e => setNovaInteracao(prev => ({ ...prev, proxima_acao: e.target.value }))}
                    placeholder="Próxima ação..."
                    className="input-field text-sm"
                  />
                  <input
                    type="date"
                    value={novaInteracao.data_proxima_acao}
                    onChange={e => setNovaInteracao(prev => ({ ...prev, data_proxima_acao: e.target.value }))}
                    className="input-field text-sm"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setShowNovaInteracao(false)} className="btn-secondary text-xs flex-1">Cancelar</button>
                    <button onClick={salvarInteracao} className="btn-primary text-xs flex-1">Salvar</button>
                  </div>
                </div>
              )}

              {/* Interaction history */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Histórico de Interações</p>
                {loadingInteracoes ? (
                  <div className="space-y-2">
                    {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}
                  </div>
                ) : interacoes.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">Nenhuma interação registrada</p>
                ) : (
                  <div className="space-y-2">
                    {interacoes.map(inter => (
                      <div key={inter.id} className="flex items-start gap-2 py-2 border-b border-gray-50 last:border-0">
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                          inter.resultado === 'positivo' ? 'bg-green-500' :
                          inter.resultado === 'negativo' ? 'bg-red-500' : 'bg-gray-400'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-700">
                            {TIPO_INTERACAO_LABELS[inter.tipo] || inter.tipo}
                            <span className="text-gray-400 font-normal ml-2">{formatDateBR(inter.data)}</span>
                          </p>
                          {inter.descricao && (
                            <p className="text-xs text-gray-500 mt-0.5">{inter.descricao}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============ Kanban Column Component ============

function KanbanColumn({
  etapa,
  pessoas,
  onOpenDrawer,
  onMover,
  moving,
  diasSemContato,
  fullWidth = false,
}: {
  etapa: Etapa
  pessoas: PessoaFunil[]
  onOpenDrawer: (p: PessoaFunil) => void
  onMover: (id: string, etapa: string) => void
  moving: string | null
  diasSemContato: (d: string | null) => number | null
  fullWidth?: boolean
}) {
  const etapaIdx = ETAPAS_ORDEM.indexOf(etapa)
  const nextEtapa = etapaIdx < ETAPAS_ORDEM.length - 1 ? ETAPAS_ORDEM[etapaIdx + 1] : null

  return (
    <div className={`rounded-xl bg-gray-50 ${fullWidth ? '' : 'min-h-[400px]'}`}>
      {/* Column header */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ETAPA_FUNIL_COLORS[etapa] }} />
            <span className="text-xs font-semibold text-gray-700 truncate">
              {ETAPA_FUNIL_LABELS[etapa]}
            </span>
          </div>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white text-gray-600 shadow-sm">
            {pessoas.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className={`p-2 space-y-2 ${fullWidth ? '' : 'max-h-[60vh] overflow-y-auto'}`}>
        {pessoas.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">Nenhum</p>
        ) : (
          pessoas.map(p => {
            const dias = diasSemContato(p.data_ultimo_contato)
            const alertaDias = dias !== null && dias > 14

            return (
              <div
                key={p.id}
                onClick={() => onOpenDrawer(p)}
                className={`bg-white rounded-lg p-2.5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer ${
                  moving === p.id ? 'opacity-50' : ''
                } ${alertaDias ? 'border-l-2 border-l-red-400' : ''}`}
              >
                <p className="text-xs font-medium text-gray-800 truncate">{p.nome}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <div className="flex items-center gap-1">
                    {p.score_engajamento != null && p.score_engajamento > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">
                        {p.score_engajamento}
                      </span>
                    )}
                    {dias !== null && (
                      <span className={`text-[10px] flex items-center gap-0.5 ${alertaDias ? 'text-red-500' : 'text-gray-400'}`}>
                        <HiOutlineClock className="w-3 h-3" />
                        {dias}d
                      </span>
                    )}
                  </div>
                  {nextEtapa && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onMover(p.id, nextEtapa) }}
                      disabled={moving === p.id}
                      className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-primary-600 disabled:opacity-40"
                      title={`Mover para ${ETAPA_FUNIL_LABELS[nextEtapa]}`}
                    >
                      <HiOutlineChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
