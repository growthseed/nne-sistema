import { useEffect, useState, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Igreja, Associacao } from '@/types'
import { FiMapPin, FiAlertCircle } from 'react-icons/fi'
import { HiOutlineOfficeBuilding, HiOutlineUserGroup, HiOutlineGlobe } from 'react-icons/hi'
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api'

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || 'AIzaSyCWTRPhd43Zik0NjR_eqXReOPFEfGxNE5c'

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

const mapContainerStyle = { width: '100%', height: 'calc(100vh - 280px)' }
const defaultCenter = { lat: -7.5, lng: -38.5 }

export default function MapasPage() {
  const { profile } = useAuth()

  const [igrejas, setIgrejas] = useState<IgrejaComAssociacao[]>([])
  const [associacoes, setAssociacoes] = useState<Associacao[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroAssociacao, setFiltroAssociacao] = useState('')
  const [camada, setCamada] = useState<Camada>('igrejas')
  const [selectedIgreja, setSelectedIgreja] = useState<IgrejaComAssociacao | null>(null)
  const [selectedCidade, setSelectedCidade] = useState<CidadeDensidade | null>(null)

  const [cidadesDensidade, setCidadesDensidade] = useState<CidadeDensidade[]>([])

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_KEY,
  })

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
      // Use church-based density (since pessoas don't have endereco_cidade)
      const { data: igData } = await supabase
        .from('igrejas')
        .select('endereco_cidade, endereco_estado, membros_ativos, interessados, coordenadas_lat, coordenadas_lng')
        .eq('ativo', true)

      if (!igData) return

      const byCity: Record<string, CidadeDensidade> = {}
      igData.forEach(ig => {
        if (!ig.endereco_cidade) return
        const key = `${ig.endereco_cidade}|${ig.endereco_estado || ''}`
        if (!byCity[key]) {
          byCity[key] = {
            cidade: ig.endereco_cidade,
            estado: ig.endereco_estado || '',
            membros: 0,
            interessados: 0,
            igrejas: 0,
            lat: ig.coordenadas_lat || undefined,
            lng: ig.coordenadas_lng || undefined,
          }
        }
        byCity[key].membros += ig.membros_ativos || 0
        byCity[key].interessados += ig.interessados || 0
        byCity[key].igrejas += 1
        if (!byCity[key].lat && ig.coordenadas_lat) {
          byCity[key].lat = ig.coordenadas_lat
          byCity[key].lng = ig.coordenadas_lng
        }
      })

      const result = Object.values(byCity).sort((a, b) => b.membros - a.membros)
      setCidadesDensidade(result)
    } catch (err) {
      console.error('Erro ao buscar densidade:', err)
    }
  }

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

  const onMapClick = useCallback(() => {
    setSelectedIgreja(null)
    setSelectedCidade(null)
  }, [])

  if (loading || !isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        <span className="ml-3 text-gray-500">Carregando mapa...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
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
            <p className="text-xs text-gray-500">Sem Coords</p>
            <p className="text-xl font-bold text-gray-800">{igrejasSemCoords.length}</p>
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
        </div>
      </div>

      {/* Google Map */}
      <div className="card p-0 overflow-hidden rounded-xl">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={defaultCenter}
          zoom={5}
          onClick={onMapClick}
          options={{
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: true,
            styles: [
              { featureType: 'poi', stylers: [{ visibility: 'off' }] },
            ],
          }}
        >
          {/* Layer: Igrejas */}
          {camada === 'igrejas' && igrejasNoMapa.map(ig => (
            <MarkerF
              key={ig.id}
              position={{ lat: ig.coordenadas_lat!, lng: ig.coordenadas_lng! }}
              onClick={() => { setSelectedIgreja(ig); setSelectedCidade(null) }}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: Math.max(6, Math.min(14, ((ig as any).membros_ativos || 0) / 5 + 6)),
                fillColor: coresMap[ig.associacao_id] || '#999',
                fillOpacity: 0.85,
                strokeColor: '#fff',
                strokeWeight: 2,
              }}
            />
          ))}

          {/* Layer: Densidade */}
          {camada === 'densidade' && cidadesComCoords.map(c => {
            const total = c.membros + c.interessados
            const color = total > 50 ? '#1e40af' : total > 10 ? '#2563eb' : '#60a5fa'

            return (
              <MarkerF
                key={`${c.cidade}-${c.estado}`}
                position={{ lat: c.lat!, lng: c.lng! }}
                onClick={() => { setSelectedCidade(c); setSelectedIgreja(null) }}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: Math.max(8, Math.min(25, Math.sqrt(total) * 3)),
                  fillColor: color,
                  fillOpacity: 0.5,
                  strokeColor: color,
                  strokeWeight: 1,
                }}
              />
            )
          })}

          {/* InfoWindow: Igreja */}
          {selectedIgreja && (
            <InfoWindowF
              position={{ lat: selectedIgreja.coordenadas_lat!, lng: selectedIgreja.coordenadas_lng! }}
              onCloseClick={() => setSelectedIgreja(null)}
            >
              <div className="text-sm min-w-[220px] p-1">
                <p className="font-bold text-gray-800 text-base mb-1">{selectedIgreja.nome}</p>
                {selectedIgreja.associacao && (
                  <p className="text-gray-500 text-xs mb-2">
                    {selectedIgreja.associacao.nome} ({selectedIgreja.associacao.sigla})
                  </p>
                )}
                <div className="space-y-1 border-t border-gray-200 pt-2">
                  {selectedIgreja.endereco_cidade && (
                    <p className="text-gray-600">
                      <span className="font-medium">Cidade:</span> {selectedIgreja.endereco_cidade}/{selectedIgreja.endereco_estado}
                    </p>
                  )}
                  {selectedIgreja.pastor && (
                    <p className="text-gray-600"><span className="font-medium">Pastor:</span> {selectedIgreja.pastor}</p>
                  )}
                  <p className="text-gray-600">
                    <span className="font-medium">Membros:</span> {((selectedIgreja as any).membros_ativos || 0).toLocaleString('pt-BR')}
                  </p>
                  {(selectedIgreja as any).interessados > 0 && (
                    <p className="text-gray-600">
                      <span className="font-medium">Interessados:</span> {((selectedIgreja as any).interessados || 0).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-gray-200">
                  <a href={`/membros?igreja=${selectedIgreja.id}`} className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-md hover:bg-green-100 font-medium">
                    Ver Membros
                  </a>
                  <a href={`/organizacao/igrejas?id=${selectedIgreja.id}`} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md hover:bg-blue-100 font-medium">
                    Ver Igreja
                  </a>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedIgreja.coordenadas_lat},${selectedIgreja.coordenadas_lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md hover:bg-gray-200 font-medium"
                  >
                    Rotas ↗
                  </a>
                </div>
              </div>
            </InfoWindowF>
          )}

          {/* InfoWindow: Cidade */}
          {selectedCidade && (
            <InfoWindowF
              position={{ lat: selectedCidade.lat!, lng: selectedCidade.lng! }}
              onCloseClick={() => setSelectedCidade(null)}
            >
              <div className="text-sm min-w-[180px] p-1">
                <p className="font-bold text-gray-800">{selectedCidade.cidade}/{selectedCidade.estado}</p>
                <div className="space-y-1 mt-1.5">
                  <p className="text-gray-600"><span className="font-medium">Membros:</span> {selectedCidade.membros}</p>
                  <p className="text-gray-600"><span className="font-medium">Interessados:</span> {selectedCidade.interessados}</p>
                  <p className="text-gray-600"><span className="font-medium">Igrejas:</span> {selectedCidade.igrejas}</p>
                </div>
              </div>
            </InfoWindowF>
          )}
        </GoogleMap>
      </div>

      {/* Top cities */}
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
            {igrejasSemCoords.slice(0, 30).map(ig => (
              <div key={ig.id} className="text-xs text-gray-600 py-1.5 px-2 bg-gray-50 rounded">
                <span className="font-medium text-gray-800">{ig.nome}</span>
                {ig.endereco_cidade && <span className="ml-1">· {ig.endereco_cidade}/{ig.endereco_estado}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
