const { types: pgTypes } = require('pg')
const { default: sql } = require('../lib/database.js')
const { canActForProfile } = require('../lib/auth.js')
const { handleError, createErrorResponse } = require('../lib/response.js')
const { withQueryTimeout, TIMEOUTS } = require('../lib/queries.js')
const { computeStreaksFromDayKeys, startOfWeekMonday } = require('../lib/streaks.js')

const DEFAULT_HISTORY_LIMIT = 50
const MAX_HISTORY_LIMIT = 500

// Les dates agrégées en JSON reviennent en texte : on les convertit avec le même parser
// que pg pour une colonne timestamp (réponse identique à celle d'une requête classique)
const parseTimestamp = pgTypes.getTypeParser(1114, 'text')
const toTimestamp = value => (value === null || value === undefined ? null : parseTimestamp(value))

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

/**
 * Toutes les statistiques du résumé en UNE requête (CTE + FILTER + agrégats JSON),
 * au lieu de 7 requêtes parallèles qui occupaient jusqu'à 7 connexions du pool par appel.
 * Les timestamps et décimaux passent en texte dans le JSON pour garder exactement les
 * types renvoyés jusqu'ici (Date, chaîne « 75.00 » pour percentage).
 */
function buildProgressSummaryQuery(profileId, weekStartIso, historyLimit) {
  return sql`
    WITH results AS (
      SELECT
        qr.id,
        qr.lesson_id,
        qr.course_page_id,
        qr.score,
        qr.total_questions,
        qr.percentage,
        qr.answers,
        qr.is_completed,
        qr.completed_at,
        COALESCE(l.title, cp.title) AS lesson_title,
        NULLIF(TRIM(COALESCE(l.subject, cp.subject)), '') AS subject_name,
        COALESCE(
          qr.completed_at >= ${weekStartIso}::timestamptz
            AND qr.completed_at < (${weekStartIso}::timestamptz + interval '7 days'),
          false
        ) AS in_week
      FROM quiz_results qr
      LEFT JOIN lessons l ON l.id = qr.lesson_id
      LEFT JOIN course_pages cp ON cp.id = qr.course_page_id
      WHERE qr.profile_id = ${profileId}
    ),
    totals AS (
      SELECT
        COUNT(*)::int AS total_quizzes,
        COALESCE(AVG(percentage), 0)::float AS average_score,
        COALESCE(SUM(percentage), 0)::int AS xp_sum,
        COUNT(*) FILTER (WHERE percentage = 100 AND is_completed IS NOT FALSE)::int AS perfect_count,
        COUNT(*) FILTER (WHERE in_week)::int AS quizzes_this_week,
        COUNT(*) FILTER (WHERE in_week AND percentage = 100 AND is_completed IS NOT FALSE)::int AS perfect_this_week,
        COUNT(DISTINCT subject_name) FILTER (WHERE in_week)::int AS subjects_this_week
      FROM results
    )
    SELECT
      t.*,
      (SELECT COALESCE(json_agg(d.day_key ORDER BY d.day_key DESC), '[]'::json)
         FROM (SELECT DISTINCT to_char(DATE(completed_at), 'YYYY-MM-DD') AS day_key
               FROM results WHERE completed_at IS NOT NULL
               ORDER BY day_key DESC LIMIT 365) d) AS day_keys,
      (SELECT COALESCE(json_agg(s ORDER BY s.quizzes DESC, s.average_score DESC), '[]'::json)
         FROM (SELECT COALESCE(subject_name, 'Autres') AS subject,
                      COUNT(*)::int AS quizzes,
                      COALESCE(AVG(percentage), 0)::float AS average_score,
                      MAX(completed_at)::text AS last_attempt
               FROM results
               GROUP BY 1
               ORDER BY quizzes DESC, average_score DESC
               LIMIT 20) s) AS skills,
      (SELECT COALESCE(json_agg(m ORDER BY m.month_key DESC), '[]'::json)
         FROM (SELECT to_char(date_trunc('month', completed_at), 'YYYY-MM') AS month_key,
                      COUNT(*)::int AS quiz_count,
                      COALESCE(AVG(percentage), 0)::float AS average_score
               FROM results
               WHERE completed_at IS NOT NULL
               GROUP BY 1
               ORDER BY month_key DESC
               LIMIT 6) m) AS monthly,
      (SELECT COALESCE(json_agg(h ORDER BY h.position), '[]'::json)
         FROM (SELECT id, lesson_id, course_page_id, lesson_title,
                      COALESCE(subject_name, 'Autres') AS subject,
                      score, total_questions,
                      percentage::text AS percentage,
                      answers, is_completed,
                      completed_at::text AS completed_at,
                      ROW_NUMBER() OVER (ORDER BY completed_at DESC, id DESC) AS position
               FROM results
               ORDER BY completed_at DESC, id DESC
               LIMIT ${historyLimit}) h) AS history
    FROM totals t
  `
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

    // canActForProfile est asynchrone (statut admin de la cible lu en base, avec cache) :
    // sans await, la Promise serait toujours « vraie » et l'accès jamais refusé
    if (!(await canActForProfile(req.user, profileIdNum))) {
      res.status(403).json(createErrorResponse('Accès refusé', 'FORBIDDEN'))
      return
    }

    // Historique : 50 par défaut, jusqu'à 500 pour les vues « année » / « tout »
    const requestedLimit = parseInt(req.query?.historyLimit, 10)
    const historyLimit = Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, MAX_HISTORY_LIMIT)
      : DEFAULT_HISTORY_LIMIT

    const weekStart = startOfWeekMonday(new Date())
    const weekStartIso = weekStart.toISOString()

    const rows = await withQueryTimeout(
      buildProgressSummaryQuery(profileIdNum, weekStartIso, historyLimit),
      TIMEOUTS.LONG,
      'résumé de progression'
    )
    const row = rows?.[0] || {}

    const perfectCount = Number(row.perfect_count) || 0
    const streaks = computeStreaksFromDayKeys(row.day_keys || [])

    const xpBase = Number(row.xp_sum) || 0
    const xpTotal = xpBase + perfectCount * 50
    const levelInfo = computeLevelFromXp(xpTotal)

    const skills = Array.isArray(row.skills) ? row.skills : []
    const subjectsVarietyAllTime = skills.filter(s => s.subject && s.subject !== 'Autres').length

    const summary = {
      profileId: profileIdNum,
      totals: {
        totalQuizzes: Number(row.total_quizzes) || 0,
        averageScore: Number(row.average_score) || 0,
        perfectCount
      },
      streaks,
      xp: {
        total: xpTotal,
        ...levelInfo
      },
      week: {
        start: weekStartIso,
        quizzesThisWeek: Number(row.quizzes_this_week) || 0,
        perfectThisWeek: Number(row.perfect_this_week) || 0,
        subjectsThisWeek: Number(row.subjects_this_week) || 0
      },
      weeklyGoals: null,
      skills: skills.map(s => ({
        subject: s.subject,
        quizzes: Number(s.quizzes) || 0,
        averageScore: Number(s.average_score) || 0,
        lastAttempt: toTimestamp(s.last_attempt)
      })),
      monthlyProgress: (Array.isArray(row.monthly) ? row.monthly : []).map(m => ({
        monthKey: m.month_key,
        quizCount: Number(m.quiz_count) || 0,
        averageScore: Number(m.average_score) || 0
      })),
      achievements: null,
      recentHistory: (Array.isArray(row.history) ? row.history : []).map(q => ({
        id: q.id,
        lessonId: q.lesson_id,
        coursePageId: q.course_page_id,
        source: q.course_page_id ? 'course_page' : 'lesson',
        lessonTitle: q.lesson_title,
        lessonSubject: q.subject,
        score: q.score,
        totalQuestions: q.total_questions,
        percentage: q.percentage,
        answers: q.answers,
        isCompleted: q.is_completed !== false,
        completedAt: toTimestamp(q.completed_at)
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
  handleProfileProgressSummary,
  buildProgressSummaryQuery
}
