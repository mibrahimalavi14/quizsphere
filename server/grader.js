import { db } from './db.js';
import { checkAndAwardBadges } from './badges.js';
import { XP_RULES, levelInfo } from './levels.js';

export const MISTAKE_XP_PER_CORRECT = 2;
export const MISTAKE_COMPLETION_XP = 5;
export const MISTAKE_MIN_QUESTIONS = 3;
export const MOCK_PASS_SCORE = 60;

export function issueCertificate({ userId, subjectId, attemptId, title, score }) {
  if (!db.prepare('SELECT 1 FROM certificates WHERE attempt_id = ?').get(attemptId)) {
    const code = `QS-${Date.now().toString(36).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`;
    const r = db.prepare('INSERT INTO certificates (user_id, subject_id, attempt_id, title, score, cert_code) VALUES (?, ?, ?, ?, ?, ?)')
      .run(userId, subjectId, attemptId, title, score, code);
    return db.prepare('SELECT * FROM certificates WHERE id = ?').get(r.lastInsertRowid);
  }
  return db.prepare('SELECT * FROM certificates WHERE attempt_id = ?').get(attemptId);
}

function upsertQuestionStats(userId, questionId, selected, isCorrect) {
  const existing = db.prepare('SELECT id, times_attempted, times_correct, times_wrong, mastered FROM question_stats WHERE user_id = ? AND question_id = ?').get(userId, questionId);
  const now = new Date().toISOString();
  const wrong = !isCorrect;
  let newlyMastered = false;
  if (!existing) {
    db.prepare('INSERT INTO question_stats (user_id, question_id, times_attempted, times_correct, times_wrong, mastered, last_attempted) VALUES (?, ?, 1, ?, ?, 0, ?)')
      .run(userId, questionId, isCorrect ? 1 : 0, wrong ? 1 : 0, now);
  } else {
    const tA = existing.times_attempted + 1;
    const tC = existing.times_correct + (isCorrect ? 1 : 0);
    const tW = existing.times_wrong + (wrong ? 1 : 0);
    const mastered = tC >= 1 && tW >= 1 && isCorrect ? 1 : 0;
    if (mastered && existing.mastered === 0) newlyMastered = true;
    db.prepare('UPDATE question_stats SET times_attempted = ?, times_correct = ?, times_wrong = ?, mastered = ?, last_attempted = ? WHERE id = ?')
      .run(tA, tC, tW, mastered, now, existing.id);
  }
  return newlyMastered;
}

// Practice XP is separate from the quiz economy: small, capped per question
// (a question pays XP only the first time it is answered correctly), so
// repeating the same questions can't farm unlimited XP. Server-side only.
function computeMistakePracticeXp(userId, breakdown) {
  let xp = 0;
  const mark = db.prepare('UPDATE question_stats SET mistake_xp = 1 WHERE user_id = ? AND question_id = ?');
  for (const b of breakdown) {
    if (!b.isCorrect) continue;
    const st = db.prepare('SELECT mistake_xp FROM question_stats WHERE user_id = ? AND question_id = ?').get(userId, b.questionId);
    if (!st || st.mistake_xp === 0) {
      xp += MISTAKE_XP_PER_CORRECT;
      mark.run(userId, b.questionId);
    }
  }
  if (breakdown.length >= MISTAKE_MIN_QUESTIONS) xp += MISTAKE_COMPLETION_XP;
  return xp;
}

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
    return {
      questionId: q.id,
      selected,
      correct: q.correct,
      isCorrect,
      pointsEarned,
      pointsAvailable: q.points,
      timeTakenMs: Math.min(Math.max(Math.round(Number(a.timeTakenMs) || 0), 0), 600000),
    };
  }).filter(Boolean);

  return { breakdown, byId };
}

function applyNegativeMarking(breakdown, factor) {
  return breakdown.map((b) => ({
    ...b,
    pointsEarned: b.isCorrect ? b.pointsEarned : -Math.round(b.pointsAvailable * factor),
  }));
}

function milestoneBonus(score) {
  for (const m of XP_RULES.MILESTONES) {
    if (score >= m.minScore) return m.xp;
  }
  return 0;
}

