import { useNavigate } from 'react-router-dom'

export default function SessionExpired() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center max-w-sm w-full">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
        </div>

        <h2 className="text-lg font-bold text-gray-800">Sessão expirada</h2>
        <p className="text-sm text-gray-500 mt-2">
          Sua sessão expirou por inatividade. Faça login novamente para continuar.
        </p>

        <button
          onClick={() => navigate('/login?expired=1')}
          className="mt-6 w-full btn-primary"
        >
          Fazer login
        </button>

        <p className="mt-4 text-xs text-gray-400">
          Seus dados não salvos podem ter sido perdidos.
        </p>
      </div>
    </div>
  )
}
