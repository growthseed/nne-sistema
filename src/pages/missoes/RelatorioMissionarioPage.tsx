import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { RelatorioMissionario, Pessoa } from '@/types'
import { FiPlus, FiFilter } from 'react-icons/fi'

interface RelatorioComPessoa extends RelatorioMissionario {
  pessoa?: { nome: string } | null
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const emptyForm = {
  pessoa_id: '',
  mes: new Date().getMonth() + 1,
  ano: new Date().getFullYear(),
  estudos_biblicos: 0,
  visitas_missionarias: 0,
  literatura_distribuida: 0,
  pessoas_contatadas: 0,
  convites_feitos: 0,
  pessoas_trazidas: 0,
  horas_trabalho: 0,
  observacoes: '',
}

export default function RelatorioMissionarioPage() {
  const { profile } = useAuth()
  const [relatorios, setRelatorios] = useState<RelatorioComPessoa[]>([])
  const [pessoas, setPessoas] = useState<Pick<Pessoa, 'id' | 'nome'>[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)

  // Filters
  const [filtroMes, setFiltroMes] = useState(new Date().getMonth() + 1)
  const [filtroAno, setFiltroAno] = useState(new Date().getFullYear())

  useEffect(() => {
    if (profile) {
      fetchPessoas()
      fetchRelatorios()
    }
  }, [profile])

  useEffect(() => {
    if (profile) fetchRelatorios()
  }, [filtroMes, filtroAno])

  async function fetchPessoas() {
    if (!profile) return
    try {
      let query = supabase
        .from('pessoas')
        .select('id, nome')
        .eq('situacao', 'ativo')
        .order('nome')

      if (profile.papel !== 'admin') {
        query = query.eq('igreja_id', profile.igreja_id!)
      }

      const { data, error } = await query
      if (error) throw error
      setPessoas(data || [])
    } catch (err) {
      console.error('Erro ao buscar pessoas:', err)
    }
  }

  async function fetchRelatorios() {
    if (!profile) return
    setLoading(true)
    try {
      let query = supabase
        .from('relatorios_missionarios')
        .select('*, pessoa:pessoas(nome)')
        .eq('mes', filtroMes)
        .eq('ano', filtroAno)
        .order('created_at', { ascending: false })

      // Hierarchical filter
      if (profile.papel === 'admin_uniao') {
        // Would need to join to filter by uniao
      } else if (profile.papel === 'admin_associacao') {
        // Would need to join to filter by associacao
      } else if (profile.papel !== 'admin') {
        query = query.eq('igreja_id', profile.igreja_id!)
      }

      const { data, error } = await query
      if (error) throw error
      setRelatorios(data || [])
    } catch (err) {
      console.error('Erro ao buscar relatorios:', err)
    } finally {
      setLoading(false)
    }
  }

  function openForm() {
    setForm(emptyForm)
    setShowForm(true)
  }

  function handleNumericChange(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: Number(value) || 0 }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile || !form.pessoa_id) return
    setSaving(true)
    try {
      const payload = {
        pessoa_id: form.pessoa_id,
        igreja_id: profile.igreja_id,
        mes: form.mes,
        ano: form.ano,
        estudos_biblicos: form.estudos_biblicos,
        visitas_missionarias: form.visitas_missionarias,
        literatura_distribuida: form.literatura_distribuida,
        pessoas_contatadas: form.pessoas_contatadas,
        convites_feitos: form.convites_feitos,
        pessoas_trazidas: form.pessoas_trazidas,
        horas_trabalho: form.horas_trabalho,
        observacoes: form.observacoes.trim() || null,
      }

      const { error } = await supabase
        .from('relatorios_missionarios')
        .insert(payload)
      if (error) throw error

      setShowForm(false)
      setForm(emptyForm)
      fetchRelatorios()
    } catch (err) {
      console.error('Erro ao salvar relatorio:', err)
      alert('Erro ao salvar relatório')
    } finally {
      setSaving(false)
    }
  }

  // Calculate totals
  const totais = relatorios.reduce(
    (acc, r) => ({
      estudos_biblicos: acc.estudos_biblicos + (r.estudos_biblicos || 0),
      visitas_missionarias: acc.visitas_missionarias + (r.visitas_missionarias || 0),
      literatura_distribuida: acc.literatura_distribuida + (r.literatura_distribuida || 0),
      pessoas_contatadas: acc.pessoas_contatadas + (r.pessoas_contatadas || 0),
      convites_feitos: acc.convites_feitos + (r.convites_feitos || 0),
      pessoas_trazidas: acc.pessoas_trazidas + (r.pessoas_trazidas || 0),
      horas_trabalho: acc.horas_trabalho + (r.horas_trabalho || 0),
    }),
    {
      estudos_biblicos: 0,
      visitas_missionarias: 0,
      literatura_distribuida: 0,
      pessoas_contatadas: 0,
      convites_feitos: 0,
      pessoas_trazidas: 0,
      horas_trabalho: 0,
    }
  )

  const anos = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link to="/missoes" className="hover:text-blue-600">Missões</Link>
            <span>/</span>
            <span>Relatórios</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Relatórios Missionários</h1>
          <p className="text-gray-500 mt-1">
            {relatorios.length} relatorio{relatorios.length !== 1 ? 's' : ''} em {MESES[filtroMes - 1]} {filtroAno}
          </p>
        </div>
        <button className="btn-primary inline-flex items-center gap-2 w-fit" onClick={openForm}>
          <FiPlus className="w-4 h-4" />
          Novo Relatório
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-5">
          <h2 className="text-lg font-semibold text-gray-800">Registrar Relatório Missionário</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label-field">Membro</label>
              <select
                value={form.pessoa_id}
                onChange={(e) => setForm(f => ({ ...f, pessoa_id: e.target.value }))}
                className="input-field"
                required
              >
                <option value="">-- Selecione --</option>
                {pessoas.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field">Mês</label>
              <select
                value={form.mes}
                onChange={(e) => setForm(f => ({ ...f, mes: Number(e.target.value) }))}
                className="input-field"
              >
                {MESES.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field">Ano</label>
              <input
                type="number"
                value={form.ano}
                onChange={(e) => setForm(f => ({ ...f, ano: Number(e.target.value) }))}
                className="input-field"
                min={2020}
                max={2030}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="label-field">Estudos Bíblicos</label>
              <input
                type="number"
                min={0}
                value={form.estudos_biblicos}
                onChange={(e) => handleNumericChange('estudos_biblicos', e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-field">Visitas Missionárias</label>
              <input
                type="number"
                min={0}
                value={form.visitas_missionarias}
                onChange={(e) => handleNumericChange('visitas_missionarias', e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-field">Literatura Distribuída</label>
              <input
                type="number"
                min={0}
                value={form.literatura_distribuida}
                onChange={(e) => handleNumericChange('literatura_distribuida', e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-field">Pessoas Contatadas</label>
              <input
                type="number"
                min={0}
                value={form.pessoas_contatadas}
                onChange={(e) => handleNumericChange('pessoas_contatadas', e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-field">Convites Feitos</label>
              <input
                type="number"
                min={0}
                value={form.convites_feitos}
                onChange={(e) => handleNumericChange('convites_feitos', e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-field">Pessoas Trazidas</label>
              <input
                type="number"
                min={0}
                value={form.pessoas_trazidas}
                onChange={(e) => handleNumericChange('pessoas_trazidas', e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-field">Horas de Trabalho</label>
              <input
                type="number"
                min={0}
                step="0.5"
                value={form.horas_trabalho}
                onChange={(e) => handleNumericChange('horas_trabalho', e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="label-field">Observações</label>
            <textarea
              value={form.observacoes}
              onChange={(e) => setForm(f => ({ ...f, observacoes: e.target.value }))}
              className="input-field"
              rows={2}
              placeholder="Observações opcionais..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Relatório'}
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1">
            <label className="label-field">
              <FiFilter className="inline w-3.5 h-3.5 mr-1" />
              Mês
            </label>
            <select
              value={filtroMes}
              onChange={(e) => setFiltroMes(Number(e.target.value))}
              className="input-field"
            >
              {MESES.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-field">Ano</label>
            <select
              value={filtroAno}
              onChange={(e) => setFiltroAno(Number(e.target.value))}
              className="input-field"
            >
              {anos.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Carregando...</div>
        ) : relatorios.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">Nenhum relatório encontrado para este período</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3">Membro</th>
                  <th className="px-4 py-3 text-center">Estudos</th>
                  <th className="px-4 py-3 text-center">Visitas</th>
                  <th className="px-4 py-3 text-center">Literatura</th>
                  <th className="px-4 py-3 text-center">Contatos</th>
                  <th className="px-4 py-3 text-center">Convites</th>
                  <th className="px-4 py-3 text-center">Trazidas</th>
                  <th className="px-4 py-3 text-right">Horas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {relatorios.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {r.pessoa?.nome || '-'}
                    </td>
                    <td className="px-4 py-3 text-center text-blue-600">{r.estudos_biblicos}</td>
                    <td className="px-4 py-3 text-center text-green-600">{r.visitas_missionarias}</td>
                    <td className="px-4 py-3 text-center text-purple-600">{r.literatura_distribuida}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{r.pessoas_contatadas}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{r.convites_feitos}</td>
                    <td className="px-4 py-3 text-center text-amber-600 font-medium">{r.pessoas_trazidas}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{r.horas_trabalho}h</td>
                  </tr>
                ))}
              </tbody>
              {/* Totals row */}
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold text-gray-800">
                  <td className="px-4 py-3">TOTAL ({relatorios.length} relatórios)</td>
                  <td className="px-4 py-3 text-center text-blue-700">{totais.estudos_biblicos}</td>
                  <td className="px-4 py-3 text-center text-green-700">{totais.visitas_missionarias}</td>
                  <td className="px-4 py-3 text-center text-purple-700">{totais.literatura_distribuida}</td>
                  <td className="px-4 py-3 text-center">{totais.pessoas_contatadas}</td>
                  <td className="px-4 py-3 text-center">{totais.convites_feitos}</td>
                  <td className="px-4 py-3 text-center text-amber-700">{totais.pessoas_trazidas}</td>
                  <td className="px-4 py-3 text-right">{totais.horas_trabalho}h</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
