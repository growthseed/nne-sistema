import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
  HiOutlineArrowLeft, HiOutlineHeart, HiOutlineSparkles, HiOutlineUsers,
  HiOutlineChartBar, HiOutlineExclamationCircle, HiOutlineUserGroup,
} from 'react-icons/hi'
import {
  type CensoRow, computeIndices, computeAreaScores, topPontos, topPrioridades,
  classColors, classifyScore, aggregateByScope, importanciaXDesempenho,
  SATISFACAO_ITENS,
} from '@/lib/censo-metrics'

interface AssocInfo {
  id: string
  nome: string
  sigla: string
  uniao_id: string | null
}
interface IgrejaSimple {
  id: string
  nome: string
  endereco_cidade: string | null
  associacao_id: string | null
  membros_ativos: number | null
}

export default function AssociacaoPerfilPage() {
  const { id } = useParams<{ id: string }>()
  const [assoc, setAssoc] = useState<AssocInfo | null>(null)
  const [rows, setRows] = useState<CensoRow[]>([])
  const [unionRows, setUnionRows] = useState<CensoRow[]>([])
  const [igrejas, setIgrejas] = useState<IgrejaSimple[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) load()
  }, [id])

  async function load() {
    setLoading(true)
    try {
      const { data: a } = await supabase.from('associacoes')
        .select('id, nome, sigla, uniao_id')
        .eq('id', id!).maybeSingle()
      if (a) setAssoc(a as any)

      const { data: r1 } = await supabase.from('cadastro_respostas').select('*').eq('associacao_id', id!)
      setRows((r1 || []) as CensoRow[])

      if ((a as any)?.uniao_id) {
        const { data: r2 } = await supabase.from('cadastro_respostas').select('*').eq('uniao_id', (a as any).uniao_id)
        setUnionRows((r2 || []) as CensoRow[])
      }

      const { data: igs } = await supabase.from('igrejas')
        .select('id, nome, endereco_cidade, associacao_id, membros_ativos')
        .eq('associacao_id', id!).eq('ativo', true)
      setIgrejas((igs || []) as IgrejaSimple[])
    } finally {
      setLoading(false)
    }
  }

  const igrejaMeta = useMemo(() => {
    const m = new Map<string, { nome: string; membros: number; cidade: string | null }>()
    igrejas.forEach(ig => m.set(ig.id, { nome: ig.nome, membros: ig.membros_ativos || 0, cidade: ig.endereco_cidade }))
    return m
  }, [igrejas])

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Carregando perfil da associação...</div>
  if (!assoc) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Associação não encontrada</p>
        <Link to="/cadastro/dashboard" className="text-primary-600 hover:underline mt-2 inline-block">Voltar</Link>
      </div>
    )
  }

  const total = rows.length
  const completos = rows.filter(r => r.completo).length
  const totalMembros = igrejas.reduce((s, ig) => s + (ig.membros_ativos || 0), 0)
  const cobertura = totalMembros > 0 ? Math.min(100, Math.round((completos / totalMembros) * 100)) : 0

  const indices = computeIndices(rows)
  const indicesUniao = computeIndices(unionRows)
  const areaScores = computeAreaScores(rows)
  const fortes = topPontos(rows, 'pontos_fortes', 10)
  const fracos = topPontos(rows, 'pontos_fracos', 10)
  const prioridades = topPrioridades(rows, 8)
  const matriz = importanciaXDesempenho(rows)

  // Ranking de igrejas dentro da associação
  const ranking = aggregateByScope(rows, 'igreja_id', new Map(igrejas.map(ig => [ig.id, { nome: ig.nome, membros: ig.membros_ativos || 0 }])))

  // Boxplot data: dispersão das notas médias gerais por igreja
  const igrejaIndices = ranking.map(r => r.indiceGeral).filter(v => v > 0)
  const minIdx = igrejaIndices.length > 0 ? Math.min(...igrejaIndices) : 0
  const maxIdx = igrejaIndices.length > 0 ? Math.max(...igrejaIndices) : 0
  const sortedIdx = [...igrejaIndices].sort((a, b) => a - b)
  const medianIdx = sortedIdx.length > 0 ? sortedIdx[Math.floor(sortedIdx.length / 2)] : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Link to="/cadastro/dashboard" className="hover:text-primary-600 inline-flex items-center gap-1">
          <HiOutlineArrowLeft className="w-3.5 h-3.5" /> Censo
        </Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">{assoc.sigla} — {assoc.nome}</span>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-700 to-indigo-900 rounded-2xl text-white p-6 sm:p-8 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-indigo-200">Painel da Associação · Tático</p>
            <h1 className="text-2xl sm:text-3xl font-bold mt-1">{assoc.nome}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-indigo-100">
              <span className="bg-white/15 px-2 py-0.5 rounded text-xs font-semibold">{assoc.sigla}</span>
              <span>{igrejas.length} igrejas</span>
              <span>·</span>
              <span>{totalMembros.toLocaleString('pt-BR')} membros</span>
              <span>·</span>
              <span>{total} respostas ({completos} completas)</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <BigStat label="Índice Geral" value={indices.geral} delta={indices.geral - indicesUniao.geral} />
            <BigStat label="Cobertura" value={cobertura} suffix="%" />
            <BigStat label="Saúde Relacional" value={indices.saudeRelacional} delta={indices.saudeRelacional - indicesUniao.saudeRelacional} />
          </div>
        </div>
      </div>

      {/* Indicadores compostos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <CompCard icon={HiOutlineSparkles} label="Vida Espiritual" value={indices.vidaEspiritual} bench={indicesUniao.vidaEspiritual} />
        <CompCard icon={HiOutlineUserGroup} label="Mobilização" value={indices.mobilizacao} bench={indicesUniao.mobilizacao} />
        <CompCard icon={HiOutlineHeart} label="Comunhão" value={indices.comunhao} bench={indicesUniao.comunhao} />
        <CompCard icon={HiOutlineUsers} label="Públicos" value={indices.publicos} bench={indicesUniao.publicos} />
      </div>

      {/* Ranking de igrejas + boxplot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-800">Ranking de igrejas (índice geral)</h3>
            <span className="text-xs text-gray-400">{ranking.length} igrejas com respostas</span>
          </div>
          {ranking.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">Sem respostas com igreja identificada ainda.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-gray-400">
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 font-medium">Igreja</th>
                  <th className="text-right py-2 font-medium">Resp.</th>
                  <th className="text-right py-2 font-medium">Compl.</th>
                  <th className="text-right py-2 font-medium">Cob.</th>
                  <th className="text-left py-2 px-2 font-medium">Índice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {ranking.map(r => {
                  const c = classifyScore(r.indiceGeral / 25)
                  const cor = classColors(c)
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="py-2">
                        <Link to={`/cadastro/igreja/${r.id}`} className="text-primary-700 hover:underline font-medium">
                          {r.nome}
                        </Link>
                      </td>
                      <td className="py-2 text-right tabular-nums text-gray-600">{r.total}</td>
                      <td className="py-2 text-right tabular-nums text-green-700">{r.completos}</td>
                      <td className="py-2 text-right tabular-nums">
                        <span className={r.cobertura >= 75 ? 'text-green-600' : r.cobertura >= 40 ? 'text-amber-600' : 'text-red-600'}>
                          {r.cobertura}%
                        </span>
                      </td>
                      <td className="py-2 px-2 min-w-[160px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${r.indiceGeral}%`, backgroundColor: cor.solid }} />
                          </div>
                          <span className={`text-xs font-medium tabular-nums ${cor.text} w-8 text-right`}>{r.indiceGeral}</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <h3 className="text-base font-semibold text-gray-800 mb-3">Dispersão entre igrejas</h3>
          {igrejaIndices.length < 2 ? (
            <p className="text-sm text-gray-400 text-center py-12">Necessárias ≥ 2 igrejas com respostas.</p>
          ) : (
            <div>
              <div className="relative h-12 mb-4">
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-gray-200 rounded-full" />
                <div className="absolute top-1/2 -translate-y-1/2 h-2 rounded-full bg-indigo-200"
                  style={{ left: `${minIdx}%`, width: `${maxIdx - minIdx}%` }} />
                <div className="absolute top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-700 rounded-full"
                  style={{ left: `${medianIdx}%` }} />
                {igrejaIndices.map((v, i) => (
                  <div key={i} className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-indigo-500/70 ring-2 ring-white"
                    style={{ left: `calc(${v}% - 5px)` }} />
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <Stat label="Mínimo" value={minIdx} />
                <Stat label="Mediana" value={medianIdx} />
                <Stat label="Máximo" value={maxIdx} />
              </div>
              <p className="text-[11px] text-gray-400 mt-3">
                {maxIdx - minIdx >= 30
                  ? 'Alta dispersão — problema concentrado em algumas igrejas.'
                  : 'Dispersão baixa — situação relativamente homogênea.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Heatmap igrejas × áreas */}
      <div className="card overflow-x-auto">
        <h3 className="text-base font-semibold text-gray-800 mb-3">Heatmap igrejas × áreas</h3>
        <p className="text-xs text-gray-400 mb-3">Verde = saudável (≥3,2) · Amarelo = atenção · Vermelho = crítico (&lt;2,4) · Cinza = sem respostas</p>
        <HeatmapIgrejas rows={rows} igrejas={igrejas} />
      </div>

      {/* Matriz importância × desempenho */}
      <div className="card">
        <h3 className="text-base font-semibold text-gray-800 mb-1">Matriz Importância × Desempenho</h3>
        <p className="text-xs text-gray-500 mb-4">Cruzamento entre o que os membros priorizam e a satisfação atual da área correspondente.</p>
        <MatrizQuadrante items={matriz} />
      </div>

      {/* SWOT agregado */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <SwotPanel title="Pontos fortes (top 10)" items={fortes} color="green" />
        <SwotPanel title="Dores recorrentes (top 10)" items={fracos} color="red" />
        <PriorityPanel prioridades={prioridades} />
      </div>
    </div>
  )
}

