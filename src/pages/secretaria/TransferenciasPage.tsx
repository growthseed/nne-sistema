import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { TransferenciaStatus } from '@/types'

interface TransferenciaView {
  id: string
  pessoa_id: string
  pessoa: { nome: string } | null
  igreja_origem: { nome: string } | null
  igreja_destino: { nome: string } | null
  tipo: 'transferencia' | 'carta'
  status: TransferenciaStatus
  motivo: string | null
  observacao: string | null
  created_at: string
}

const statusConfig: Record<TransferenciaStatus, { label: string; bg: string; text: string }> = {
  solicitada: { label: 'Pendente', bg: 'bg-amber-100', text: 'text-amber-700' },
  aprovada: { label: 'Aprovada', bg: 'bg-green-100', text: 'text-green-700' },
  concluida: { label: 'Concluída', bg: 'bg-blue-100', text: 'text-blue-700' },
  rejeitada: { label: 'Rejeitada', bg: 'bg-red-100', text: 'text-red-700' },
}

const tipoConfig = {
  transferencia: { label: 'Transferência', bg: 'bg-blue-100', text: 'text-blue-700' },
  carta: { label: 'Carta', bg: 'bg-gray-100', text: 'text-gray-700' },
}

export default function TransferenciasPage() {
  const { profile, user } = useAuth()
  const [transferencias, setTransferencias] = useState<TransferenciaView[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ pessoa_id: '', igreja_destino_id: '', tipo: 'carta' as 'transferencia' | 'carta', motivo: '' })

  // Listas para selects
  const [pessoas, setPessoas] = useState<{ id: string; nome: string }[]>([])
  const [igrejas, setIgrejas] = useState<{ id: string; nome: string }[]>([])

  useEffect(() => {
    if (profile) {
      fetchTransferências()
      fetchPessoas()
      fetchIgrejas()
    }
  }, [profile])

  async function fetchTransferências() {
    if (!profile) return
    setLoading(true)
    try {
      let query = supabase
        .from('transferencias')
        .select('id, pessoa_id, tipo, status, motivo, observacao, created_at, pessoa:pessoas!pessoa_id(nome), igreja_origem:igrejas!igreja_origem_id(nome), igreja_destino:igrejas!igreja_destino_id(nome)')
        .order('created_at', { ascending: false })

      if (profile.papel !== 'admin') {
        query = query.or(`igreja_origem_id.eq.${profile.igreja_id},igreja_destino_id.eq.${profile.igreja_id}`)
      }

      const { data, error } = await query
      if (error) throw error
      setTransferencias((data || []) as unknown as TransferenciaView[])
    } catch (err) {
      console.error('Erro ao buscar transferências:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchPessoas() {
    if (!profile?.igreja_id) return
    const { data } = await supabase
      .from('pessoas')
      .select('id, nome')
      .eq('igreja_id', profile.igreja_id)
      .eq('situacao', 'ativo')
      .order('nome')
    setPessoas(data || [])
  }

  async function fetchIgrejas() {
    const { data } = await supabase
      .from('igrejas')
      .select('id, nome')
      .eq('ativo', true)
      .order('nome')
    setIgrejas(data || [])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile || !user) return
    setSaving(true)
    try {
      const { error } = await supabase.from('transferencias').insert({
        pessoa_id: form.pessoa_id,
        igreja_origem_id: profile.igreja_id,
        igreja_destino_id: form.igreja_destino_id,
        tipo: form.tipo,
        status: 'solicitada',
        motivo: form.motivo || null,
        solicitado_por: user.id,
      })
      if (error) throw error
      setShowForm(false)
      setForm({ pessoa_id: '', igreja_destino_id: '', tipo: 'carta', motivo: '' })
      fetchTransferências()
    } catch (err) {
      console.error('Erro ao solicitar transferência:', err)
      alert('Erro ao solicitar transferência')
    } finally {
      setSaving(false)
    }
  }

  async function handleAprovar(id: string) {
    if (!user) return
    const { error } = await supabase
      .from('transferencias')
      .update({ status: 'aprovada', aprovado_por: user.id, data_aprovacao: new Date().toISOString() })
      .eq('id', id)
    if (!error) fetchTransferências()
  }

  async function handleRejeitar(id: string) {
    if (!user) return
    const { error } = await supabase
      .from('transferencias')
      .update({ status: 'rejeitada', aprovado_por: user.id, data_aprovacao: new Date().toISOString() })
      .eq('id', id)
    if (!error) fetchTransferências()
  }

  const filtered = filtroStatus === 'todos'
    ? transferencias
    : transferencias.filter((t) => t.status === filtroStatus)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link to="/secretaria" className="hover:text-blue-600">Secretaria</Link>
            <span>/</span>
            <span>Transferências</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Transferências</h1>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Nova Transferência'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Solicitar Transferência</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-field">Membro</label>
              <select
                value={form.pessoa_id}
                onChange={(e) => setForm(p => ({ ...p, pessoa_id: e.target.value }))}
                className="input-field"
                required
              >
                <option value="">Selecione o membro</option>
                {pessoas.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field">Igreja Destino</label>
              <select
                value={form.igreja_destino_id}
                onChange={(e) => setForm(p => ({ ...p, igreja_destino_id: e.target.value }))}
                className="input-field"
                required
              >
                <option value="">Selecione a igreja destino</option>
                {igrejas.filter(i => i.id !== profile?.igreja_id).map(i => (
                  <option key={i.id} value={i.id}>{i.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field">Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm(p => ({ ...p, tipo: e.target.value as 'transferencia' | 'carta' }))}
                className="input-field"
              >
                <option value="carta">Carta de Transferência</option>
                <option value="transferencia">Transferência</option>
              </select>
            </div>
            <div>
              <label className="label-field">Motivo (opcional)</label>
              <input
                type="text"
                placeholder="Motivo da transferência"
                value={form.motivo}
                onChange={(e) => setForm(p => ({ ...p, motivo: e.target.value }))}
                className="input-field"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : 'Solicitar Transferência'}
            </button>
          </div>
        </form>
      )}

      <div className="flex gap-2">
        {['todos', 'solicitada', 'aprovada', 'concluida', 'rejeitada'].map((f) => (
          <button
            key={f}
            onClick={() => setFiltroStatus(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filtroStatus === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'todos' ? 'Todos' : statusConfig[f as TransferenciaStatus]?.label || f}
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="text-center text-gray-400 py-8">Carregando...</p>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-semibold text-gray-600">Membro</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-600">Origem</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-600">Destino</th>
                  <th className="text-center py-3 px-2 font-semibold text-gray-600">Tipo</th>
                  <th className="text-center py-3 px-2 font-semibold text-gray-600">Status</th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-600">Data</th>
                  <th className="text-center py-3 px-2 font-semibold text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const st = statusConfig[t.status]
                  const tp = tipoConfig[t.tipo]
                  return (
                    <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2 font-medium text-gray-800">
                        {t.pessoa?.nome || '-'}
                      </td>
                      <td className="py-3 px-2 text-gray-600">{t.igreja_origem?.nome || '-'}</td>
                      <td className="py-3 px-2 text-gray-600">{t.igreja_destino?.nome || '-'}</td>
                      <td className="py-3 px-2 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${tp.bg} ${tp.text}`}>
                          {tp.label}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${st.bg} ${st.text}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right text-gray-500">
                        {new Date(t.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {t.status === 'solicitada' && (
                          <div className="flex justify-center gap-1">
                            <button
                              onClick={() => handleAprovar(t.id)}
                              className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                            >
                              Aprovar
                            </button>
                            <button
                              onClick={() => handleRejeitar(t.id)}
                              className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                            >
                              Rejeitar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="text-center text-gray-400 py-8">Nenhuma transferência encontrada</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
