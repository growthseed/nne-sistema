import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
  HiOutlineAcademicCap, HiOutlineMail, HiOutlineLockClosed,
  HiOutlineEye, HiOutlineEyeOff, HiOutlineArrowRight,
} from 'react-icons/hi'

type View = 'login' | 'register' | 'forgot' | 'reset-sent'

export default function PortalLoginPage() {
  const navigate = useNavigate()
  const [view, setView] = useState<View>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nome, setNome] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checkingSession, setCheckingSession] = useState(true)

  // Check existing session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/portal', { replace: true })
      setCheckingSession(false)
    })
  }, [])

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos' : error.message)
    } else {
      navigate('/portal', { replace: true })
    }
    setLoading(false)
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres'); return }
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { nome } }
    })
    if (error) {
      setError(error.message)
    } else {
      // Auto-login after signup (Supabase confirms email automatically if configured)
      const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password })
      if (!loginErr) {
        navigate('/portal', { replace: true })
      } else {
        setView('login')
        setError('Conta criada! Faça login com suas credenciais.')
      }
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
    if (error) {
      setError(error.message)
    } else {
      setView('reset-sent')
    }
    setLoading(false)
  }

  async function handleOAuth(provider: 'google' | 'facebook') {
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/portal` }
    })
    if (error) setError(error.message)
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-950 to-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-400/30 border-t-primary-400 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-950 to-slate-900 flex flex-col">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djJoLTR2LTJoNHptMC0zMHYyaC00VjRoNHpNNiAzNHYySDJ2LTJoNHptMC0zMHYySDJWNGg0eiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />

      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md">
          {/* Logo & Branding */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-emerald-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/25">
              <HiOutlineAcademicCap className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Escola Bíblica</h1>
            <p className="text-primary-300/70 text-sm mt-1">Portal do Aluno • NNE</p>
          </div>

          {/* Card */}
          <div className="bg-white/[0.07] backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
            {/* ===== LOGIN ===== */}
            {view === 'login' && (
              <>
                <h2 className="text-lg font-semibold text-white mb-1">Bem-vindo de volta</h2>
                <p className="text-sm text-gray-400 mb-6">Entre com sua conta para continuar</p>

                {/* Social Login */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <button onClick={() => handleOAuth('google')} disabled={loading}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-sm text-white transition-all">
                    <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115Z"/><path fill="#34A853" d="M16.04 18.013C14.95 18.72 13.56 19.09 12 19.09c-3.07 0-5.654-2.06-6.6-4.84L1.24 17.35C3.198 21.3 7.27 24 12 24c2.933 0 5.735-1.043 7.834-3l-3.793-2.987Z"/><path fill="#4A90D9" d="M19.834 21c2.195-2.048 3.62-5.096 3.62-9 0-.71-.109-1.473-.272-2.182H12v4.637h6.436c-.317 1.559-1.17 2.766-2.395 3.558L19.834 21Z"/><path fill="#FBBC05" d="M5.4 14.25A7.12 7.12 0 0 1 4.909 12c0-.782.136-1.54.39-2.25L1.24 6.65A11.934 11.934 0 0 0 0 12c0 1.928.463 3.75 1.24 5.35l4.16-3.1Z"/></svg>
                    Google
                  </button>
                  <button onClick={() => handleOAuth('facebook')} disabled={loading}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-sm text-white transition-all">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    Facebook
                  </button>
                </div>

                <div className="flex items-center gap-3 mb-6">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-xs text-gray-500">ou com e-mail</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">E-mail</label>
                    <div className="relative">
                      <HiOutlineMail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all"
                        placeholder="seu@email.com" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Senha</label>
                    <div className="relative">
                      <HiOutlineLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all"
                        placeholder="••••••••" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                        {showPassword ? <HiOutlineEyeOff className="w-4 h-4" /> : <HiOutlineEye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button type="button" onClick={() => setView('forgot')} className="text-xs text-primary-400 hover:text-primary-300">
                      Esqueceu a senha?
                    </button>
                  </div>

                  {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">{error}</p>}

                  <button type="submit" disabled={loading}
                    className="w-full bg-gradient-to-r from-primary-500 to-emerald-500 hover:from-primary-600 hover:to-emerald-600 text-white font-medium py-2.5 rounded-xl transition-all shadow-lg shadow-primary-500/25 disabled:opacity-50 flex items-center justify-center gap-2">
                    {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Entrar <HiOutlineArrowRight className="w-4 h-4" /></>}
                  </button>
                </form>

                <p className="text-center text-xs text-gray-500 mt-6">
                  Não tem conta?{' '}
                  <button onClick={() => { setView('register'); setError('') }} className="text-primary-400 hover:text-primary-300 font-medium">
                    Criar conta gratuita
                  </button>
                </p>
              </>
            )}

            {/* ===== REGISTER ===== */}
            {view === 'register' && (
              <>
                <h2 className="text-lg font-semibold text-white mb-1">Criar conta</h2>
                <p className="text-sm text-gray-400 mb-6">Preencha seus dados para acessar a Escola Bíblica</p>

                {/* Social Register */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <button onClick={() => handleOAuth('google')} disabled={loading}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-sm text-white transition-all">
                    <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115Z"/><path fill="#34A853" d="M16.04 18.013C14.95 18.72 13.56 19.09 12 19.09c-3.07 0-5.654-2.06-6.6-4.84L1.24 17.35C3.198 21.3 7.27 24 12 24c2.933 0 5.735-1.043 7.834-3l-3.793-2.987Z"/><path fill="#4A90D9" d="M19.834 21c2.195-2.048 3.62-5.096 3.62-9 0-.71-.109-1.473-.272-2.182H12v4.637h6.436c-.317 1.559-1.17 2.766-2.395 3.558L19.834 21Z"/><path fill="#FBBC05" d="M5.4 14.25A7.12 7.12 0 0 1 4.909 12c0-.782.136-1.54.39-2.25L1.24 6.65A11.934 11.934 0 0 0 0 12c0 1.928.463 3.75 1.24 5.35l4.16-3.1Z"/></svg>
                    Google
                  </button>
                  <button onClick={() => handleOAuth('facebook')} disabled={loading}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-sm text-white transition-all">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    Facebook
                  </button>
                </div>

                <div className="flex items-center gap-3 mb-6">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-xs text-gray-500">ou com e-mail</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Nome completo</label>
                    <input type="text" value={nome} onChange={e => setNome(e.target.value)} required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500/50 transition-all"
                      placeholder="Seu nome" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">E-mail</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500/50 transition-all"
                      placeholder="seu@email.com" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Senha</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500/50 transition-all"
                      placeholder="Mínimo 6 caracteres" />
                  </div>

                  {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">{error}</p>}

                  <button type="submit" disabled={loading}
                    className="w-full bg-gradient-to-r from-primary-500 to-emerald-500 hover:from-primary-600 hover:to-emerald-600 text-white font-medium py-2.5 rounded-xl transition-all shadow-lg shadow-primary-500/25 disabled:opacity-50 flex items-center justify-center gap-2">
                    {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Criar conta'}
                  </button>
                </form>

                <p className="text-center text-xs text-gray-500 mt-6">
                  Já tem conta?{' '}
                  <button onClick={() => { setView('login'); setError('') }} className="text-primary-400 hover:text-primary-300 font-medium">
                    Entrar
                  </button>
                </p>
              </>
            )}

            {/* ===== FORGOT PASSWORD ===== */}
            {view === 'forgot' && (
              <>
                <h2 className="text-lg font-semibold text-white mb-1">Recuperar senha</h2>
                <p className="text-sm text-gray-400 mb-6">Enviaremos um link de recuperação para seu e-mail</p>

                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">E-mail</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500/50 transition-all"
                      placeholder="seu@email.com" />
                  </div>

                  {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">{error}</p>}

                  <button type="submit" disabled={loading}
                    className="w-full bg-gradient-to-r from-primary-500 to-emerald-500 text-white font-medium py-2.5 rounded-xl transition-all shadow-lg shadow-primary-500/25 disabled:opacity-50">
                    {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Enviar link'}
                  </button>
                </form>

                <p className="text-center text-xs text-gray-500 mt-6">
                  <button onClick={() => { setView('login'); setError('') }} className="text-primary-400 hover:text-primary-300">
                    Voltar ao login
                  </button>
                </p>
              </>
            )}

            {/* ===== RESET SENT ===== */}
            {view === 'reset-sent' && (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <HiOutlineMail className="w-7 h-7 text-green-400" />
                </div>
                <h2 className="text-lg font-semibold text-white mb-2">E-mail enviado!</h2>
                <p className="text-sm text-gray-400 mb-6">
                  Verifique sua caixa de entrada em <strong className="text-white">{email}</strong> e clique no link para redefinir sua senha.
                </p>
                <button onClick={() => setView('login')}
                  className="text-primary-400 hover:text-primary-300 text-sm font-medium">
                  Voltar ao login
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <p className="text-center text-[10px] text-gray-600 mt-6">
            União Norte Nordeste • Igreja Adventista do Sétimo Dia - Movimento de Reforma
          </p>
        </div>
      </div>
    </div>
  )
}
