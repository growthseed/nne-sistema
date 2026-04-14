import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { NavLink } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Missionario, RelatorioDiario } from '@/types'
import {
  FiCalendar, FiSave, FiDownload, FiLock, FiUnlock, FiX,
  FiChevronLeft, FiChevronRight, FiClipboard,
} from 'react-icons/fi'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

import {
  MISSOES_TABS, CARGO_LABELS, MESES_NOMES,
  RELATORIO_ATIVIDADES_MISSIONARIAS, RELATORIO_HORAS,
  RELATORIO_PASTORAIS, RELATORIO_DESPESAS, RELATORIO_TODOS_CAMPOS,
} from '@/lib/missoes-constants'

function MissoesSubNav() {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {MISSOES_TABS.map(tab => (
        <NavLink key={tab.to} to={tab.to} end className={({ isActive }) =>
          `px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${isActive ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`
        }>{tab.label}</NavLink>
      ))}
    </div>
  )
}

// Helper: number of days in a month
function daysInMonth(mes: number, ano: number) {
  return new Date(ano, mes, 0).getDate()
}

// Helper: sum a field across all daily records
function sumField(dailyData: Record<number, Partial<RelatorioDiario>>, field: string): number {
  return Object.values(dailyData).reduce((s, d) => s + (Number((d as any)[field]) || 0), 0)
}

// Empty daily record template
function emptyDay(): Partial<RelatorioDiario> {
  const d: Record<string, any> = { lugar_atividade: '', observacao: '' }
  for (const f of RELATORIO_TODOS_CAMPOS) d[f.key] = 0
  return d
}

