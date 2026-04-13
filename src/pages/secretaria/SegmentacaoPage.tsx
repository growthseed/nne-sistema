import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { calcularIdade } from '@/lib/secretaria-constants'
import { exportToExcel, exportToPDF } from '@/lib/export-utils'
import {
  HiOutlineUserGroup, HiOutlineFilter, HiOutlineDownload,
  HiOutlineRefresh, HiOutlinePhone,
  HiOutlineMail, HiOutlineEye, HiOutlineExclamation
} from 'react-icons/hi'

// ── Types ──────────────────────────────────────────────────

interface PessoaSegmento {
  pessoa_id: string
  nome: string
  celular: string | null
  telefone: string | null
  email: string | null
  data_nascimento: string | null
  estado_civil: string | null
  conjuge_nome: string | null
  endereco_cidade: string | null
  endereco_estado: string | null
  igreja_nome: string | null
  associacao_id: string | null
  tipo: string
  situacao: string
  cargo: string | null
  // From renda view
  dizimo_12m_total: number
  ofertas_12m_total: number
  contribuicao_12m_total: number
  meses_com_dizimo_12m: number
  renda_mensal_estimada: number | null
  ultimo_yyyymm: number | null
}

const ESTADO_CIVIL_OPTIONS = [
  { value: '', label: 'Qualquer' },
  { value: 'casado', label: 'Casado(a)' },
  { value: 'solteiro', label: 'Solteiro(a)' },
  { value: 'viuvo', label: 'Viúvo(a)' },
  { value: 'divorciado', label: 'Divorciado(a)' },
  { value: 'separado', label: 'Separado(a)' },
  { value: 'uniao_estavel', label: 'União Estável' },
]

const FAIXAS_RENDA = [
  { label: 'Qualquer', min: 0, max: Infinity },
  { label: 'Até R$ 3.000', min: 0, max: 3000 },
  { label: 'R$ 3.000 – 5.000', min: 3000, max: 5000 },
  { label: 'R$ 5.000 – 10.000', min: 5000, max: 10000 },
  { label: 'R$ 10.000 – 20.000', min: 10000, max: 20000 },
  { label: 'R$ 20.000 – 50.000', min: 20000, max: 50000 },
  { label: 'Acima de R$ 50.000', min: 50000, max: Infinity },
]

// ── Component ──────────────────────────────────────────────

