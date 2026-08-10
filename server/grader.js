import { db } from './db.js';
import { checkAndAwardBadges } from './badges.js';
import {
  XP_PER_POINT,
  COMPLETION_BONUS,
  PERFECT_BONUS,
  RAPID_XP_PER_CORRECT,
  DAILY_XP_MULTIPLIER,
  levelInfo,
} from './levels.js';

function gradeAnswers(answers) {
  const ids = answers.map((a) => a.questionId).filter(Boolean);
  if (ids.length === 0) return { breakdown: [], byId: new Map() };

  const placeholders = ids.map(() => '?').join(',');
  const rows = db.prepare(`SELECT id, correct, points FROM questions WHERE id IN (${placeholders})`).all(...ids);
  const byId = new Map(rows.map((q) => [q.id, q]));

  const breakdown = answers.map((a) => {
    const q = byId.get(a.questionId);
    if (!q) return null;
    const selected = Number.isInteger(a.selected) ? a.selected : null;
    const isCorrect = selected === q.correct;
    const pointsEarned = isCorrect ? q.points : 0;
    return { questionId: q.id, selected, correct: q.correct, isCorrect, pointsEarned, pointsAvailable: q.points };
  }).filter(Boolean);

  return { breakdown, byId };
}

function applyNegativeMarking(breakdown, factor) {
  return breakdown.map((b) => ({
    ...b,
    pointsEarned: b.isCorrect ? b.pointsEarned : Math.round(-b.pointsAvailable * factor),
  }));
}

function computeXp({ mode, correctCount, total, earnedPoints }) {
  if (mode === 'practice') return 0;
  let xp = 0;
  if (mode === 'rapid') {
    xp = correctCount * RAPID_XP_PER_CORRECT;
  } else {
    xp = Math.max(0, earnedPoints) * XP_PER_POINT;
    xp += COMPLETION_BONUS;
    if (correctCount === total && total > 0) xp += PERFECT_BONUS;
  }
  if (mode === 'daily') xp *= DAILY_XP_MULTIPLIER;
  return Math.round(xp);
}

function updateStreak(userId) {
  const user = db.prepare('SELECT current_streak, max_streak, last_played_date FROM users WHERE id = ?').get(userId);
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  let streak = 1;
  if (user.last_played_date === today) {
    streak = user.current_streak;
  } else if (user.last_played_date === yesterday) {
    streak = user.current_streak + 1;
  }
  const maxStreak = Math.max(user.max_streak, streak);
  db.prepare('UPDATE users SET current_streak = ?, max_streak = ?, last_played_date = ? WHERE id = ?')
    .run(streak, maxStreak, today, userId);
  return { currentStreak: streak, maxStreak };
}

export function gradeAndRecord({ userId, subjectId, answers, mode = 'quiz', negative = false, durationSeconds = 0 }) {
  const subject = db.prepare('SELECT id, name, icon, color FROM subjects WHERE id = ?').get(subjectId);
  if (!subject) {
    const err = new Error('Subject not found');
    err.status = 404;
    throw err;
  }

  const { breakdown } = gradeAnswers(answers);
  if (breakdown.length === 0) {
    const err = new Error('No valid answers submitted');
    err.status = 400;
    throw err;
  }

  const graded = negative ? applyNegativeMarking(breakdown, 0.5) : breakdown;
  const correctCount = graded.filter((b) => b.isCorrect).length;
  const earnedPoints = graded.reduce((s, b) => s + b.pointsEarned, 0);
  const totalPoints = graded.reduce((s, b) => s + b.pointsAvailable, 0);
  const score = Math.round((correctCount / graded.length) * 100);
  const xpEarned = computeXp({ mode, correctCount, total: graded.length, earnedPoints });
  const safeDuration = Math.max(0, Math.floor(Number(durationSeconds) || 0));

  const attempt = db.prepare(`
    INSERT INTO attempts (user_id, subject_id, mode, negative, score, correct_answers, total_questions, earned_points, total_points, xp_earned, duration_seconds)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, subjectId, mode, negative ? 1 : 0, score, correctCount, graded.length, Math.max(earnedPoints, 0), totalPoints, xpEarned, safeDuration);

  const insertAnswer = db.prepare(`
    INSERT INTO answers (attempt_id, question_id, selected, is_correct, points_earned)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (const b of graded) {
    insertAnswer.run(attempt.lastInsertRowid, b.questionId, b.selected, b.isCorrect ? 1 : 0, b.pointsEarned);
  }

  const streakInfo = mode === 'practice' ? { currentStreak: null, maxStreak: null } : updateStreak(userId);

  let xpResult = { xpAdded: 0, levelInfo: null };
  if (xpEarned > 0) {
    db.prepare('UPDATE users SET xp = xp + ? WHERE id = ?').run(xpEarned, userId);
    const user = db.prepare('SELECT xp FROM users WHERE id = ?').get(userId);
    xpResult = { xpAdded: xpEarned, levelInfo: levelInfo(user.xp) };
  }

  const newBadges = mode === 'practice'
    ? checkAndAwardBadges(userId, { perfectScore: false })
    : checkAndAwardBadges(userId, { perfectScore: score === 100 && correctCount === graded.length && totalPoints > 0 });

  return {
    attemptId: attempt.lastInsertRowid,
    subject,
    mode,
    negative,
    score,
    correctAnswers: correctCount,
    totalQuestions: graded.length,
    earnedPoints: Math.max(earnedPoints, 0),
    totalPoints,
    xpEarned,
    durationSeconds: safeDuration,
    ...xpResult,
    streak: streakInfo,
    newBadges,
    breakdown: graded,
    createdAt: new Date().toISOString(),
  };
}
