import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CARGO_LABELS, STATUS_LABELS } from '@/lib/missoes-constants'

type LabelsMap = Record<string, string>

function useConfigLabels(chave: string, defaults: LabelsMap, cached: { val: LabelsMap | null; fromDb: boolean }, descricao: string) {
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
        // Use DB values as-is (respect deletions), don't merge with defaults
        const dbLabels = data.valor as LabelsMap
        cached.val = dbLabels
        cached.fromDb = true
        setLabels(dbLabels)
      }
    } catch {
      // fallback to hardcoded
    } finally {
      setLoading(false)
    }
  }

  async function updateLabels(newLabels: LabelsMap): Promise<boolean> {
    try {
      // Detect which keys were removed
      const removedKeys = Object.keys(labels).filter(k => !(k in newLabels))

      const { error } = await supabase
        .from('configuracoes')
        .upsert(
          { chave, valor: newLabels, descricao, updated_at: new Date().toISOString() },
          { onConflict: 'chave' }
        )
      if (error) throw error

      // Clean up missionarios that had a deleted cargo/status
      if (removedKeys.length > 0) {
        const column = chave === 'cargo_labels' ? 'cargo_ministerial' : 'status'
        await supabase
          .from('missionarios')
          .update({ [column]: null })
          .in(column, removedKeys)
      }

      cached.val = newLabels
      cached.fromDb = true
      setLabels(newLabels)
      return true
    } catch (err) {
      console.error(`Erro ao salvar ${chave}:`, err)
      return false
    }
  }

  function invalidateCache() {
    cached.val = null
    cached.fromDb = false
  }

  return { labels, loading, updateLabels, invalidateCache }
}

const _cargoCache = { val: null as LabelsMap | null, fromDb: false }
const _statusCache = { val: null as LabelsMap | null, fromDb: false }

export function useCargoLabels() {
  return useConfigLabels('cargo_labels', CARGO_LABELS, _cargoCache, 'Nomes de exibição dos cargos ministeriais.')
}

export function useStatusLabels() {
  return useConfigLabels('status_labels', STATUS_LABELS, _statusCache, 'Nomes de exibição dos status de missionários.')
}
