import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CARGO_LABELS } from '@/lib/missoes-constants'
import type { CargoMinisterial } from '@/types'

type CargoLabelsMap = Record<CargoMinisterial, string>

let cachedLabels: CargoLabelsMap | null = null

export function useCargoLabels() {
  const [labels, setLabels] = useState<CargoLabelsMap>(cachedLabels || CARGO_LABELS)
  const [loading, setLoading] = useState(!cachedLabels)

  useEffect(() => {
    if (cachedLabels) return
    fetchLabels()
  }, [])

  async function fetchLabels() {
    try {
      const { data, error } = await supabase
        .from('configuracoes')
        .select('valor')
        .eq('chave', 'cargo_labels')
        .single()

      if (!error && data?.valor) {
        const merged = { ...CARGO_LABELS, ...data.valor } as CargoLabelsMap
        cachedLabels = merged
        setLabels(merged)
      }
    } catch {
      // fallback to hardcoded
    } finally {
      setLoading(false)
    }
  }

  async function updateLabels(newLabels: CargoLabelsMap): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('configuracoes')
        .upsert(
          {
            chave: 'cargo_labels',
            valor: newLabels,
            descricao: 'Nomes de exibição dos cargos ministeriais. Editável via Configurações > Categorias.',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'chave' }
        )

      if (error) throw error
      cachedLabels = newLabels
      setLabels(newLabels)
      return true
    } catch (err) {
      console.error('Erro ao salvar cargo labels:', err)
      return false
    }
  }

  function invalidateCache() {
    cachedLabels = null
  }

  return { labels, loading, updateLabels, invalidateCache }
}