// ====== components ======
function BigStat({ label, value, suffix = '', delta }: { label: string; value: number; suffix?: string; delta?: number }) {
  return (
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-wider text-indigo-200">{label}</p>
      <p className="text-3xl font-bold text-white tabular-nums">{value}{suffix}</p>
      {typeof delta === 'number' && delta !== 0 && (
        <p className={`text-[10px] ${delta > 0 ? 'text-emerald-300' : 'text-red-300'}`}>
          {delta > 0 ? '+' : ''}{delta} vs União
        </p>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-gray-400">{label}</p>
      <p className="text-lg font-bold text-gray-800 tabular-nums">{value}</p>
    </div>
  )
}

function CompCard({ icon: Icon, label, value, bench }: { icon: any; label: string; value: number; bench: number }) {
  const delta = value - bench
  const c = classifyScore(value / 25)
  const cor = classColors(c)
  return (
    <div className="card flex items-start gap-3">
      <div className={`p-2 rounded-lg ${cor.bg}`}><Icon className={`w-5 h-5 ${cor.text}`} /></div>
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

function HeatmapIgrejas({ rows, igrejas }: { rows: CensoRow[]; igrejas: IgrejaSimple[] }) {
  // linhas: igrejas com pelo menos 1 resposta com satisfacao
  const linhas = igrejas.map(ig => {
    const list = rows.filter(r => r.igreja_id === ig.id)
    return { ig, scores: computeAreaScores(list), n: list.length }
  }).filter(l => l.n > 0)

  if (linhas.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">Sem dados.</p>
  }

  return (
    <div className="min-w-[700px]">
      <div className="grid" style={{ gridTemplateColumns: `200px repeat(${SATISFACAO_ITENS.length}, minmax(40px, 1fr)) 60px` }}>
        <div className="text-[10px] uppercase tracking-wider text-gray-400 px-2 py-1.5">Igreja</div>
        {SATISFACAO_ITENS.map(a => (
          <div key={a} className="text-[9px] text-gray-500 px-1 py-1.5 text-center" title={a}>
            {a.length > 10 ? a.slice(0, 10) + '…' : a}
          </div>
        ))}
        <div className="text-[10px] uppercase tracking-wider text-gray-400 px-1 py-1.5 text-right">N</div>

        {linhas.map(({ ig, scores, n }) => (
          <FragmentRow key={ig.id} ig={ig} scores={scores} n={n} />
        ))}
      </div>
    </div>
  )
}

function FragmentRow({ ig, scores, n }: { ig: IgrejaSimple; scores: ReturnType<typeof computeAreaScores>; n: number }) {
  const byArea = new Map(scores.map(s => [s.area, s]))
  return (
    <>
      <Link to={`/cadastro/igreja/${ig.id}`} className="px-2 py-1.5 text-xs text-primary-700 hover:underline truncate" title={ig.nome}>
        {ig.nome}
      </Link>
      {SATISFACAO_ITENS.map(a => {
        const s = byArea.get(a)
        if (!s || s.respondentes === 0) {
          return <div key={a} className="m-0.5 rounded-sm bg-gray-50 h-7" />
        }
        const cor = classColors(s.classificacao)
        return (
          <div
            key={a}
            className={`m-0.5 rounded-sm h-7 flex items-center justify-center text-[10px] font-bold tabular-nums ${cor.text}`}
            style={{ backgroundColor: cor.soft }}
            title={`${ig.nome} · ${a}: ${s.media.toFixed(2)}/4 (${s.respondentes} resp.)`}
          >
            {s.media.toFixed(1)}
          </div>
        )
      })}
      <div className="px-1 py-1.5 text-xs text-gray-500 tabular-nums text-right">{n}</div>
    </>
  )
}

function MatrizQuadrante({ items }: { items: ReturnType<typeof importanciaXDesempenho> }) {
  if (items.length === 0) return <p className="text-sm text-gray-400">Sem dados.</p>

  // Quadrantes (canvas mental):
  //   alto importância × baixo desempenho = Agir Agora (top-left)
  //   alto × alto = Manter (top-right)
  //   baixo × baixo = Baixa relevância (bottom-left)
  //   baixo × alto = Over-invest (bottom-right)
  const buckets = {
    agir_agora: items.filter(i => i.quadrante === 'agir_agora').slice(0, 6),
    manter: items.filter(i => i.quadrante === 'manter').slice(0, 6),
    over_invest: items.filter(i => i.quadrante === 'over_invest').slice(0, 6),
    baixa_relevancia: items.filter(i => i.quadrante === 'baixa_relevancia').slice(0, 6),
  }
  return (
    <div className="grid grid-cols-2 gap-3 max-w-3xl mx-auto">
      <Quadrant titulo="Agir agora" subtitulo="Alta demanda · Baixo desempenho" cor="red" items={buckets.agir_agora} />
      <Quadrant titulo="Manter" subtitulo="Alta demanda · Bom desempenho" cor="green" items={buckets.manter} />
      <Quadrant titulo="Baixa relevância" subtitulo="Baixa demanda · Baixo desempenho" cor="gray" items={buckets.baixa_relevancia} />
      <Quadrant titulo="Já investido" subtitulo="Baixa demanda · Bom desempenho" cor="blue" items={buckets.over_invest} />
    </div>
  )
}

function Quadrant({ titulo, subtitulo, cor, items }: {
  titulo: string
  subtitulo: string
  cor: 'red' | 'green' | 'gray' | 'blue'
  items: { prioridade: string; importancia: number; desempenho: number | null }[]
}) {
  const palette = {
    red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: 'bg-red-500' },
    green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', dot: 'bg-green-500' },
    gray: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600', dot: 'bg-gray-400' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' },
  }[cor]
  return (
    <div className={`rounded-xl border ${palette.border} ${palette.bg} p-4`}>
      <p className={`text-xs font-bold uppercase tracking-wider ${palette.text}`}>{titulo}</p>
      <p className="text-[10px] text-gray-500 mb-3">{subtitulo}</p>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400 italic">Nenhum tema.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map(it => (
            <li key={it.prioridade} className="flex items-start gap-2 text-xs">
              <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${palette.dot}`} />
              <span className="flex-1 text-gray-700">{it.prioridade}</span>
              <span className="text-gray-400 tabular-nums shrink-0">{it.importancia}% · {it.desempenho ?? '—'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SwotPanel({ title, items, color }: { title: string; items: { tema: string; count: number }[]; color: 'green' | 'red' }) {
  const palette = color === 'green'
    ? { border: 'border-emerald-200', dot: 'bg-emerald-500', text: 'text-emerald-700' }
    : { border: 'border-red-200', dot: 'bg-red-500', text: 'text-red-700' }
  return (
    <div className={`card border ${palette.border}`}>
      <h3 className={`text-base font-semibold mb-3 ${palette.text}`}>{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">Sem dados.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((it, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
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
      <h3 className="text-base font-semibold text-amber-700 mb-3">Prioridades demandadas</h3>
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
