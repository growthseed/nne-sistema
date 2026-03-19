import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { FiUsers, FiAlertTriangle, FiSearch } from 'react-icons/fi'

interface GrupoDuplicado {
  nome_normalizado: string
  membros: {
    id: string
    nome: string
    situacao: string
    telefone?: string
    data_nascimento?: string
    igreja_nome?: string
  }[]
}

function normalizar(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export default function DuplicadosPage() {
  const { applyScope } = useAuth()
  const [grupos, setGrupos] = useState<GrupoDuplicado[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('')

  useEffect(() => {
    fetchData()
  }, []) // eslint-disable-line

  async function fetchData() {
    setLoading(true)

    let query = supabase
      .from('pessoas')
      .select('id, nome, situacao, telefone, data_nascimento, igreja:igrejas(nome)')
      .in('situacao', ['ativo', 'inativo', 'interessado'])
      .order('nome')
      .limit(10000)

    query = applyScope(query) as typeof query
    const { data } = await query

    if (!data) { setLoading(false); return }

    // Agrupar por nome normalizado
    const mapa = new Map<string, GrupoDuplicado['membros']>()

    for (const p of data) {
      const key = normalizar(p.nome)
      if (!key || key.length < 3) continue

      if (!mapa.has(key)) mapa.set(key, [])
      mapa.get(key)!.push({
        id: p.id,
        nome: p.nome,
        situacao: p.situacao,
        telefone: p.telefone || undefined,
        data_nascimento: p.data_nascimento || undefined,
        igreja_nome: (p.igreja as any)?.nome,
      })
    }

    // Filtrar grupos com 2+ membros
    const duplicados: GrupoDuplicado[] = []
    for (const [key, membros] of mapa) {
      if (membros.length >= 2) {
        duplicados.push({ nome_normalizado: key, membros })
      }
    }

    // Ordenar por quantidade descendente
    duplicados.sort((a, b) => b.membros.length - a.membros.length)

    setGrupos(duplicados)
    setLoading(false)
  }

  const filtered = filtro
    ? grupos.filter(g => g.nome_normalizado.includes(normalizar(filtro)))
    : grupos

  const totalDuplicados = grupos.reduce((acc, g) => acc + g.membros.length, 0)

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse w-64" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500">
        <Link to="/secretaria" className="hover:text-primary-600">Secretaria</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-800 font-medium">Detecção de Duplicados</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-800">Detecção de Duplicados</h1>
        <p className="text-gray-500 mt-1">Membros com nomes idênticos que podem ser cadastros duplicados</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-100">
            <FiAlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-600">{grupos.length}</p>
            <p className="text-xs text-gray-500">Grupos com Duplicados</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-100">
            <FiUsers className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{totalDuplicados}</p>
            <p className="text-xs text-gray-500">Registros Afetados</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100">
            <FiSearch className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Filtrar</p>
            <input
              type="text"
              placeholder="Buscar nome..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="input-field text-sm py-1"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <FiUsers className="w-10 h-10 mx-auto mb-3 text-green-400" />
          <p className="font-medium text-green-600">Nenhum duplicado encontrado!</p>
          <p className="text-sm mt-1">Todos os nomes são únicos no sistema.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.slice(0, 100).map(grupo => (
            <div key={grupo.nome_normalizado} className="card">
              <div className="flex items-center gap-2 mb-3">
                <FiAlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="font-semibold text-gray-800">{grupo.membros.length} registros com nome similar</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 text-gray-500 font-medium">Nome</th>
                      <th className="text-left py-2 px-2 text-gray-500 font-medium">Igreja</th>
                      <th className="text-left py-2 px-2 text-gray-500 font-medium">Situação</th>
                      <th className="text-left py-2 px-2 text-gray-500 font-medium">Telefone</th>
                      <th className="text-left py-2 px-2 text-gray-500 font-medium">Nascimento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.membros.map(m => (
                      <tr key={m.id} className="border-b border-gray-50 hover:bg-amber-50/50">
                        <td className="py-2 px-2">
                          <Link to={`/membros/${m.id}`} className="text-primary-600 hover:underline">
                            {m.nome}
                          </Link>
                        </td>
                        <td className="py-2 px-2 text-gray-600">{m.igreja_nome || '—'}</td>
                        <td className="py-2 px-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            m.situacao === 'ativo' ? 'bg-green-100 text-green-700' :
                            m.situacao === 'interessado' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{m.situacao}</span>
                        </td>
                        <td className="py-2 px-2 text-gray-600">{m.telefone || '—'}</td>
                        <td className="py-2 px-2 text-gray-600">
                          {m.data_nascimento ? new Date(m.data_nascimento).toLocaleDateString('pt-BR') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {filtered.length > 100 && (
            <p className="text-center text-sm text-gray-400 py-3">
              Mostrando 100 de {filtered.length} grupos.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
