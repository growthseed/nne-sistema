import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { calcularIdade, formatDateBR } from '@/lib/secretaria-constants'
import {
  HiOutlineHeart, HiOutlineExclamationCircle, HiOutlineEye,
  HiOutlinePhone, HiOutlineCalendar, HiOutlineRefresh,
  HiOutlineShieldCheck, HiOutlineExclamation, HiOutlineBan,
  HiOutlineFilter, HiOutlineTrendingDown
} from 'react-icons/hi'

interface MembroSaude {
  id: string
  nome: string
  celular: string | null
  telefone: string | null
  data_nascimento: string | null
  data_batismo: string | null
  situacao: string
  created_at: string
  data_ultimo_contato: string | null
  score_engajamento: number | null
  igreja: { nome: string } | null
  // Computed
  indiceSaude: number
  alertas: string[]
  risco: 'baixo' | 'medio' | 'alto' | 'critico'
}

type FiltroRisco = 'todos' | 'critico' | 'alto' | 'medio' | 'baixo'

const RISCO_COLORS = {
  baixo: 'bg-green-100 text-green-700',
  medio: 'bg-yellow-100 text-yellow-700',
  alto: 'bg-orange-100 text-orange-700',
  critico: 'bg-red-100 text-red-700',
}

const RISCO_ICONS = {
  baixo: HiOutlineShieldCheck,
  medio: HiOutlineExclamation,
  alto: HiOutlineExclamationCircle,
  critico: HiOutlineBan,
}

function calcularSaude(p: {
  data_batismo: string | null
  data_ultimo_contato: string | null
  score_engajamento: number | null
  data_nascimento: string | null
  situacao: string
  created_at: string
}): { indiceSaude: number; alertas: string[]; risco: 'baixo' | 'medio' | 'alto' | 'critico' } {
  let score = 100
  const alertas: string[] = []
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  // 1. Tempo sem contato (-5 per week without contact, max -40)
  if (p.data_ultimo_contato) {
    const ultimo = new Date(p.data_ultimo_contato + 'T00:00:00')
    const diasSem = Math.floor((hoje.getTime() - ultimo.getTime()) / (1000 * 60 * 60 * 24))
    if (diasSem > 90) {
      score -= 40
      alertas.push(`${diasSem} dias sem contato`)
    } else if (diasSem > 60) {
      score -= 30
      alertas.push(`${diasSem} dias sem contato`)
    } else if (diasSem > 30) {
      score -= 20
      alertas.push(`${diasSem} dias sem contato`)
    } else if (diasSem > 14) {
      score -= 10
      alertas.push(`${diasSem} dias sem contato`)
    }
  } else {
    // Never contacted
    score -= 25
    alertas.push('Nunca contatado')
  }

  // 2. Batismo recente (< 365 dias) = more attention needed
  if (p.data_batismo) {
    const batismo = new Date(p.data_batismo + 'T00:00:00')
    const diasBatismo = Math.floor((hoje.getTime() - batismo.getTime()) / (1000 * 60 * 60 * 24))
    if (diasBatismo < 365) {
      // New member - doesn't lower score but flags attention
      alertas.push(`Novo membro (batismo há ${Math.floor(diasBatismo / 30)} meses)`)
      if (diasBatismo < 90 && !p.data_ultimo_contato) {
        score -= 15
        alertas.push('Sem acompanhamento pós-batismo')
      }
    }
  } else {
    // No baptism date - might be a data quality issue or recent member
    score -= 5
  }

  // 3. Score de engajamento
  if (p.score_engajamento != null) {
    if (p.score_engajamento >= 50) {
      score += 10
    } else if (p.score_engajamento <= 10) {
      score -= 15
      alertas.push('Baixo engajamento')
    } else if (p.score_engajamento <= 20) {
      score -= 5
    }
  }

  // 4. Age-specific concerns
  if (p.data_nascimento) {
    const idade = calcularIdade(p.data_nascimento)
    if (idade >= 18 && idade <= 25) {
      // Young adults: higher evasion risk
      score -= 5
      if (alertas.length > 0) {
        alertas.push('Jovem adulto (faixa de maior evasão)')
      }
    }
    if (idade >= 70) {
      alertas.push('Idoso (pode precisar de atenção pastoral)')
    }
  }

  // 5. Situação
  if (p.situacao === 'inativo') {
    score -= 30
    alertas.push('Situação: inativo')
  }

  // Clamp
  score = Math.max(0, Math.min(100, score))

  // Determine risk level
  let risco: 'baixo' | 'medio' | 'alto' | 'critico' = 'baixo'
  if (score < 30) risco = 'critico'
  else if (score < 50) risco = 'alto'
  else if (score < 70) risco = 'medio'
  else risco = 'baixo'

  return { indiceSaude: score, alertas, risco }
}

