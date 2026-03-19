import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { ContagemMensal } from '@/types'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const emptyForm = {
  ano: new Date().getFullYear(),
  mes: new Date().getMonth() + 1,
  total_membros: 0,
  total_interessados: 0,
  batismos: 0,
  transferencias_entrada: 0,
  transferencias_saida: 0,
  exclusoes: 0,
  obitos: 0,
}

export default function ContagemMensalPage() {
  const { profile } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [contagens, setContagens] = useState<ContagemMensal[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile) fetchContagens()
  }, [profile])

  async function fetchContagens() {
    if (!profile) return
    setLoading(true)
    try {
      let query = supabase
        .from('contagem_mensal')
        .select('*, igreja:igrejas(nome)')
        .order('ano', { ascending: false })
        .order('mes', { ascending: false })
        .limit(50)

      if (profile.papel !== 'admin' && profile.igreja_id) {
        query = query.eq('igreja_id', profile.igreja_id)
      }

      const { data, error } = await query
      if (error) throw error
      setContagens(data || [])
    } catch (err) {
      console.error('Erro ao buscar contagens:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: Number(value) }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const { error } = await supabase.from('contagem_mensal').insert({
        igreja_id: profile?.igreja_id,
        ...form,
      })
      if (error) throw error
      setShowForm(false)
      setForm(emptyForm)
      fetchContagens()
    } catch (err) {
      console.error('Erro ao salvar contagem:', err)
      alert('Erro ao salvar contagem')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link to="/secretaria" className="hover:text-blue-600">Secretaria</Link>
            <span>/</span>
            <span>Contagem Mensal</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Contagem Mensal</h1>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Nova Contagem'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Registrar Contagem</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="label-field">Ano</label>
              <input type="number" name="ano" value={form.ano} onChange={handleChange} className="input-field" min={2020} max={2030} />
            </div>
            <div>
              <label className="label-field">Mês</label>
              <select name="mes" value={form.mes} onChange={handleChange} className="input-field">
                {MESES.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field">Total Membros</label>
              <input type="number" name="total_membros" value={form.total_membros} onChange={handleChange} className="input-field" min={0} />
            </div>
            <div>
              <label className="label-field">Batismos</label>
              <input type="number" name="batismos" value={form.batismos} onChange={handleChange} className="input-field" min={0} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="label-field">Transferências Entrada</label>
              <input type="number" name="transferencias_entrada" value={form.transferencias_entrada} onChange={handleChange} className="input-field" min={0} />
            </div>
            <div>
              <label className="label-field">Transferências Saída</label>
              <input type="number" name="transferencias_saida" value={form.transferencias_saida} onChange={handleChange} className="input-field" min={0} />
            </div>
            <div>
              <label className="label-field">Exclusões</label>
              <input type="number" name="exclusoes" value={form.exclusoes} onChange={handleChange} className="input-field" min={0} />
            </div>
            <div>
              <label className="label-field">Óbitos</label>
              <input type="number" name="obitos" value={form.obitos} onChange={handleChange} className="input-field" min={0} />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Contagem'}
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="card overflow-x-auto">
        {loading ? (
          <p className="text-center text-gray-400 py-8">Carregando...</p>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-semibold text-gray-600">Igreja</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-600">Período</th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-600">Total Membros</th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-600">Batismos</th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-600">Entradas</th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-600">Saídas</th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-600">Exclusões</th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-600">Óbitos</th>
                </tr>
              </thead>
              <tbody>
                {contagens.map((c) => (
                  <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-2 text-gray-600 text-xs">
                      {(c as any).igreja?.nome || '—'}
                    </td>
                    <td className="py-3 px-2 font-medium text-gray-800">
                      {MESES[c.mes - 1]} / {c.ano}
                    </td>
                    <td className="py-3 px-2 text-right">{c.total_membros}</td>
                    <td className="py-3 px-2 text-right text-green-600 font-medium">+{c.batismos}</td>
                    <td className="py-3 px-2 text-right text-blue-600">+{c.transferencias_entrada}</td>
                    <td className="py-3 px-2 text-right text-amber-600">-{c.transferencias_saida}</td>
                    <td className="py-3 px-2 text-right text-red-600">{c.exclusoes}</td>
                    <td className="py-3 px-2 text-right text-gray-500">{c.obitos}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {contagens.length === 0 && (
              <p className="text-center text-gray-400 py-8">Nenhuma contagem registrada</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
