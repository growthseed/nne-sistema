import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { populacaoPorCidadeUF, normCidade } from '@/lib/ibge-api'
import {
  type CensoRow as MetricsCensoRow,
  classifyScore, classColors,
} from '@/lib/censo-metrics'
import {
  HiOutlineGlobeAlt, HiOutlineLocationMarker, HiOutlineUsers,
  HiOutlineUserGroup, HiOutlineRefresh, HiOutlineLightBulb,
} from 'react-icons/hi'

interface IgrejaInfo {
  id: string
  nome: string
  endereco_cidade: string | null
  endereco_estado: string | null
  associacao_id: string | null
  membros_ativos: number | null
}

interface TerritorioTabProps {
  rows: MetricsCensoRow[]
  igrejas: IgrejaInfo[]
}

interface CidadeAgregada {
  cidade: string
  uf: string
  key: string
  igrejas: number
  membrosInventario: number
  respostas: number
  completos: number
  satMedia: number | null    // 1..4
  populacao: number | null   // IBGE
  alcance: number | null     // % membros / pop
  associacoes: Set<string>
}

function classifySat(media: number | null) {
  if (media === null) return 'sem_dados' as const
  if (media >= 3.2) return 'saudavel' as const
  if (media >= 2.4) return 'atencao' as const
  return 'critico' as const
}

