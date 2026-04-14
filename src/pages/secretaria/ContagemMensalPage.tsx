import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useContagemMensal, useSaveContagemMensal } from '@/hooks/useContagemMensal'
import { useScopedIgrejas } from '@/hooks/useScopedIgrejas'

const MESES = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

interface ContagemFormData {
  igreja_id: string
  ano: number
  mes: number
  total_membros: number
  total_interessados: number
  batismos: number
  transferencias_entrada: number
  transferencias_saida: number
  exclusoes: number
  obitos: number
}

const emptyForm: ContagemFormData = {
  igreja_id: '',
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

function ContagemSkeleton() {
  return (
    <div className="card overflow-hidden p-0">
      <div className="border-b border-gray-100 px-4 py-4">
        <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
      </div>
      <div className="hidden space-y-4 px-4 py-4 lg:block">
        <div className="grid grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-4 animate-pulse rounded bg-gray-200" />
          ))}
        </div>
        {Array.from({ length: 4 }).map((_, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-6 gap-4 border-t border-gray-100 pt-4">
            {Array.from({ length: 6 }).map((_, colIndex) => (
              <div key={colIndex} className="h-5 animate-pulse rounded bg-gray-100" />
            ))}
          </div>
        ))}
      </div>
      <div className="space-y-3 p-4 lg:hidden">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-gray-100 p-4">
            <div className="h-5 w-40 animate-pulse rounded bg-gray-200" />
            <div className="mt-3 grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, blockIndex) => (
                <div key={blockIndex} className="h-14 animate-pulse rounded bg-gray-100" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ContagemMensalPage() {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<ContagemFormData>(emptyForm)
  const { contagens, loading, error, refetch } = useContagemMensal()
  const { igrejas } = useScopedIgrejas()
  const saveContagemMensal = useSaveContagemMensal()
  const saving = saveContagemMensal.isPending

  useEffect(() => {
    if (igrejas.length === 1 && !form.igreja_id) {
      setForm((prev) => ({ ...prev, igreja_id: igrejas[0].id }))
    }
  }, [igrejas, form.igreja_id])

  function resetForm() {
    setForm({
      ...emptyForm,
      igreja_id: igrejas.length === 1 ? igrejas[0].id : '',
    })
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target

    if (name === 'igreja_id') {
      setForm((prev) => ({ ...prev, igreja_id: value }))
      return
    }

    setForm((prev) => ({ ...prev, [name]: Number(value) }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.igreja_id) {
      toast.error('Selecione a igreja da contagem.')
      return
    }

    try {
      await saveContagemMensal.mutateAsync(form)
      setShowForm(false)
      resetForm()
      toast.success('Contagem mensal registrada com sucesso.')
    } catch (mutationError) {
      console.error('Erro ao salvar contagem:', mutationError)
      toast.error('Nao foi possivel salvar a contagem agora.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm text-gray-500">
            <Link to="/secretaria" className="hover:text-blue-600">Secretaria</Link>
            <span>/</span>
            <span>Contagem Mensal</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Contagem Mensal</h1>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            if (showForm) {
              setShowForm(false)
              return
            }

            resetForm()
            setShowForm(true)
          }}
        >
          {showForm ? 'Cancelar' : '+ Nova Contagem'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Registrar Contagem</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="label-field">Igreja</label>
              <select
                name="igreja_id"
                value={form.igreja_id}
                onChange={handleChange}
                className="input-field"
                disabled={igrejas.length === 1}
                required
              >
                <option value="">Selecione a igreja...</option>
                {igrejas.map((igreja) => (
                  <option key={igreja.id} value={igreja.id}>{igreja.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field">Ano</label>
              <input type="number" name="ano" value={form.ano} onChange={handleChange} className="input-field" min={2020} max={2030} />
            </div>
            <div>
              <label className="label-field">Mes</label>
              <select name="mes" value={form.mes} onChange={handleChange} className="input-field">
                {MESES.map((mes, index) => (
                  <option key={index} value={index + 1}>{mes}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field">Total Membros</label>
              <input type="number" name="total_membros" value={form.total_membros} onChange={handleChange} className="input-field" min={0} />
            </div>
            <div>
              <label className="label-field">Total Interessados</label>
              <input type="number" name="total_interessados" value={form.total_interessados} onChange={handleChange} className="input-field" min={0} />
            </div>
            <div>
              <label className="label-field">Batismos</label>
              <input type="number" name="batismos" value={form.batismos} onChange={handleChange} className="input-field" min={0} />
            </div>
            <div>
              <label className="label-field">Transferencias Entrada</label>
              <input type="number" name="transferencias_entrada" value={form.transferencias_entrada} onChange={handleChange} className="input-field" min={0} />
            </div>
            <div>
              <label className="label-field">Transferencias Saida</label>
              <input type="number" name="transferencias_saida" value={form.transferencias_saida} onChange={handleChange} className="input-field" min={0} />
            </div>
            <div>
              <label className="label-field">Exclusoes</label>
              <input type="number" name="exclusoes" value={form.exclusoes} onChange={handleChange} className="input-field" min={0} />
            </div>
            <div>
              <label className="label-field">Obitos</label>
              <input type="number" name="obitos" value={form.obitos} onChange={handleChange} className="input-field" min={0} />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowForm(false)}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Contagem'}
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="card flex flex-col gap-3 border border-red-200 bg-red-50 text-sm text-red-700">
          <div>
            <p className="font-medium">Nao foi possivel carregar as contagens mensais.</p>
            <p className="mt-1 text-red-600/90">{error}</p>
          </div>
          <div>
            <button
              type="button"
              onClick={() => void refetch()}
              className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-red-700 shadow-sm transition hover:bg-red-100"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <ContagemSkeleton />
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="border-b border-gray-100 px-4 py-4">
            <h2 className="text-lg font-semibold text-gray-800">Historico de Contagens</h2>
          </div>

          {contagens.length === 0 ? (
            <p className="py-8 text-center text-gray-400">Nenhuma contagem registrada</p>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-2 py-3 text-left font-semibold text-gray-600">Igreja</th>
                      <th className="px-2 py-3 text-left font-semibold text-gray-600">Periodo</th>
                      <th className="px-2 py-3 text-right font-semibold text-gray-600">Membros</th>
                      <th className="px-2 py-3 text-right font-semibold text-gray-600">Interessados</th>
                      <th className="px-2 py-3 text-right font-semibold text-gray-600">Batismos</th>
                      <th className="px-2 py-3 text-right font-semibold text-gray-600">Entradas</th>
                      <th className="px-2 py-3 text-right font-semibold text-gray-600">Saidas</th>
                      <th className="px-2 py-3 text-right font-semibold text-gray-600">Exclusoes</th>
                      <th className="px-2 py-3 text-right font-semibold text-gray-600">Obitos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contagens.map((contagem) => (
                      <tr key={contagem.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-2 py-3 text-xs text-gray-600">
                          {contagem.igreja?.nome || '-'}
                        </td>
                        <td className="px-2 py-3 font-medium text-gray-800">
                          {MESES[contagem.mes - 1]} / {contagem.ano}
                        </td>
                        <td className="px-2 py-3 text-right">{contagem.total_membros}</td>
                        <td className="px-2 py-3 text-right">{contagem.total_interessados}</td>
                        <td className="px-2 py-3 text-right font-medium text-green-600">+{contagem.batismos}</td>
                        <td className="px-2 py-3 text-right text-blue-600">+{contagem.transferencias_entrada}</td>
                        <td className="px-2 py-3 text-right text-amber-600">-{contagem.transferencias_saida}</td>
                        <td className="px-2 py-3 text-right text-red-600">{contagem.exclusoes}</td>
                        <td className="px-2 py-3 text-right text-gray-500">{contagem.obitos}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-gray-100 lg:hidden">
                {contagens.map((contagem) => (
                  <div key={contagem.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-gray-800">{contagem.igreja?.nome || '-'}</p>
                        <p className="text-xs text-gray-400">{MESES[contagem.mes - 1]} / {contagem.ano}</p>
                      </div>
                      <div className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {contagem.total_membros} membros
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-lg bg-gray-50 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-gray-400">Interessados</p>
                        <p className="mt-1 font-medium text-gray-700">{contagem.total_interessados}</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-gray-400">Batismos</p>
                        <p className="mt-1 font-medium text-green-600">+{contagem.batismos}</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-gray-400">Entradas</p>
                        <p className="mt-1 font-medium text-blue-600">+{contagem.transferencias_entrada}</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-gray-400">Saidas</p>
                        <p className="mt-1 font-medium text-amber-600">-{contagem.transferencias_saida}</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-gray-400">Exclusoes</p>
                        <p className="mt-1 font-medium text-red-600">{contagem.exclusoes}</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-gray-400">Obitos</p>
                        <p className="mt-1 font-medium text-gray-600">{contagem.obitos}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