// Transparent, server-side XP rules. Client never submits XP — it is
// always derived here from the graded attempt.
function computeXp({ mode, correctCount, total, score }) {
  if (mode === 'practice') return 0;
  if (mode === 'rapid') return correctCount * XP_RULES.RAPID_XP_PER_CORRECT;

  let xp = correctCount * XP_RULES.PER_CORRECT
    + XP_RULES.COMPLETION_BONUS
    + milestoneBonus(score);

  if (mode === 'daily') xp += XP_RULES.DAILY_BONUS;
  if (mode === 'weekly') xp += XP_RULES.WEEKLY_BONUS;
  return xp;
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

export function gradeAndRecord({ userId, subjectId, answers, mode = 'quiz', negative = false, durationSeconds = 0, practiceType = null, examMode = false, retakeOf = null, config = null }) {
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
  const safeDuration = Math.max(0, Math.floor(Number(durationSeconds) || 0));

  const isFirstQuiz = mode !== 'practice'
    && db.prepare(`SELECT COUNT(*) AS c FROM attempts WHERE user_id = ? AND mode != 'practice'`).get(userId).c === 0;
  let xpEarned = computeXp({ mode, correctCount, total: graded.length, score });
  if (isFirstQuiz) xpEarned += XP_RULES.FIRST_QUIZ_BONUS;

  let newlyMastered = 0;
  for (const b of graded) {
    if (upsertQuestionStats(userId, b.questionId, b.selected, b.isCorrect)) newlyMastered++;
  }

  if (mode === 'practice' && practiceType === 'mistakes') {
    xpEarned = computeMistakePracticeXp(userId, graded);
  }

  const attempt = db.prepare(`
    INSERT INTO attempts (user_id, subject_id, mode, negative, score, correct_answers, total_questions, earned_points, total_points, xp_earned, duration_seconds, exam_mode, retake_of, config)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, subjectId, mode, negative ? 1 : 0, score, correctCount, graded.length, Math.max(earnedPoints, 0), totalPoints, xpEarned, safeDuration, examMode ? 1 : 0, retakeOf || null, config || '');

  const insertAnswer = db.prepare(`
    INSERT INTO answers (attempt_id, question_id, selected, is_correct, points_earned, time_taken_ms)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const b of graded) {
    insertAnswer.run(attempt.lastInsertRowid, b.questionId, b.selected, b.isCorrect ? 1 : 0, b.pointsEarned, b.timeTakenMs);
  }

  const streakInfo = mode === 'practice' ? { currentStreak: null, maxStreak: null } : updateStreak(userId);

  let xpResult = { xpAdded: 0, levelInfo: null };
  if (xpEarned > 0) {
    db.prepare('UPDATE users SET xp = xp + ? WHERE id = ?').run(xpEarned, userId);
    if (mode !== 'practice') db.prepare('UPDATE users SET rank_xp = rank_xp + ? WHERE id = ?').run(xpEarned, userId);
    const user = db.prepare('SELECT xp FROM users WHERE id = ?').get(userId);
    xpResult = { xpAdded: xpEarned, levelInfo: levelInfo(user.xp) };
  }

  const newBadges = mode === 'practice'
    ? checkAndAwardBadges(userId, { perfectScore: false })
    : checkAndAwardBadges(userId, { perfectScore: score === 100 && correctCount === graded.length && totalPoints > 0 });

  let certificate = null;
  if (mode === 'mock' && score >= MOCK_PASS_SCORE) {
    certificate = issueCertificate({
      userId,
      subjectId,
      attemptId: attempt.lastInsertRowid,
      title: `${subject.name} Mock Test`,
      score,
    });
  }

  return {
    attemptId: attempt.lastInsertRowid,
    subject,
    mode,
    negative,
    examMode,
    retakeOf: retakeOf || null,
    config,
    score,
    correctAnswers: correctCount,
    totalQuestions: graded.length,
    earnedPoints: Math.max(earnedPoints, 0),
    totalPoints,
    xpEarned,
    firstQuizBonus: isFirstQuiz ? XP_RULES.FIRST_QUIZ_BONUS : 0,
    practiceType: mode === 'practice' ? practiceType : null,
    newlyMastered,
    durationSeconds: safeDuration,
    ...xpResult,
    streak: streakInfo,
    newBadges,
    breakdown: graded,
    certificate,
    createdAt: new Date().toISOString(),
  };
}
