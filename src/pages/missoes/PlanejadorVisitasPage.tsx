import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Pessoa, Igreja, PlanoVisita } from '@/types'
import { generateGoogleCalendarUrl } from '@/lib/projections'
import { FiFilter, FiMapPin, FiCalendar, FiSave, FiChevronUp, FiChevronDown, FiX, FiGift, FiUserPlus, FiUserX, FiUsers, FiSearch } from 'react-icons/fi'
import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// Fix default Leaflet marker icon (Vite breaks it)
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

// Custom colored marker icons
function createColoredIcon(color: string) {
  return L.divIcon({
    html: `<div style="background:${color};width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  })
}

const MARKER_COLORS: Record<string, string> = {
  membro: '#006D43',
  interessado: '#3B82F6',
  inativo: '#EF4444',
}

type FilterToggle = 'aniversariantes' | 'recentes' | 'interessados' | 'inativos'

interface PessoaComVisita extends Pessoa {
  ultima_visita?: string | null
}

export default function PlanejadorVisitasPage() {
  const { profile } = useAuth()

  const [pessoas, setPessoas] = useState<PessoaComVisita[]>([])
  const [igrejas, setIgrejas] = useState<Igreja[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Filters
  const [activeFilters, setActiveFilters] = useState<Set<FilterToggle>>(new Set())
  const [filtroIgrejaId, setFiltroIgrejaId] = useState('')
  const [busca, setBusca] = useState('')
  const [dataInicio, setDataInicio] = useState(() => new Date().toISOString().split('T')[0])
  const [dataFim, setDataFim] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().split('T')[0]
  })

  // Selection & plan
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [orderedSelected, setOrderedSelected] = useState<PessoaComVisita[]>([])
  const [showPlanBuilder, setShowPlanBuilder] = useState(false)
  const [planSaved, setPlanSaved] = useState(false)

  // Existing plans
  const [planosExistentes, setPlanosExistentes] = useState<PlanoVisita[]>([])

  useEffect(() => {
    if (profile) {
      fetchData()
    }
  }, [profile])

  async function fetchData() {
    setLoading(true)
    try {
      await Promise.all([fetchIgrejas(), fetchPlanos()])
    } finally {
      setLoading(false)
    }
  }

  // Search pessoas by name (on demand, not on load)
  const [searching, setSearching] = useState(false)

  async function searchPessoas(termo: string) {
    if (!profile || termo.trim().length < 2) {
      setPessoas([])
      return
    }
    setSearching(true)
    try {
      let query = supabase
        .from('pessoas')
        .select('*')
        .ilike('nome', `%${termo.trim()}%`)
        .order('nome')
        .limit(50)

      if (profile.papel === 'admin_uniao') {
        query = query.eq('uniao_id', profile.uniao_id!)
      } else if (profile.papel === 'admin_associacao') {
        query = query.eq('associacao_id', profile.associacao_id!)
      } else if (profile.papel !== 'admin') {
        query = query.eq('igreja_id', profile.igreja_id!)
      }

      const { data, error } = await query
      if (error) {
        console.error('Erro ao buscar pessoas:', error)
        return
      }
      setPessoas(data || [])
    } finally {
      setSearching(false)
    }
  }

  // Debounce search
  useEffect(() => {
    if (busca.trim().length < 2) {
      setPessoas([])
      return
    }
    const timer = setTimeout(() => searchPessoas(busca), 400)
    return () => clearTimeout(timer)
  }, [busca]) // eslint-disable-line

  async function fetchIgrejas() {
    if (!profile) return
    let query = supabase
      .from('igrejas')
      .select('*')
      .eq('ativo', true)
      .order('nome')

    if (profile.papel === 'admin_uniao') {
      query = query.eq('uniao_id', profile.uniao_id!)
    } else if (profile.papel === 'admin_associacao') {
      query = query.eq('associacao_id', profile.associacao_id!)
    } else if (profile.papel !== 'admin') {
      query = query.eq('id', profile.igreja_id!)
    }

    const { data, error } = await query
    if (error) {
      console.error('Erro ao buscar igrejas:', error)
      return
    }
    setIgrejas(data || [])
  }

  async function fetchPlanos() {
    if (!profile) return
    let query = supabase
      .from('planos_visita')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (profile.papel !== 'admin') {
      query = query.eq('igreja_id', profile.igreja_id!)
    }

    const { data, error } = await query
    if (error) {
      console.error('Erro ao buscar planos:', error)
      return
    }
    setPlanosExistentes(data || [])
  }

  function toggleFilter(filter: FilterToggle) {
    const next = new Set(activeFilters)
    if (next.has(filter)) {
      next.delete(filter)
      if (next.size === 0 && !busca.trim()) setPessoas([])
    } else {
      next.add(filter)
      // Fetch data for this filter from server
      fetchByFilter(filter)
    }
    setActiveFilters(next)
  }

  async function fetchByFilter(filter: FilterToggle) {
    if (!profile) return
    setSearching(true)
    try {
      let query = supabase.from('pessoas').select('*').order('nome').limit(100)

      // Scope filter
      if (profile.papel === 'admin_uniao') query = query.eq('uniao_id', profile.uniao_id!)
      else if (profile.papel === 'admin_associacao') query = query.eq('associacao_id', profile.associacao_id!)
      else if (profile.papel !== 'admin') query = query.eq('igreja_id', profile.igreja_id!)

      if (filter === 'aniversariantes') {
        const currentMonth = new Date().getMonth() + 1
        // Fetch all with birth dates and filter client-side for month
        query = query.not('data_nascimento', 'is', null).eq('situacao', 'ativo')
      } else if (filter === 'recentes') {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        query = query.gte('created_at', thirtyDaysAgo.toISOString())
      } else if (filter === 'interessados') {
        query = query.eq('tipo', 'interessado')
      } else if (filter === 'inativos') {
        query = query.eq('situacao', 'inativo')
      }

      if (filtroIgrejaId) query = query.eq('igreja_id', filtroIgrejaId)

      const { data } = await query
      if (data) {
        // Merge with existing, dedup by id
        setPessoas(prev => {
          const map = new Map(prev.map(p => [p.id, p]))
          data.forEach(p => map.set(p.id, p))
          return [...map.values()]
        })
      }
    } finally {
      setSearching(false)
    }
  }

  const filteredPessoas = useMemo(() => {
    let result = [...pessoas]

    // Church filter (client-side, server already filtered by name)
    if (filtroIgrejaId) {
      result = result.filter(p => p.igreja_id === filtroIgrejaId)
    }

    // Toggle filters - combined with OR logic (match any active filter)
    if (activeFilters.size > 0) {
      const currentMonth = new Date().getMonth() + 1
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      result = result.filter(p => {
        if (activeFilters.has('aniversariantes')) {
          if (p.data_nascimento && new Date(p.data_nascimento).getMonth() + 1 === currentMonth) return true
        }
        if (activeFilters.has('recentes')) {
          if (p.created_at && new Date(p.created_at) > thirtyDaysAgo) return true
        }
        if (activeFilters.has('interessados')) {
          if (p.tipo === 'interessado') return true
        }
        if (activeFilters.has('inativos')) {
          if (p.situacao === 'inativo') return true
        }
        // If no filter matched but filters are active, exclude
        return false
      })
    }

    return result
  }, [pessoas, filtroIgrejaId, activeFilters])

  // All filtered people with coordinates for map display
  const allMapPessoas = useMemo(() => {
    return filteredPessoas.filter(p => p.coordenadas_lat && p.coordenadas_lng)
  }, [filteredPessoas])

  function toggleSelectPessoa(pessoa: PessoaComVisita) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(pessoa.id)) {
        next.delete(pessoa.id)
        setOrderedSelected(os => os.filter(p => p.id !== pessoa.id))
      } else {
        next.add(pessoa.id)
        setOrderedSelected(os => [...os, pessoa])
      }
      return next
    })
    setPlanSaved(false)
  }

  function selectAll() {
    const newIds = new Set(filteredPessoas.map(p => p.id))
    setSelectedIds(newIds)
    setOrderedSelected(filteredPessoas)
    setPlanSaved(false)
  }

  function clearSelection() {
    setSelectedIds(new Set())
    setOrderedSelected([])
    setPlanSaved(false)
    setShowPlanBuilder(false)
  }

  function moveItem(index: number, direction: 'up' | 'down') {
    setOrderedSelected(prev => {
      const arr = [...prev]
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= arr.length) return arr
      ;[arr[index], arr[targetIndex]] = [arr[targetIndex], arr[index]]
      return arr
    })
  }

  function removeFromPlan(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    setOrderedSelected(prev => prev.filter(p => p.id !== id))
  }

  async function salvarPlano() {
    if (!profile || orderedSelected.length === 0) return
    setSaving(true)
    try {
      const igrejaId = filtroIgrejaId || profile.igreja_id
      const plano = {
        titulo: `Plano de Visitas - ${new Date().toLocaleDateString('pt-BR')}`,
        data: dataInicio,
        visitador_id: profile.id,
        igreja_id: igrejaId,
        paradas: orderedSelected.map((p, i) => ({
          ordem: i + 1,
          pessoaId: p.id,
          endereco: `${p.endereco_rua || ''}, ${p.endereco_bairro || ''} - ${p.endereco_cidade || ''}`,
          coordenadas: { lat: p.coordenadas_lat || 0, lng: p.coordenadas_lng || 0 },
          visitaRealizada: false,
        })),
        rota_otimizada: false,
        status: 'planejado',
      }

      const { error } = await supabase.from('planos_visita').insert(plano)
      if (error) throw error
      setPlanSaved(true)
      fetchPlanos()
    } catch (err) {
      console.error('Erro ao salvar plano:', err)
      alert('Erro ao salvar o plano de visitas.')
    } finally {
      setSaving(false)
    }
  }

  function getGoogleCalendarUrl(pessoa: PessoaComVisita, index: number) {
    const endereco = [pessoa.endereco_rua, pessoa.endereco_numero, pessoa.endereco_bairro, pessoa.endereco_cidade, pessoa.endereco_estado].filter(Boolean).join(', ')
    return generateGoogleCalendarUrl({
      titulo: `Visita - ${pessoa.nome}`,
      descricao: `Visita pastoral a ${pessoa.nome}. ${pessoa.telefone ? 'Tel: ' + pessoa.telefone : ''}`,
      data: dataInicio,
      horaInicio: `${8 + index}:00`,
      horaFim: `${9 + index}:00`,
      local: endereco,
    })
  }

  function getBirthdayDisplay(pessoa: Pessoa): string | null {
    if (!pessoa.data_nascimento) return null
    const d = new Date(pessoa.data_nascimento)
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  function getTipoBadge(pessoa: Pessoa) {
    if (pessoa.situacao === 'inativo') {
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Inativo</span>
    }
    if (pessoa.tipo === 'interessado') {
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Interessado</span>
    }
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Membro</span>
  }

  // Map bounds
  const mapCenter = useMemo<[number, number]>(() => {
    const withCoords = allMapPessoas.length > 0 ? allMapPessoas : []
    if (withCoords.length === 0) return [-14.235, -51.925]
    const avgLat = withCoords.reduce((s, p) => s + (p.coordenadas_lat || 0), 0) / withCoords.length
    const avgLng = withCoords.reduce((s, p) => s + (p.coordenadas_lng || 0), 0) / withCoords.length
    return [avgLat, avgLng]
  }, [allMapPessoas])

  const mapZoom = allMapPessoas.length > 0 ? 10 : 4

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Planejador de Visitas</h1>
          <p className="text-gray-500 mt-1">
            {filteredPessoas.length} pessoa{filteredPessoas.length !== 1 ? 's' : ''} encontrada{filteredPessoas.length !== 1 ? 's' : ''}
            {selectedIds.size > 0 && ` | ${selectedIds.size} selecionada${selectedIds.size !== 1 ? 's' : ''}`}
          </p>
        </div>
        {selectedIds.size > 0 && (
          <button
            className="btn-primary inline-flex items-center gap-2 w-fit"
            onClick={() => setShowPlanBuilder(true)}
          >
            <FiMapPin className="w-4 h-4" />
            Criar Plano ({selectedIds.size})
          </button>
        )}
      </div>

      {/* Filter Panel */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <FiFilter className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-gray-700">Filtros</h2>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => toggleFilter('aniversariantes')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
              activeFilters.has('aniversariantes')
                ? 'bg-amber-50 border-amber-300 text-amber-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <FiGift className="w-4 h-4" />
            Aniversariantes do Mes
          </button>
          <button
            onClick={() => toggleFilter('recentes')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
              activeFilters.has('recentes')
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <FiUserPlus className="w-4 h-4" />
            Cadastrados Recentemente
          </button>
          <button
            onClick={() => toggleFilter('interessados')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
              activeFilters.has('interessados')
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <FiUsers className="w-4 h-4" />
            Interessados
          </button>
          <button
            onClick={() => toggleFilter('inativos')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
              activeFilters.has('inativos')
                ? 'bg-red-50 border-red-300 text-red-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <FiUserX className="w-4 h-4" />
            Membros Inativos
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label-field">Igreja</label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por nome..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          <div>
            <label className="label-field">Igreja</label>
            <select
              value={filtroIgrejaId}
              onChange={e => setFiltroIgrejaId(e.target.value)}
              className="input-field"
            >
              <option value="">Todas as igrejas</option>
              {igrejas.map(ig => (
                <option key={ig.id} value={ig.id}>{ig.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-field">Data Inicio</label>
            <input
              type="date"
              value={dataInicio}
              onChange={e => setDataInicio(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field">Data Fim</label>
            <input
              type="date"
              value={dataFim}
              onChange={e => setDataFim(e.target.value)}
              className="input-field"
            />
          </div>
        </div>
      </div>

      {/* Results Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left - List (60%) */}
        <div className="lg:col-span-3 space-y-3">
          {/* Bulk actions */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {filteredPessoas.length} resultado{filteredPessoas.length !== 1 ? 's' : ''}
            </span>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="text-xs text-primary-600 hover:underline"
              >
                Selecionar todos
              </button>
              {selectedIds.size > 0 && (
                <button
                  onClick={clearSelection}
                  className="text-xs text-red-500 hover:underline"
                >
                  Limpar selecao
                </button>
              )}
            </div>
          </div>

          {/* People cards */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredPessoas.length === 0 ? (
              <div className="card text-center py-8">
                {searching ? (
                  <p className="text-gray-400">Buscando...</p>
                ) : busca.trim().length === 0 ? (
                  <div>
                    <FiSearch className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">Digite o nome de uma pessoa para buscar.</p>
                    <p className="text-xs text-gray-400 mt-1">Mínimo 2 caracteres</p>
                  </div>
                ) : busca.trim().length < 2 ? (
                  <p className="text-gray-400">Digite pelo menos 2 caracteres...</p>
                ) : (
                  <p className="text-gray-500">Nenhuma pessoa encontrada para "{busca}".</p>
                )}
              </div>
            ) : (
              filteredPessoas.map(pessoa => {
                const isSelected = selectedIds.has(pessoa.id)
                const birthday = getBirthdayDisplay(pessoa)
                const currentMonth = new Date().getMonth() + 1
                const isBirthdayMonth = pessoa.data_nascimento && new Date(pessoa.data_nascimento).getMonth() + 1 === currentMonth

                return (
                  <div
                    key={pessoa.id}
                    onClick={() => toggleSelectPessoa(pessoa)}
                    className={`card cursor-pointer transition-all p-3 ${
                      isSelected
                        ? 'ring-2 ring-primary-500 bg-primary-50/30'
                        : 'hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <div className="mt-0.5">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-primary-600 border-primary-600'
                            : 'border-gray-300'
                        }`}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-800 truncate">{pessoa.nome}</span>
                          {getTipoBadge(pessoa)}
                          {isBirthdayMonth && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 inline-flex items-center gap-1">
                              <FiGift className="w-3 h-3" /> {birthday}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
                          {pessoa.endereco_cidade && (
                            <span className="inline-flex items-center gap-1">
                              <FiMapPin className="w-3 h-3" />
                              {pessoa.endereco_bairro ? `${pessoa.endereco_bairro}, ` : ''}{pessoa.endereco_cidade}
                            </span>
                          )}
                          {pessoa.telefone && (
                            <span>{pessoa.telefone}</span>
                          )}
                          {pessoa.celular && !pessoa.telefone && (
                            <span>{pessoa.celular}</span>
                          )}
                          {pessoa.coordenadas_lat && (
                            <span className="text-green-600">GPS</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right - Map (40%) */}
        <div className="lg:col-span-2">
          <div className="card p-0 overflow-hidden sticky top-4" style={{ height: '500px' }}>
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {allMapPessoas.map(pessoa => {
                const isSelected = selectedIds.has(pessoa.id)
                const markerColor = isSelected
                  ? '#F59E0B'
                  : pessoa.situacao === 'inativo'
                    ? MARKER_COLORS.inativo
                    : pessoa.tipo === 'interessado'
                      ? MARKER_COLORS.interessado
                      : MARKER_COLORS.membro

                return (
                  <Marker
                    key={pessoa.id}
                    position={[pessoa.coordenadas_lat!, pessoa.coordenadas_lng!]}
                    icon={createColoredIcon(markerColor)}
                    eventHandlers={{
                      click: () => toggleSelectPessoa(pessoa),
                    }}
                  >
                    <Popup>
                      <div className="text-sm">
                        <strong>{pessoa.nome}</strong>
                        <br />
                        <span className="text-gray-500">{pessoa.tipo === 'interessado' ? 'Interessado' : 'Membro'}</span>
                        {pessoa.endereco_bairro && (
                          <>
                            <br />
                            <span className="text-gray-500">{pessoa.endereco_bairro}, {pessoa.endereco_cidade}</span>
                          </>
                        )}
                        {pessoa.telefone && (
                          <>
                            <br />
                            <span className="text-gray-500">{pessoa.telefone}</span>
                          </>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                )
              })}
            </MapContainer>

            {/* Map legend */}
            <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs z-[1000] shadow">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: MARKER_COLORS.membro }} />
                  <span>Membro</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: MARKER_COLORS.interessado }} />
                  <span>Interessado</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: MARKER_COLORS.inativo }} />
                  <span>Inativo</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <span>Selecionado</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Visit Plan Builder Modal */}
      {showPlanBuilder && orderedSelected.length > 0 && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Plano de Visitas</h2>
                <p className="text-sm text-gray-500">{orderedSelected.length} parada{orderedSelected.length !== 1 ? 's' : ''} - {dataInicio}</p>
              </div>
              <button
                onClick={() => setShowPlanBuilder(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Plan items */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
              {orderedSelected.map((pessoa, index) => (
                <div
                  key={pessoa.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100"
                >
                  {/* Order number */}
                  <div className="w-7 h-7 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                    {index + 1}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{pessoa.nome}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {[pessoa.endereco_rua, pessoa.endereco_bairro, pessoa.endereco_cidade].filter(Boolean).join(', ') || 'Sem endereco'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => moveItem(index, 'up')}
                      disabled={index === 0}
                      className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 transition-colors"
                      title="Mover para cima"
                    >
                      <FiChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveItem(index, 'down')}
                      disabled={index === orderedSelected.length - 1}
                      className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 transition-colors"
                      title="Mover para baixo"
                    >
                      <FiChevronDown className="w-4 h-4" />
                    </button>
                    <a
                      href={getGoogleCalendarUrl(pessoa, index)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 hover:bg-blue-100 rounded text-blue-600 transition-colors"
                      title="Google Agenda"
                      onClick={e => e.stopPropagation()}
                    >
                      <FiCalendar className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => removeFromPlan(pessoa.id)}
                      className="p-1 hover:bg-red-100 rounded text-red-500 transition-colors"
                      title="Remover"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              {planSaved ? (
                <span className="text-sm text-green-600 font-medium">Plano salvo com sucesso!</span>
              ) : (
                <span className="text-sm text-gray-400">Reordene as paradas como desejar</span>
              )}
              <div className="flex gap-2">
                <button
                  className="btn-secondary"
                  onClick={() => setShowPlanBuilder(false)}
                >
                  Fechar
                </button>
                <button
                  className="btn-primary inline-flex items-center gap-2"
                  onClick={salvarPlano}
                  disabled={saving || planSaved}
                >
                  <FiSave className="w-4 h-4" />
                  {saving ? 'Salvando...' : planSaved ? 'Salvo' : 'Salvar Plano'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Existing Plans */}
      {planosExistentes.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Planos Recentes</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3">Titulo</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3 text-center">Paradas</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {planosExistentes.map(plano => (
                  <tr key={plano.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{plano.titulo}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {plano.data ? new Date(plano.data + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {plano.paradas?.length || 0}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        plano.status === 'concluido'
                          ? 'bg-green-100 text-green-700'
                          : plano.status === 'em_andamento'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-100 text-blue-700'
                      }`}>
                        {plano.status === 'concluido' ? 'Concluido' : plano.status === 'em_andamento' ? 'Em andamento' : 'Planejado'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