export default function SaudeMembrosPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [membrosRaw, setMembrosRaw] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroRisco, setFiltroRisco] = useState<FiltroRisco>('todos')

  function buildScopeFilter(query: any) {
    if (!profile) return query
    if (profile.papel === 'admin') return query
    if (profile.papel === 'admin_uniao') return query.eq('uniao_id', profile.uniao_id!)
    if (profile.papel === 'admin_associacao') return query.eq('associacao_id', profile.associacao_id!)
    return query.eq('igreja_id', profile.igreja_id!)
  }

  useEffect(() => {
    if (profile) fetchMembros()
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchMembros() {
    setLoading(true)
    try {
      const { data, error } = await buildScopeFilter(
        supabase
          .from('pessoas')
          .select('id, nome, celular, telefone, data_nascimento, data_batismo, situacao, created_at, data_ultimo_contato, score_engajamento, igreja:igrejas(nome)')
          .eq('tipo', 'membro')
          .in('situacao', ['ativo', 'inativo'])
          .order('nome')
      )

      if (error) throw error
      setMembrosRaw(data || [])
    } catch (err) {
      console.error('Erro:', err)
    } finally {
      setLoading(false)
    }
  }

  const membros: MembroSaude[] = useMemo(() => {
    return membrosRaw.map(p => {
      const { indiceSaude, alertas, risco } = calcularSaude(p)
      return { ...p, indiceSaude, alertas, risco } as MembroSaude
    }).sort((a, b) => a.indiceSaude - b.indiceSaude) // worst first
  }, [membrosRaw])

  const filtered = useMemo(() => {
    if (filtroRisco === 'todos') return membros
    return membros.filter(m => m.risco === filtroRisco)
  }, [membros, filtroRisco])

  // Stats
  const counts = useMemo(() => {
    const c = { critico: 0, alto: 0, medio: 0, baixo: 0 }
    membros.forEach(m => { c[m.risco]++ })
    return c
  }, [membros])

  const avgScore = membros.length > 0
    ? Math.round(membros.reduce((s, m) => s + m.indiceSaude, 0) / membros.length)
    : 0

  function getWhatsAppLink(m: MembroSaude) {
    const phone = (m.celular || m.telefone || '').replace(/\D/g, '')
    if (!phone) return null
    const p = phone.startsWith('55') ? phone : `55${phone}`
    return `https://wa.me/${p}`
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-20 bg-gray-200 rounded-lg animate-pulse" />)}
        </div>
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Saúde dos Membros</h1>
          <p className="text-gray-500 mt-1">Identifique membros em risco e tome ação preventiva</p>
        </div>
        <button onClick={fetchMembros} className="btn-secondary inline-flex items-center gap-2 text-sm w-fit">
          <HiOutlineRefresh className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="card py-3 text-center">
          <p className="text-3xl font-bold" style={{ color: avgScore >= 70 ? '#22c55e' : avgScore >= 50 ? '#eab308' : '#ef4444' }}>
            {avgScore}
          </p>
          <p className="text-xs text-gray-500">Índice Médio</p>
        </div>
        <button
          onClick={() => setFiltroRisco(filtroRisco === 'critico' ? 'todos' : 'critico')}
          className={`card py-3 text-center transition-all ${filtroRisco === 'critico' ? 'ring-2 ring-red-400' : 'hover:shadow-md'}`}
        >
          <p className="text-3xl font-bold text-red-600">{counts.critico}</p>
          <p className="text-xs text-gray-500">Crítico</p>
        </button>
        <button
          onClick={() => setFiltroRisco(filtroRisco === 'alto' ? 'todos' : 'alto')}
          className={`card py-3 text-center transition-all ${filtroRisco === 'alto' ? 'ring-2 ring-orange-400' : 'hover:shadow-md'}`}
        >
          <p className="text-3xl font-bold text-orange-600">{counts.alto}</p>
          <p className="text-xs text-gray-500">Alto Risco</p>
        </button>
        <button
          onClick={() => setFiltroRisco(filtroRisco === 'medio' ? 'todos' : 'medio')}
          className={`card py-3 text-center transition-all ${filtroRisco === 'medio' ? 'ring-2 ring-yellow-400' : 'hover:shadow-md'}`}
        >
          <p className="text-3xl font-bold text-yellow-600">{counts.medio}</p>
          <p className="text-xs text-gray-500">Médio</p>
        </button>
        <button
          onClick={() => setFiltroRisco(filtroRisco === 'baixo' ? 'todos' : 'baixo')}
          className={`card py-3 text-center transition-all ${filtroRisco === 'baixo' ? 'ring-2 ring-green-400' : 'hover:shadow-md'}`}
        >
          <p className="text-3xl font-bold text-green-600">{counts.baixo}</p>
          <p className="text-xs text-gray-500">Saudável</p>
        </button>
      </div>

      {/* Filter indicator */}
      {filtroRisco !== 'todos' && (
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${RISCO_COLORS[filtroRisco]}`}>
            Filtrando: {filtroRisco}
          </span>
          <button onClick={() => setFiltroRisco('todos')} className="text-xs text-gray-400 hover:text-gray-600">
            Limpar filtro
          </button>
          <span className="text-xs text-gray-400 ml-auto">{filtered.length} membro{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Member list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="card py-8 text-center">
            <HiOutlineHeart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhum membro nesta categoria</p>
          </div>
        ) : (
          filtered.map(m => {
            const RiscoIcon = RISCO_ICONS[m.risco]
            const waLink = getWhatsAppLink(m)

            return (
              <div
                key={m.id}
                className={`card py-3 px-4 flex items-start gap-3 hover:shadow-md transition-shadow cursor-pointer ${
                  m.risco === 'critico' ? 'border-l-4 border-l-red-400' :
                  m.risco === 'alto' ? 'border-l-4 border-l-orange-400' : ''
                }`}
                onClick={() => navigate(`/membros/${m.id}`)}
              >
                {/* Score circle */}
                <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${RISCO_COLORS[m.risco]}`}>
                  {m.indiceSaude}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-800 truncate">{m.nome}</p>
                    <RiscoIcon className={`w-4 h-4 shrink-0 ${
                      m.risco === 'critico' ? 'text-red-500' :
                      m.risco === 'alto' ? 'text-orange-500' :
                      m.risco === 'medio' ? 'text-yellow-500' : 'text-green-500'
                    }`} />
                  </div>
                  <p className="text-xs text-gray-400 truncate">
                    {(m.igreja as any)?.nome || '—'}
                    {m.data_nascimento && ` • ${calcularIdade(m.data_nascimento)} anos`}
                  </p>
                  {m.alertas.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {m.alertas.slice(0, 3).map((a, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                          {a}
                        </span>
                      ))}
                      {m.alertas.length > 3 && (
                        <span className="text-[10px] text-gray-400">+{m.alertas.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {waLink && (
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center hover:bg-green-200 transition-colors"
                      title="WhatsApp"
                    >
                      <HiOutlinePhone className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); navigate(`/membros/${m.id}`) }}
                    className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-primary-100 hover:text-primary-600 transition-colors"
                    title="Ver perfil"
                  >
                    <HiOutlineEye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Legend */}
      <div className="card p-4">
        <p className="text-xs font-medium text-gray-500 mb-2">Como funciona o índice de saúde</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-gray-500">
          <div>
            <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-1.5 align-middle" />
            70-100: Saudável
          </div>
          <div>
            <span className="inline-block w-3 h-3 rounded-full bg-yellow-500 mr-1.5 align-middle" />
            50-69: Atenção
          </div>
          <div>
            <span className="inline-block w-3 h-3 rounded-full bg-orange-500 mr-1.5 align-middle" />
            30-49: Alto risco
          </div>
          <div>
            <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-1.5 align-middle" />
            0-29: Crítico
          </div>
        </div>
        <p className="text-[10px] text-gray-400 mt-2">
          Fatores: tempo sem contato, engajamento, idade do batismo, faixa etária, situação cadastral
        </p>
      </div>
    </div>
  )
}
