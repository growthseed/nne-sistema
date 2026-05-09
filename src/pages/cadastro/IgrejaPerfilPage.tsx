import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
  Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
  Radar, RadarChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis,
} from 'recharts'
import {
  HiOutlineArrowLeft, HiOutlineUsers, HiOutlineHeart, HiOutlineSparkles, HiOutlineExclamationCircle,
  HiOutlineLocationMarker, HiOutlineUserGroup, HiOutlineDocumentText, HiOutlineChartBar,
} from 'react-icons/hi'
import {
  type CensoRow,
  computeAreaScores, computeFrequenciaScores, computeIndices,
  topPontos, topPrioridades, computeDemographics,
  classColors, classifyScore,
} from '@/lib/censo-metrics'

interface IgrejaInfo {
  id: string
  nome: string
  endereco_cidade: string | null
  endereco_estado: string | null
  membros_ativos: number | null
  associacao: { id: string; nome: string; sigla: string } | null
  uniao_id: string | null
}

export default function IgrejaPerfilPage() {
  const { id } = useParams<{ id: string }>()
  const [igreja, setIgreja] = useState<IgrejaInfo | null>(null)
  const [rows, setRows] = useState<CensoRow[]>([])
  const [unionRows, setUnionRows] = useState<CensoRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) load()
  }, [id])

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

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={HiOutlineDocumentText} label="Respostas" value={total} />
        <StatCard icon={HiOutlineSparkles} label="Completos" value={completos} color="text-green-600" />
        <StatCard icon={HiOutlineExclamationCircle} label="Parciais" value={parciais} color="text-amber-600" />
        <StatCard icon={HiOutlineUsers} label="Membros (Inv.)" value={igreja.membros_ativos || 0} color="text-teal-600" />
      </div>

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
