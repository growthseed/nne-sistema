import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
  HiOutlineMail, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeOff,
  HiOutlineArrowRight, HiOutlineQuestionMarkCircle,
} from 'react-icons/hi'

type View = 'login' | 'register' | 'forgot' | 'reset-sent'

export default function PortalLoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/portal'
  const selfSignupEnabled = import.meta.env.VITE_PORTAL_SELF_SIGNUP_ENABLED === 'true'
  const [view, setView] = useState<View>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nome, setNome] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checkingSession, setCheckingSession] = useState(true)
  const [newPassword, setNewPassword] = useState('')
  const [showResetForm, setShowResetForm] = useState(false)
  const showResetRef = useRef(false)

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event (user clicked reset link in email)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        showResetRef.current = true
        setShowResetForm(true)
        setCheckingSession(false)
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      // Only redirect if NOT in password recovery flow (use ref to avoid stale closure)
      if (session && !showResetRef.current) navigate(redirectTo, { replace: true })
      setCheckingSession(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!selfSignupEnabled && view === 'register') {
      setView('login')
    }
  }, [selfSignupEnabled, view])

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword.length < 6) { setError('A senha deve ter pelo menos 6 caracteres'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) { setError(error.message); setLoading(false); return }
    setShowResetForm(false)
    navigate(redirectTo, { replace: true })
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      const msg = error.message?.toLowerCase() || ''
      if (msg.includes('invalid') || msg.includes('credentials') || msg.includes('unauthorized'))
        setError('E-mail ou senha incorretos. Verifique seus dados.')
      else if (msg.includes('email not confirmed'))
        setError('E-mail não confirmado. Verifique sua caixa de entrada.')
      else
        setError(error.message || 'Erro ao fazer login. Tente novamente.')
    } else {
      navigate(redirectTo, { replace: true })
    }
    setLoading(false)
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!selfSignupEnabled) {
      setError('O cadastro público do portal está desativado. Solicite seu acesso ao professor ou à secretaria.')
      return
    }
    if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres'); return }
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { nome } }
    })
    if (error) {
      setError(error.message)
    } else {
      const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password })
      if (!loginErr) navigate(redirectTo, { replace: true })
      else { setView('login'); setError('Conta criada! Faça login.') }
    }
    setLoading(false)
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/portal/login`,
    })
    if (error) setError(error.message)
    else setView('reset-sent')
    setLoading(false)
  }

  async function handleOAuth(provider: 'google' | 'facebook') {
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}${redirectTo}` }
    })
    if (error) setError(error.message)
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* LEFT: Form */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-8 sm:py-12">
        <div className="w-full max-w-sm mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Escola Bíblica</h1>
              <p className="text-xs text-gray-400">Portal do Aluno • NNE</p>
            </div>
          </div>

          {/* ===== RESET PASSWORD (from email link) ===== */}
          {showResetForm && (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Nova senha</h2>
                <p className="text-sm text-gray-500 mt-1">Defina sua nova senha para acessar o portal</p>
              </div>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Nova senha</label>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all outline-none"
                    placeholder="Mínimo 6 caracteres" autoFocus />
                </div>
                {error && <div className="bg-red-50 border border-red-100 rounded-xl p-3"><span className="text-xs text-red-600">{error}</span></div>}
                <button type="submit" disabled={loading}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-green-600/20 disabled:opacity-50 text-sm">
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Salvar nova senha'}
                </button>
              </form>
            </>
          )}

          {/* ===== LOGIN ===== */}
          {view === 'login' && !showResetForm && (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Bem-vindo de volta</h2>
                <p className="text-sm text-gray-500 mt-1">Entre com suas credenciais para acessar o portal</p>
              </div>

              {/* Social */}
              <div className="space-y-2.5 mb-6">
                <button onClick={() => handleOAuth('google')} disabled={loading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all">
                  <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115Z"/><path fill="#34A853" d="M16.04 18.013C14.95 18.72 13.56 19.09 12 19.09c-3.07 0-5.654-2.06-6.6-4.84L1.24 17.35C3.198 21.3 7.27 24 12 24c2.933 0 5.735-1.043 7.834-3l-3.793-2.987Z"/><path fill="#4A90D9" d="M19.834 21c2.195-2.048 3.62-5.096 3.62-9 0-.71-.109-1.473-.272-2.182H12v4.637h6.436c-.317 1.559-1.17 2.766-2.395 3.558L19.834 21Z"/><path fill="#FBBC05" d="M5.4 14.25A7.12 7.12 0 0 1 4.909 12c0-.782.136-1.54.39-2.25L1.24 6.65A11.934 11.934 0 0 0 0 12c0 1.928.463 3.75 1.24 5.35l4.16-3.1Z"/></svg>
                  Entrar com Google
                </button>
                <button onClick={() => handleOAuth('facebook')} disabled={loading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  Entrar com Facebook
                </button>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">ou</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">E-mail</label>
                  <div className="relative">
                    <HiOutlineMail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                      className="w-full border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all outline-none"
                      placeholder="seu@email.com" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Senha</label>
                  <div className="relative">
                    <HiOutlineLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                      className="w-full border border-gray-200 rounded-xl pl-11 pr-11 py-3 text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all outline-none"
                      placeholder="Digite sua senha" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button type="button" onClick={() => setView('forgot')} className="text-sm text-green-600 hover:text-green-700 font-medium">
                    Esqueceu a senha?
                  </button>
                </div>

                {error && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3">
                    <span className="text-xs text-red-600">{error}</span>
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-green-600/20 disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Entrar <HiOutlineArrowRight className="w-4 h-4" /></>}
                </button>
              </form>

              {selfSignupEnabled && (
                <p className="text-center text-sm text-gray-500 mt-8">
                Não tem conta?{' '}
                <button onClick={() => { setView('register'); setError('') }} className="text-green-600 hover:text-green-700 font-semibold">
                  Criar conta gratuita
                </button>
                </p>
              )}
              {!selfSignupEnabled && (
                <p className="text-center text-sm text-gray-500 mt-8">
                  O acesso é liberado pela equipe da escola bíblica.
                </p>
              )}
            </>
          )}

          {/* ===== REGISTER ===== */}
          {view === 'register' && selfSignupEnabled && (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Criar conta</h2>
                <p className="text-sm text-gray-500 mt-1">Preencha seus dados para acessar a Escola Bíblica</p>
              </div>

              <div className="space-y-2.5 mb-6">
                <button onClick={() => handleOAuth('google')} disabled={loading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all">
                  <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115Z"/><path fill="#34A853" d="M16.04 18.013C14.95 18.72 13.56 19.09 12 19.09c-3.07 0-5.654-2.06-6.6-4.84L1.24 17.35C3.198 21.3 7.27 24 12 24c2.933 0 5.735-1.043 7.834-3l-3.793-2.987Z"/><path fill="#4A90D9" d="M19.834 21c2.195-2.048 3.62-5.096 3.62-9 0-.71-.109-1.473-.272-2.182H12v4.637h6.436c-.317 1.559-1.17 2.766-2.395 3.558L19.834 21Z"/><path fill="#FBBC05" d="M5.4 14.25A7.12 7.12 0 0 1 4.909 12c0-.782.136-1.54.39-2.25L1.24 6.65A11.934 11.934 0 0 0 0 12c0 1.928.463 3.75 1.24 5.35l4.16-3.1Z"/></svg>
                  Cadastrar com Google
                </button>
                <button onClick={() => handleOAuth('facebook')} disabled={loading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  Cadastrar com Facebook
                </button>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">ou com e-mail</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Nome completo</label>
                  <input type="text" value={nome} onChange={e => setNome(e.target.value)} required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all outline-none"
                    placeholder="Seu nome" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">E-mail</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all outline-none"
                    placeholder="seu@email.com" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Senha</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all outline-none"
                    placeholder="Mínimo 6 caracteres" />
                </div>

                {error && <div className="bg-red-50 border border-red-100 rounded-xl p-3"><span className="text-xs text-red-600">{error}</span></div>}

                <button type="submit" disabled={loading}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-green-600/20 disabled:opacity-50 text-sm">
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Criar conta'}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-8">
                Já tem conta?{' '}
                <button onClick={() => { setView('login'); setError('') }} className="text-green-600 font-semibold">Entrar</button>
              </p>
            </>
          )}

          {/* ===== FORGOT ===== */}
          {view === 'forgot' && (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Recuperar senha</h2>
                <p className="text-sm text-gray-500 mt-1">Enviaremos um link de recuperação</p>
              </div>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">E-mail</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all outline-none"
                    placeholder="seu@email.com" />
                </div>
                {error && <div className="bg-red-50 border border-red-100 rounded-xl p-3"><span className="text-xs text-red-600">{error}</span></div>}
                <button type="submit" disabled={loading}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-green-600/20 disabled:opacity-50 text-sm">
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Enviar link de recuperação'}
                </button>
              </form>
              <p className="text-center text-sm text-gray-500 mt-6">
                <button onClick={() => { setView('login'); setError('') }} className="text-green-600 font-semibold">Voltar ao login</button>
              </p>
            </>
          )}

          {/* ===== RESET SENT ===== */}
          {view === 'reset-sent' && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <HiOutlineMail className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">E-mail enviado!</h2>
              <p className="text-sm text-gray-500 mb-8">
                Verifique <strong className="text-gray-700">{email}</strong> e clique no link para redefinir sua senha.
              </p>
              <button onClick={() => setView('login')} className="text-green-600 font-semibold text-sm">
                Voltar ao login
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-gray-100">
            <p className="text-[11px] text-gray-400 text-center">
              Igreja Adventista do Sétimo Dia — Movimento de Reforma
            </p>
            <p className="text-[11px] text-gray-300 text-center mt-1">
              União Norte Nordeste Brasileira
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT: Hero image + branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[45%] relative bg-gradient-to-br from-green-700 via-green-600 to-emerald-500 overflow-hidden">
        {/* Pattern overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djJoLTR2LTJoNHptMC0zMHYyaC00VjRoNHpNNiAzNHYySDJ2LTJoNHptMC0zMHYySDJWNGg0eiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />

        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute top-1/3 right-1/4 w-40 h-40 rounded-full bg-white/5" />

        {/* Content */}
        <div className="relative flex flex-col justify-center px-12 text-white">
          <div className="mb-8">
            <img src="/img/logo-nne.png" alt="NNE" className="h-16 w-16 mb-6 opacity-90" />
            <h2 className="text-3xl font-bold leading-tight">
              Estude a Palavra<br />de Deus
            </h2>
            <p className="text-green-100 mt-4 text-sm leading-relaxed max-w-sm">
              Acesse os módulos de Princípios de Fé e Crenças Fundamentais,
              acompanhe seu progresso e interaja com sua turma.
            </p>
          </div>

          {/* Feature pills */}
          <div className="space-y-3">
            {[
              '37 Pontos de Princípios de Fé',
              '25 Temas de Crenças Fundamentais',
              'Questionários interativos com gabarito',
              'Acompanhe seu progresso',
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm text-green-50">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
