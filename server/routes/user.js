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
