import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import {
  ResponsiveContainer, Tooltip,
  Radar, RadarChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis,
} from 'recharts'
import {
  HiOutlineArrowLeft, HiOutlineUsers, HiOutlineHeart, HiOutlineSparkles, HiOutlineExclamationCircle,
  HiOutlineUserGroup, HiOutlineDocumentText, HiOutlineExternalLink,
  HiOutlineAcademicCap, HiOutlineGlobeAlt, HiOutlineBriefcase, HiOutlineChartBar,
  HiOutlineEye, HiOutlineSearch, HiOutlineDownload, HiOutlineIdentification,
} from 'react-icons/hi'
import {
  type CensoRow,
  computeAreaScores, computeFrequenciaScores, computeIndices,
  topPontos, topPrioridades, computeDemographics,
  classColors, classifyScore,
} from '@/lib/censo-metrics'
import { populacaoPorCidadeUF, normCidade } from '@/lib/ibge-api'

interface IgrejaInfo {
  id: string
  nome: string
  endereco_cidade: string | null
  endereco_estado: string | null
  membros_ativos: number | null
  interessados: number | null
  associacao: { id: string; nome: string; sigla: string } | null
  uniao_id: string | null
}

type IgrejaTab = 'overview' | 'membros' | 'missionarios' | 'classe_biblica' | 'alcance'
type ListFilter = 'todos' | 'completos' | 'parciais' | 'membros' | 'interessados'

// Linha enriquecida com campos extras que vêm de cadastro_respostas via select('*')
// mas não estão no tipo público CensoRow.
interface CensoRowFull extends CensoRow {
  draft_token?: string | null
  whatsapp_parente?: string | null
}

function isInteressado(r: CensoRow): boolean {
  return (r.tempo_membro || '').toLowerCase() === 'interessado'
}

function digitsOnly(s: string | null | undefined): string {
  return (s || '').replace(/\D/g, '')
}

function buildResumeUrl(r: CensoRowFull): string | null {
  if (!r.draft_token) return null
  return `${window.location.origin}/formulario?resume=${r.id}&token=${r.draft_token}`
}