export default function RelatorioMissionarioPage() {
  const { profile } = useAuth()
  const reportRef = useRef<HTMLDivElement>(null)

  const [missionarios, setMissionarios] = useState<Missionario[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Month/year
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [ano, setAno] = useState(new Date().getFullYear())

  // Report header data
  const [relatorioId, setRelatorioId] = useState<string | null>(null)
  const [status, setStatus] = useState<'aberto' | 'fechado'>('aberto')
  const [observacoes, setObservacoes] = useState('')

  // Daily data: keyed by day number (1-31)
  const [dailyData, setDailyData] = useState<Record<number, Partial<RelatorioDiario>>>({})

  // UI state
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [activeBlock, setActiveBlock] = useState<'atividades' | 'horas' | 'pastorais' | 'despesas'>('atividades')

  const numDays = daysInMonth(mes, ano)
  const isReadOnly = status === 'fechado'

  // ── Fetch missionaries ──
  useEffect(() => {
    if (profile) fetchMissionarios()
  }, [profile])

  async function fetchMissionarios() {
    if (!profile) return
    setLoading(true)
    try {
      let query = supabase
        .from('missionarios')
        .select('*, associacao:associacoes(nome, sigla)')
        .eq('status', 'ativo')
        .order('nome')

      if (profile.papel === 'admin') {
        // see all
      } else if (profile.papel === 'admin_uniao') {
        query = query.eq('uniao_id', profile.uniao_id!)
      } else if (profile.papel === 'admin_associacao') {
        query = query.eq('associacao_id', profile.associacao_id!)
      } else {
        query = query.eq('usuario_id', profile.id)
      }

      const { data } = await query
      setMissionarios(data || [])
      if (data && data.length === 1) setSelectedId(data[0].id)
      else if (data) {
        const self = data.find(m => m.usuario_id === profile.id)
        if (self) setSelectedId(self.id)
      }
    } catch (err) {
      console.error('Erro ao buscar missionarios:', err)
    } finally {
      setLoading(false)
    }
  }

  // ── Fetch report when missionary/month changes ──
  useEffect(() => {
    if (selectedId && mes && ano) fetchRelatorio()
  }, [selectedId, mes, ano])

  async function fetchRelatorio() {
    if (!selectedId) return
    setLoading(true)
    try {
      // 1. Get or create header
      const { data: existing } = await supabase
        .from('relatorios_missionarios')
        .select('id, status, observacoes')
        .eq('missionario_id', selectedId)
        .eq('mes', mes)
        .eq('ano', ano)
        .maybeSingle()

      if (existing) {
        setRelatorioId(existing.id)
        setStatus(existing.status || 'aberto')
        setObservacoes(existing.observacoes || '')

        // Fetch daily records
        const { data: dias } = await supabase
          .from('relatorio_missionario_diario')
          .select('*')
          .eq('relatorio_id', existing.id)
          .order('dia')

        const map: Record<number, Partial<RelatorioDiario>> = {}
        for (const d of dias || []) {
          map[d.dia] = d
        }
        setDailyData(map)
      } else {
        setRelatorioId(null)
        setStatus('aberto')
        setObservacoes('')
        setDailyData({})
      }
      setSelectedDay(null)
    } catch (err) {
      console.error('Erro ao buscar relatorio:', err)
    } finally {
      setLoading(false)
    }
  }

  // ── Save ──
  async function handleSave() {
    if (!selectedId || !profile) return
    setSaving(true)
    try {
      let headerIdToUse = relatorioId

      // Upsert header
      if (!headerIdToUse) {
        const { data: newHeader, error: hErr } = await supabase
          .from('relatorios_missionarios')
          .insert({
            missionario_id: selectedId,
            igreja_id: profile.igreja_id || null,
            pessoa_id: profile.id,
            mes, ano,
            status,
            observacoes: observacoes || null,
          })
          .select('id')
          .single()
        if (hErr) throw hErr
        headerIdToUse = newHeader.id
        setRelatorioId(headerIdToUse)
      } else {
        await supabase
          .from('relatorios_missionarios')
          .update({ status, observacoes: observacoes || null })
          .eq('id', headerIdToUse)
      }

      // Delete existing daily and re-insert
      await supabase
        .from('relatorio_missionario_diario')
        .delete()
        .eq('relatorio_id', headerIdToUse!)

      const inserts = Object.entries(dailyData)
        .filter(([_, d]) => {
          // Only insert days that have some data
          return RELATORIO_TODOS_CAMPOS.some(f => Number((d as any)[f.key]) > 0) || (d.lugar_atividade && d.lugar_atividade.trim())
        })
        .map(([dia, d]) => {
          const row: Record<string, any> = {
            relatorio_id: headerIdToUse,
            dia: Number(dia),
            lugar_atividade: d.lugar_atividade || null,
            observacao: d.observacao || null,
          }
          for (const f of RELATORIO_TODOS_CAMPOS) {
            row[f.key] = Number((d as any)[f.key]) || 0
          }
          return row
        })

      if (inserts.length > 0) {
        const { error: iErr } = await supabase
          .from('relatorio_missionario_diario')
          .insert(inserts)
        if (iErr) throw iErr
      }

      // Sync legacy fields on relatorios_missionarios for backwards compatibility
      // (7+ pages still read these fields for dashboards, KPIs, etc.)
      const t = totals
      const horasTotal = (t.horas_viagens || 0) + (t.horas_comissoes || 0) + (t.horas_estudo_pessoal || 0)
        + (t.horas_reunioes_igreja || 0) + (t.horas_escritorio || 0) + (t.horas_diligencias || 0)
        + (t.horas_aconselhamentos || 0) + (t.horas_recebendo_visitas || 0)
      await supabase
        .from('relatorios_missionarios')
        .update({
          estudos_biblicos: t.estudos_biblicos || 0,
          visitas_missionarias: (t.familias_visitadas || 0) + (t.membros_visitados || 0) + (t.interessados_visitados || 0),
          literatura_distribuida: t.folhetos_distribuidos || 0,
          pessoas_contatadas: t.contatos_missionarios || 0,
          convites_feitos: (t.sermoes_conferencias || 0) + (t.seminarios_palestras || 0),
          pessoas_trazidas: t.pessoas_batizadas || 0,
          horas_trabalho: horasTotal,
        })
        .eq('id', headerIdToUse!)

      alert('Relatorio salvo com sucesso!')
    } catch (err) {
      console.error('Erro ao salvar:', err)
      alert('Erro ao salvar relatorio')
    } finally {
      setSaving(false)
    }
  }

  // ── Toggle status ──
  async function toggleStatus() {
    const newStatus = status === 'aberto' ? 'fechado' : 'aberto'
    if (newStatus === 'fechado' && !confirm('Fechar o relatorio? Nao podera mais ser editado (admin pode reabrir).')) return
    setStatus(newStatus)
    if (relatorioId) {
      await supabase
        .from('relatorios_missionarios')
        .update({ status: newStatus, data_fechamento: newStatus === 'fechado' ? new Date().toISOString() : null })
        .eq('id', relatorioId)
    }
  }

  // ── Update daily field ──
  const updateDayField = useCallback((dia: number, field: string, value: any) => {
    setDailyData(prev => ({
      ...prev,
      [dia]: { ...prev[dia] || emptyDay(), [field]: value },
    }))
  }, [])

  // ── Totals computed ──
  const totals = useMemo(() => {
    const result: Record<string, number> = {}
    for (const f of RELATORIO_TODOS_CAMPOS) {
      result[f.key] = sumField(dailyData, f.key)
    }
    return result
  }, [dailyData])

  // ── Calendar grid ──
  const firstDayOfWeek = new Date(ano, mes - 1, 1).getDay() // 0=Sun

  const selectedMiss = missionarios.find(m => m.id === selectedId)
  const anos = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  // ── PDF Generation ──
  async function gerarPDF() {
    if (!reportRef.current) return
    const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true })
    const pdf = new jsPDF('l', 'mm', 'a4') // landscape for wide table
    const w = pdf.internal.pageSize.getWidth()
    const h = (canvas.height * w) / canvas.width
    const pageH = pdf.internal.pageSize.getHeight()
    if (h <= pageH) {
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, h)
    } else {
      let yOffset = 0
      while (yOffset < canvas.height) {
        const sliceH = Math.min(canvas.height - yOffset, (pageH / w) * canvas.width)
        const sliceCanvas = document.createElement('canvas')
        sliceCanvas.width = canvas.width
        sliceCanvas.height = sliceH
        const ctx = sliceCanvas.getContext('2d')!
        ctx.drawImage(canvas, 0, yOffset, canvas.width, sliceH, 0, 0, canvas.width, sliceH)
        const imgH = (sliceH * w) / canvas.width
        pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', 0, 0, w, imgH)
        yOffset += sliceH
        if (yOffset < canvas.height) pdf.addPage()
      }
    }
    const safeName = selectedMiss?.nome?.replace(/\s+/g, '-') || 'relatorio'
    pdf.save(`relatorio-${safeName}-${mes}-${ano}.pdf`)
  }

  if (loading && missionarios.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        <span className="ml-3 text-gray-500">Carregando...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <MissoesSubNav />

      {/* ── HEADER BAR ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="label-field text-xs">Missionario</label>
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            className="input-field"
          >
            <option value="">-- Selecione --</option>
            {missionarios.map(m => (
              <option key={m.id} value={m.id}>
                {m.nome || 'Sem nome'} — {CARGO_LABELS[m.cargo_ministerial] || m.cargo_ministerial}
              </option>
            ))}
          </select>
        </div>
        <div className="w-36">
          <label className="label-field text-xs">Mes</label>
          <select value={mes} onChange={e => setMes(Number(e.target.value))} className="input-field">
            {MESES_NOMES.map((n, i) => <option key={i} value={i + 1}>{n}</option>)}
          </select>
        </div>
        <div className="w-24">
          <label className="label-field text-xs">Ano</label>
          <select value={ano} onChange={e => setAno(Number(e.target.value))} className="input-field">
            {anos.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="flex items-end gap-2 pt-5">
          <button
            onClick={toggleStatus}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium ${
              status === 'aberto'
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-red-100 text-red-700 hover:bg-red-200'
            }`}
            title={status === 'aberto' ? 'Fechar relatorio' : 'Reabrir relatorio'}
          >
            {status === 'aberto' ? <FiUnlock size={14} /> : <FiLock size={14} />}
            {status === 'aberto' ? 'Aberto' : 'Fechado'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || isReadOnly || !selectedId}
            className="btn-primary inline-flex items-center gap-1.5 text-sm"
          >
            <FiSave size={14} />
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
          <button
            onClick={gerarPDF}
            disabled={!selectedId}
            className="btn-secondary inline-flex items-center gap-1.5 text-sm"
          >
            <FiDownload size={14} /> PDF
          </button>
        </div>
      </div>

      {!selectedId ? (
        <div className="card text-center py-16 text-gray-400">
          <FiClipboard className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Selecione um missionario para abrir o relatorio mensal</p>
        </div>
      ) : (
        <div className="flex gap-4">
          {/* ── LEFT: Calendar + Summary ── */}
          <div className="flex-1 space-y-4">

            {/* Calendar Grid */}
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <FiCalendar size={14} />
                {MESES_NOMES[mes - 1]} {ano}
              </h3>
              <div className="grid grid-cols-7 gap-1 text-center">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(d => (
                  <div key={d} className="text-xs font-medium text-gray-400 py-1">{d}</div>
                ))}
                {/* Empty cells for offset */}
                {Array.from({ length: firstDayOfWeek }, (_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {/* Day cells */}
                {Array.from({ length: numDays }, (_, i) => {
                  const dia = i + 1
                  const dayData = dailyData[dia]
                  const hasData = dayData && RELATORIO_TODOS_CAMPOS.some(f => Number((dayData as any)[f.key]) > 0)
                  const isSelected = selectedDay === dia

                  return (
                    <button
                      key={dia}
                      onClick={() => setSelectedDay(isSelected ? null : dia)}
                      className={`
                        relative w-full aspect-square rounded-lg text-sm font-medium transition-all
                        ${isSelected
                          ? 'bg-green-600 text-white ring-2 ring-green-400'
                          : hasData
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }
                      `}
                    >
                      {dia}
                      {hasData && !isSelected && (
                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-green-500" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Summary Totals */}
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Resumo do Mes</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {RELATORIO_TODOS_CAMPOS.map(f => {
                  const val = totals[f.key] || 0
                  if (val === 0) return null
                  return (
                    <div key={f.key} className="flex justify-between items-center px-3 py-2 bg-gray-50 rounded-lg">
                      <span className="text-xs text-gray-600 truncate mr-2">{f.label}</span>
                      <span className="text-sm font-bold text-gray-900">{val}</span>
                    </div>
                  )
                }).filter(Boolean)}
                {Object.values(totals).every(v => v === 0) && (
                  <p className="col-span-full text-center text-gray-400 text-sm py-4">Nenhum dado registrado</p>
                )}
              </div>
            </div>

            {/* Observacoes */}
            <div className="card">
              <label className="label-field text-xs">Observacoes do Mes</label>
              <textarea
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
                className="input-field"
                rows={2}
                disabled={isReadOnly}
                placeholder="Observacoes gerais do relatorio..."
              />
            </div>
          </div>

          {/* ── RIGHT: Day Entry Panel ── */}
          <div className="w-[400px] shrink-0">
            {selectedDay ? (
              <div className="card sticky top-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedDay(Math.max(1, selectedDay - 1))}
                      className="p-1 hover:bg-gray-100 rounded"
                      disabled={selectedDay <= 1}
                    >
                      <FiChevronLeft size={16} />
                    </button>
                    <h3 className="text-lg font-bold text-gray-800">
                      Dia {selectedDay}
                    </h3>
                    <button
                      onClick={() => setSelectedDay(Math.min(numDays, selectedDay + 1))}
                      className="p-1 hover:bg-gray-100 rounded"
                      disabled={selectedDay >= numDays}
                    >
                      <FiChevronRight size={16} />
                    </button>
                  </div>
                  <button onClick={() => setSelectedDay(null)} className="p-1 hover:bg-gray-100 rounded text-gray-400">
                    <FiX size={16} />
                  </button>
                </div>

                {/* Lugar de atividade */}
                <div className="mb-3">
                  <label className="label-field text-xs">Local da Atividade</label>
                  <input
                    type="text"
                    className="input-field"
                    value={(dailyData[selectedDay]?.lugar_atividade as string) || ''}
                    onChange={e => updateDayField(selectedDay, 'lugar_atividade', e.target.value)}
                    disabled={isReadOnly}
                    placeholder="Ex: Belem, Parauapebas..."
                  />
                </div>

                {/* Block tabs */}
                <div className="flex gap-1 mb-3 overflow-x-auto">
                  {[
                    { key: 'atividades' as const, label: 'Atividades' },
                    { key: 'horas' as const, label: 'Horas' },
                    { key: 'pastorais' as const, label: 'Pastorais' },
                    { key: 'despesas' as const, label: 'Despesas' },
                  ].map(b => (
                    <button
                      key={b.key}
                      onClick={() => setActiveBlock(b.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                        activeBlock === b.key ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>

                {/* Fields for selected block */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {(activeBlock === 'atividades' ? RELATORIO_ATIVIDADES_MISSIONARIAS :
                    activeBlock === 'horas' ? RELATORIO_HORAS :
                    activeBlock === 'pastorais' ? RELATORIO_PASTORAIS :
                    RELATORIO_DESPESAS
                  ).map(f => (
                    <div key={f.key} className="flex items-center gap-2">
                      <label className="text-xs text-gray-600 flex-1 truncate" title={f.label}>{f.label}</label>
                      <input
                        type="number"
                        min={0}
                        step={'decimal' in f && f.decimal ? '0.5' : 'currency' in f && f.currency ? '0.01' : '1'}
                        className="input-field w-20 text-right text-sm"
                        value={Number((dailyData[selectedDay] as any)?.[f.key]) || ''}
                        onChange={e => updateDayField(selectedDay, f.key, Number(e.target.value) || 0)}
                        disabled={isReadOnly}
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="card text-center py-12 text-gray-400 sticky top-4">
                <FiCalendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Clique em um dia no calendario para lancar atividades</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PRINTABLE REPORT (hidden until PDF) ── */}
      {selectedId && (
        <div ref={reportRef} className="bg-white p-6 space-y-4 print:p-2">
          {/* Header */}
          <div className="text-center border-b pb-3">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#006D43' }}>
              Igreja Adventista do Setimo Dia — Movimento de Reforma
            </p>
            <p className="text-sm font-semibold text-gray-700">Uniao Norte Nordeste Brasileira</p>
            <p className="text-base font-bold text-gray-900 mt-1">
              RELATORIO DE ATIVIDADES - {MESES_NOMES[mes - 1].toUpperCase()} {ano}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {selectedMiss?.nome} — {CARGO_LABELS[selectedMiss?.cargo_ministerial as keyof typeof CARGO_LABELS] || ''}
              {' | '}
              {(selectedMiss?.associacao as any)?.nome || ''}
            </p>
          </div>

          {/* Matrix table: fields x days */}
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-1 py-1 text-left font-medium text-gray-600 sticky left-0 bg-gray-100 min-w-[140px]">
                    Campo
                  </th>
                  {Array.from({ length: numDays }, (_, i) => (
                    <th key={i + 1} className="border px-0.5 py-1 text-center font-medium text-gray-500 w-7">
                      {i + 1}
                    </th>
                  ))}
                  <th className="border px-1 py-1 text-center font-bold text-gray-800 bg-green-50 min-w-[40px]">Total</th>
                </tr>
              </thead>
              <tbody>
                {/* Block separators with grouped fields */}
                {[
                  { title: 'ATIVIDADES MISSIONARIAS', fields: RELATORIO_ATIVIDADES_MISSIONARIAS },
                  { title: 'HORAS EMPREGADAS', fields: RELATORIO_HORAS },
                  { title: 'ATIVIDADES PASTORAIS', fields: RELATORIO_PASTORAIS },
                  { title: 'DESPESAS', fields: RELATORIO_DESPESAS },
                ].map(block => (
                  <>
                    <tr key={`sep-${block.title}`} className="bg-gray-200">
                      <td colSpan={numDays + 2} className="border px-2 py-1 font-bold text-gray-700 text-[9px] uppercase">
                        {block.title}
                      </td>
                    </tr>
                    {block.fields.map(f => {
                      const total = totals[f.key] || 0
                      return (
                        <tr key={f.key} className="hover:bg-gray-50">
                          <td className="border px-1 py-0.5 text-gray-700 sticky left-0 bg-white truncate">
                            {f.label}
                          </td>
                          {Array.from({ length: numDays }, (_, i) => {
                            const dia = i + 1
                            const val = Number((dailyData[dia] as any)?.[f.key]) || 0
                            return (
                              <td key={dia} className={`border px-0.5 py-0.5 text-center ${val > 0 ? 'text-gray-900 font-medium bg-green-50' : 'text-gray-300'}`}>
                                {val > 0 ? val : ''}
                              </td>
                            )
                          })}
                          <td className="border px-1 py-0.5 text-center font-bold text-green-700 bg-green-50">
                            {total > 0 ? total : ''}
                          </td>
                        </tr>
                      )
                    })}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-3 gap-8 mt-8 pt-4">
            <div className="text-center">
              <div className="border-t-2 border-gray-400 pt-2 mt-12">
                <p className="font-semibold text-gray-800 text-xs">{selectedMiss?.nome}</p>
                <p className="text-[10px] text-gray-500">
                  {CARGO_LABELS[selectedMiss?.cargo_ministerial as keyof typeof CARGO_LABELS] || ''}
                </p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t-2 border-gray-400 pt-2 mt-12">
                <p className="font-semibold text-gray-800 text-xs">Presidente da Associacao</p>
                <p className="text-[10px] text-gray-500">{(selectedMiss?.associacao as any)?.nome || ''}</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t-2 border-gray-400 pt-2 mt-12">
                <p className="font-semibold text-gray-800 text-xs">Presidente da Uniao</p>
                <p className="text-[10px] text-gray-500">Uniao Norte Nordeste Brasileira</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
