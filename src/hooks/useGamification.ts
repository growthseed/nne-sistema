import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// =============================================
// TYPES
// =============================================

export interface GamificationLevel {
  level_number: number; name: string; xp_min: number; xp_max: number | null
  description: string; bible_ref: string | null; icon_key: string; color_hex: string
}

export interface StudentProfile {
  xp_total: number; xp_current_week: number; xp_current_month: number
  level_number: number; streak_current: number; streak_best: number
}

export interface Badge {
  id: string; code: string; category: string; name: string; description: string
  xp_bonus: number; icon_key: string; rarity: string; earned_at?: string
}

// =============================================
// LEVELS DATA (cached client-side)
// =============================================

const STUDENT_LEVELS: GamificationLevel[] = [
  { level_number: 1, name: 'Semente', xp_min: 0, xp_max: 299, description: 'Ainda na terra, com potencial latente', bible_ref: null, icon_key: 'seed', color_hex: '#a3a3a3' },
  { level_number: 2, name: 'Germinando', xp_min: 300, xp_max: 799, description: 'A casca se rompe, vida começa', bible_ref: null, icon_key: 'sprout', color_hex: '#84cc16' },
  { level_number: 3, name: 'Broto', xp_min: 800, xp_max: 1799, description: 'Primeira luz, crescimento visível', bible_ref: null, icon_key: 'leaf', color_hex: '#22c55e' },
  { level_number: 4, name: 'Muda', xp_min: 1800, xp_max: 3499, description: 'Raízes se formando', bible_ref: null, icon_key: 'plant', color_hex: '#16a34a' },
  { level_number: 5, name: 'Arbusto', xp_min: 3500, xp_max: 6499, description: 'Estabelecido, frutos iniciais', bible_ref: null, icon_key: 'bush', color_hex: '#15803d' },
  { level_number: 6, name: 'Árvore Jovem', xp_min: 6500, xp_max: 10999, description: 'Forte, começa a dar sombra', bible_ref: null, icon_key: 'tree', color_hex: '#166534' },
  { level_number: 7, name: 'Árvore Frutífera', xp_min: 11000, xp_max: 17999, description: 'Frutos abundantes', bible_ref: 'João 15:5', icon_key: 'fruit-tree', color_hex: '#ca8a04' },
  { level_number: 8, name: 'Luz do Mundo', xp_min: 18000, xp_max: 27999, description: 'Ilumina os que estão ao redor', bible_ref: 'Mateus 5:14', icon_key: 'sun', color_hex: '#eab308' },
  { level_number: 9, name: 'Sal da Terra', xp_min: 28000, xp_max: 41999, description: 'Preserva e dá sabor', bible_ref: 'Mateus 5:13', icon_key: 'salt', color_hex: '#f59e0b' },
  { level_number: 10, name: 'Trigo Amadurecido', xp_min: 42000, xp_max: 59999, description: 'Pronto para a colheita', bible_ref: null, icon_key: 'wheat', color_hex: '#d97706' },
  { level_number: 11, name: 'Servo Fiel', xp_min: 60000, xp_max: 84999, description: 'Bem feito, servo fiel', bible_ref: 'Mateus 25:21', icon_key: 'crown', color_hex: '#7c3aed' },
  { level_number: 12, name: 'Discípulo', xp_min: 85000, xp_max: 119999, description: 'Seguidor comprometido', bible_ref: null, icon_key: 'book', color_hex: '#6d28d9' },
  { level_number: 13, name: 'Embaixador', xp_min: 120000, xp_max: 169999, description: 'Representa o Reino', bible_ref: '2 Coríntios 5:20', icon_key: 'flag', color_hex: '#4f46e5' },
  { level_number: 14, name: 'Semeador', xp_min: 170000, xp_max: 239999, description: 'Vai e semeia em outros campos', bible_ref: null, icon_key: 'sower', color_hex: '#2563eb' },
  { level_number: 15, name: 'Colheita Abundante', xp_min: 240000, xp_max: null, description: 'A promessa cumprida', bible_ref: 'João 4:35', icon_key: 'harvest', color_hex: '#dc2626' },
]

// =============================================
// HOOK
// =============================================

export function useStudentGamification(userId: string | null) {
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [badges, setBadges] = useState<Badge[]>([])
  const [allBadges, setAllBadges] = useState<Badge[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) loadProfile()
  }, [userId])

  async function loadProfile() {
    setLoading(true)

    // Get or create gamification profile
    const { data: gam } = await supabase
      .from('student_gamification')
      .select('*')
      .eq('user_id', userId!)
      .single()

    if (gam) {
      setProfile(gam)
    } else {
      // Auto-create
      await supabase.from('student_gamification').insert({ user_id: userId })
      setProfile({ xp_total: 0, xp_current_week: 0, xp_current_month: 0, level_number: 1, streak_current: 0, streak_best: 0 })
    }

    // Get earned badges
    const { data: earnedBadges } = await supabase
      .from('user_badges')
      .select('badge_id, earned_at, badges:badges(id, code, category, name, description, xp_bonus, icon_key, rarity)')
      .eq('user_id', userId!)

    const earned = (earnedBadges || []).map(ub => ({
      ...(Array.isArray(ub.badges) ? ub.badges[0] : ub.badges) as any,
      earned_at: ub.earned_at,
    })).filter(Boolean)
    setBadges(earned)

    // Get all student badges
    const { data: all } = await supabase.from('badges').select('*').eq('actor_type', 'student').order('category')
    setAllBadges(all || [])

    setLoading(false)
  }

  const currentLevel = STUDENT_LEVELS.find(l => l.level_number === (profile?.level_number || 1)) || STUDENT_LEVELS[0]
  const nextLevel = STUDENT_LEVELS.find(l => l.level_number === (profile?.level_number || 1) + 1)

  const progressToNextLevel = nextLevel && profile
    ? Math.min(100, Math.round(((profile.xp_total - currentLevel.xp_min) / (nextLevel.xp_min - currentLevel.xp_min)) * 100))
    : 100

  const streakMultiplier = profile
    ? profile.streak_current >= 60 ? 2.5 : profile.streak_current >= 30 ? 2.0 : profile.streak_current >= 14 ? 1.5 : profile.streak_current >= 7 ? 1.2 : 1.0
    : 1.0

  return {
    profile, currentLevel, nextLevel, progressToNextLevel, streakMultiplier,
    badges, allBadges, loading, reload: loadProfile, levels: STUDENT_LEVELS,
  }
}
