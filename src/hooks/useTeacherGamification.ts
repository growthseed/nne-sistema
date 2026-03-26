import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface TeacherLevel {
  level_number: number; name: string; xp_min: number; xp_max: number | null
  description: string; bible_ref: string | null; color_hex: string
}

export interface TeacherProfile {
  xp_total: number; xp_current_week: number; xp_current_month: number
  level_number: number; total_students_ever: number
}

export interface TeacherBadge {
  id: string; code: string; category: string; name: string; description: string
  xp_bonus: number; rarity: string; earned_at?: string
}

const TEACHER_LEVELS: TeacherLevel[] = [
  { level_number: 1, name: 'Instrutor', xp_min: 0, xp_max: 999, description: 'Início do ministério docente', bible_ref: null, color_hex: '#6b7280' },
  { level_number: 2, name: 'Guia', xp_min: 1000, xp_max: 2999, description: 'Começa a orientar o caminho', bible_ref: null, color_hex: '#22c55e' },
  { level_number: 3, name: 'Mestre', xp_min: 3000, xp_max: 6999, description: 'Ensina com autoridade', bible_ref: null, color_hex: '#16a34a' },
  { level_number: 4, name: 'Educador Fiel', xp_min: 7000, xp_max: 13999, description: 'Comprometido com a missão', bible_ref: null, color_hex: '#15803d' },
  { level_number: 5, name: 'Ancião', xp_min: 14000, xp_max: 24999, description: 'Sabedoria reconhecida', bible_ref: '1 Timóteo 3:2', color_hex: '#ca8a04' },
  { level_number: 6, name: 'Pastor de Turma', xp_min: 25000, xp_max: 44999, description: 'Cuida do rebanho', bible_ref: null, color_hex: '#eab308' },
  { level_number: 7, name: 'Evangelista', xp_min: 45000, xp_max: 74999, description: 'Foco em crescimento e colheita', bible_ref: null, color_hex: '#d97706' },
  { level_number: 8, name: 'Reformador', xp_min: 75000, xp_max: 119999, description: 'Transforma vidas pela Palavra', bible_ref: null, color_hex: '#7c3aed' },
  { level_number: 9, name: 'Mentor de Almas', xp_min: 120000, xp_max: 199999, description: 'Forma outros professores', bible_ref: null, color_hex: '#4f46e5' },
  { level_number: 10, name: 'Pilar da Reforma', xp_min: 200000, xp_max: null, description: 'Fundação do movimento regional', bible_ref: null, color_hex: '#dc2626' },
]

export function useTeacherGamification(userId: string | null) {
  const [profile, setProfile] = useState<TeacherProfile | null>(null)
  const [badges, setBadges] = useState<TeacherBadge[]>([])
  const [allBadges, setAllBadges] = useState<TeacherBadge[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) loadProfile()
  }, [userId])

  async function loadProfile() {
    setLoading(true)
    const { data: gam } = await supabase
      .from('teacher_gamification')
      .select('*')
      .eq('user_id', userId!)
      .limit(1)

    if (gam && gam.length > 0) {
      setProfile(gam[0])
    } else {
      await supabase.from('teacher_gamification').insert({ user_id: userId })
      setProfile({ xp_total: 0, xp_current_week: 0, xp_current_month: 0, level_number: 1, total_students_ever: 0 })
    }

    const { data: earnedBadges } = await supabase
      .from('user_badges')
      .select('badge_id, earned_at, badges:badges(id, code, category, name, description, xp_bonus, rarity)')
      .eq('user_id', userId!)

    const earned = (earnedBadges || []).map(ub => ({
      ...(Array.isArray(ub.badges) ? ub.badges[0] : ub.badges) as any,
      earned_at: ub.earned_at,
    })).filter(Boolean)
    setBadges(earned)

    const { data: all } = await supabase.from('badges').select('*').eq('actor_type', 'teacher').order('category')
    setAllBadges(all || [])

    setLoading(false)
  }

  const currentLevel = TEACHER_LEVELS.find(l => l.level_number === (profile?.level_number || 1)) || TEACHER_LEVELS[0]
  const nextLevel = TEACHER_LEVELS.find(l => l.level_number === (profile?.level_number || 1) + 1)
  const progressToNextLevel = nextLevel && profile
    ? Math.min(100, Math.round(((profile.xp_total - currentLevel.xp_min) / (nextLevel.xp_min - currentLevel.xp_min)) * 100))
    : 100

  return { profile, currentLevel, nextLevel, progressToNextLevel, badges, allBadges, loading, levels: TEACHER_LEVELS }
}