export default function SegmentacaoPage() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [pessoas, setPessoas] = useState<PessoaSegmento[]>([])
  const [igrejas, setIgrejas] = useState<{ id: string; nome: string }[]>([])

  // Filters
  const [estadoCivil, setEstadoCivil] = useState('')
  const [faixaRendaIdx, setFaixaRendaIdx] = useState(0)
  const [igrejaId, setIgrejaId] = useState('')
  const [requireConjuge, setRequireConjuge] = useState(false)
  const [minMesesAtivos, setMinMesesAtivos] = useState(3)
  const [busca, setBusca] = useState('')
  const [idadeMin, setIdadeMin] = useState('')
  const [idadeMax, setIdadeMax] = useState('')
  const [apenasComContato, setApenasComContato] = useState(false)
  const [apenasMembrosAtivos, setApenasMembrosAtivos] = useState(true)

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (profile) loadData()
  }, [profile]) // eslint-disable-line

  async function loadData() {
    setLoading(true)
    try {
      // 1. Load pessoa_renda_estimada joined with pessoas + igreja
      // The view returns one row per pessoa with aggregated 12m totals
      const { data: rendaData, error: rendaErr } = await supabase
        .from('pessoa_renda_estimada')
        .select(`
          pessoa_id,
          dizimo_12m_total,
          ofertas_12m_total,
          contribuicao_12m_total,
          meses_com_dizimo_12m,
          renda_mensal_estimada,
          ultimo_yyyymm,
          pessoa:pessoas!inner(
            id, nome, celular, telefone, email,
            data_nascimento, estado_civil, conjuge_nome,
            endereco_cidade, endereco_estado,
            tipo, situacao, cargo,
            associacao_id,
            igreja:igrejas(id, nome)
          )
        `)
        .order('renda_mensal_estimada', { ascending: false, nullsFirst: false })
        .limit(2000)
      if (rendaErr) throw rendaErr

      const mapped: PessoaSegmento[] = (rendaData || []).map((r: any) => ({
        pessoa_id: r.pessoa_id,
        nome: r.pessoa?.nome || '?',
        celular: r.pessoa?.celular || null,
        telefone: r.pessoa?.telefone || null,
        email: r.pessoa?.email || null,
        data_nascimento: r.pessoa?.data_nascimento || null,
        estado_civil: r.pessoa?.estado_civil || null,
        conjuge_nome: r.pessoa?.conjuge_nome || null,
        endereco_cidade: r.pessoa?.endereco_cidade || null,
        endereco_estado: r.pessoa?.endereco_estado || null,
        igreja_nome: r.pessoa?.igreja?.nome || null,
        associacao_id: r.pessoa?.associacao_id || null,
        tipo: r.pessoa?.tipo || 'membro',
        situacao: r.pessoa?.situacao || 'ativo',
        cargo: r.pessoa?.cargo || null,
        dizimo_12m_total: parseFloat(r.dizimo_12m_total || 0),
        ofertas_12m_total: parseFloat(r.ofertas_12m_total || 0),
        contribuicao_12m_total: parseFloat(r.contribuicao_12m_total || 0),
        meses_com_dizimo_12m: r.meses_com_dizimo_12m || 0,
        renda_mensal_estimada: r.renda_mensal_estimada != null ? parseFloat(r.renda_mensal_estimada) : null,
        ultimo_yyyymm: r.ultimo_yyyymm,
      }))
      setPessoas(mapped)

      // 2. Load distinct igrejas for filter dropdown
      const igrejaSet = new Map<string, string>()
      for (const p of mapped) {
        const ig = (rendaData?.find((x: any) => x.pessoa_id === p.pessoa_id) as any)?.pessoa?.igreja
        if (ig?.id && ig?.nome) igrejaSet.set(ig.id, ig.nome)
      }
      setIgrejas([...igrejaSet.entries()].map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome)))
    } catch (err) {
      console.error('Erro:', err)
    } finally {
      setLoading(false)
    }
  }

  // ── Filtering ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    const faixa = FAIXAS_RENDA[faixaRendaIdx]
    const buscaNorm = busca.trim().toLowerCase()
    const minIdade = idadeMin ? parseInt(idadeMin) : 0
    const maxIdade = idadeMax ? parseInt(idadeMax) : 200

    return pessoas.filter(p => {
      // Renda
      const renda = p.renda_mensal_estimada || 0
      if (renda < faixa.min || renda > faixa.max) return false

      // Estado civil
      if (estadoCivil && p.estado_civil !== estadoCivil) return false

      // Cônjuge requerido (para eventos de casais)
      if (requireConjuge && !p.conjuge_nome) return false

      // Igreja
      if (igrejaId && p.igreja_nome !== igrejas.find(i => i.id === igrejaId)?.nome) return false

      // Meses ativos
      if (p.meses_com_dizimo_12m < minMesesAtivos) return false

      // Busca por nome
      if (buscaNorm && !p.nome.toLowerCase().includes(buscaNorm)) return false

      // Idade
      if (p.data_nascimento) {
        const idade = calcularIdade(p.data_nascimento)
        if (idade < minIdade || idade > maxIdade) return false
      } else if (idadeMin || idadeMax) {
        return false // sem data → não passa filtro de idade
      }

      // Contato
      if (apenasComContato && !p.celular && !p.telefone && !p.email) return false

      // Apenas membros ativos
      if (apenasMembrosAtivos) {
        if (p.tipo !== 'membro') return false
        if (p.situacao !== 'ativo') return false
      }

      return true
    })
  }, [pessoas, igrejas, estadoCivil, faixaRendaIdx, igrejaId, requireConjuge, minMesesAtivos, busca, idadeMin, idadeMax, apenasComContato, apenasMembrosAtivos])

  // ── Stats ──────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = filtered.length
    const sumRenda = filtered.reduce((s, p) => s + (p.renda_mensal_estimada || 0), 0)
    const avgRenda = total > 0 ? sumRenda / total : 0
    const sumDizimo = filtered.reduce((s, p) => s + p.dizimo_12m_total, 0)
    const comCelular = filtered.filter(p => p.celular).length
    return { total, sumRenda, avgRenda, sumDizimo, comCelular }
  }, [filtered])

  // ── Selection ──────────────────────────────────────────────
  const allSelected = filtered.length > 0 && filtered.every(p => selectedIds.has(p.pessoa_id))
  function toggleAll() {
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(filtered.map(p => p.pessoa_id)))
  }
  function toggleOne(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const selectionForExport = filtered.filter(p => selectedIds.size === 0 || selectedIds.has(p.pessoa_id))

  // ── Export ─────────────────────────────────────────────────
  function fmtMoney(v: number | null) {
    if (v == null) return ''
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  }

  function handleExportExcel() {
    const rows = selectionForExport.map(p => ({
      nome: p.nome,
      conjuge: p.conjuge_nome || '',
      estado_civil: p.estado_civil || '',
      idade: p.data_nascimento ? calcularIdade(p.data_nascimento) : '',
      igreja: p.igreja_nome || '',
      cidade: p.endereco_cidade || '',
      uf: p.endereco_estado || '',
      celular: p.celular || '',
      telefone: p.telefone || '',
      email: p.email || '',
      renda_mensal_estimada: fmtMoney(p.renda_mensal_estimada),
      dizimo_12m: fmtMoney(p.dizimo_12m_total),
      meses_ativos: p.meses_com_dizimo_12m,
    }))
    exportToExcel(rows, [
      { header: 'Nome', key: 'nome', width: 35 },
      { header: 'Cônjuge', key: 'conjuge', width: 30 },
      { header: 'Estado Civil', key: 'estado_civil', width: 14 },
      { header: 'Idade', key: 'idade', width: 6 },
      { header: 'Igreja', key: 'igreja', width: 25 },
      { header: 'Cidade', key: 'cidade', width: 18 },
      { header: 'UF', key: 'uf', width: 5 },
      { header: 'Celular', key: 'celular', width: 14 },
      { header: 'Telefone', key: 'telefone', width: 14 },
      { header: 'E-mail', key: 'email', width: 28 },
      { header: 'Renda Mensal Est.', key: 'renda_mensal_estimada', width: 16 },
      { header: 'Dízimo 12m', key: 'dizimo_12m', width: 14 },
      { header: 'Meses Ativos', key: 'meses_ativos', width: 12 },
    ], `segmentacao_${new Date().toISOString().slice(0, 10)}`)
  }

  function handleExportPDF() {
    const rows = selectionForExport.map(p => ({
      nome: p.nome,
      conjuge: p.conjuge_nome || '-',
      igreja: p.igreja_nome || '-',
      celular: p.celular || '-',
      renda: fmtMoney(p.renda_mensal_estimada),
    }))
    exportToPDF(rows, [
      { header: 'Nome', key: 'nome' },
      { header: 'Cônjuge', key: 'conjuge' },
      { header: 'Igreja', key: 'igreja' },
      { header: 'Celular', key: 'celular' },
      { header: 'Renda Estimada', key: 'renda' },
    ], `segmentacao_${new Date().toISOString().slice(0, 10)}`, 'Lista de Segmentação')
  }

  function getWhatsAppLink(p: PessoaSegmento) {
    const phone = (p.celular || p.telefone || '').replace(/\D/g, '')
    if (!phone) return null
    const wa = phone.startsWith('55') ? phone : `55${phone}`
    return `https://wa.me/${wa}`
  }

  // ── Render ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-gray-200 rounded-lg animate-pulse" />)}
        </div>
        <div className="h-96 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <HiOutlineUserGroup className="w-7 h-7 text-primary-600" />
            Segmentação de Membros
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Filtre membros por renda estimada (dízimo × 10), estado civil e mais para criar listas de eventos.
          </p>
        </div>
        <button
          onClick={loadData}
          className="btn-secondary inline-flex items-center gap-2 text-sm w-fit"
        >
          <HiOutlineRefresh className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {/* Disclaimer */}
      <div className="card bg-amber-50 border-amber-200 p-3 flex items-start gap-3">
        <HiOutlineExclamation className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        <div className="text-xs text-amber-800">
          <p className="font-medium">Renda estimada = média do dízimo dos meses ativos × 10.</p>
          <p>É uma <strong>aproximação</strong>: pessoas que devolvem dízimo de outras fontes ou em períodos irregulares podem ter estimativas imprecisas. Use como ponto de partida, não como verdade absoluta.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card py-3 text-center">
          <p className="text-2xl font-bold text-primary-600">{stats.total}</p>
          <p className="text-xs text-gray-500">Membros na seleção</p>
        </div>
        <div className="card py-3 text-center">
          <p className="text-2xl font-bold text-emerald-600">
            R$ {stats.avgRenda.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-gray-500">Renda média estimada</p>
        </div>
        <div className="card py-3 text-center">
          <p className="text-2xl font-bold text-blue-600">
            R$ {(stats.sumDizimo / 1000).toFixed(0)}k
          </p>
          <p className="text-xs text-gray-500">Total dízimos 12m</p>
        </div>
        <div className="card py-3 text-center">
          <p className="text-2xl font-bold text-purple-600">{stats.comCelular}</p>
          <p className="text-xs text-gray-500">Com celular</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
          <HiOutlineFilter className="w-4 h-4" />
          Filtros
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Renda */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Faixa de renda</label>
            <select
              className="input-field text-sm"
              value={faixaRendaIdx}
              onChange={e => setFaixaRendaIdx(parseInt(e.target.value))}
            >
              {FAIXAS_RENDA.map((f, i) => <option key={i} value={i}>{f.label}</option>)}
            </select>
          </div>
          {/* Estado civil */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Estado civil</label>
            <select
              className="input-field text-sm"
              value={estadoCivil}
              onChange={e => setEstadoCivil(e.target.value)}
            >
              {ESTADO_CIVIL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {/* Igreja */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Igreja</label>
            <select
              className="input-field text-sm"
              value={igrejaId}
              onChange={e => setIgrejaId(e.target.value)}
            >
              <option value="">Todas</option>
              {igrejas.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
            </select>
          </div>
          {/* Min meses ativos */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Min. meses ativos (12m)</label>
            <input
              type="number"
              className="input-field text-sm"
              value={minMesesAtivos}
              min={0}
              max={12}
              onChange={e => setMinMesesAtivos(parseInt(e.target.value || '0'))}
            />
          </div>
          {/* Idade min */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Idade mín.</label>
            <input
              type="number"
              className="input-field text-sm"
              value={idadeMin}
              placeholder="—"
              onChange={e => setIdadeMin(e.target.value)}
            />
          </div>
          {/* Idade max */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Idade máx.</label>
            <input
              type="number"
              className="input-field text-sm"
              value={idadeMax}
              placeholder="—"
              onChange={e => setIdadeMax(e.target.value)}
            />
          </div>
          {/* Busca */}
          <div className="lg:col-span-2">
            <label className="text-xs text-gray-500 block mb-1">Buscar por nome</label>
            <input
              type="text"
              className="input-field text-sm"
              value={busca}
              placeholder="Digite parte do nome..."
              onChange={e => setBusca(e.target.value)}
            />
          </div>
        </div>
        {/* Toggles */}
        <div className="flex flex-wrap gap-4 pt-2 border-t border-gray-100">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={requireConjuge}
              onChange={e => setRequireConjuge(e.target.checked)}
              className="rounded text-primary-600"
            />
            Apenas com cônjuge cadastrado (eventos de casais)
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={apenasComContato}
              onChange={e => setApenasComContato(e.target.checked)}
              className="rounded text-primary-600"
            />
            Apenas com telefone ou e-mail
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={apenasMembrosAtivos}
              onChange={e => setApenasMembrosAtivos(e.target.checked)}
              className="rounded text-primary-600"
            />
            Apenas membros ativos
          </label>
        </div>
      </div>

      {/* Actions bar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-600">
          {selectedIds.size > 0 ? <strong>{selectedIds.size} selecionados</strong> : `${filtered.length} resultados`}
        </span>
        <div className="flex-1" />
        {selectedIds.size > 0 && (
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-gray-500 hover:text-gray-700 px-2"
          >
            Limpar seleção
          </button>
        )}
        <button
          onClick={handleExportExcel}
          disabled={filtered.length === 0}
          className="btn-secondary inline-flex items-center gap-1.5 text-sm disabled:opacity-50"
        >
          <HiOutlineDownload className="w-4 h-4" />
          Excel
        </button>
        <button
          onClick={handleExportPDF}
          disabled={filtered.length === 0}
          className="btn-secondary inline-flex items-center gap-1.5 text-sm disabled:opacity-50"
        >
          <HiOutlineDownload className="w-4 h-4" />
          PDF
        </button>
      </div>

      {/* Results table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-3 py-2.5 w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="rounded text-primary-600"
                  />
                </th>
                <th className="px-3 py-2.5">Nome</th>
                <th className="px-3 py-2.5 hidden md:table-cell">Cônjuge</th>
                <th className="px-3 py-2.5 hidden md:table-cell">Igreja</th>
                <th className="px-3 py-2.5 hidden lg:table-cell text-center">Idade</th>
                <th className="px-3 py-2.5 text-right">Renda Estimada</th>
                <th className="px-3 py-2.5 hidden lg:table-cell text-right">Dízimo 12m</th>
                <th className="px-3 py-2.5 hidden lg:table-cell text-center">Meses</th>
                <th className="px-3 py-2.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-400">
                    <HiOutlineUserGroup className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    Nenhum membro encontrado com esses filtros
                  </td>
                </tr>
              ) : filtered.slice(0, 500).map(p => {
                const isSelected = selectedIds.has(p.pessoa_id)
                const wa = getWhatsAppLink(p)
                return (
                  <tr
                    key={p.pessoa_id}
                    className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-primary-50/50' : ''}`}
                  >
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(p.pessoa_id)}
                        className="rounded text-primary-600"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-gray-800">{p.nome}</div>
                      <div className="text-xs text-gray-400 md:hidden">
                        {p.igreja_nome || '—'}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 hidden md:table-cell text-gray-600 text-xs">
                      {p.conjuge_nome || '—'}
                    </td>
                    <td className="px-3 py-2.5 hidden md:table-cell text-gray-600 text-xs">
                      {p.igreja_nome || '—'}
                    </td>
                    <td className="px-3 py-2.5 hidden lg:table-cell text-center text-gray-600">
                      {p.data_nascimento ? calcularIdade(p.data_nascimento) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="font-semibold text-emerald-700">
                        {p.renda_mensal_estimada != null
                          ? `R$ ${p.renda_mensal_estimada.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
                          : '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 hidden lg:table-cell text-right text-gray-600 text-xs">
                      R$ {p.dizimo_12m_total.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-3 py-2.5 hidden lg:table-cell text-center text-gray-500 text-xs">
                      {p.meses_com_dizimo_12m}/12
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        {wa && (
                          <a
                            href={wa}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-7 h-7 rounded-md bg-green-50 hover:bg-green-100 text-green-600 flex items-center justify-center"
                            title="WhatsApp"
                          >
                            <HiOutlinePhone className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {p.email && (
                          <a
                            href={`mailto:${p.email}`}
                            className="w-7 h-7 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center"
                            title="E-mail"
                          >
                            <HiOutlineMail className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <Link
                          to={`/membros/${p.pessoa_id}`}
                          className="w-7 h-7 rounded-md bg-gray-100 hover:bg-primary-100 hover:text-primary-600 text-gray-500 flex items-center justify-center"
                          title="Ver perfil"
                        >
                          <HiOutlineEye className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {filtered.length > 500 && (
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 text-center">
            Mostrando 500 de {filtered.length} resultados. Refine os filtros ou exporte para ver tudo.
          </div>
        )}
      </div>
    </div>
  )
}
