const { default: sql } = require('../lib/database.js')
const { authenticateToken } = require('../lib/auth.js')
const { handleError, createErrorResponse } = require('../lib/response.js')
const { withQueryTimeout, TIMEOUTS } = require('../lib/queries.js')

function startOfWeekMonday(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  // JS: 0=dimanche ... 6=samedi. On veut lundi=0
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day)
  return d
}

function toDateOnlyKey(date) {
  // YYYY-MM-DD en local (ok pour streak)
  const d = new Date(date)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function computeStreaksFromDayKeys(dayKeys) {
  // dayKeys: array unique, trié desc (YYYY-MM-DD)
  if (!Array.isArray(dayKeys) || dayKeys.length === 0) {
    return { current: 0, best: 0, lastActivityDate: null }
  }

  const todayKey = toDateOnlyKey(new Date())
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = toDateOnlyKey(yesterday)

  const set = new Set(dayKeys)

  // current streak: commence aujourd'hui si activité, sinon hier si activité, sinon 0
  let current = 0
  let cursor = null
  if (set.has(todayKey)) cursor = new Date()
  else if (set.has(yesterdayKey)) cursor = yesterday
  else cursor = null

  while (cursor) {
    const key = toDateOnlyKey(cursor)
    if (!set.has(key)) break
    current++
    cursor.setDate(cursor.getDate() - 1)
  }

  // best streak: parcourir toutes les dates (desc) et compter runs consécutifs
  let best = 1
  let run = 1
  for (let i = 1; i < dayKeys.length; i++) {
    const prev = new Date(dayKeys[i - 1])
    const cur = new Date(dayKeys[i])
    prev.setDate(prev.getDate() - 1)
    if (toDateOnlyKey(prev) === toDateOnlyKey(cur)) {
      run++
      best = Math.max(best, run)
    } else {
      run = 1
    }
  }

  return { current, best, lastActivityDate: dayKeys[0] }
}

function computeLevelFromXp(xpTotal) {
  const xp = Number.isFinite(xpTotal) ? xpTotal : 0
  const level = Math.max(1, Math.floor(xp / 500) + 1)
  const xpInLevel = xp % 500
  const xpForNextLevel = 500
  const levelProgressPercent = Math.min(100, Math.round((xpInLevel / xpForNextLevel) * 100))
  return { level, xpInLevel, xpForNextLevel, levelProgressPercent }
}

function buildDefaultWeeklyGoals(summary) {
  const quizzesTarget = 5
  const perfectTarget = 1
  const subjectsTarget = 3

  const quizzesDone = summary.week?.quizzesThisWeek ?? 0
  const perfectDone = summary.week?.perfectThisWeek ?? 0
  const subjectsDone = summary.week?.subjectsThisWeek ?? 0

  return [
    {
      id: 'weekly_quizzes',
      title: 'Quiz de la semaine',
      description: `Faire ${quizzesTarget} quiz`,
      target: quizzesTarget,
      current: quizzesDone,
      unit: 'quiz',
      rewardXp: 150
    },
    {
      id: 'weekly_perfect',
      title: 'Score parfait',
      description: `Obtenir ${perfectTarget} score parfait`,
      target: perfectTarget,
      current: perfectDone,
      unit: 'perfect',
      rewardXp: 200
    },
    {
      id: 'weekly_subjects',
      title: 'Variété',
      description: `Travailler ${subjectsTarget} matières`,
      target: subjectsTarget,
      current: subjectsDone,
      unit: 'matières',
      rewardXp: 100
    }
  ].map(g => ({
    ...g,
    progressPercent: Math.min(100, Math.round((g.current / g.target) * 100))
  }))
}

function buildAchievements({ totals, streaks, subjectsVariety, perfectCount }) {
  const totalQuizzes = totals?.totalQuizzes ?? 0
  const achievements = [
    {
      id: 'first_quiz',
      title: 'Premier quiz',
      description: 'Compléter ton premier quiz',
      icon: '🎯',
      target: 1,
      current: totalQuizzes
    },
    {
      id: 'ten_quizzes',
      title: 'Quiz master',
      description: 'Compléter 10 quiz',
      icon: '🏆',
      target: 10,
      current: totalQuizzes
    },
    {
      id: 'perfect_score',
      title: 'Score parfait',
      description: 'Obtenir 100% à un quiz',
      icon: '⭐',
      target: 1,
      current: perfectCount
    },
    {
      id: 'daily_streak_3',
      title: 'Série 3 jours',
      description: 'Apprendre 3 jours de suite',
      icon: '🔥',
      target: 3,
      current: streaks?.current ?? 0
    },
    {
      id: 'subjects_variety',
      title: 'Curieux',
      description: 'Travailler 3 matières différentes',
      icon: '🧠',
      target: 3,
      current: subjectsVariety
    }
  ]

  return achievements.map(a => ({
    ...a,
    unlocked: a.current >= a.target,
    progress: Math.min(100, Math.round((a.current / a.target) * 100))
  }))
}

async function handleProfileProgressSummary(req, res) {
  try {
    if (req.method !== 'GET') {
      res.status(405).json(createErrorResponse('Méthode non autorisée', 'METHOD_NOT_ALLOWED'))
      return
    }

    const id = req.params.id
    const profileIdNum = parseInt(id, 10)
    if (!id || Number.isNaN(profileIdNum)) {
      res.status(400).json(createErrorResponse('ID de profil invalide', 'BAD_REQUEST'))
      return
    }

    const user = authenticateToken(req)
    if (!user?.isAdmin && user?.profileId !== profileIdNum) {
      res.status(403).json(createErrorResponse('Accès refusé', 'FORBIDDEN'))
      return
    }

    const weekStart = startOfWeekMonday(new Date())
    const weekStartIso = weekStart.toISOString()

    const [
      totalsRes,
      perfectRes,
      dayKeysRes,
      weekStatsRes,
      skillsRes,
      monthlyRes,
      recentHistoryRes
    ] = await Promise.all([
      withQueryTimeout(
        sql`SELECT COUNT(*)::int as total_quizzes, COALESCE(AVG(percentage), 0)::float as average_score, COALESCE(SUM(percentage), 0)::int as xp_sum FROM quiz_results WHERE profile_id = ${profileIdNum}`,
        TIMEOUTS.STANDARD,
        'progress summary (totals)'
      ),
      withQueryTimeout(
        sql`SELECT COUNT(*)::int as perfect_count FROM quiz_results WHERE profile_id = ${profileIdNum} AND percentage = 100`,
        TIMEOUTS.STANDARD,
        'progress summary (perfect)'
      ),
      withQueryTimeout(
        sql`
          SELECT DISTINCT DATE(completed_at) as day
          FROM quiz_results
          WHERE profile_id = ${profileIdNum}
          ORDER BY day DESC
          LIMIT 365
        `,
        TIMEOUTS.STANDARD,
        'progress summary (days)'
      ),
      withQueryTimeout(
        sql`
          SELECT 
            COUNT(*)::int as quizzes_this_week,
            COUNT(*) FILTER (WHERE percentage = 100)::int as perfect_this_week,
            COUNT(DISTINCT NULLIF(TRIM(l.subject), ''))::int as subjects_this_week
          FROM quiz_results qr
          JOIN lessons l ON l.id = qr.lesson_id
          WHERE qr.profile_id = ${profileIdNum}
            AND qr.completed_at >= ${weekStartIso}::timestamptz
            AND qr.completed_at < (${weekStartIso}::timestamptz + interval '7 days')
        `,
        TIMEOUTS.STANDARD,
        'progress summary (week)'
      ),
      withQueryTimeout(
        sql`
          SELECT 
            COALESCE(NULLIF(TRIM(l.subject), ''), 'Autres') as subject,
            COUNT(*)::int as quizzes,
            COALESCE(AVG(qr.percentage), 0)::float as average_score,
            MAX(qr.completed_at) as last_attempt
          FROM quiz_results qr
          JOIN lessons l ON l.id = qr.lesson_id
          WHERE qr.profile_id = ${profileIdNum}
          GROUP BY 1
          ORDER BY quizzes DESC, average_score DESC
          LIMIT 20
        `,
        TIMEOUTS.STANDARD,
        'progress summary (skills)'
      ),
      withQueryTimeout(
        sql`
          SELECT 
            to_char(date_trunc('month', completed_at), 'YYYY-MM') as month_key,
            COUNT(*)::int as quiz_count,
            COALESCE(AVG(percentage), 0)::float as average_score
          FROM quiz_results
          WHERE profile_id = ${profileIdNum}
          GROUP BY 1
          ORDER BY month_key DESC
          LIMIT 6
        `,
        TIMEOUTS.STANDARD,
        'progress summary (monthly)'
      ),
      withQueryTimeout(
        sql`
          SELECT
            qr.id,
            qr.lesson_id,
            l.title as lesson_title,
            COALESCE(NULLIF(TRIM(l.subject), ''), 'Autres') as subject,
            qr.score,
            qr.total_questions,
            qr.percentage,
            qr.completed_at
          FROM quiz_results qr
          JOIN lessons l ON l.id = qr.lesson_id
          WHERE qr.profile_id = ${profileIdNum}
          ORDER BY qr.completed_at DESC
          LIMIT 50
        `,
        TIMEOUTS.STANDARD,
        'progress summary (recent history)'
      )
    ])

    const totalsRow = totalsRes?.[0] || {}
    const perfectCount = perfectRes?.[0]?.perfect_count ?? 0
    const dayKeys = (dayKeysRes || []).map(r => toDateOnlyKey(r.day))
    const streaks = computeStreaksFromDayKeys(dayKeys)

    const weekRow = weekStatsRes?.[0] || {}
    const subjectsThisWeek = Number(weekRow.subjects_this_week) || 0

    const xpBase = Number(totalsRow.xp_sum) || 0
    const xpTotal = xpBase + (Number(perfectCount) || 0) * 50
    const levelInfo = computeLevelFromXp(xpTotal)

    const subjectsVarietyAllTime = (skillsRes || []).filter(s => s.subject && s.subject !== 'Autres').length

    const summary = {
      profileId: profileIdNum,
      totals: {
        totalQuizzes: Number(totalsRow.total_quizzes) || 0,
        averageScore: Number(totalsRow.average_score) || 0,
        perfectCount: Number(perfectCount) || 0
      },
      streaks,
      xp: {
        total: xpTotal,
        ...levelInfo
      },
      week: {
        start: weekStartIso,
        quizzesThisWeek: Number(weekRow.quizzes_this_week) || 0,
        perfectThisWeek: Number(weekRow.perfect_this_week) || 0,
        subjectsThisWeek
      },
      weeklyGoals: null,
      skills: (skillsRes || []).map(s => ({
        subject: s.subject,
        quizzes: Number(s.quizzes) || 0,
        averageScore: Number(s.average_score) || 0,
        lastAttempt: s.last_attempt
      })),
      monthlyProgress: (monthlyRes || []).map(m => ({
        monthKey: m.month_key,
        quizCount: Number(m.quiz_count) || 0,
        averageScore: Number(m.average_score) || 0
      })),
      achievements: null,
      recentHistory: (recentHistoryRes || []).map(q => ({
        id: q.id,
        lessonId: q.lesson_id,
        lessonTitle: q.lesson_title,
        lessonSubject: q.subject,
        score: q.score,
        totalQuestions: q.total_questions,
        percentage: q.percentage,
        completedAt: q.completed_at
      }))
    }

    summary.weeklyGoals = buildDefaultWeeklyGoals(summary)
    summary.achievements = buildAchievements({
      totals: summary.totals,
      streaks: summary.streaks,
      subjectsVariety: subjectsVarietyAllTime,
      perfectCount: summary.totals.perfectCount
    })

    res.status(200).json({
      success: true,
      message: 'Résumé de progression récupéré avec succès',
      data: { summary }
    })
  } catch (error) {
    const errorResponse = handleError(error, 'Erreur lors de la récupération du résumé de progression')
    res.status(errorResponse.statusCode).json(JSON.parse(errorResponse.body))
  }
}

module.exports = {
  handleProfileProgressSummary
}

