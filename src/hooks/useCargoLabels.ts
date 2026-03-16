import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CARGO_LABELS, STATUS_LABELS } from '@/lib/missoes-constants'

type LabelsMap = Record<string, string>

function useConfigLabels(chave: string, defaults: LabelsMap, cached: { val: LabelsMap | null }, descricao: string) {
  const [labels, setLabels] = useState<LabelsMap>(cached.val || defaults)
  const [loading, setLoading] = useState(!cached.val)

  useEffect(() => {
    if (cached.val) return
    fetchLabels()
  }, [])

  async function fetchLabels() {
    try {
      const { data, error } = await supabase
        .from('configuracoes')
        .select('valor')
        .eq('chave', chave)
        .single()

      if (!error && data?.valor) {
        const merged = { ...defaults, ...data.valor } as LabelsMap
        cached.val = merged
        setLabels(merged)
      }
    } catch {
      // fallback to hardcoded
    } finally {
      setLoading(false)
    }
  }

  async function updateLabels(newLabels: LabelsMap): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('configuracoes')
        .upsert(
          { chave, valor: newLabels, descricao, updated_at: new Date().toISOString() },
          { onConflict: 'chave' }
        )
      if (error) throw error
      cached.val = newLabels
      setLabels(newLabels)
      return true
    } catch (err) {
      console.error(`Erro ao salvar ${chave}:`, err)
      return false
    }
  }

  function invalidateCache() {
    cached.val = null
  }

  return { labels, loading, updateLabels, invalidateCache }
}

const _cargoCache = { val: null as LabelsMap | null }
const _statusCache = { val: null as LabelsMap | null }

export function useCargoLabels() {
  return useConfigLabels('cargo_labels', CARGO_LABELS, _cargoCache, 'Nomes de exibição dos cargos ministeriais.')
}

export function useStatusLabels() {
  return useConfigLabels('status_labels', STATUS_LABELS, _statusCache, 'Nomes de exibição dos status de missionários.')
}
