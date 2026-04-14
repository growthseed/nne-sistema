import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  HiOutlineBookOpen,
  HiOutlineOfficeBuilding,
  HiOutlineAcademicCap,
  HiOutlineEye,
  HiOutlineEyeOff,
  HiOutlineX,
  HiOutlineMail,
} from 'react-icons/hi'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const { signIn, clearSessionExpired } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isExpired = searchParams.get('expired') === '1'

  useEffect(() => {
    if (isExpired) clearSessionExpired()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await signIn(email, password)

    if (error) {
      setError('Email ou senha inválidos')
      setLoading(false)
    } else {
      navigate('/', { replace: true })
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gray-50 dark:bg-gray-950">
      {/* LEFT — Login form */}
      <div className="flex-1 flex items-center justify-center px-4 py-10 lg:py-0">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <img
              src="/img/logo-nne.png"
              alt="NNE - União Norte Nordeste"
              className="h-20 w-auto mb-4"
            />
            <h1 className="text-3xl font-bold text-primary-800 dark:text-primary-300">NNE Sistema</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-center text-sm">
              União Norte Nordeste Brasileira
            </p>
          </div>

          {isExpired && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              <span>Sua sessão expirou por inatividade. Faça login novamente.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="card space-y-5">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 text-center">
              Entrar no sistema
            </h2>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm rounded-lg p-3">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="label-field">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-field"
                placeholder="seu@email.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="label-field !mb-0">Senha</label>
                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  className="text-xs font-medium text-primary-700 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-primary-700 dark:hover:text-primary-300"
                  title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  tabIndex={-1}
                >
                  {showPassword
                    ? <HiOutlineEyeOff className="w-5 h-5" />
                    : <HiOutlineEye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
            © {new Date().getFullYear()} União Norte Nordeste Brasileira
          </p>
        </div>
      </div>

      {/* RIGHT — Banner / highlights panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950">
        {/*
          Banner image layer.
          Para trocar a imagem: substitua /public/img/login-bg.webp pelo
          arquivo que desejar (mantenha o mesmo nome) ou aponte para outro path.
        */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-50 mix-blend-overlay"
          style={{ backgroundImage: "url('/img/login-bg.webp')" }}
        />

        {/* Dark vignette for legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-primary-950/80 via-primary-900/40 to-transparent" />

        {/* Decorative blobs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary-400/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1 text-xs font-medium">
              <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
              Plataforma oficial da União Norte Nordeste
            </div>
          </div>

          <div className="max-w-lg">
            <h2 className="text-4xl xl:text-5xl font-bold leading-tight mb-4">
              Fiéis à Palavra. Unidos na missão.
            </h2>
            <p className="text-primary-100 text-lg mb-10 leading-relaxed">
              Plataforma integrada para as associações da União Norte Nordeste
              da Igreja Adventista do Sétimo Dia — Movimento de Reforma.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <Highlight
                icon={<HiOutlineBookOpen className="w-5 h-5" />}
                title="Secretaria"
                subtitle="Membros e cadastro"
              />
              <Highlight
                icon={<HiOutlineOfficeBuilding className="w-5 h-5" />}
                title="Missões"
                subtitle="Obreiros e campos"
              />
              <Highlight
                icon={<HiOutlineBookOpen className="w-5 h-5" />}
                title="Escola Bíblica"
                subtitle="Estudo e preparo batismal"
              />
              <Highlight
                icon={<HiOutlineAcademicCap className="w-5 h-5" />}
                title="Escola Sabatina"
                subtitle="Ensino e discipulado"
              />
            </div>
          </div>

          <div className="text-sm text-primary-200">
            <p className="font-medium">Precisa de ajuda?</p>
            <p>Entre em contato com o administrador da sua associação.</p>
          </div>
        </div>
      </div>

      {showResetModal && (
        <ResetPasswordModal
          initialEmail={email}
          onClose={() => setShowResetModal(false)}
        />
      )}
    </div>
  )
}

function Highlight({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
}) {
  return (
    <div className="flex items-start gap-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3">
      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 text-white shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate">{title}</p>
        <p className="text-xs text-primary-200 truncate">{subtitle}</p>
      </div>
    </div>
  )
}

function ResetPasswordModal({
  initialEmail,
  onClose,
}: {
  initialEmail: string
  onClose: () => void
}) {
  const [resetEmail, setResetEmail] = useState(initialEmail)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState('')

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setSending(true)
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      setErr('Não foi possível enviar o email. Verifique o endereço e tente novamente.')
      setSending(false)
    } else {
      setSent(true)
      setSending(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          aria-label="Fechar"
        >
          <HiOutlineX className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 flex items-center justify-center mb-3">
            <HiOutlineMail className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
            Redefinir senha
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Enviaremos um link de redefinição para o seu email.
          </p>
        </div>

        {sent ? (
          <div className="space-y-4">
            <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 text-primary-800 dark:text-primary-200 text-sm rounded-lg p-4">
              Email enviado para <strong>{resetEmail}</strong>. Abra sua caixa de
              entrada (e a pasta de spam) e clique no link para criar uma nova senha.
            </div>
            <button type="button" onClick={onClose} className="btn-primary w-full">
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            {err && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm rounded-lg p-3">
                {err}
              </div>
            )}
            <div>
              <label htmlFor="reset-email" className="label-field">Email</label>
              <input
                id="reset-email"
                type="email"
                value={resetEmail}
                onChange={e => setResetEmail(e.target.value)}
                className="input-field"
                placeholder="seu@email.com"
                required
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary flex-1"
                disabled={sending}
              >
                Cancelar
              </button>
              <button type="submit" className="btn-primary flex-1" disabled={sending}>
                {sending ? 'Enviando...' : 'Enviar link'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
