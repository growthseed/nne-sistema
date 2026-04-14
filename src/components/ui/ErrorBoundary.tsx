import { Component, type ReactNode, type ErrorInfo } from 'react'
import { trackError } from '@/lib/observability'

interface Props {
  children: ReactNode
  /** Mensagem exibida quando a página quebra. Padrão genérico se omitido. */
  message?: string
}

interface State {
  hasError: boolean
  errorMessage: string
}

/**
 * ErrorBoundary — captura erros de renderização em subárvores React.
 *
 * Uso:
 * ```tsx
 * <ErrorBoundary message="Não foi possível carregar esta seção.">
 *   <MinhaPagePesada />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, errorMessage: '' }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    trackError(error, {
      componentStack: info.componentStack ?? undefined,
    })
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const msg =
      this.props.message ??
      'Algo deu errado ao carregar esta página. Por favor, tente novamente.'

    return (
      <div className="min-h-[40vh] flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-500 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">
            Ops! Algo deu errado
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{msg}</p>
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={this.handleRetry}
              className="btn-primary"
            >
              Tentar novamente
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-secondary"
            >
              Recarregar página
            </button>
          </div>
        </div>
      </div>
    )
  }
}
