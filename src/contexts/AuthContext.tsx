import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { UserProfile, UserRole } from '@/types'

interface AuthContextType {
  session: Session | null
  user: User | null
  profile: UserProfile | null
  loading: boolean
  sessionExpired: boolean
  clearSessionExpired: () => void
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  hasRole: (roles: readonly UserRole[]) => boolean
  hasScope: (scope: { uniao_id?: string; associacao_id?: string; igreja_id?: string }) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionExpired, setSessionExpired] = useState(false)
  const currentUserIdRef = useRef<string | null>(null)
  const sessionRef = useRef<Session | null>(null)
  const manualSignOutRef = useRef(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      sessionRef.current = session
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        currentUserIdRef.current = session.user.id
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Always keep the latest session in ref (for signOut/signIn checks)
      const hadSession = sessionRef.current !== null
      sessionRef.current = session

      // Token refresh: silently update ref, no re-render needed
      if (event === 'TOKEN_REFRESHED') {
        return
      }

      if (event === 'SIGNED_OUT') {
        if (!manualSignOutRef.current && hadSession) {
          // Session expired (not a manual sign-out)
          setSessionExpired(true)
        }
        manualSignOutRef.current = false
      }

      if (event === 'SIGNED_IN') {
        setSessionExpired(false)
      }

      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        if (currentUserIdRef.current !== session.user.id) {
          currentUserIdRef.current = session.user.id
          fetchProfile(session.user.id)
        }
      } else {
        currentUserIdRef.current = null
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .single()

    if (!error && data) {
      setProfile(data as UserProfile)
    } else if (error) {
      // Profile doesn't exist yet in usuarios table - auto-create via RPC
      console.warn('Perfil não encontrado, tentando criar via ensure_user_profile...')
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('ensure_user_profile')

        if (!rpcError && rpcData) {
          console.log('Perfil criado via RPC:', rpcData)
          setProfile(rpcData as UserProfile)
        } else {
          // Fallback: try direct insert (may fail due to RLS)
          console.warn('RPC falhou, tentando insert direto...', rpcError)
          const { data: authUser } = await supabase.auth.getUser()
          const email = authUser?.user?.email || ''
          const nome = authUser?.user?.user_metadata?.nome || email.split('@')[0] || 'Novo Usuário'

          const { data: newProfile, error: insertError } = await supabase
            .from('usuarios')
            .insert({
              id: userId,
              nome,
              email,
              papel: 'membro' as UserRole,
              ativo: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select()
            .single()

          if (!insertError && newProfile) {
            setProfile(newProfile as UserProfile)
          } else {
            console.error('Erro ao criar perfil:', insertError)
          }
        }
      } catch (err) {
        console.error('Erro ao criar perfil:', err)
      }
    }
    setLoading(false)
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error as Error | null }
  }

  async function signOut() {
    manualSignOutRef.current = true
    await supabase.auth.signOut()
    setProfile(null)
    setSessionExpired(false)
  }

  function clearSessionExpired() {
    setSessionExpired(false)
  }

  function hasRole(roles: readonly UserRole[]) {
    if (!profile) return false
    return roles.includes(profile.papel)
  }

  function hasScope(scope: { uniao_id?: string; associacao_id?: string; igreja_id?: string }) {
    if (!profile) return false
    if (profile.papel === 'admin') return true
    if (scope.uniao_id && profile.uniao_id !== scope.uniao_id) return false
    if (scope.associacao_id && profile.associacao_id !== scope.associacao_id) return false
    if (scope.igreja_id && profile.igreja_id !== scope.igreja_id) return false
    return true
  }

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, sessionExpired, clearSessionExpired, signIn, signOut, hasRole, hasScope }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return context
}
