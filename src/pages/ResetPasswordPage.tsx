import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
  HiOutlineEye,
  HiOutlineEyeOff,
  HiOutlineLockClosed,
  HiOutlineCheckCircle,
} from 'react-icons/hi'

/**
 * Handles the password recovery redirect from Supabase.
 * The email link brings the user here with a session; we then allow
 * updating the password via supabase.auth.updateUser({ password }).
 */
export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false)
  const [recovering, setRecovering] = useState(false)
  const [sessionError, setSessionError] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Supabase sends PASSWORD_RECOVERY event when the recovery link is hit.
    // We also check the current session as a fallback.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecovering(true)
        setReady(true)
      } else if (session) {
        setReady(true)
      }
    })

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
      else {
        // No session? Might still be processing — give it a tick.
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: d2 }) => {
            if (!d2.session) {
              setSessionError(
                'Link de redefinição inválido ou expirado. Solicite um novo na tela de login.'
              )
            }
            setReady(true)
          })
        }, 800)
      }
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    if (password.length < 6) {
      setErr('A senha precisa ter pelo menos 6 caracteres.')
      return
    }
    if (password !== confirm) {
      setErr('As senhas não coincidem.')
      return
    }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setErr(error.message || 'Erro ao atualizar a senha. Tente novamente.')
      setSaving(false)
      return
    }
    setDone(true)
    setSaving(false)
    // Sign out and redirect back to login after a short pause
    setTimeout(async () => {
      await supabase.auth.signOut()
      navigate('/login', { replace: true })
    }, 2500)
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-gray-500 dark:text-gray-400">Validando link...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 dark:from-gray-950 dark:via-gray-900 dark:to-primary-950 px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <img
            src="/img/logo-nne.png"
            alt="NNE"
            className="h-16 w-auto mb-3"
          />
          <h1 className="text-2xl font-bold text-primary-800 dark:text-primary-300">
            Redefinir senha
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {recovering ? 'Defina sua nova senha abaixo' : 'Crie uma nova senha de acesso'}
          </p>
        </div>

        <div className="card">
          {sessionError ? (
            <div className="space-y-4">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm rounded-lg p-3">
                {sessionError}
              </div>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="btn-primary w-full"
              >
                Voltar para o login
              </button>
            </div>
          ) : done ? (
            <div className="flex flex-col items-center text-center space-y-3 py-4">
              <div className="w-14 h-14 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 flex items-center justify-center">
                <HiOutlineCheckCircle className="w-8 h-8" />
              </div>
              <p className="text-gray-800 dark:text-gray-100 font-semibold">
                Senha atualizada com sucesso!
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Redirecionando para o login...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {err && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm rounded-lg p-3">
                  {err}
                </div>
              )}

              <div>
                <label htmlFor="new-password" className="label-field">Nova senha</label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={show ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="input-field pr-10"
                    placeholder="••••••••"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShow(v => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-primary-700 dark:hover:text-primary-300"
                    tabIndex={-1}
                    aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {show
                      ? <HiOutlineEyeOff className="w-5 h-5" />
                      : <HiOutlineEye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirm-password" className="label-field">Confirmar senha</label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    type={show ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    className="input-field pr-10"
                    placeholder="••••••••"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <HiOutlineLockClosed className="absolute inset-y-0 right-0 mr-3 my-auto w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <button type="submit" disabled={saving} className="btn-primary w-full">
                {saving ? 'Salvando...' : 'Salvar nova senha'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
          © {new Date().getFullYear()} União Norte Nordeste Brasileira
        </p>
      </div>
    </div>
  )
}
