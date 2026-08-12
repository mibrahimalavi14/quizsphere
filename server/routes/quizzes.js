import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { gradeAndRecord } from '../grader.js';
import { assertRank, rankMeta } from '../ranks.js';

const router = Router();

function gate(req, res, minRank) {
  try {
    assertRank(req.user.xp || 0, minRank);
    return true;
  } catch (e) {
    res.status(e.status || 403).json({ error: e.message, rank: e.rank });
    return false;
  }
}

function getSubject(id) {
  return db.prepare('SELECT id, name, icon, color, min_rank FROM subjects WHERE id = ?').get(id);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function stripAnswer(q, includeCorrect) {
  const base = {
    id: q.id,
    question: q.question,
    options: [q.option_a, q.option_b, q.option_c, q.option_d],
    points: q.points,
    timeLimit: q.time_limit,
    difficulty: q.difficulty,
    explanation: q.explanation || '',
  };
  if (includeCorrect) base.correct = q.correct;
  return base;
}

router.get('/daily', requireAuth, (req, res) => {
  const dailySubject = db.prepare(`SELECT * FROM subjects WHERE name = 'Daily Challenge'`).get();
  if (!dailySubject) return res.status(500).json({ error: 'Daily challenge not configured' });
  if (!gate(req, res, dailySubject.min_rank)) return;

  const doneToday = db.prepare(`
    SELECT a.* FROM attempts a WHERE a.user_id = ? AND a.mode = 'daily' AND date(a.created_at) = date('now')
  `).get(req.user.id);

  if (doneToday) {
    return res.json({ done: true, subject: { id: dailySubject.id, name: dailySubject.name, icon: dailySubject.icon, color: dailySubject.color }, attempt: doneToday });
  }

  const rows = db.prepare(`
    SELECT * FROM questions WHERE subject_id IN (SELECT id FROM subjects WHERE is_visible = 1)
    ORDER BY RANDOM() LIMIT 5
  `).all();

  res.json({
    done: false,
    date: todayKey(),
    subject: { id: dailySubject.id, name: dailySubject.name, icon: dailySubject.icon, color: dailySubject.color },
    questions: rows.map((q) => stripAnswer(q, false)),
  });
});

router.post('/daily/submit', requireAuth, (req, res) => {
  const dailySubject = db.prepare(`SELECT id, min_rank FROM subjects WHERE name = 'Daily Challenge'`).get();
  if (!dailySubject) return res.status(500).json({ error: 'Daily challenge not configured' });
  if (!gate(req, res, dailySubject.min_rank)) return;

  const doneToday = db.prepare(`
    SELECT id FROM attempts WHERE user_id = ? AND mode = 'daily' AND date(created_at) = date('now')
  `).get(req.user.id);
  if (doneToday) return res.status(409).json({ error: 'You already completed today\'s challenge. Come back tomorrow!' });

  const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
  try {
    const result = gradeAndRecord({ userId: req.user.id, subjectId: dailySubject.id, answers, mode: 'daily', durationSeconds: req.body?.durationSeconds });
    res.status(201).json(result);
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

router.get('/rapid', requireAuth, (req, res) => {
  const rapidSubject = db.prepare(`SELECT * FROM subjects WHERE name = 'Rapid Fire'`).get();
  if (!rapidSubject) return res.status(500).json({ error: 'Rapid fire not configured' });
  if (!gate(req, res, rapidSubject.min_rank)) return;

  const limit = Math.min(Number(req.query.limit) || 10, 10);
  const rows = db.prepare(`
    SELECT * FROM questions WHERE subject_id IN (SELECT id FROM subjects WHERE is_visible = 1)
    ORDER BY RANDOM() LIMIT ?
  `).all(limit);

  res.json({
    subject: { id: rapidSubject.id, name: rapidSubject.name, icon: rapidSubject.icon, color: rapidSubject.color },
    questions: rows.map((q) => ({ ...stripAnswer(q, false), timeLimit: 10 })),
  });
});

router.post('/rapid/submit', requireAuth, (req, res) => {
  const rapidSubject = db.prepare(`SELECT id, min_rank FROM subjects WHERE name = 'Rapid Fire'`).get();
  if (!rapidSubject) return res.status(500).json({ error: 'Rapid fire not configured' });
  if (!gate(req, res, rapidSubject.min_rank)) return;

  const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
  try {
    const result = gradeAndRecord({ userId: req.user.id, subjectId: rapidSubject.id, answers, mode: 'rapid', durationSeconds: req.body?.durationSeconds });
    res.status(201).json(result);
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

router.get('/practice/mistakes', requireAuth, (req, res) => {
  const practiceSubject = db.prepare(`SELECT * FROM subjects WHERE name = 'Practice Mistakes'`).get();
  if (!practiceSubject) return res.status(500).json({ error: 'Practice not configured' });

  const limit = Math.min(Number(req.query.limit) || 10, 30);
  const rows = db.prepare(`
    SELECT q.* FROM questions q
    JOIN question_stats s ON s.question_id = q.id
    WHERE s.user_id = ? AND s.times_wrong > 0
    ORDER BY RANDOM() LIMIT ?
  `).all(req.user.id, limit);

  res.json({
    subject: { id: practiceSubject.id, name: practiceSubject.name, icon: practiceSubject.icon, color: practiceSubject.color },
    questions: rows.map((q) => stripAnswer(q, true)),
  });
});

router.post('/practice/mistakes/submit', requireAuth, (req, res) => {
  const practiceSubject = db.prepare(`SELECT id FROM subjects WHERE name = 'Practice Mistakes'`).get();
  if (!practiceSubject) return res.status(500).json({ error: 'Practice not configured' });

  const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
  try {
    const result = gradeAndRecord({ userId: req.user.id, subjectId: practiceSubject.id, answers, mode: 'practice', practiceType: 'mistakes', durationSeconds: req.body?.durationSeconds });
    res.status(201).json(result);
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

router.get('/weekly', requireAuth, (req, res) => {
  const weeklySubject = db.prepare(`SELECT * FROM subjects WHERE name = 'Weekly Challenge'`).get();
  if (!weeklySubject) return res.status(500).json({ error: 'Weekly challenge not configured' });
  if (!gate(req, res, weeklySubject.min_rank)) return;

  const doneThisWeek = db.prepare(`
    SELECT a.* FROM attempts a WHERE a.user_id = ? AND a.mode = 'weekly'
      AND strftime('%Y-%W', a.created_at) = strftime('%Y-%W', 'now')
  `).get(req.user.id);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const range = {
    start: weekStart.toISOString().slice(0, 10),
    end: weekEnd.toISOString().slice(0, 10),
  };

  if (doneThisWeek) {
    return res.json({ done: true, range, subject: { id: weeklySubject.id, name: weeklySubject.name, icon: weeklySubject.icon, color: weeklySubject.color }, attempt: doneThisWeek });
  }

  const rows = db.prepare(`
    SELECT * FROM questions WHERE subject_id IN (SELECT id FROM subjects WHERE is_visible = 1)
    ORDER BY RANDOM() LIMIT 10
  `).all();

  res.json({
    done: false,
    range,
    subject: { id: weeklySubject.id, name: weeklySubject.name, icon: weeklySubject.icon, color: weeklySubject.color },
    questions: rows.map((q) => stripAnswer(q, false)),
  });
});

router.post('/weekly/submit', requireAuth, (req, res) => {
  const weeklySubject = db.prepare(`SELECT id, min_rank FROM subjects WHERE name = 'Weekly Challenge'`).get();
  if (!weeklySubject) return res.status(500).json({ error: 'Weekly challenge not configured' });
  if (!gate(req, res, weeklySubject.min_rank)) return;

  const doneThisWeek = db.prepare(`
    SELECT id FROM attempts WHERE user_id = ? AND mode = 'weekly'
      AND strftime('%Y-%W', created_at) = strftime('%Y-%W', 'now')
  `).get(req.user.id);
  if (doneThisWeek) return res.status(409).json({ error: 'You already completed this week\'s challenge. Come back next week!' });

  const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
  try {
    const result = gradeAndRecord({ userId: req.user.id, subjectId: weeklySubject.id, answers, mode: 'weekly', durationSeconds: req.body?.durationSeconds });
    res.status(201).json(result);
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

router.get('/retake/:attemptId/questions', requireAuth, (req, res) => {
  const attempt = db.prepare(`
    SELECT a.*, s.name AS subject_name, s.icon, s.color, s.min_rank FROM attempts a
    JOIN subjects s ON s.id = a.subject_id
    WHERE a.id = ? AND a.user_id = ? AND a.mode NOT IN ('practice', 'daily', 'weekly')
  `).get(req.params.attemptId, req.user.id);
  if (!attempt) return res.status(404).json({ error: 'Attempt not found' });

  const rows = db.prepare(`
    SELECT q.* FROM questions q
    JOIN answers a ON a.question_id = q.id
    WHERE a.attempt_id = ?
    ORDER BY a.id ASC
  `).all(attempt.id);

  res.json({
    subject: { id: attempt.subject_id, name: attempt.subject_name, icon: attempt.icon, color: attempt.color, min_rank: attempt.min_rank },
    mode: attempt.mode,
    retakeOf: attempt.id,
    questions: rows.map((q) => stripAnswer(q, false)),
  });
});

router.get('/:subjectId/questions', requireAuth, (req, res) => {
  const subjectId = Number(req.params.subjectId);
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const difficulty = req.query.difficulty || 'all';
  const mode = req.query.mode || 'quiz';
  const practice = mode === 'practice';

  const subject = db.prepare('SELECT id, name, icon, color, min_rank FROM subjects WHERE id = ? AND is_visible = 1').get(subjectId);
  if (!subject) return res.status(404).json({ error: 'Subject not found' });
  if (!gate(req, res, subject.min_rank)) return;

  const where = ['subject_id = ?'];
  const params = [subjectId];
  if (difficulty !== 'all') {
    where.push('difficulty = ?');
    params.push(difficulty);
  }
  const rows = db.prepare(`SELECT * FROM questions WHERE ${where.join(' AND ')} ORDER BY RANDOM() LIMIT ?`).all(...params, limit);
  if (rows.length === 0) {
    return res.json({ subject: { ...subject, requiredRank: rankMeta(subject.min_rank) }, difficulty, mode, questions: [] });
  }

  res.json({
    subject: { ...subject, requiredRank: rankMeta(subject.min_rank) },
    difficulty,
    mode,
    questions: rows.map((q) => stripAnswer(q, practice)),
  });
});

router.post('/:subjectId/submit', requireAuth, (req, res) => {
  const subjectId = Number(req.params.subjectId);
  const subject = getSubject(subjectId);
  if (!subject) return res.status(404).json({ error: 'Subject not found' });
  if (!gate(req, res, subject.min_rank)) return;

  const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
  const mode = req.body?.mode || 'quiz';
  const negative = Boolean(req.body?.negative);
  const examMode = Boolean(req.body?.examMode);
  const retakeOf = Number(req.body?.retakeOf) || null;
  const config = req.body?.config ? JSON.stringify(req.body.config) : '';

  const allowedModes = ['quiz', 'practice', 'mock'];
  if (!allowedModes.includes(mode)) return res.status(400).json({ error: 'Invalid mode' });

  try {
    const result = gradeAndRecord({ userId: req.user.id, subjectId, answers, mode, negative, durationSeconds: req.body?.durationSeconds, examMode, retakeOf, config });
    res.status(201).json(result);
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

export default router;
