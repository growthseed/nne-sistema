import { useEffect, useState, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { generateGoogleCalendarUrl } from '@/lib/projections'
import type {
  Missionario,
  MetaMissionario,
  AtividadeMissionario,
  TipoAtividade,
  RelatorioMissionario,
} from '@/types'
import {
  FiUser,
  FiCalendar,
  FiPlus,
  FiUsers,
  FiDollarSign,
  FiBookOpen,
  FiFileText,
  FiClock,
  FiMapPin,
  FiCheckCircle,
  FiExternalLink,
} from 'react-icons/fi'

import { TIPO_ATIVIDADE_LABELS, TIPO_ATIVIDADE_ICONS, MESES_NOMES } from '@/lib/missoes-constants'
import { useCargoLabels } from '@/hooks/useCargoLabels'

const MESES = MESES_NOMES

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

// ========== Component ==========

const emptyActivityForm = {
  tipo: '' as TipoAtividade | '',
  titulo: '',
  descricao: '',
  data: new Date().toISOString().slice(0, 10),
  hora_inicio: '08:00',
  hora_fim: '09:00',
  igreja_id: '',
  local_descricao: '',
  numero_participantes: 0,
}

export default function MeuPainelMissionarioPage() {
  const { profile } = useAuth()
  const { labels: CARGO_LABELS } = useCargoLabels()

  const [missionario, setMissionario] = useState<Missionario | null>(null)
  const [metas, setMetas] = useState<MetaMissionario | null>(null)
  const [atividades, setAtividades] = useState<(AtividadeMissionario & { igreja?: { nome: string } | null })[]>([])
  const [relatorios, setRelatorios] = useState<RelatorioMissionario[]>([])
  const [igrejas, setIgrejas] = useState<{ id: string; nome: string }[]>([])
  const [totalMembros, setTotalMembros] = useState(0)
  const [totalDizimos, setTotalDizimos] = useState(0)
  const [classesBatismaisAtivas, setClassesBatismaisAtivas] = useState(0)
  const [temRelatorioMes, setTemRelatorioMes] = useState(false)

  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyActivityForm)

  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  // ---- Data fetching ----

  useEffect(() => {
    if (profile) fetchMissionario()
  }, [profile])

  async function fetchMissionario() {
    if (!profile) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('missionarios')
        .select('*')
        .eq('usuario_id', profile.id)
        .single()

      if (error || !data) {
        setMissionario(null)
        setLoading(false)
        return
      }

      setMissionario(data)
      await Promise.all([
        fetchIgrejas(data.igrejas_responsavel),
        fetchMetas(data.id),
        fetchAtividades(data.id),
        fetchRelatorios(data.igrejas_responsavel),
        fetchMembros(data.igrejas_responsavel),
        fetchFinanceiro(data.igrejas_responsavel),
        fetchClassesBatismais(data.igrejas_responsavel),
      ])
    } catch (err) {
      console.error('Erro ao buscar missionario:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchIgrejas(ids: string[]) {
    if (!ids.length) return
    const { data } = await supabase
      .from('igrejas')
      .select('id, nome')
      .in('id', ids)
    setIgrejas(data || [])
  }

  async function fetchMetas(missionarioId: string) {
    const { data } = await supabase
      .from('metas_missionario')
      .select('*')
      .eq('missionario_id', missionarioId)
      .eq('tipo_periodo', 'mensal')
      .eq('mes', currentMonth)
      .eq('ano', currentYear)
      .single()
    setMetas(data || null)
  }

  async function fetchAtividades(missionarioId: string) {
    const { data } = await supabase
      .from('atividades_missionario')
      .select('*, igreja:igrejas(nome)')
      .eq('missionario_id', missionarioId)
      .order('data', { ascending: false })
      .limit(30)
    setAtividades(data || [])
  }

  async function fetchRelatorios(igrejasIds: string[]) {
    if (!igrejasIds.length) {
      setTemRelatorioMes(false)
      return
    }
    const { data } = await supabase
      .from('relatorios_missionarios')
      .select('*')
      .in('igreja_id', igrejasIds)
      .eq('mes', currentMonth)
      .eq('ano', currentYear)
    setRelatorios(data || [])
    setTemRelatorioMes((data || []).length > 0)
  }

  async function fetchMembros(igrejasIds: string[]) {
    if (!igrejasIds.length) return
    const { count } = await supabase
      .from('pessoas')
      .select('id', { count: 'exact', head: true })
      .in('igreja_id', igrejasIds)
      .eq('situacao', 'ativo')
    setTotalMembros(count || 0)
  }

  async function fetchFinanceiro(igrejasIds: string[]) {
    if (!igrejasIds.length) return
    const { data } = await supabase
      .from('dados_financeiros')
      .select('receita_dizimos')
      .in('igreja_id', igrejasIds)
      .eq('mes', currentMonth)
      .eq('ano', currentYear)
    const soma = (data || []).reduce((acc, d) => acc + (d.receita_dizimos || 0), 0)
    setTotalDizimos(soma)
  }

  async function fetchClassesBatismais(igrejasIds: string[]) {
    if (!igrejasIds.length) return
    const { count } = await supabase
      .from('classes_batismais')
      .select('id', { count: 'exact', head: true })
      .in('igreja_id', igrejasIds)
      .eq('status', 'ativa')
    setClassesBatismaisAtivas(count || 0)
  }

  // ---- Aggregate actuals from relatorios ----

  const actualsFromReports = useMemo(() => {
    return relatorios.reduce(
      (acc, r) => ({
        estudos: acc.estudos + (r.estudos_biblicos || 0),
        visitas: acc.visitas + (r.visitas_missionarias || 0),
        literatura: acc.literatura + (r.literatura_distribuida || 0),
        convites: acc.convites + (r.convites_feitos || 0),
        pessoas_trazidas: acc.pessoas_trazidas + (r.pessoas_trazidas || 0),
        horas: acc.horas + (r.horas_trabalho || 0),
      }),
      { estudos: 0, visitas: 0, literatura: 0, convites: 0, pessoas_trazidas: 0, horas: 0 }
    )
  }, [relatorios])

  // ---- Goals progress items ----

  const goalsProgress = useMemo(() => {
    if (!metas) return []
    return [
      { label: 'Estudos Biblicos', actual: actualsFromReports.estudos, goal: metas.meta_estudos_biblicos },
      { label: 'Visitas', actual: actualsFromReports.visitas, goal: metas.meta_visitas },
      { label: 'Literatura', actual: actualsFromReports.literatura, goal: metas.meta_literatura },
      { label: 'Convites', actual: actualsFromReports.convites, goal: metas.meta_convites },
      { label: 'Pessoas Trazidas', actual: actualsFromReports.pessoas_trazidas, goal: metas.meta_pessoas_trazidas },
      { label: 'Horas', actual: actualsFromReports.horas, goal: metas.meta_horas_trabalho },
    ]
  }, [metas, actualsFromReports])

  // ---- Grouped activities by date ----

  const groupedActivities = useMemo(() => {
    const groups: Record<string, typeof atividades> = {}
    for (const a of atividades) {
      const d = a.data
      if (!groups[d]) groups[d] = []
      groups[d].push(a)
    }
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
  }, [atividades])

  // ---- Activity form handlers ----

  function openActivityModal() {
    setForm({
      ...emptyActivityForm,
      igreja_id: igrejas.length === 1 ? igrejas[0].id : '',
    })
    setShowModal(true)
  }

  async function handleSaveActivity(e: React.FormEvent) {
    e.preventDefault()
    if (!missionario || !form.tipo) return
    setSaving(true)
    try {
      const payload = {
        missionario_id: missionario.id,
        tipo: form.tipo,
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim() || null,
        data: form.data,
        hora_inicio: form.hora_inicio || null,
        hora_fim: form.hora_fim || null,
        igreja_id: form.igreja_id || null,
        local_descricao: form.local_descricao.trim() || null,
        numero_participantes: form.numero_participantes,
        pessoas_envolvidas: [],
        google_calendar_synced: false,
      }
      const { error } = await supabase
        .from('atividades_missionario')
        .insert(payload)
      if (error) throw error

      setShowModal(false)
      await fetchAtividades(missionario.id)
    } catch (err) {
      console.error('Erro ao salvar atividade:', err)
      alert('Erro ao salvar atividade')
    } finally {
      setSaving(false)
    }
  }

  // ---- Initials for avatar ----

  function getInitials(name?: string | null) {
    if (!name) return '?'
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0].toUpperCase())
      .join('')
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  }

  function formatDateShort(dateStr: string | null) {
    if (!dateStr) return '-'
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('pt-BR')
  }

  // ---- Progress bar color helper ----

  function progressColor(pct: number) {
    if (pct >= 80) return 'bg-green-500'
    if (pct >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  // ========== Render ==========

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <span className="ml-3 text-gray-500">Carregando...</span>
        </div>
      </div>
    )
  }

  if (!missionario) {
    return (
      <div className="space-y-6">
        <div className="card text-center py-12">
          <FiUser className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-600">Perfil de Missionário não encontrado</h2>
          <p className="text-gray-400 mt-2">Seu usuário não está vinculado a um registro de missionário no sistema.</p>
          <div className="mt-6 flex gap-3 justify-center">
            <NavLink to="/missoes" className="btn-primary inline-flex items-center gap-2 text-sm">
              Dashboard Missões
            </NavLink>
            <NavLink to="/missoes/inventario" className="btn-secondary inline-flex items-center gap-2 text-sm">
              Ficha de Campo
            </NavLink>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Para vincular seu perfil, acesse a Ficha de Campo e associe seu usuário a um missionário.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Meu Painel</h1>
        <p className="text-gray-500 mt-1">{MESES[currentMonth - 1]} {currentYear}</p>
      </div>

      {/* ===== 1. Profile Card ===== */}
      <div className="card">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Avatar */}
          {missionario.foto_url ? (
            <img
              src={missionario.foto_url}
              alt={profile?.nome || ''}
              className="w-20 h-20 rounded-full object-cover border-4 border-primary-100"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-2xl font-bold border-4 border-primary-50">
              {getInitials(profile?.nome)}
            </div>
          )}

          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl font-bold text-gray-800">{profile?.nome}</h2>
            <span className="inline-block mt-1 px-3 py-0.5 rounded-full bg-primary-50 text-primary-700 text-sm font-medium">
              {CARGO_LABELS[missionario.cargo_ministerial] || missionario.cargo_ministerial}
            </span>

            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-500 justify-center sm:justify-start">
              {missionario.data_inicio_ministerio && (
                <span className="flex items-center gap-1">
                  <FiCalendar className="w-3.5 h-3.5" />
                  Inicio: {formatDateShort(missionario.data_inicio_ministerio)}
                </span>
              )}
              <span className="flex items-center gap-1">
                <FiMapPin className="w-3.5 h-3.5" />
                {igrejas.length} igreja{igrejas.length !== 1 ? 's' : ''}
              </span>
            </div>

            {igrejas.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {igrejas.map(ig => (
                  <span key={ig.id} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                    {ig.nome}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== 2. Goals Progress ===== */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Progresso das Metas - {MESES[currentMonth - 1]}</h3>

        {!metas ? (
          <p className="text-gray-400 text-sm">Nenhuma meta definida para este mes.</p>
        ) : (
          <div className="space-y-4">
            {goalsProgress.map(item => {
              const pct = item.goal > 0 ? Math.min(Math.round((item.actual / item.goal) * 100), 100) : 0
              const pctDisplay = item.goal > 0 ? Math.round((item.actual / item.goal) * 100) : 0
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{item.label}</span>
                    <span className="text-gray-500">
                      {item.actual} / {item.goal} ({pctDisplay}%)
                    </span>
                  </div>
                  <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${progressColor(pctDisplay)}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ===== 3. Field Summary Cards (2x2) ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Members */}
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-100">
              <FiUsers className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{totalMembros}</p>
              <p className="text-xs text-gray-500">Membros Ativos</p>
            </div>
          </div>
        </div>

        {/* Financial */}
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-green-100">
              <FiDollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(totalDizimos)}</p>
              <p className="text-xs text-gray-500">Dizimos no Mes</p>
            </div>
          </div>
        </div>

        {/* Baptismal Classes */}
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-purple-100">
              <FiBookOpen className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{classesBatismaisAtivas}</p>
              <p className="text-xs text-gray-500">Classes Batismais Ativas</p>
            </div>
          </div>
        </div>

        {/* Monthly Report Status */}
        <div className="card">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${temRelatorioMes ? 'bg-green-100' : 'bg-amber-100'}`}>
              {temRelatorioMes ? (
                <FiCheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <FiFileText className="w-5 h-5 text-amber-600" />
              )}
            </div>
            <div>
              <p className="text-lg font-bold text-gray-800">
                {temRelatorioMes ? 'Enviado' : 'Pendente'}
              </p>
              <p className="text-xs text-gray-500">
                Relatorio {MESES[currentMonth - 1]} ({relatorios.length} registro{relatorios.length !== 1 ? 's' : ''})
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== 4. Activity Timeline ===== */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Atividades Recentes</h3>
          <button className="btn-primary inline-flex items-center gap-1.5 text-sm" onClick={openActivityModal}>
            <FiPlus className="w-4 h-4" />
            Registrar Atividade
          </button>
        </div>

        {atividades.length === 0 ? (
          <p className="text-gray-400 text-sm py-4 text-center">Nenhuma atividade registrada.</p>
        ) : (
          <div className="space-y-6">
            {groupedActivities.map(([date, items]) => (
              <div key={date}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  {formatDate(date)}
                </p>
                <div className="space-y-2">
                  {items.map(a => {
                    const IconComp = TIPO_ATIVIDADE_ICONS[a.tipo] || FiFileText
                    return (
                      <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div className="p-2 rounded-lg bg-white shadow-sm">
                          <IconComp className="w-4 h-4 text-primary-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-800 text-sm">{a.titulo}</span>
                            <span className="text-xs px-1.5 py-0.5 bg-primary-50 text-primary-700 rounded">
                              {TIPO_ATIVIDADE_LABELS[a.tipo] || a.tipo}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-500">
                            {a.hora_inicio && (
                              <span className="flex items-center gap-1">
                                <FiClock className="w-3 h-3" />
                                {a.hora_inicio}{a.hora_fim ? ` - ${a.hora_fim}` : ''}
                              </span>
                            )}
                            {a.igreja?.nome && (
                              <span className="flex items-center gap-1">
                                <FiMapPin className="w-3 h-3" />
                                {a.igreja.nome}
                              </span>
                            )}
                            {a.numero_participantes > 0 && (
                              <span className="flex items-center gap-1">
                                <FiUsers className="w-3 h-3" />
                                {a.numero_participantes} participante{a.numero_participantes !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Google Calendar button */}
                        <a
                          href={generateGoogleCalendarUrl({
                            titulo: a.titulo,
                            descricao: a.descricao || undefined,
                            data: a.data,
                            horaInicio: a.hora_inicio || undefined,
                            horaFim: a.hora_fim || undefined,
                            local: a.local_descricao || a.igreja?.nome || undefined,
                          })}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 p-1.5 rounded-md text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          title="Adicionar ao Google Agenda"
                        >
                          <FiExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== 5. Google Calendar Section ===== */}
      {atividades.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Google Agenda</h3>
          <p className="text-sm text-gray-500 mb-3">
            Adicione suas atividades ao Google Agenda clicando no icone ao lado de cada atividade acima, ou use os atalhos abaixo para as proximas atividades:
          </p>
          <div className="flex flex-wrap gap-2">
            {atividades
              .filter(a => a.data >= new Date().toISOString().slice(0, 10))
              .slice(0, 5)
              .map(a => (
                <a
                  key={a.id}
                  href={generateGoogleCalendarUrl({
                    titulo: a.titulo,
                    descricao: a.descricao || undefined,
                    data: a.data,
                    horaInicio: a.hora_inicio || undefined,
                    horaFim: a.hora_fim || undefined,
                    local: a.local_descricao || a.igreja?.nome || undefined,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary inline-flex items-center gap-1.5 text-xs"
                >
                  <FiCalendar className="w-3.5 h-3.5" />
                  {a.titulo} ({a.data})
                </a>
              ))}
          </div>
        </div>
      )}

      {/* ===== Activity Modal ===== */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Registrar Atividade</h2>

            <form onSubmit={handleSaveActivity} className="space-y-4">
              {/* Tipo */}
              <div>
                <label className="label-field">Tipo de Atividade</label>
                <select
                  value={form.tipo}
                  onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TipoAtividade }))}
                  className="input-field"
                  required
                >
                  <option value="">-- Selecione --</option>
                  {(Object.keys(TIPO_ATIVIDADE_LABELS) as TipoAtividade[]).map(t => (
                    <option key={t} value={t}>{TIPO_ATIVIDADE_LABELS[t]}</option>
                  ))}
                </select>
              </div>

              {/* Titulo */}
              <div>
                <label className="label-field">Titulo</label>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  className="input-field"
                  required
                  placeholder="Ex: Estudo com familia Silva"
                />
              </div>

              {/* Descricao */}
              <div>
                <label className="label-field">Descricao</label>
                <textarea
                  value={form.descricao}
                  onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  className="input-field"
                  rows={2}
                  placeholder="Descricao opcional..."
                />
              </div>

              {/* Data + Horarios */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label-field">Data</label>
                  <input
                    type="date"
                    value={form.data}
                    onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="label-field">Hora Inicio</label>
                  <input
                    type="time"
                    value={form.hora_inicio}
                    onChange={e => setForm(f => ({ ...f, hora_inicio: e.target.value }))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label-field">Hora Fim</label>
                  <input
                    type="time"
                    value={form.hora_fim}
                    onChange={e => setForm(f => ({ ...f, hora_fim: e.target.value }))}
                    className="input-field"
                  />
                </div>
              </div>

              {/* Igreja + Local */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-field">Igreja</label>
                  <select
                    value={form.igreja_id}
                    onChange={e => setForm(f => ({ ...f, igreja_id: e.target.value }))}
                    className="input-field"
                  >
                    <option value="">-- Selecione --</option>
                    {igrejas.map(ig => (
                      <option key={ig.id} value={ig.id}>{ig.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label-field">Local</label>
                  <input
                    type="text"
                    value={form.local_descricao}
                    onChange={e => setForm(f => ({ ...f, local_descricao: e.target.value }))}
                    className="input-field"
                    placeholder="Endereco ou descricao"
                  />
                </div>
              </div>

              {/* Participantes */}
              <div>
                <label className="label-field">Numero de Participantes</label>
                <input
                  type="number"
                  min={0}
                  value={form.numero_participantes}
                  onChange={e => setForm(f => ({ ...f, numero_participantes: Number(e.target.value) || 0 }))}
                  className="input-field"
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar Atividade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
