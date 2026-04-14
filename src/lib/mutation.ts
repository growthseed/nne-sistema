import toast from 'react-hot-toast'

interface MutationToastOptions {
  loading?: string
  success?: string
  error?: string
}

/**
 * Wrapper para mutations com toast padronizado.
 * - Exibe loading, success e error via toast
 * - Loga erro no console
 * - Retorna null em caso de falha (sem throw)
 */
export async function withMutationToast<T>(
  promiseFn: () => Promise<T>,
  options: MutationToastOptions = {},
): Promise<T | null> {
  const {
    loading = 'Salvando...',
    success = 'Salvo com sucesso.',
    error: errorLabel = 'Erro ao salvar.',
  } = options

  const toastId = toast.loading(loading)

  try {
    const result = await promiseFn()
    toast.success(success, { id: toastId })
    return result
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : errorLabel
    console.error('[mutation]', err)
    toast.error(msg || errorLabel, { id: toastId })
    return null
  }
}
