import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Igreja, Associacao } from '@/types'
import { FiMapPin, FiAlertCircle } from 'react-icons/fi'
import { HiOutlineOfficeBuilding, HiOutlineUserGroup, HiOutlineGlobe } from 'react-icons/hi'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
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

type IgrejaComAssociacao = Igreja & {
  associacao: { nome: string; sigla: string } | null
}

interface CidadeDensidade {
  cidade: string
  estado: string
  membros: number
  interessados: number
  igrejas: number
  lat?: number
  lng?: number
}

const CORES_ASSOCIACAO = [
  '#006D43', '#0F3999', '#3B82F6', '#EF4444',
  '#F59E0B', '#8B5CF6', '#10B981', '#EC4899',
]

type Camada = 'igrejas' | 'densidade'

export default function MapasPage() {
  const { profile } = useAuth()

  const [igrejas, setIgrejas] = useState<IgrejaComAssociacao[]>([])
  const [associacoes, setAssociacoes] = useState<Associacao[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroAssociacao, setFiltroAssociacao] = useState('')
  const [camada, setCamada] = useState<Camada>('igrejas')

  // Density data
  const [cidadesDensidade, setCidadesDensidade] = useState<CidadeDensidade[]>([])

  useEffect(() => {
    if (profile) fetchData()
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchData() {
    setLoading(true)
    try {
      await Promise.all([fetchIgrejas(), fetchAssociacoes(), fetchDensidade()])
    } finally {
      setLoading(false)
    }
  }

  async function fetchIgrejas() {
    if (!profile) return
    let query = supabase
      .from('igrejas')
      .select('*, membros_ativos, interessados, associacao:associacoes(nome, sigla)')
      .eq('ativo', true)
      .order('nome')

    if (profile.papel === 'admin_uniao') {
      query = query.eq('uniao_id', profile.uniao_id!)
    } else if (profile.papel === 'admin_associacao') {
      query = query.eq('associacao_id', profile.associacao_id!)
    } else if (profile.papel !== 'admin') {
      if (profile.igreja_id) query = query.eq('id', profile.igreja_id)
    }

    const { data, error } = await query
    if (error) { console.error('Erro ao buscar igrejas:', error); return }
    setIgrejas((data || []) as IgrejaComAssociacao[])
  }

  async function fetchAssociacoes() {
    if (!profile) return
    let query = supabase
      .from('associacoes')
      .select('*')
      .eq('ativo', true)
      .order('nome')

    if (profile.papel === 'admin_uniao') query = query.eq('uniao_id', profile.uniao_id!)
    else if (profile.papel === 'admin_associacao') query = query.eq('id', profile.associacao_id!)

    const { data, error } = await query
    if (error) { console.error('Erro ao buscar associações:', error); return }
    setAssociacoes(data || [])
  }

  async function fetchDensidade() {
    try {
      const { data } = await supabase
        .from('pessoas')
        .select('endereco_cidade, endereco_estado, tipo, situacao')
        .in('situacao', ['ativo', 'inativo'])
        .not('endereco_cidade', 'is', null)

      if (!data) return

      // Aggregate by city
      const byCity: Record<string, { membros: number; interessados: number }> = {}
      data.forEach(p => {
        if (!p.endereco_cidade) return
        const key = `${p.endereco_cidade}|${p.endereco_estado || ''}`
        if (!byCity[key]) byCity[key] = { membros: 0, interessados: 0 }
        if (p.tipo === 'membro') byCity[key].membros++
        else byCity[key].interessados++
      })

      // Count churches per city
      const cidadesResult: CidadeDensidade[] = Object.entries(byCity).map(([key, counts]) => {
        const [cidade, estado] = key.split('|')
        // Find a church in this city for coordinates
        const igrejaCidade = igrejas.find(ig =>
          ig.endereco_cidade?.toLowerCase() === cidade.toLowerCase() &&
          ig.coordenadas_lat != null
        )
        const igrejasCount = igrejas.filter(ig =>
          ig.endereco_cidade?.toLowerCase() === cidade.toLowerCase()
        ).length

        return {
          cidade,
          estado,
          membros: counts.membros,
          interessados: counts.interessados,
          igrejas: igrejasCount,
          lat: igrejaCidade?.coordenadas_lat ?? undefined,
          lng: igrejaCidade?.coordenadas_lng ?? undefined,
        }
      }).sort((a, b) => b.membros - a.membros)

      setCidadesDensidade(cidadesResult)
    } catch (err) {
      console.error('Erro ao buscar densidade:', err)
    }
  }

  // Map associacao_id -> color index
  const coresMap = useMemo(() => {
    const map: Record<string, string> = {}
    const ids = [...new Set(igrejas.map(ig => ig.associacao_id))].sort()
    ids.forEach((id, i) => { map[id] = CORES_ASSOCIACAO[i % CORES_ASSOCIACAO.length] })
    return map
  }, [igrejas])

  const igrejasFiltradas = useMemo(() => {
    if (!filtroAssociacao) return igrejas
    return igrejas.filter(ig => ig.associacao_id === filtroAssociacao)
  }, [igrejas, filtroAssociacao])

  const igrejasNoMapa = useMemo(
    () => igrejasFiltradas.filter(ig => ig.coordenadas_lat != null && ig.coordenadas_lng != null),
    [igrejasFiltradas]
  )

  const igrejasSemCoords = useMemo(
    () => igrejasFiltradas.filter(ig => ig.coordenadas_lat == null || ig.coordenadas_lng == null),
    [igrejasFiltradas]
  )

  const totalMembros = useMemo(() => {
    return igrejasFiltradas.reduce((sum, ig) => sum + ((ig as any).membros_ativos || 0), 0)
  }, [igrejasFiltradas])

  const cidadesComCoords = useMemo(
    () => cidadesDensidade.filter(c => c.lat != null && c.lng != null),
    [cidadesDensidade]
  )

  const totalCidades = cidadesDensidade.length
  const cidadesComIgreja = cidadesDensidade.filter(c => c.igrejas > 0).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Carregando mapa...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Mapa Territorial</h1>
        <p className="text-gray-500 mt-1">Visualização geográfica e densidade de membros</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="card flex items-start gap-3">
          <div className="bg-blue-500 p-2.5 rounded-xl text-white">
            <HiOutlineOfficeBuilding className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500">Igrejas</p>
            <p className="text-xl font-bold text-gray-800">{igrejasFiltradas.length}</p>
          </div>
        </div>
        <div className="card flex items-start gap-3">
          <div className="bg-green-500 p-2.5 rounded-xl text-white">
            <FiMapPin className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500">No Mapa</p>
            <p className="text-xl font-bold text-gray-800">{igrejasNoMapa.length}</p>
          </div>
        </div>
        <div className="card flex items-start gap-3">
          <div className="bg-purple-500 p-2.5 rounded-xl text-white">
            <HiOutlineUserGroup className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500">Membros</p>
            <p className="text-xl font-bold text-gray-800">{totalMembros.toLocaleString('pt-BR')}</p>
          </div>
        </div>
        <div className="card flex items-start gap-3">
          <div className="bg-teal-500 p-2.5 rounded-xl text-white">
            <HiOutlineGlobe className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500">Cidades</p>
            <p className="text-xl font-bold text-gray-800">{totalCidades}</p>
          </div>
        </div>
        <div className="card flex items-start gap-3">
          <div className="bg-amber-500 p-2.5 rounded-xl text-white">
            <FiAlertCircle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500">Sem Igreja</p>
            <p className="text-xl font-bold text-gray-800">{totalCidades - cidadesComIgreja}</p>
          </div>
        </div>
      </div>

      {/* Filter Bar + Layer Toggle */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Filtrar:</label>
          <select
            value={filtroAssociacao}
            onChange={(e) => setFiltroAssociacao(e.target.value)}
            className="input-field w-full sm:w-56"
          >
            <option value="">Todas Associações</option>
            {associacoes.map(a => (
              <option key={a.id} value={a.id}>{a.nome} ({a.sigla})</option>
            ))}
          </select>

          {/* Layer toggle */}
          <div className="flex gap-1 ml-auto">
            <button
              onClick={() => setCamada('igrejas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                camada === 'igrejas' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Igrejas
            </button>
            <button
              onClick={() => setCamada('densidade')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                camada === 'densidade' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Densidade
            </button>
          </div>

          {/* Legend */}
          {camada === 'igrejas' && (
            <div className="flex flex-wrap items-center gap-3">
              {associacoes
                .filter(a => !filtroAssociacao || a.id === filtroAssociacao)
                .map(a => (
                  <div key={a.id} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: coresMap[a.id] || '#999' }} />
                    {a.sigla}
                  </div>
                ))}
            </div>
          )}
          {camada === 'densidade' && (
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span><span className="inline-block w-3 h-3 rounded-full bg-blue-400 mr-1" />1-10</span>
              <span><span className="inline-block w-3 h-3 rounded-full bg-blue-600 mr-1" />11-50</span>
              <span><span className="inline-block w-3 h-3 rounded-full bg-blue-800 mr-1" />50+</span>
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="card p-0 overflow-hidden">
        <MapContainer
          center={[-7.5, -38.5]}
          zoom={6}
          className="h-[calc(100vh-280px)] w-full"
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Layer: Igrejas */}
          {camada === 'igrejas' && igrejasNoMapa.map(ig => (
            <CircleMarker
              key={ig.id}
              center={[ig.coordenadas_lat!, ig.coordenadas_lng!]}
              radius={Math.max(6, Math.min(18, ((ig as any).membros_ativos || 0) / 3 + 6))}
              pathOptions={{
                color: coresMap[ig.associacao_id] || '#999',
                fillColor: coresMap[ig.associacao_id] || '#999',
                fillOpacity: 0.8,
                weight: 2,
              }}
            >
              <Popup>
                <div className="text-sm min-w-[200px]">
                  <p className="font-bold text-gray-800 text-base mb-1">{ig.nome}</p>
                  {ig.associacao && (
                    <p className="text-gray-500 text-xs mb-2">
                      {ig.associacao.nome} ({ig.associacao.sigla})
                    </p>
                  )}
                  <div className="space-y-1 border-t border-gray-100 pt-2">
                    {(ig.endereco_cidade || ig.endereco_estado) && (
                      <p className="text-gray-600">
                        <span className="font-medium">Cidade:</span>{' '}
                        {ig.endereco_cidade ? `${ig.endereco_cidade}${ig.endereco_estado ? `/${ig.endereco_estado}` : ''}` : ig.endereco_estado}
                      </p>
                    )}
                    {ig.pastor && <p className="text-gray-600"><span className="font-medium">Pastor:</span> {ig.pastor}</p>}
                    {ig.telefone && <p className="text-gray-600"><span className="font-medium">Telefone:</span> {ig.telefone}</p>}
                    <p className="text-gray-600"><span className="font-medium">Membros:</span> {((ig as any).membros_ativos || 0).toLocaleString('pt-BR')}</p>
                    {(ig as any).interessados > 0 && (
                      <p className="text-gray-600"><span className="font-medium">Interessados:</span> {((ig as any).interessados || 0).toLocaleString('pt-BR')}</p>
                    )}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* Layer: Density by city */}
          {camada === 'densidade' && cidadesComCoords.map(c => {
            const total = c.membros + c.interessados
            const color = total > 50 ? '#1e40af' : total > 10 ? '#2563eb' : '#60a5fa'
            const radius = Math.max(8, Math.min(30, Math.sqrt(total) * 3))

            return (
              <CircleMarker
                key={`${c.cidade}-${c.estado}`}
                center={[c.lat!, c.lng!]}
                radius={radius}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.5,
                  weight: 1,
                }}
              >
                <Popup>
                  <div className="text-sm min-w-[180px]">
                    <p className="font-bold text-gray-800">{c.cidade}/{c.estado}</p>
                    <div className="space-y-1 mt-1.5">
                      <p className="text-gray-600"><span className="font-medium">Membros:</span> {c.membros}</p>
                      <p className="text-gray-600"><span className="font-medium">Interessados:</span> {c.interessados}</p>
                      <p className="text-gray-600"><span className="font-medium">Igrejas:</span> {c.igrejas}</p>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            )
          })}
        </MapContainer>
      </div>

      {/* Top cities by members */}
      {camada === 'densidade' && cidadesDensidade.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Top Cidades por Membros</h3>
          <div className="space-y-1.5">
            {cidadesDensidade.slice(0, 15).map((c, i) => (
              <div key={`${c.cidade}-${c.estado}`} className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-gray-50">
                <span className="text-xs text-gray-400 w-5 text-right">{i + 1}.</span>
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-700">{c.cidade}</span>
                  <span className="text-xs text-gray-400 ml-1">/{c.estado}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-green-600 font-medium">{c.membros} membros</span>
                  {c.interessados > 0 && <span className="text-amber-600">{c.interessados} int.</span>}
                  <span className="text-gray-400">{c.igrejas} igr.</span>
                </div>
                {/* Bar indicator */}
                <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full"
                    style={{ width: `${Math.min(100, (c.membros / (cidadesDensidade[0]?.membros || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Churches without coordinates */}
      {camada === 'igrejas' && igrejasSemCoords.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
            <FiAlertCircle className="w-4 h-4 text-amber-500" />
            Igrejas sem coordenadas ({igrejasSemCoords.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {igrejasSemCoords.map(ig => (
              <div key={ig.id} className="text-xs text-gray-500 py-1 px-2 bg-gray-50 rounded">
                <span className="font-medium text-gray-700">{ig.nome}</span>
                {ig.associacao && <span className="ml-1">({ig.associacao.sigla})</span>}
                {ig.endereco_cidade && <span className="ml-1">- {ig.endereco_cidade}/{ig.endereco_estado}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
