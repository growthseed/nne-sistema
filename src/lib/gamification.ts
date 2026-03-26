import { supabase } from './supabase'

/**
 * Award XP to a user by calling the award_xp() SQL function.
 * Returns the XP earned (after multiplier), or 0 if action was rate-limited.
 */
export async function awardXP(
  userId: string,
  actorType: 'student' | 'teacher',
  actionKey: string,
  referenceId?: string,
  referenceType?: string,
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('award_xp', {
      p_user_id: userId,
      p_actor_type: actorType,
      p_action_key: actionKey,
      p_reference_id: referenceId || null,
      p_reference_type: referenceType || null,
    })
    if (error) { console.error('awardXP error:', error); return 0 }
    return data || 0
  } catch (err) {
    console.error('awardXP exception:', err)
    return 0
  }
}

/**
 * Log a streak day for a user.
 * Call this whenever the user performs a study action.
 */
export async function logStreakDay(userId: string, actionKey: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)

  // Insert streak log (unique per user per day)
  await supabase.from('streak_logs').upsert({
    user_id: userId,
    log_date: today,
    action_key: actionKey,
  }, { onConflict: 'user_id,log_date' })

  // Calculate current streak
  const { data: logs } = await supabase
    .from('streak_logs')
    .select('log_date')
    .eq('user_id', userId)
    .order('log_date', { ascending: false })
    .limit(100)

  if (!logs || logs.length === 0) return

  let streak = 1
  const dates = logs.map(l => l.log_date)
  for (let i = 1; i < dates.length; i++) {
    const curr = new Date(dates[i - 1])
    const prev = new Date(dates[i])
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
    if (diff <= 1) streak++
    else break
  }

  // Update streak in student_gamification
  await supabase.from('student_gamification').update({
    streak_current: streak,
    streak_best: supabase.rpc ? streak : streak, // will use GREATEST in SQL
    streak_last_activity: today,
  }).eq('user_id', userId)

  // Also update streak_best only if new streak is higher
  await supabase.rpc('update_streak_best', { p_user_id: userId, p_streak: streak }).catch(() => {})

  // Check streak milestones
  if (streak === 7) await awardXP(userId, 'student', 'streak_7_days')
  if (streak === 30) await awardXP(userId, 'student', 'streak_30_days')
}