export default function TerritorioTab({ rows, igrejas }: TerritorioTabProps) {
  const [populacoes, setPopulacoes] = useState<Map<string, number>>(new Map())
  const [loadingPop, setLoadingPop] = useState(false)
  const [erroPop, setErroPop] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'membros' | 'respostas' | 'alcance' | 'sat'>('membros')

  // Agrega cidades a partir de igrejas + respostas do censo
  const cidades = useMemo<CidadeAgregada[]>(() => {
    const map = new Map<string, CidadeAgregada>()

    igrejas.forEach(ig => {
      if (!ig.endereco_cidade || !ig.endereco_estado) return
      const key = `${normCidade(ig.endereco_cidade)}__${ig.endereco_estado.toUpperCase()}`
      if (!map.has(key)) {
        map.set(key, {
          cidade: ig.endereco_cidade,
          uf: ig.endereco_estado.toUpperCase(),
          key,
          igrejas: 0,
          membrosInventario: 0,
          respostas: 0,
          completos: 0,
          satMedia: null,
          populacao: null,
          alcance: null,
          associacoes: new Set(),
        })
      }
      const c = map.get(key)!
      c.igrejas += 1
      c.membrosInventario += ig.membros_ativos || 0
      if (ig.associacao_id) c.associacoes.add(ig.associacao_id)
    })

    // Soma respostas do censo + satisfação por cidade
    const satByKey = new Map<string, number[]>()
    rows.forEach(r => {
      if (!r.cidade || !r.estado) return
      const key = `${normCidade(r.cidade)}__${r.estado.toUpperCase()}`
      const c = map.get(key)
      if (!c) return
      c.respostas += 1
      if (r.completo) c.completos += 1
      if (r.satisfacao) {
        const vals = Object.values(r.satisfacao).filter(v => typeof v === 'number') as number[]
        if (vals.length > 0) {
          const avg = vals.reduce((a, b) => a + b, 0) / vals.length
          if (!satByKey.has(key)) satByKey.set(key, [])
          satByKey.get(key)!.push(avg)
        }
      }
    })
    satByKey.forEach((vals, key) => {
      const c = map.get(key)
      if (c && vals.length > 0) {
        c.satMedia = +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)
      }
    })

    // Aplica populações IBGE
    map.forEach(c => {
      const pop = populacoes.get(c.key)
      if (pop !== undefined) {
        c.populacao = pop
        c.alcance = pop > 0 ? +((c.membrosInventario / pop) * 100).toFixed(3) : null
      }
    })

    return Array.from(map.values())
  }, [rows, igrejas, populacoes])

  // Carrega populações IBGE quando a lista de cidades muda
  useEffect(() => {
    if (cidades.length === 0) return
    setLoadingPop(true)
    setErroPop(null)
    populacaoPorCidadeUF(cidades.map(c => ({ cidade: c.cidade, uf: c.uf })))
      .then(p => setPopulacoes(p))
      .catch(e => setErroPop(e?.message || 'Falha ao consultar IBGE'))
      .finally(() => setLoadingPop(false))
  }, [igrejas.length])  // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    let list = cidades
    if (search.trim()) {
      const t = search.toLowerCase()
      list = list.filter(c => c.cidade.toLowerCase().includes(t) || c.uf.toLowerCase().includes(t))
    }
    return list.sort((a, b) => {
      if (sortBy === 'respostas') return b.respostas - a.respostas
      if (sortBy === 'alcance') return (b.alcance ?? -1) - (a.alcance ?? -1)
      if (sortBy === 'sat') return (b.satMedia ?? 0) - (a.satMedia ?? 0)
      return b.membrosInventario - a.membrosInventario
    })
  }, [cidades, search, sortBy])

  const totals = useMemo(() => {
    const ufs = new Set(cidades.map(c => c.uf))
    const comIbge = cidades.filter(c => c.populacao !== null)
    const totalMembros = cidades.reduce((s, c) => s + c.membrosInventario, 0)
    const totalPop = comIbge.reduce((s, c) => s + (c.populacao || 0), 0)
    const alcanceMedio = totalPop > 0 ? +((totalMembros / totalPop) * 100).toFixed(3) : null
    return {
      cidades: cidades.length,
      estados: ufs.size,
      igrejas: cidades.reduce((s, c) => s + c.igrejas, 0),
      membros: totalMembros,
      populacaoTotal: totalPop,
      alcanceMedio,
      respostas: cidades.reduce((s, c) => s + c.respostas, 0),
      cidadesComIbge: comIbge.length,
    }
  }, [cidades])

  // Oportunidades: cidades com alcance < 0.1% (1 em 1000) ou sem igreja com baixa satisfação
  const oportunidades = useMemo(() => {
    return cidades
      .filter(c => c.populacao && c.alcance !== null && c.alcance < 0.1 && c.populacao > 5000)
      .sort((a, b) => (b.populacao || 0) - (a.populacao || 0))
      .slice(0, 8)
  }, [cidades])

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="bg-gradient-to-br from-teal-700 to-teal-900 rounded-2xl text-white p-6 shadow-md">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-teal-200 flex items-center gap-1.5">
              <HiOutlineGlobeAlt className="w-3.5 h-3.5" /> Inteligência Territorial
            </p>
            <h2 className="text-xl font-bold mt-1">Alcance da denominação por cidade</h2>
            <p className="text-xs text-teal-200 mt-1">
              Cruza membros do Inventário, respostas do Censo e população IBGE (Censo 2022) cidade a cidade.
            </p>
          </div>
          <button
            onClick={() => {
              setLoadingPop(true)
              populacaoPorCidadeUF(cidades.map(c => ({ cidade: c.cidade, uf: c.uf })))
                .then(p => setPopulacoes(p))
                .catch(e => setErroPop(e?.message || 'Falha'))
                .finally(() => setLoadingPop(false))
            }}
            disabled={loadingPop}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <HiOutlineRefresh className={`w-3.5 h-3.5 ${loadingPop ? 'animate-spin' : ''}`} />
            {loadingPop ? 'Consultando IBGE...' : 'Atualizar IBGE'}
          </button>
        </div>

        {/* Stat grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mt-5 pt-5 border-t border-white/10">
          <TerrStat label="Cidades" value={totals.cidades.toLocaleString('pt-BR')} />
          <TerrStat label="Estados" value={totals.estados.toLocaleString('pt-BR')} />
          <TerrStat label="Igrejas" value={totals.igrejas.toLocaleString('pt-BR')} />
          <TerrStat label="Membros (inv.)" value={totals.membros.toLocaleString('pt-BR')} accent="emerald" />
          <TerrStat label="Respostas" value={totals.respostas.toLocaleString('pt-BR')} accent="indigo" />
          <TerrStat label="População IBGE" value={totals.populacaoTotal.toLocaleString('pt-BR')} hint={`${totals.cidadesComIbge}/${totals.cidades} c/ IBGE`} />
          <TerrStat label="Alcance médio" value={totals.alcanceMedio !== null ? `${totals.alcanceMedio.toFixed(3)}%` : '—'} accent="teal" hint="membros / população" />
        </div>
      </div>

      {erroPop && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
          Não conseguimos consultar o IBGE agora ({erroPop}). A tabela mostra dados sem população — clique em "Atualizar IBGE" para tentar novamente.
        </div>
      )}

      {/* Oportunidades */}
      {oportunidades.length > 0 && (
        <div className="card border border-amber-200 bg-amber-50/40">
          <div className="flex items-center gap-2 mb-2">
            <HiOutlineLightBulb className="w-5 h-5 text-amber-700" />
            <h3 className="text-base font-semibold text-amber-900">Oportunidades de expansão</h3>
          </div>
          <p className="text-xs text-amber-700 mb-3">
            Cidades com igreja(s) cadastrada(s) mas alcance &lt; 0,1% da população — potencial para evangelismo focado.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {oportunidades.map(c => (
              <div key={c.key} className="bg-white border border-amber-200 rounded-lg p-3">
                <p className="text-sm font-semibold text-gray-800">{c.cidade}/{c.uf}</p>
                <p className="text-[11px] text-gray-500">{c.igrejas} igreja(s) · {c.membrosInventario} membros</p>
                <p className="text-xs text-amber-700 mt-1">
                  População: <span className="font-medium">{c.populacao?.toLocaleString('pt-BR')}</span>
                  <span className="ml-1">· Alcance: <span className="font-bold">{c.alcance?.toFixed(3)}%</span></span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <HiOutlineLocationMarker className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar cidade ou UF..."
              className="input-field pl-10"
            />
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 text-xs">
            {([['membros', 'Membros'], ['respostas', 'Respostas'], ['alcance', 'Alcance %'], ['sat', 'Satisfação']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={`px-3 py-1.5 font-medium rounded-md ${sortBy === key ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-gray-400 border-b border-gray-100">
              <th className="py-2 px-3 font-medium">Cidade / UF</th>
              <th className="py-2 px-3 font-medium text-right">Igrejas</th>
              <th className="py-2 px-3 font-medium text-right">Membros</th>
              <th className="py-2 px-3 font-medium text-right">População IBGE</th>
              <th className="py-2 px-3 font-medium text-right">Alcance %</th>
              <th className="py-2 px-3 font-medium text-right">Respostas</th>
              <th className="py-2 px-3 font-medium text-right">Compl.</th>
              <th className="py-2 px-3 font-medium text-left">Satisfação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="py-10 text-center text-gray-400 text-sm">Nenhuma cidade encontrada</td></tr>
            ) : filtered.map(c => {
              const cls = classifySat(c.satMedia)
              const cor = classColors(cls === 'sem_dados' ? 'sem_dados' : cls as any)
              const alcCor = c.alcance === null ? 'text-gray-400'
                : c.alcance < 0.1 ? 'text-red-600'
                : c.alcance < 0.5 ? 'text-amber-600'
                : 'text-emerald-700'
              return (
                <tr key={c.key} className="hover:bg-gray-50">
                  <td className="py-2 px-3">
                    <span className="font-medium text-gray-800">{c.cidade}</span>
                    <span className="text-xs text-gray-400 ml-1">/{c.uf}</span>
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-gray-600">{c.igrejas}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-emerald-700 font-medium">{c.membrosInventario.toLocaleString('pt-BR')}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-gray-600">
                    {c.populacao !== null ? c.populacao.toLocaleString('pt-BR') : <span className="text-gray-300">—</span>}
                  </td>
                  <td className={`py-2 px-3 text-right tabular-nums font-semibold ${alcCor}`}>
                    {c.alcance !== null ? `${c.alcance.toFixed(3)}%` : '—'}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-gray-600">{c.respostas}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-green-700">{c.completos}</td>
                  <td className="py-2 px-3">
                    {c.satMedia !== null ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[60px]">
                          <div className="h-full rounded-full" style={{ width: `${((c.satMedia - 1) / 3) * 100}%`, backgroundColor: cor.solid }} />
                        </div>
                        <span className={`text-xs font-medium tabular-nums ${cor.text}`}>{c.satMedia.toFixed(2)}</span>
                      </div>
                    ) : <span className="text-xs text-gray-300">sem respostas</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-gray-400 text-center pt-2">
        Dados de população: API pública IBGE (Censo 2022 · agregado 4714/93) ·
        Cache local da sessão pra evitar reconsultas.
      </p>
    </div>
  )
}

function TerrStat({ label, value, accent, hint }: { label: string; value: string; accent?: 'emerald' | 'teal' | 'indigo'; hint?: string }) {
  const cor = accent === 'emerald' ? 'text-emerald-300'
    : accent === 'teal' ? 'text-teal-300'
    : accent === 'indigo' ? 'text-indigo-300'
    : 'text-white'
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-teal-200">{label}</p>
      <p className={`text-xl sm:text-2xl font-bold tabular-nums ${cor}`}>{value}</p>
      {hint && <p className="text-[10px] text-teal-300/70 mt-0.5">{hint}</p>}
    </div>
  )
}
