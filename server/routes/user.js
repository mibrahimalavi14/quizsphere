import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { levelInfo } from '../levels.js';
import { rankInfoForXp } from '../ranks.js';
import { BADGES, getUserBadges } from '../badges.js';

const router = Router();

router.patch('/profile', requireAuth, (req, res) => {
  const { name, bio, avatar } = req.body || {};
  const current = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  const newName = name !== undefined ? (String(name).trim() || current.name) : current.name;
  const newBio = bio !== undefined ? String(bio).slice(0, 300) : current.bio;
  const newAvatar = avatar !== undefined ? String(avatar).slice(0, 30) : current.avatar;

  db.prepare('UPDATE users SET name = ?, bio = ?, avatar = ? WHERE id = ?')
    .run(newName, newBio, newAvatar, req.user.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    is_admin: user.is_admin,
    avatar: user.avatar,
    bio: user.bio,
    xp: user.xp,
    ...levelInfo(user.xp),
    ...rankInfoForXp(user.xp),
  });
});

router.get('/stats', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const attempts = db.prepare(`
    SELECT * FROM attempts WHERE user_id = ? ORDER BY id DESC LIMIT 100
  `).all(req.user.id);

  const totals = db.prepare(`
    SELECT
      COUNT(*) AS attempts_count,
      COUNT(CASE WHEN mode != 'practice' THEN 1 END) AS graded_attempts,
      COALESCE(SUM(correct_answers), 0) AS correct_answers,
      COALESCE(SUM(total_questions), 0) AS total_questions,
      COALESCE(SUM(earned_points), 0) AS total_points,
      COALESCE(SUM(xp_earned), 0) AS total_xp
    FROM attempts WHERE user_id = ?
  `).get(req.user.id);

  const bestPerSubject = db.prepare(`
    SELECT s.id, s.name, s.icon, s.color,
      MAX(a.score) AS best_score,
      MAX(a.earned_points) AS best_points
    FROM attempts a JOIN subjects s ON s.id = a.subject_id
    WHERE a.user_id = ? AND a.mode != 'practice'
    GROUP BY a.subject_id
  `).all(req.user.id);

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
      xp: user.xp,
      ...levelInfo(user.xp),
      ...rankInfoForXp(user.xp),
      currentStreak: user.current_streak,
      maxStreak: user.max_streak,
    },
    totals: {
      attemptsCount: totals.attempts_count || 0,
      gradedAttempts: totals.graded_attempts || 0,
      correctAnswers: totals.correct_answers || 0,
      totalQuestions: totals.total_questions || 0,
      totalPoints: totals.total_points || 0,
      totalXp: totals.total_xp || 0,
      accuracy: totals.total_questions
        ? Math.round((totals.correct_answers / totals.total_questions) * 100)
        : 0,
    },
    bestPerSubject,
    attempts: attempts.map((a) => ({ ...a })),
  });
});

