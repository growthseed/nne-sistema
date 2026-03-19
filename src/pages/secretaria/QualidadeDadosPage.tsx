import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { FiAlertTriangle, FiCheckCircle, FiSearch, FiDownload } from 'react-icons/fi'
import * as XLSX from 'xlsx'

interface PessoaIncompleta {
  id: string
  nome: string
  situacao: string
  igreja_nome?: string
  campos_faltantes: string[]
}

const CAMPOS_OBRIGATORIOS = [
  { campo: 'telefone', label: 'Telefone' },
  { campo: 'email', label: 'E-mail' },
  { campo: 'data_nascimento', label: 'Data de Nascimento' },
  { campo: 'endereco_cidade', label: 'Cidade' },
  { campo: 'endereco_estado', label: 'UF' },
  { campo: 'sexo', label: 'Sexo' },
  { campo: 'estado_civil', label: 'Estado Civil' },
  { campo: 'cpf', label: 'CPF' },
]

export default function QualidadeDadosPage() {
  const { applyScope } = useAuth()
  const [pessoas, setPessoas] = useState<PessoaIncompleta[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [filtroCampo, setFiltroCampo] = useState('')
  const [totais, setTotais] = useState({ total: 0, completos: 0, incompletos: 0 })

  useEffect(() => {
    fetchData()
  }, []) // eslint-disable-line

  async function fetchData() {
    setLoading(true)
    let query = supabase
      .from('pessoas')
      .select('id, nome, situacao, telefone, email, data_nascimento, endereco_cidade, endereco_estado, sexo, estado_civil, cpf, igreja:igrejas(nome)')
      .in('situacao', ['ativo', 'inativo'])
      .order('nome')
      .limit(5000)

    query = applyScope(query) as typeof query

    const { data } = await query
    if (!data) { setLoading(false); return }

    const incompletos: PessoaIncompleta[] = []
    let completos = 0

    for (const p of data) {
      const faltantes: string[] = []
      for (const c of CAMPOS_OBRIGATORIOS) {
        const val = (p as any)[c.campo]
        if (!val || (typeof val === 'string' && val.trim() === '')) {
          faltantes.push(c.label)
        }
      }
      if (faltantes.length > 0) {
        incompletos.push({
          id: p.id,
          nome: p.nome,
          situacao: p.situacao,
          igreja_nome: (p.igreja as any)?.nome,
          campos_faltantes: faltantes,
        })
      } else {
        completos++
      }
    }

    setPessoas(incompletos)
    setTotais({ total: data.length, completos, incompletos: incompletos.length })
    setLoading(false)
  }

  const filtered = useMemo(() => {
    let result = pessoas
    if (filtro) {
      const q = filtro.toLowerCase()
      result = result.filter(p => p.nome.toLowerCase().includes(q) || p.igreja_nome?.toLowerCase().includes(q))
    }
    if (filtroCampo) {
      result = result.filter(p => p.campos_faltantes.includes(filtroCampo))
    }
    return result
  }, [pessoas, filtro, filtroCampo])

  function exportar() {
    const rows = filtered.map(p => ({
      Nome: p.nome,
      Situação: p.situacao,
      Igreja: p.igreja_nome || '-',
      'Campos Faltantes': p.campos_faltantes.join(', '),
      'Qtd Faltantes': p.campos_faltantes.length,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Membros sem Dados')
    XLSX.writeFile(wb, 'membros-sem-dados.xlsx')
  }

  const pctCompleto = totais.total > 0 ? Math.round((totais.completos / totais.total) * 100) : 0

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse w-64" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
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
        <span className="text-gray-800 font-medium">Qualidade de Dados</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-800">Qualidade de Dados</h1>
        <p className="text-gray-500 mt-1">Membros com cadastro incompleto — campos obrigatórios faltantes</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="card flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100">
            <FiSearch className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{totais.total.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Total Analisados</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-100">
            <FiCheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{totais.completos.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Cadastros Completos</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-100">
            <FiAlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-600">{totais.incompletos.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Cadastros Incompletos</p>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500">Completude</p>
            <p className="text-sm font-bold text-gray-800">{pctCompleto}%</p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${pctCompleto >= 80 ? 'bg-green-500' : pctCompleto >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${pctCompleto}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar por nome ou igreja..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
        <select
          value={filtroCampo}
          onChange={(e) => setFiltroCampo(e.target.value)}
          className="input w-full sm:w-56"
        >
          <option value="">Todos os campos faltantes</option>
          {CAMPOS_OBRIGATORIOS.map(c => (
            <option key={c.campo} value={c.label}>{c.label}</option>
          ))}
        </select>
        <button onClick={exportar} className="btn-secondary inline-flex items-center gap-2 whitespace-nowrap">
          <FiDownload className="w-4 h-4" /> Exportar Excel
        </button>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500">{filtered.length} registro{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}</p>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-3 font-medium text-gray-600">Nome</th>
              <th className="text-left py-3 px-3 font-medium text-gray-600">Igreja</th>
              <th className="text-left py-3 px-3 font-medium text-gray-600">Situação</th>
              <th className="text-left py-3 px-3 font-medium text-gray-600">Campos Faltantes</th>
              <th className="text-center py-3 px-3 font-medium text-gray-600">Qtd</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 200).map(p => (
              <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2.5 px-3">
                  <Link to={`/membros/${p.id}`} className="text-primary-600 hover:underline font-medium">
                    {p.nome}
                  </Link>
                </td>
                <td className="py-2.5 px-3 text-gray-600">{p.igreja_nome || '—'}</td>
                <td className="py-2.5 px-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    p.situacao === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>{p.situacao}</span>
                </td>
                <td className="py-2.5 px-3">
                  <div className="flex flex-wrap gap-1">
                    {p.campos_faltantes.map(c => (
                      <span key={c} className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded">{c}</span>
                    ))}
                  </div>
                </td>
                <td className="py-2.5 px-3 text-center">
                  <span className={`text-xs font-bold ${
                    p.campos_faltantes.length >= 5 ? 'text-red-600' : p.campos_faltantes.length >= 3 ? 'text-amber-600' : 'text-gray-600'
                  }`}>{p.campos_faltantes.length}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 200 && (
          <p className="text-center text-sm text-gray-400 py-3">Mostrando 200 de {filtered.length} registros. Exporte para ver todos.</p>
        )}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <FiCheckCircle className="w-10 h-10 mx-auto mb-3 text-green-400" />
            <p className="font-medium text-green-600">Todos os cadastros estão completos!</p>
          </div>
        )}
      </div>
    </div>
  )
}