export default function IgrejaPerfilPage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const [igreja, setIgreja] = useState<IgrejaInfo | null>(null)
  const [rows, setRows] = useState<CensoRow[]>([])
  const [unionRows, setUnionRows] = useState<CensoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<IgrejaTab>('overview')
  const [showList, setShowList] = useState<ListFilter | null>(null)

  const canDelete = profile?.papel === 'admin'
    || profile?.papel === 'admin_uniao'
    || profile?.papel === 'admin_associacao'

  async function handleDeleteResposta(r: CensoRowFull): Promise<boolean> {
    const nome = (r.nome || 'esta resposta').trim()
    if (!window.confirm(`Excluir DEFINITIVAMENTE a resposta de "${nome}"?\n\nEsta ação não pode ser desfeita.`)) return false
    try {
      const { error } = await supabase.rpc('admin_delete_cadastro_resposta', { p_id: r.id })
      if (error) throw error
      setRows(prev => prev.filter(x => x.id !== r.id))
      return true
    } catch (e: any) {
      alert('Erro ao excluir: ' + (e?.message || 'falha desconhecida'))
      console.error('[cadastro_excluir_resposta]', e)
      return false
    }
  }

  // Dados lazy por aba
  const [pessoas, setPessoas] = useState<any[]>([])
  const [pessoasLoading, setPessoasLoading] = useState(false)
  const [missionarios, setMissionarios] = useState<any[]>([])
  const [missionariosLoading, setMissionariosLoading] = useState(false)
  const [classesBiblicas, setClassesBiblicas] = useState<any[]>([])
  const [cbLoading, setCbLoading] = useState(false)
  const [populacao, setPopulacao] = useState<number | null>(null)
  const [popLoading, setPopLoading] = useState(false)

  useEffect(() => {
    if (id) load()
  }, [id])

  useEffect(() => {
    if (!id || !igreja) return
    if (tab === 'membros' && pessoas.length === 0 && !pessoasLoading) loadPessoas()
    if (tab === 'missionarios' && missionarios.length === 0 && !missionariosLoading) loadMissionarios()
    if (tab === 'classe_biblica' && classesBiblicas.length === 0 && !cbLoading) loadClassesBiblicas()
    if (tab === 'alcance' && populacao === null && !popLoading && igreja.endereco_cidade && igreja.endereco_estado) loadPopulacao()
  }, [tab, igreja])  // eslint-disable-line react-hooks/exhaustive-deps

  async function loadPessoas() {
    setPessoasLoading(true)
    const { data } = await supabase
      .from('pessoas')
      .select('id, nome, foto, data_nascimento, sexo, telefone, celular, email, tipo, situacao, cargo, fonte')
      .eq('igreja_id', id!)
      .order('nome')
    setPessoas(data || [])
    setPessoasLoading(false)
  }

  async function loadMissionarios() {
    setMissionariosLoading(true)
    const { data } = await supabase
      .from('usuarios')
      .select('id, nome, email, telefone, papel, ativo')
      .eq('igreja_id', id!)
      .in('papel', ['missionario', 'pastor', 'lider'])
      .order('nome')
    setMissionarios(data || [])
    setMissionariosLoading(false)
  }

  async function loadClassesBiblicas() {
    setCbLoading(true)
    const { data } = await supabase
      .from('classes_biblicas')
      .select('id, nome, data_inicio, status, instrutor_nome, modulo_titulo, total_licoes')
      .eq('igreja_id', id!)
      .order('data_inicio', { ascending: false })
    setClassesBiblicas(data || [])
    setCbLoading(false)
  }

  async function loadPopulacao() {
    if (!igreja?.endereco_cidade || !igreja?.endereco_estado) return
    setPopLoading(true)
    try {
      const m = await populacaoPorCidadeUF([{ cidade: igreja.endereco_cidade, uf: igreja.endereco_estado }])
      const key = `${normCidade(igreja.endereco_cidade)}__${igreja.endereco_estado.toUpperCase()}`
      setPopulacao(m.get(key) ?? null)
    } catch {
      setPopulacao(null)
    } finally {
      setPopLoading(false)
    }
  }

  async function load() {
    setLoading(true)
    try {
      const { data: ig } = await supabase
        .from('igrejas')
        .select('id, nome, endereco_cidade, endereco_estado, membros_ativos, uniao_id, associacao:associacoes(id, nome, sigla)')
        .eq('id', id!)
        .maybeSingle()
      if (ig) setIgreja(ig as any)

      // Respostas da igreja
      const { data: r1 } = await supabase
        .from('cadastro_respostas')
        .select('*')
        .eq('igreja_id', id!)
      setRows((r1 || []) as CensoRow[])

      // Respostas da União inteira para benchmark
      if ((ig as any)?.uniao_id) {
        const { data: r2 } = await supabase
          .from('cadastro_respostas')
          .select('*')
          .eq('uniao_id', (ig as any).uniao_id)
        setUnionRows((r2 || []) as CensoRow[])
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Carregando perfil da igreja...</div>
  }
  if (!igreja) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Igreja não encontrada</p>
        <Link to="/cadastro/dashboard" className="text-primary-600 hover:underline mt-2 inline-block">Voltar</Link>
      </div>
    )
  }

  const total = rows.length
  const completos = rows.filter(r => r.completo).length
  const parciais = total - completos
  const interessados = rows.filter(isInteressado).length
  const membros = rows.filter(r => r.tempo_membro && !isInteressado(r)).length
  const semClassificacao = total - membros - interessados
  const cobertura = igreja.membros_ativos && igreja.membros_ativos > 0
    ? Math.min(100, Math.round((completos / igreja.membros_ativos) * 100))
    : 0
  const taxaConclusao = total > 0 ? Math.round((completos / total) * 100) : 0

  const indices = computeIndices(rows)
  const areaScores = computeAreaScores(rows)
  const freqScores = computeFrequenciaScores(rows)
  const fortes = topPontos(rows, 'pontos_fortes', 8)
  const fracos = topPontos(rows, 'pontos_fracos', 8)
  const prioridades = topPrioridades(rows, 8)
  const demo = computeDemographics(rows)

  // Benchmark: média da União para comparação
  const indicesUniao = computeIndices(unionRows)
  const deltaIndice = indices.geral - indicesUniao.geral

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Link to="/cadastro/dashboard" className="hover:text-primary-600 inline-flex items-center gap-1">
          <HiOutlineArrowLeft className="w-3.5 h-3.5" /> Censo
        </Link>
        {igreja.associacao && (
          <>
            <span>/</span>
            <Link to={`/cadastro/associacao/${igreja.associacao.id}`} className="hover:text-primary-600">
              {igreja.associacao.sigla}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-gray-700 font-medium">{igreja.nome}</span>
      </div>

      {/* Hero header */}
      <div className="bg-gradient-to-br from-primary-700 to-primary-900 rounded-2xl text-white p-6 sm:p-8 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-primary-200">Perfil da Igreja · Operacional</p>
            <h1 className="text-2xl sm:text-3xl font-bold mt-1">{igreja.nome}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-primary-100">
              {igreja.associacao && (
                <span className="bg-white/15 px-2 py-0.5 rounded text-xs font-semibold">{igreja.associacao.sigla}</span>
              )}
              {igreja.endereco_cidade && <span>{igreja.endereco_cidade}{igreja.endereco_estado ? '/' + igreja.endereco_estado : ''}</span>}
              <span>·</span>
              <span>{igreja.membros_ativos || 0} membros (Inventário)</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <ScoreBig label="Índice Geral" value={indices.geral} suffix="" color="text-white" delta={deltaIndice} deltaLabel="vs União" />
            <ScoreBig label="Cobertura" value={cobertura} suffix="%" color="text-white" />
            <ScoreBig label="Conclusão" value={taxaConclusao} suffix="%" color="text-white" />
          </div>
        </div>
      </div>

      {/* Indicadores compostos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <CompostoCard icon={HiOutlineSparkles} label="Vida Espiritual" value={indices.vidaEspiritual} bench={indicesUniao.vidaEspiritual} />
        <CompostoCard icon={HiOutlineHeart} label="Saúde Relacional" value={indices.saudeRelacional} bench={indicesUniao.saudeRelacional} />
        <CompostoCard icon={HiOutlineUserGroup} label="Mobilização" value={indices.mobilizacao} bench={indicesUniao.mobilizacao} />
        <CompostoCard icon={HiOutlineUsers} label="Comunhão" value={indices.comunhao} bench={indicesUniao.comunhao} />
      </div>

      {/* Stats row — KPIs operacionais (clicáveis) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <ClickStatCard
          icon={HiOutlineDocumentText}
          label="Respostas"
          value={total}
          onClick={() => total > 0 && setShowList('todos')}
          hoverRing="hover:ring-gray-200"
        />
        <ClickStatCard
          icon={HiOutlineIdentification}
          label="Membros"
          value={membros}
          color="text-indigo-600"
          onClick={() => membros > 0 && setShowList('membros')}
          hoverRing="hover:ring-indigo-200"
          hint="Respondentes que se declararam membros (tempo de membro > interessado)"
        />
        <ClickStatCard
          icon={HiOutlineUserGroup}
          label="Interessados"
          value={interessados}
          color="text-fuchsia-600"
          onClick={() => interessados > 0 && setShowList('interessados')}
          hoverRing="hover:ring-fuchsia-200"
          hint="Respondentes que marcaram 'Sou interessado/visitante'"
        />
        <ClickStatCard
          icon={HiOutlineSparkles}
          label="Completos"
          value={completos}
          color="text-green-600"
          onClick={() => completos > 0 && setShowList('completos')}
          hoverRing="hover:ring-green-200"
        />
        <ClickStatCard
          icon={HiOutlineExclamationCircle}
          label="Parciais"
          value={parciais}
          color="text-amber-600"
          onClick={() => parciais > 0 && setShowList('parciais')}
          hoverRing="hover:ring-amber-200"
        />
        <StatCard
          icon={HiOutlineUsers}
          label="Membros (Inv.)"
          value={igreja.membros_ativos || 0}
          color="text-teal-600"
        />
      </div>
      {semClassificacao > 0 && total > 0 && (
        <p className="text-[11px] text-gray-400 -mt-2">
          {semClassificacao} respondente{semClassificacao !== 1 ? 's' : ''} ainda não classificado{semClassificacao !== 1 ? 's' : ''} (parou antes da etapa de tempo de membro).
        </p>
      )}

      {/* Lista permanente — facilita visão dos missionários da igreja */}
      <RespondentesIgrejaTable
        rows={rows as CensoRowFull[]}
        igrejaNome={igreja.nome}
        onOpenList={setShowList}
        canDelete={canDelete}
        onDelete={handleDeleteResposta}
      />

      {/* Modal de lista */}
      {showList && (
        <IgrejaListModal
          rows={rows as CensoRowFull[]}
          filter={showList}
          igrejaNome={igreja.nome}
          onClose={() => setShowList(null)}
          canDelete={canDelete}
          onDelete={handleDeleteResposta}
        />
      )}

      {/* Notas por área (operacional core) */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800">Notas por área (1=mín · 4=máx)</h2>
          <p className="text-xs text-gray-400">Verde ≥ 3,2 · Amarelo ≥ 2,4 · Vermelho &lt; 2,4</p>
        </div>
        {areaScores.filter(a => a.respondentes > 0).length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">Sem respostas com avaliação de áreas ainda.</p>
        ) : (
          <div className="space-y-2.5">
            {areaScores.filter(a => a.respondentes > 0).sort((a, b) => b.media - a.media).map(s => {
              const cor = classColors(s.classificacao)
              return (
                <div key={s.area}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-700 font-medium">{s.area}</span>
                    <span className={`font-medium tabular-nums ${cor.text}`}>
                      {s.media.toFixed(2)}/4 <span className="text-gray-400 font-normal">· {s.respondentes} resp.</span>
                    </span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${s.pct}%`, backgroundColor: cor.solid }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Radar AP da igreja vs União */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <h3 className="text-base font-semibold text-gray-800 mb-3">Radar de áreas — igreja vs União</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={areaScores.filter(a => a.respondentes > 0).map(s => ({
                area: s.area.length > 14 ? s.area.slice(0, 12) + '…' : s.area,
                igreja: s.pct,
                uniao: computeAreaScores(unionRows).find(u => u.area === s.area)?.pct || 0,
              }))}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="area" tick={{ fontSize: 10, fill: '#6b7280' }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#9ca3af' }} />
                <Radar name="Igreja" dataKey="igreja" stroke="#006D43" fill="#006D43" fillOpacity={0.35} />
                <Radar name="União" dataKey="uniao" stroke="#9ca3af" fill="#9ca3af" fillOpacity={0.15} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="text-base font-semibold text-gray-800 mb-3">Frequência mensal por atividade</h3>
          {freqScores.filter(f => f.respondentes > 0).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">Sem dados.</p>
          ) : (
            <div className="space-y-3">
              {freqScores.filter(f => f.respondentes > 0).sort((a, b) => b.media - a.media).map(f => {
                const cor = classColors(f.classificacao)
                return (
                  <div key={f.item}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-700 font-medium">{f.item}</span>
                      <span className={`tabular-nums ${cor.text}`}>{f.media.toFixed(1)}× · {f.taxaAdesao}% ativos</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(f.media / 4) * 100}%`, backgroundColor: cor.solid }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* SWOT visual: forças, fraquezas, prioridades */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <SwotPanel
          title="Pontos fortes"
          icon={HiOutlineSparkles}
          items={fortes}
          color="green"
          empty="Sem citações ainda."
        />
        <SwotPanel
          title="Pontos fracos"
          icon={HiOutlineExclamationCircle}
          items={fracos}
          color="red"
          empty="Sem citações ainda."
        />
        <PriorityPanel prioridades={prioridades} />
      </div>

      {/* Perfil dos respondentes */}
      <div className="card">
        <h3 className="text-base font-semibold text-gray-800 mb-4">Perfil dos respondentes</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          <DemoBlock title="Sexo" data={demo.sexo} />
          <DemoBlock title="Faixa etária" data={demo.faixaEtaria} order={['< 18','18-25','26-35','36-45','46-55','56-65','65+']} />
          <DemoBlock title="Tempo de membro" data={demo.tempoMembro} labelMap={{
            menos1: 'Menos de 1 ano', '1a5': '1 a 5 anos', '6a10': '6 a 10 anos',
            '11a20': '11 a 20 anos', '21a30': '21 a 30 anos', mais30: 'Mais de 30 anos',
          }} />
          <DemoBlock title="Como conheceu" data={demo.comoConheceu} labelMap={{
            amigo_parente: 'Amigo/parente', conjuge_membro: 'Cônjuge', veio_pais: 'Pais',
            nasci_igreja: 'Nasceu na igreja', visita_membro: 'Visita',
            campanha: 'Campanha', colportagem: 'Colportagem', internet: 'Internet',
            sem_convite: 'Sem convite', outro: 'Outro',
          }} />
        </div>
      </div>

      {/* Plano de ação sugerido (placeholder) */}
      <div className="card bg-gradient-to-br from-primary-50 to-white">
        <h3 className="text-base font-semibold text-gray-800 mb-2">Plano de ação sugerido (próximos 30/60/90 dias)</h3>
        <p className="text-xs text-gray-500 mb-4">Sugestões automáticas baseadas em áreas críticas e prioridades demandadas.</p>
        <PlanoDeAcao areaScores={areaScores} prioridades={prioridades} />
      </div>
    </div>
  )
}

// ====== sub-components ======
function ScoreBig({ label, value, suffix, color, delta, deltaLabel }: {
  label: string; value: number; suffix: string; color: string; delta?: number; deltaLabel?: string
}) {
  return (
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-wider text-primary-200">{label}</p>
      <p className={`text-3xl font-bold ${color} tabular-nums`}>{value}{suffix}</p>
      {typeof delta === 'number' && (
        <p className={`text-[10px] ${delta > 0 ? 'text-emerald-300' : delta < 0 ? 'text-red-300' : 'text-primary-200'}`}>
          {delta > 0 ? '+' : ''}{delta} {deltaLabel}
        </p>
      )}
    </div>
  )
}

function CompostoCard({ icon: Icon, label, value, bench }: { icon: any; label: string; value: number; bench: number }) {
  const delta = value - bench
  const c = classifyScore(value / 25, 'satisfacao') // 0..100 → 0..4
  const cor = classColors(c)
  return (
    <div className="card flex items-start gap-3">
      <div className={`p-2 rounded-lg ${cor.bg}`}>
        <Icon className={`w-5 h-5 ${cor.text}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`text-2xl font-bold tabular-nums ${cor.text}`}>{value}<span className="text-sm font-normal text-gray-400">/100</span></p>
        <p className={`text-[10px] ${delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-600' : 'text-gray-400'}`}>
          {delta > 0 ? '+' : ''}{delta} vs União
        </p>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color = 'text-gray-800' }: { icon: any; label: string; value: number; color?: string }) {
  return (
    <div className="card flex items-center gap-3">
      <Icon className="w-5 h-5 text-gray-400" />
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`text-xl font-bold ${color} tabular-nums`}>{value.toLocaleString('pt-BR')}</p>
      </div>
    </div>
  )
}

function ClickStatCard({ icon: Icon, label, value, color = 'text-gray-800', onClick, hoverRing, hint }: {
  icon: any
  label: string
  value: number
  color?: string
  onClick: () => void
  hoverRing: string
  hint?: string
}) {
  const disabled = value === 0
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={hint || `Clique para ver a lista (${value})`}
      className={`card flex items-center gap-3 text-left transition-all ${
        disabled ? 'opacity-60 cursor-default' : `cursor-pointer hover:ring-2 ${hoverRing}`
      }`}
    >
      <Icon className={`w-5 h-5 ${disabled ? 'text-gray-300' : 'text-gray-400'}`} />
      <div className="min-w-0">
        <p className="text-xs text-gray-500 truncate">{label}</p>
        <p className={`text-xl font-bold ${color} tabular-nums`}>{value.toLocaleString('pt-BR')}</p>
      </div>
    </button>
  )
}

// ===== Lista permanente: respondentes da igreja (visão missionário) =====
function RespondentesIgrejaTable({ rows, igrejaNome, onOpenList, canDelete, onDelete }: {
  rows: CensoRowFull[]
  igrejaNome: string
  onOpenList: (f: ListFilter) => void
  canDelete?: boolean
  onDelete?: (r: CensoRowFull) => Promise<boolean> | void
}) {
  const [q, setQ] = useState('')
  const [aba, setAba] = useState<'todos' | 'membros' | 'interessados'>('todos')

  const filtered = rows
    .filter(r => {
      if (aba === 'membros') return r.tempo_membro && !isInteressado(r)
      if (aba === 'interessados') return isInteressado(r)
      return true
    })
    .filter(r => {
      const t = q.trim().toLowerCase()
      if (!t) return true
      return (
        (r.nome || '').toLowerCase().includes(t) ||
        (r.email || '').toLowerCase().includes(t) ||
        (r.telefone || '').includes(t)
      )
    })
    .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'))

  const total = rows.length
  const totalMembros = rows.filter(r => r.tempo_membro && !isInteressado(r)).length
  const totalInteressados = rows.filter(isInteressado).length

  if (total === 0) return null

  return (
    <div className="card">
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="flex items-center gap-2">
          <HiOutlineUsers className="w-5 h-5 text-primary-700" />
          <h2 className="text-base font-semibold text-gray-800">Respondentes desta igreja</h2>
        </div>
        <span className="text-xs text-gray-400">{igrejaNome}</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenList('todos')}
            className="text-xs text-primary-600 hover:text-primary-800 hover:underline"
            title="Abrir lista expandida com ações (link de retomada, WhatsApp, e-mail)"
          >
            Abrir em modal ↗
          </button>
        </div>
      </div>

      {/* Tabs Membros / Interessados / Todos */}
      <div className="flex items-center gap-1 mb-3 border-b border-gray-100">
        {([
          ['todos', 'Todos', total, 'text-gray-700'],
          ['membros', 'Membros', totalMembros, 'text-indigo-700'],
          ['interessados', 'Interessados', totalInteressados, 'text-fuchsia-700'],
        ] as const).map(([k, lbl, n, c]) => (
          <button
            key={k}
            type="button"
            onClick={() => setAba(k)}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
              aba === k ? `${c} border-current` : 'text-gray-400 border-transparent hover:text-gray-600'
            }`}
          >
            {lbl} <span className="ml-1 text-[10px] tabular-nums opacity-70">({n})</span>
          </button>
        ))}
      </div>

      {/* Busca */}
      <div className="relative mb-2">
        <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          className="input-field pl-9 text-sm"
          placeholder="Buscar por nome, email ou telefone..."
        />
      </div>

      <div className="overflow-x-auto -mx-2 sm:mx-0">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Nenhum respondente nesta seleção.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 text-[10px] uppercase tracking-wider border-b border-gray-100">
                <th className="px-2 py-2">Nome</th>
                <th className="px-2 py-2">Vínculo</th>
                <th className="px-2 py-2">Contato</th>
                <th className="px-2 py-2 text-center">Status</th>
                {canDelete && <th className="px-2 py-2 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.slice(0, 30).map(r => {
                const isInt = isInteressado(r)
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-2 py-2 font-medium text-gray-800 text-xs">
                      {r.nome || <span className="text-gray-400 italic">Sem nome</span>}
                    </td>
                    <td className="px-2 py-2 text-xs">
                      {isInt ? (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-fuchsia-50 text-fuchsia-700">
                          Interessado
                        </span>
                      ) : r.tempo_membro ? (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                          Membro
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400 italic">—</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-xs">
                      {r.telefone && <span className="block text-gray-700">{r.telefone}</span>}
                      {r.email && <span className="block text-gray-500">{r.email}</span>}
                      {!r.telefone && !r.email && <span className="text-gray-400 italic">—</span>}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {r.completo ? (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Completo</span>
                      ) : r.etapa_atual === 11 ? (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Parou final</span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">E{r.etapa_atual}/11</span>
                      )}
                    </td>
                    {canDelete && (
                      <td className="px-2 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => onDelete?.(r)}
                          title="Excluir resposta (definitivo)"
                          className="text-[10px] font-medium px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100"
                        >
                          Excluir
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {filtered.length > 30 && (
          <p className="text-[11px] text-gray-400 mt-2 text-center">
            Exibindo 30 de {filtered.length} resultados. Use o modal para a lista completa com ações.
          </p>
        )}
      </div>
    </div>
  )
}

// ===== Modal expandido com ações por respondente =====
const LIST_LABELS: Record<ListFilter, string> = {
  todos: 'Todas as respostas',
  completos: 'Respostas completas',
  parciais: 'Respostas parciais',
  membros: 'Membros respondentes',
  interessados: 'Interessados / Visitantes',
}

function IgrejaListModal({ rows, filter, igrejaNome, onClose, canDelete, onDelete }: {
  rows: CensoRowFull[]
  filter: ListFilter
  igrejaNome: string
  onClose: () => void
  canDelete?: boolean
  onDelete?: (r: CensoRowFull) => Promise<boolean> | void
}) {
  const [busca, setBusca] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  function applyFilter(r: CensoRowFull): boolean {
    if (filter === 'completos') return r.completo
    if (filter === 'parciais') return !r.completo
    if (filter === 'membros') return Boolean(r.tempo_membro) && !isInteressado(r)
    if (filter === 'interessados') return isInteressado(r)
    return true
  }

  const respostas = rows.filter(applyFilter)
  const filtradas = busca.trim()
    ? respostas.filter(r => {
        const t = busca.toLowerCase()
        return (
          (r.nome || '').toLowerCase().includes(t) ||
          (r.email || '').toLowerCase().includes(t) ||
          (r.telefone || '').includes(t) ||
          (r.cidade || '').toLowerCase().includes(t)
        )
      })
    : respostas

  function copyResume(r: CensoRowFull) {
    const url = buildResumeUrl(r)
    if (!url) return
    navigator.clipboard.writeText(url)
    setCopiedId(r.id)
    setTimeout(() => setCopiedId(null), 1800)
  }

  function whatsappLink(r: CensoRowFull): string | null {
    const url = buildResumeUrl(r)
    if (!url) return null
    const phone = digitsOnly(r.telefone) || digitsOnly(r.whatsapp_parente)
    if (!phone) return null
    const phoneE164 = phone.startsWith('55') ? phone : `55${phone}`
    const nome = (r.nome || 'irmão(a)').split(' ')[0]
    const msg = `Olá ${nome}! Aqui é da Igreja ${igrejaNome}. Você começou o cadastro do Censo mas não concluiu. Pode finalizar de onde parou neste link (suas respostas estão salvas):\n\n${url}\n\nLeva poucos minutos. Obrigado por participar!`
    return `https://wa.me/${phoneE164}?text=${encodeURIComponent(msg)}`
  }

  function mailtoLink(r: CensoRowFull): string | null {
    const url = buildResumeUrl(r)
    if (!url || !r.email) return null
    const nome = (r.nome || 'irmão(a)').split(' ')[0]
    const subject = `Finalize seu cadastro do Censo — etapa ${r.etapa_atual} de 11`
    const body = `Olá ${nome},\n\nVocê começou o cadastro do Censo mas não concluiu. Suas respostas até a etapa ${r.etapa_atual} estão salvas — basta abrir o link abaixo para continuar de onde parou:\n\n${url}\n\nLeva poucos minutos. Obrigado por participar!\n\n— Secretaria · Igreja ${igrejaNome}`
    return `mailto:${r.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  function handleExport() {
    if (filtradas.length === 0) return
    const headers = ['Nome', 'Vinculo', 'Telefone', 'Email', 'Cidade', 'UF', 'Status', 'Etapa', 'Tempo de Membro']
    const lines = filtradas.map(r => {
      const vinculo = isInteressado(r) ? 'Interessado' : r.tempo_membro ? 'Membro' : 'Indefinido'
      const status = r.completo ? 'Completo' : r.etapa_atual === 11 ? 'Parou final' : 'Parcial'
      return [
        r.nome || '',
        vinculo,
        r.telefone || '',
        r.email || '',
        r.cidade || '',
        r.estado || '',
        status,
        String(r.etapa_atual ?? ''),
        r.tempo_membro || '',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    })
    const csv = '﻿' + [headers.join(','), ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${igrejaNome.replace(/\s+/g, '_')}_${filter}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const isResumable = filter !== 'completos' && filter !== 'todos' && filter !== 'membros' && filter !== 'interessados'
    ? true
    : filter === 'parciais'

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 pt-10 overflow-y-auto"
      onClick={onClose}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2.5 py-1 rounded-lg">
                {igrejaNome}
              </span>
              <h2 className="text-lg font-bold text-gray-800">{LIST_LABELS[filter]}</h2>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {filtradas.length} de {respostas.length} {respostas.length === 1 ? 'resposta' : 'respostas'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {filtradas.length > 0 && (
              <button onClick={handleExport} className="btn-secondary text-xs flex items-center gap-1.5">
                <HiOutlineDownload className="w-4 h-4" />
                Exportar CSV
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-6 py-3 border-b border-gray-100">
          <div className="relative">
            <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="input-field pl-10 text-sm"
              placeholder="Filtrar por nome, email, telefone, cidade..."
            />
          </div>
        </div>

        <div className="max-h-[65vh] overflow-y-auto">
          {filtradas.length === 0 ? (
            <p className="p-8 text-sm text-gray-400 text-center">
              Nenhuma resposta {busca ? 'casa com a busca' : 'nesta categoria'}.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr className="text-left text-gray-500 text-[10px] uppercase tracking-wider">
                  <th className="px-4 py-2">Nome</th>
                  <th className="px-4 py-2">Vínculo</th>
                  <th className="px-4 py-2">Cidade / UF</th>
                  <th className="px-4 py-2">Contato</th>
                  <th className="px-4 py-2 text-center">Status</th>
                  <th className="px-4 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtradas.map(r => {
                  const isInt = isInteressado(r)
                  const wpp = isResumable ? whatsappLink(r) : null
                  const mail = isResumable ? mailtoLink(r) : null
                  const url = isResumable ? buildResumeUrl(r) : null
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 align-top">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-gray-800 text-xs">
                          {r.nome || <span className="text-gray-400 italic">Sem nome</span>}
                        </p>
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        {isInt ? (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-fuchsia-50 text-fuchsia-700">
                            Interessado
                          </span>
                        ) : r.tempo_membro ? (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                            Membro
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">
                        {[r.cidade, r.estado].filter(Boolean).join(' / ') || '—'}
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        {r.telefone && <p className="text-gray-700">{r.telefone}</p>}
                        {r.email && <p className="text-gray-500">{r.email}</p>}
                        {!r.telefone && !r.email && <span className="text-gray-400 italic">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {r.completo ? (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Completo</span>
                        ) : r.etapa_atual === 11 ? (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Parou final</span>
                        ) : (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">E{r.etapa_atual}/11</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="inline-flex items-center gap-1 flex-wrap justify-end">
                          {wpp && (
                            <a href={wpp} target="_blank" rel="noopener noreferrer"
                              className="text-[10px] font-medium px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200">
                              WhatsApp
                            </a>
                          )}
                          {mail && (
                            <a href={mail}
                              className="text-[10px] font-medium px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200">
                              E-mail
                            </a>
                          )}
                          {url && (
                            <button onClick={() => copyResume(r)}
                              className={`text-[10px] font-medium px-2 py-1 rounded ${
                                copiedId === r.id ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}>
                              {copiedId === r.id ? 'Copiado!' : 'Link'}
                            </button>
                          )}
                          {r.nome && (
                            <a href={`/membros?q=${encodeURIComponent(r.nome)}`} target="_blank" rel="noopener noreferrer"
                              className="text-[10px] font-medium px-2 py-1 rounded bg-primary-50 text-primary-700 hover:bg-primary-100">
                              Ficha
                            </a>
                          )}
                          {canDelete && onDelete && (
                            <button
                              type="button"
                              onClick={() => onDelete(r)}
                              title="Excluir resposta (definitivo)"
                              className="text-[10px] font-medium px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100"
                            >
                              Excluir
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

function SwotPanel({ title, icon: Icon, items, color, empty }: {
  title: string
  icon: any
  items: { tema: string; count: number }[]
  color: 'green' | 'red'
  empty: string
}) {
  const palette = color === 'green'
    ? { bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500', text: 'text-emerald-700' }
    : { bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500', text: 'text-red-700' }
  return (
    <div className={`card border ${palette.border}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-5 h-5 ${palette.text}`} />
        <h3 className="text-base font-semibold text-gray-800">{title}</h3>
        <span className="text-xs text-gray-400 ml-auto">{items.length} temas</span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">{empty}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((it, idx) => (
            <li key={idx} className="flex items-center gap-2 text-sm">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${palette.dot}`} />
              <span className="text-gray-700 flex-1 truncate" title={it.tema}>{it.tema}</span>
              <span className="text-xs text-gray-400 tabular-nums">{it.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function PriorityPanel({ prioridades }: { prioridades: { prioridade: string; count: number; pct: number }[] }) {
  return (
    <div className="card border border-amber-200">
      <div className="flex items-center gap-2 mb-3">
        <HiOutlineChartBar className="w-5 h-5 text-amber-700" />
        <h3 className="text-base font-semibold text-gray-800">Prioridades demandadas</h3>
        <span className="text-xs text-gray-400 ml-auto">top 8</span>
      </div>
      {prioridades.length === 0 ? (
        <p className="text-sm text-gray-400">Sem dados.</p>
      ) : (
        <div className="space-y-2">
          {prioridades.map(p => (
            <div key={p.prioridade}>
              <div className="flex items-center justify-between text-xs mb-0.5">
                <span className="text-gray-700 truncate" title={p.prioridade}>{p.prioridade}</span>
                <span className="text-amber-700 tabular-nums">{p.pct}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${p.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DemoBlock({ title, data, order, labelMap }: {
  title: string
  data: Record<string, number>
  order?: string[]
  labelMap?: Record<string, string>
}) {
  const entries = order
    ? order.filter(k => data[k]).map(k => [k, data[k]] as [string, number])
    : Object.entries(data).sort((a, b) => b[1] - a[1])
  const total = entries.reduce((a, b) => a + b[1], 0)
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{title}</p>
      {entries.length === 0 ? (
        <p className="text-xs text-gray-400">Sem dados</p>
      ) : (
        <ul className="space-y-1">
          {entries.slice(0, 6).map(([k, v]) => {
            const label = labelMap?.[k] || k.replace(/_/g, ' ')
            const pct = total > 0 ? Math.round((v / total) * 100) : 0
            return (
              <li key={k} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-gray-600 capitalize truncate">{label}</span>
                <span className="text-gray-700 tabular-nums shrink-0">{v} <span className="text-gray-400">({pct}%)</span></span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function PlanoDeAcao({ areaScores, prioridades }: {
  areaScores: ReturnType<typeof computeAreaScores>
  prioridades: { prioridade: string; pct: number }[]
}) {
  const criticas = areaScores.filter(a => a.classificacao === 'critico' && a.respondentes > 0).slice(0, 3)
  const atencao = areaScores.filter(a => a.classificacao === 'atencao' && a.respondentes > 0).slice(0, 3)
  const topPrios = prioridades.slice(0, 3)

  if (criticas.length === 0 && atencao.length === 0 && topPrios.length === 0) {
    return <p className="text-sm text-gray-400">Sem dados suficientes para sugestões.</p>
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <PlanoBucket
        prazo="30 dias"
        tom="Crítico — agir já"
        items={criticas.map(c => `Reforçar ${c.area} (nota ${c.media.toFixed(1)}/4)`)}
        cor="red"
      />
      <PlanoBucket
        prazo="60 dias"
        tom="Atenção"
        items={atencao.map(c => `Plano de melhoria em ${c.area} (nota ${c.media.toFixed(1)}/4)`)}
        cor="amber"
      />
      <PlanoBucket
        prazo="90 dias"
        tom="Investir nas demandas"
        items={topPrios.map(p => `Programa de ${p.prioridade} (${p.pct}% dos membros pedem)`)}
        cor="primary"
      />
    </div>
  )
}

function PlanoBucket({ prazo, tom, items, cor }: { prazo: string; tom: string; items: string[]; cor: 'red' | 'amber' | 'primary' }) {
  const palette = cor === 'red'
    ? 'border-red-300 bg-red-50/60'
    : cor === 'amber'
    ? 'border-amber-300 bg-amber-50/60'
    : 'border-primary-300 bg-primary-50/60'
  const txt = cor === 'red' ? 'text-red-700' : cor === 'amber' ? 'text-amber-700' : 'text-primary-700'
  return (
    <div className={`rounded-xl border p-4 ${palette}`}>
      <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${txt}`}>{prazo}</div>
      <p className="text-xs text-gray-500 mb-2">{tom}</p>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400 italic">Nenhuma ação sugerida nesta janela.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((it, i) => (
            <li key={i} className="text-sm text-gray-700 flex gap-2">
              <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${cor === 'red' ? 'bg-red-500' : cor === 'amber' ? 'bg-amber-500' : 'bg-primary-500'}`} />
              <span>{it}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