router.get('/dashboard', requireAuth, (req, res) => {
  const uid = req.user.id;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(uid);

  const summary = db.prepare(`
    SELECT
      COUNT(*) AS quizzes,
      COUNT(CASE WHEN score >= 40 THEN 1 END) AS passed,
      COALESCE(AVG(score), 0) AS avg_score,
      COALESCE(MAX(score), 0) AS highest,
      COALESCE(SUM(total_questions), 0) AS questions_solved,
      COALESCE(SUM(xp_earned), 0) AS total_xp
    FROM attempts WHERE user_id = ? AND mode != 'practice'
  `).get(uid);

  const cwu = db.prepare(`
    SELECT
      COALESCE(SUM(ans.is_correct), 0) AS correct,
      COALESCE(SUM(CASE WHEN ans.selected IS NOT NULL AND ans.is_correct = 0 THEN 1 END), 0) AS wrong,
      COALESCE(SUM(CASE WHEN ans.selected IS NULL THEN 1 END), 0) AS unanswered
    FROM answers ans JOIN attempts a ON a.id = ans.attempt_id
    WHERE a.user_id = ? AND a.mode != 'practice'
  `).get(uid);

  const subjects = db.prepare(`
    SELECT s.id, s.name, s.icon, s.color, s.min_rank,
      COUNT(a.id) AS attempts,
      ROUND(AVG(a.score)) AS avg_score,
      MAX(a.score) AS best,
      COALESCE(SUM(a.correct_answers), 0) AS correct,
      COALESCE(SUM(a.total_questions), 0) AS total
    FROM attempts a JOIN subjects s ON s.id = a.subject_id
    WHERE a.user_id = ? AND a.mode != 'practice'
    GROUP BY a.subject_id
    ORDER BY avg_score DESC
  `).all(uid);

  const timeline = db.prepare(`
    SELECT score, date(created_at) AS day FROM attempts
    WHERE user_id = ? AND mode != 'practice'
    ORDER BY id DESC LIMIT 20
  `).all(uid).reverse();

  const attempts = db.prepare(`
    SELECT a.*, s.name AS subject_name, s.icon AS subject_icon, s.color AS subject_color
    FROM attempts a JOIN subjects s ON s.id = a.subject_id
    WHERE a.user_id = ?
    ORDER BY a.id DESC LIMIT 50
  `).all(uid);

  const allSubjects = db.prepare(`
    SELECT id, name, icon, color, min_rank FROM subjects
    WHERE is_visible = 1 AND name NOT IN ('Daily Challenge', 'Rapid Fire')
  `).all();

  const playedMap = new Map(subjects.map((s) => [s.id, s]));
  const recommendations = [];
  const seen = new Set();

  for (const s of subjects) {
    if (s.attempts > 0 && s.avg_score < 50) {
      recommendations.push({
        type: 'weak',
        title: `Practice ${s.name}`,
        subjectId: s.id,
        icon: s.icon,
        color: s.color,
        reason: `Your average in ${s.name} is ${s.avg_score}% — practice the basics to improve.`,
        mode: 'practice',
      });
      seen.add(s.id);
    }
  }
  for (const s of subjects) {
    if (s.avg_score >= 80 && !seen.has(s.id)) {
      recommendations.push({
        type: 'hard',
        title: `Try Hard mode in ${s.name}`,
        subjectId: s.id,
        icon: s.icon,
        color: s.color,
        reason: `You average ${s.avg_score}% — you are ready for harder questions!`,
        difficulty: 'hard',
      });
      seen.add(s.id);
    }
  }
  for (const s of allSubjects) {
    if (!playedMap.has(s.id) && recommendations.length < 6) {
      recommendations.push({
        type: 'new',
        title: `Explore ${s.name}`,
        subjectId: s.id,
        icon: s.icon,
        color: s.color,
        reason: `You haven't played ${s.name} yet — give it a try!`,
      });
      seen.add(s.id);
    }
  }

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
      xp: user.xp,
      ...levelInfo(user.xp),
      ...rankInfoForXp(user.xp),
      currentStreak: user.current_streak,
      maxStreak: user.max_streak,
    },
    summary: {
      quizzes: summary.quizzes || 0,
      passed: summary.passed || 0,
      failed: (summary.quizzes || 0) - (summary.passed || 0),
      avgScore: Math.round(summary.avg_score || 0),
      highest: summary.highest || 0,
      questionsSolved: summary.questions_solved || 0,
      totalXp: summary.total_xp || 0,
    },
    cwu: {
      correct: cwu.correct || 0,
      wrong: cwu.wrong || 0,
      unanswered: cwu.unanswered || 0,
      total: (cwu.correct || 0) + (cwu.wrong || 0) + (cwu.unanswered || 0),
    },
    subjects,
    timeline,
    strongest: subjects[0] || null,
    weakest: subjects.length > 1 ? subjects[subjects.length - 1] : null,
    attempts: attempts.map((a) => ({ ...a })),
    recommendations,
  });
});

router.get('/badges', requireAuth, (req, res) => {
  const badges = getUserBadges(req.user.id);
  res.json({ badges, totalEarned: badges.filter((b) => b.earned).length, totalAvailable: BADGES.length });
});

router.get('/attempts', requireAuth, (req, res) => {
  const attempts = db.prepare(`
    SELECT a.*, s.name AS subject_name, s.icon AS subject_icon, s.color AS subject_color
    FROM attempts a JOIN subjects s ON s.id = a.subject_id
    WHERE a.user_id = ?
    ORDER BY a.id DESC
    LIMIT 100
  `).all(req.user.id);
  res.json(attempts);
});

router.get('/attempts/:id', requireAuth, (req, res) => {
  const attempt = db.prepare(`
    SELECT a.*, s.name AS subject_name, s.icon AS subject_icon
    FROM attempts a JOIN subjects s ON s.id = a.subject_id
    WHERE a.id = ? AND a.user_id = ?
  `).get(req.params.id, req.user.id);
  if (!attempt) return res.status(404).json({ error: 'Attempt not found' });

  const answers = db.prepare(`
    SELECT ans.question_id, ans.selected, ans.is_correct, ans.points_earned,
      q.question, q.correct AS correct_answer,
      q.option_a, q.option_b, q.option_c, q.option_d, q.points, q.explanation
    FROM answers ans JOIN questions q ON q.id = ans.question_id
    WHERE ans.attempt_id = ?
  `).all(attempt.id);

  res.json({
    ...attempt,
    answers: answers.map((a) => ({
      questionId: a.question_id,
      question: a.question,
      options: [a.option_a, a.option_b, a.option_c, a.option_d],
      selected: a.selected,
      correctAnswer: a.correct_answer,
      isCorrect: a.is_correct,
      pointsEarned: a.points_earned,
      points: a.points,
      explanation: a.explanation || '',
    })),
  });
});

export default router;
