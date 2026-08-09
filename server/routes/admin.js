import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { requireAdmin, signToken } from '../middleware/auth.js';
import { BADGES } from '../badges.js';
import { levelInfo } from '../levels.js';
import { RANKS, rankIndex } from '../ranks.js';

const router = Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user || user.is_admin !== 1 || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid admin credentials' });
  }
  const safe = { id: user.id, name: user.name, email: user.email, is_admin: user.is_admin };
  res.json({ token: signToken(user), user: safe });
});

router.get('/stats', requireAdmin, (req, res) => {
  const counts = {
    users: db.prepare('SELECT COUNT(*) AS c FROM users').get().c,
    subjects: db.prepare('SELECT COUNT(*) AS c FROM subjects WHERE is_visible = 1').get().c,
    questions: db.prepare('SELECT COUNT(*) AS c FROM questions').get().c,
    attempts: db.prepare('SELECT COUNT(*) AS c FROM attempts').get().c,
    dailyChallenges: db.prepare(`SELECT COUNT(*) AS c FROM attempts WHERE mode = 'daily'`).get().c,
    rapidFire: db.prepare(`SELECT COUNT(*) AS c FROM attempts WHERE mode = 'rapid'`).get().c,
  };

  const recentAttempts = db.prepare(`
    SELECT a.*, u.name AS user_name, u.email AS user_email, s.name AS subject_name
    FROM attempts a
    JOIN users u ON u.id = a.user_id
    JOIN subjects s ON s.id = a.subject_id
    ORDER BY a.id DESC LIMIT 10
  `).all();

  const recentUsers = db.prepare(`
    SELECT id, name, email, is_admin, created_at FROM users ORDER BY id DESC LIMIT 10
  `).all();

  const attemptsLast7Days = db.prepare(`
    SELECT date(created_at) AS day, COUNT(*) AS count
    FROM attempts
    WHERE created_at >= date('now', '-6 days')
    GROUP BY day ORDER BY day
  `).all();

  const subjectPopularity = db.prepare(`
    SELECT s.name, s.icon, COUNT(a.id) AS attempts, COALESCE(AVG(a.score), 0) AS avg_score
    FROM subjects s
    LEFT JOIN attempts a ON a.subject_id = s.id AND a.mode != 'practice'
    WHERE s.is_visible = 1
    GROUP BY s.id ORDER BY attempts DESC
  `).all();

  const difficultyDistribution = db.prepare(`
    SELECT difficulty, COUNT(*) AS count FROM questions GROUP BY difficulty
  `).all();

  const avgScore = db.prepare(`
    SELECT COALESCE(AVG(score), 0) AS avg_score, COALESCE(AVG(correct_answers * 1.0 / total_questions) * 100, 0) AS avg_accuracy
    FROM attempts WHERE mode != 'practice' AND total_questions > 0
  `).get();

  const topPlayers = db.prepare(`
    SELECT u.id, u.name, u.avatar, u.xp, u.max_streak, COALESCE(SUM(a.earned_points), 0) AS total_points,
      (SELECT COUNT(*) FROM attempts a2 WHERE a2.user_id = u.id AND a2.mode != 'practice') AS quizzes
    FROM users u
    LEFT JOIN attempts a ON a.user_id = u.id AND a.mode != 'practice'
    GROUP BY u.id ORDER BY u.xp DESC LIMIT 5
  `).all();

  res.json({
    counts,
    recentAttempts,
    recentUsers,
    attemptsLast7Days,
    subjectPopularity,
    difficultyDistribution,
    avgScore,
    topPlayers,
  });
});

router.get('/subjects', requireAdmin, (req, res) => {
  const subjects = db.prepare(`
    SELECT s.*, (SELECT COUNT(*) FROM questions q WHERE q.subject_id = s.id) AS question_count
    FROM subjects s ORDER BY s.is_visible DESC, s.name
  `).all();
  res.json(subjects);
});

router.post('/subjects', requireAdmin, (req, res) => {
  const { name, description, icon, color, is_visible, min_rank } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Subject name is required' });
  const rank = RANKS[rankIndex(min_rank)] ? min_rank : 'bronze';
  try {
    const info = db.prepare('INSERT INTO subjects (name, description, icon, color, is_visible, min_rank) VALUES (?, ?, ?, ?, ?, ?)')
      .run(name.trim(), description || '', icon || '📘', color || '#6366f1', is_visible === undefined ? 1 : (is_visible ? 1 : 0), rank);
    const subject = db.prepare('SELECT * FROM subjects WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(subject);
  } catch {
    res.status(409).json({ error: 'Subject name already exists' });
  }
});

router.put('/subjects/:id', requireAdmin, (req, res) => {
  const b = req.body || {};
  const existing = db.prepare('SELECT * FROM subjects WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Subject not found' });
  const rank = b.min_rank !== undefined ? (RANKS[rankIndex(b.min_rank)] ? b.min_rank : existing.min_rank) : existing.min_rank;
  try {
    db.prepare('UPDATE subjects SET name = ?, description = ?, icon = ?, color = ?, is_visible = ?, min_rank = ? WHERE id = ?')
      .run(
        b.name?.trim() ?? existing.name,
        b.description ?? existing.description,
        b.icon ?? existing.icon,
        b.color ?? existing.color,
        b.is_visible === undefined ? existing.is_visible : (b.is_visible ? 1 : 0),
        rank,
        req.params.id
      );
    res.json(db.prepare('SELECT * FROM subjects WHERE id = ?').get(req.params.id));
  } catch {
    res.status(409).json({ error: 'Subject name already exists' });
  }
});

router.delete('/subjects/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT id FROM subjects WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Subject not found' });
  db.prepare('DELETE FROM subjects WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.get('/questions', requireAdmin, (req, res) => {
  const subjectId = req.query.subjectId ? Number(req.query.subjectId) : null;
  const difficulty = req.query.difficulty || 'all';
  const search = (req.query.search || '').trim();
  const page = Math.max(Number(req.query.page) || 1, 1);
  const perPage = Math.min(Number(req.query.perPage) || 20, 100);

  const where = [];
  const params = [];
  if (subjectId) { where.push('q.subject_id = ?'); params.push(subjectId); }
  if (difficulty !== 'all') { where.push('q.difficulty = ?'); params.push(difficulty); }
  if (search) { where.push('q.question LIKE ?'); params.push(`%${search}%`); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = db.prepare(`SELECT COUNT(*) AS c FROM questions q ${whereSql}`).get(...params).c;
  const questions = db.prepare(`
    SELECT q.*, s.name AS subject_name, s.icon AS subject_icon, s.color AS subject_color,
      (SELECT COUNT(*) FROM answers ans JOIN attempts a ON a.id = ans.attempt_id
        WHERE ans.question_id = q.id AND a.mode != 'practice') AS times_answered,
      (SELECT COUNT(*) FROM answers ans JOIN attempts a ON a.id = ans.attempt_id
        WHERE ans.question_id = q.id AND a.mode != 'practice' AND ans.is_correct = 1) AS times_correct
    FROM questions q JOIN subjects s ON s.id = q.subject_id
    ${whereSql}
    ORDER BY q.id DESC LIMIT ? OFFSET ?
  `).all(...params, perPage, (page - 1) * perPage);

  res.json({ questions, total, page, perPage, pages: Math.max(Math.ceil(total / perPage), 1) });
});

router.post('/questions', requireAdmin, (req, res) => {
  const b = req.body || {};
  if (!b.subject_id || !b.question || !b.option_a || !b.option_b || !b.option_c || !b.option_d) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  const c = Number(b.correct);
  if (![0, 1, 2, 3].includes(c)) return res.status(400).json({ error: 'Correct answer must be 0-3' });
  const difficulty = ['easy', 'medium', 'hard'].includes(b.difficulty) ? b.difficulty : 'medium';
  const info = db.prepare(`
    INSERT INTO questions (subject_id, question, option_a, option_b, option_c, option_d, correct, points, time_limit, difficulty, explanation)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    b.subject_id, b.question, b.option_a, b.option_b, b.option_c, b.option_d, c,
    Number(b.points) || 1, Number(b.time_limit) || 20, difficulty, b.explanation || ''
  );
  res.status(201).json(db.prepare('SELECT * FROM questions WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/questions/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Question not found' });
  const b = req.body || {};
  const correct = b.correct !== undefined ? Number(b.correct) : existing.correct;
  if (![0, 1, 2, 3].includes(correct)) return res.status(400).json({ error: 'Correct answer must be 0-3' });
  const difficulty = b.difficulty !== undefined
    ? (['easy', 'medium', 'hard'].includes(b.difficulty) ? b.difficulty : existing.difficulty)
    : existing.difficulty;
  db.prepare(`
    UPDATE questions SET subject_id = ?, question = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?,
      correct = ?, points = ?, time_limit = ?, difficulty = ?, explanation = ? WHERE id = ?
  `).run(
    b.subject_id ?? existing.subject_id,
    b.question ?? existing.question,
    b.option_a ?? existing.option_a,
    b.option_b ?? existing.option_b,
    b.option_c ?? existing.option_c,
    b.option_d ?? existing.option_d,
    correct,
    b.points !== undefined ? Number(b.points) : existing.points,
    b.time_limit !== undefined ? Number(b.time_limit) : existing.time_limit,
    difficulty,
    b.explanation ?? existing.explanation,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id));
});

router.delete('/questions/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT id FROM questions WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Question not found' });
  db.prepare('DELETE FROM questions WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.post('/questions/import', requireAdmin, (req, res) => {
  const { subject_id, questions } = req.body || {};
  if (!subject_id || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'subject_id and questions array are required' });
  }
  const insert = db.prepare(`
    INSERT INTO questions (subject_id, question, option_a, option_b, option_c, option_d, correct, points, time_limit, difficulty, explanation)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  let imported = 0;
  let skipped = 0;
  const run = db.transaction((list) => {
    for (const q of list) {
      if (!q.question || !q.option_a || !q.option_b || !q.option_c || !q.option_d) { skipped++; continue; }
      if (![0, 1, 2, 3].includes(Number(q.correct))) { skipped++; continue; }
      const difficulty = ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium';
      insert.run(
        subject_id, q.question, q.option_a, q.option_b, q.option_c, q.option_d,
        Number(q.correct), Number(q.points) || 1, Number(q.time_limit) || 20, difficulty, q.explanation || ''
      );
      imported++;
    }
  });
  run(questions);
  res.status(201).json({ imported, skipped });
});

router.get('/users', requireAdmin, (req, res) => {
  const search = (req.query.search || '').trim();
  const page = Math.max(Number(req.query.page) || 1, 1);
  const perPage = Math.min(Number(req.query.perPage) || 20, 100);
  const where = search ? 'WHERE u.name LIKE ? OR u.email LIKE ?' : '';
  const params = search ? [`%${search}%`, `%${search}%`] : [];
  const total = db.prepare(`SELECT COUNT(*) AS c FROM users u ${where}`).get(...params).c;
  const users = db.prepare(`
    SELECT u.*,
      (SELECT COUNT(*) FROM attempts a WHERE a.user_id = u.id) AS attempts_count,
      (SELECT COALESCE(SUM(earned_points), 0) FROM attempts a WHERE a.user_id = u.id AND a.mode != 'practice') AS total_points
    FROM users u ${where} ORDER BY u.id DESC LIMIT ? OFFSET ?
  `).all(...params, perPage, (page - 1) * perPage);
  res.json({
    users: users.map((u) => ({ ...u, ...levelInfo(u.xp || 0) })),
    total, page, perPage, pages: Math.max(Math.ceil(total / perPage), 1),
  });
});

router.patch('/users/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'User not found' });
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'You cannot modify your own admin status' });
  }
  if (req.body.is_admin !== undefined) {
    db.prepare('UPDATE users SET is_admin = ? WHERE id = ?').run(req.body.is_admin ? 1 : 0, req.params.id);
  }
  res.json(db.prepare('SELECT id, name, email, is_admin, created_at FROM users WHERE id = ?').get(req.params.id));
});

router.delete('/users/:id', requireAdmin, (req, res) => {
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'User not found' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.get('/attempts', requireAdmin, (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 500);
  const userId = req.query.userId ? Number(req.query.userId) : null;
  const subjectId = req.query.subjectId ? Number(req.query.subjectId) : null;
  const mode = req.query.mode || 'all';
  const where = [];
  const params = [];
  if (userId) { where.push('a.user_id = ?'); params.push(userId); }
  if (subjectId) { where.push('a.subject_id = ?'); params.push(subjectId); }
  if (mode !== 'all') { where.push('a.mode = ?'); params.push(mode); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const attempts = db.prepare(`
    SELECT a.*, u.name AS user_name, u.email AS user_email, s.name AS subject_name, s.icon AS subject_icon
    FROM attempts a
    JOIN users u ON u.id = a.user_id
    JOIN subjects s ON s.id = a.subject_id
    ${whereSql}
    ORDER BY a.id DESC LIMIT ?
  `).all(...params, limit);
  res.json(attempts);
});

router.get('/announcements', requireAdmin, (req, res) => {
  const announcements = db.prepare('SELECT * FROM announcements ORDER BY id DESC').all();
  res.json(announcements);
});

router.post('/announcements', requireAdmin, (req, res) => {
  const { title, body, is_active } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const info = db.prepare('INSERT INTO announcements (title, body, is_active) VALUES (?, ?, ?)')
    .run(title.trim(), body || '', is_active === undefined ? 1 : (is_active ? 1 : 0));
  res.status(201).json(db.prepare('SELECT * FROM announcements WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/announcements/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT id FROM announcements WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Announcement not found' });
  const b = req.body || {};
  db.prepare('UPDATE announcements SET title = ?, body = ?, is_active = ? WHERE id = ?')
    .run(b.title ?? existing.title, b.body ?? existing.body, b.is_active === undefined ? existing.is_active : (b.is_active ? 1 : 0), req.params.id);
  res.json(db.prepare('SELECT * FROM announcements WHERE id = ?').get(req.params.id));
});

router.delete('/announcements/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT id FROM announcements WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Announcement not found' });
  db.prepare('DELETE FROM announcements WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.get('/badges', requireAdmin, (req, res) => {
  const stats = db.prepare(`
    SELECT b.badge_key, COUNT(*) AS holders FROM badges b GROUP BY b.badge_key
  `).all();
  const map = new Map(stats.map((s) => [s.badge_key, s.holders]));
  res.json({ badges: BADGES.map((b) => ({ ...b, holders: map.get(b.key) || 0 })) });
});

function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(',')];
  for (const row of rows) lines.push(headers.map((h) => escape(row[h])).join(','));
  return lines.join('\r\n');
}

router.get('/export/users', requireAdmin, (req, res) => {
  const rows = db.prepare(`
    SELECT u.id, u.name, u.email, u.is_admin, u.xp, u.current_streak, u.max_streak, u.bio, u.avatar, u.created_at,
      (SELECT COUNT(*) FROM attempts a WHERE a.user_id = u.id) AS attempts,
      (SELECT COALESCE(SUM(earned_points), 0) FROM attempts a WHERE a.user_id = u.id AND a.mode != 'practice') AS total_points
    FROM users u ORDER BY u.id
  `).all();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
  res.send(`\uFEFF${toCsv(rows)}`);
});

router.get('/export/attempts', requireAdmin, (req, res) => {
  const rows = db.prepare(`
    SELECT a.id, a.mode, u.name AS user, u.email, s.name AS subject, a.score, a.correct_answers, a.total_questions,
      a.earned_points, a.xp_earned, a.created_at
    FROM attempts a JOIN users u ON u.id = a.user_id JOIN subjects s ON s.id = a.subject_id
    ORDER BY a.id
  `).all();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="attempts.csv"');
  res.send(`\uFEFF${toCsv(rows)}`);
});

router.get('/export/questions', requireAdmin, (req, res) => {
  const rows = db.prepare(`
    SELECT q.id, s.name AS subject, q.question, q.option_a, q.option_b, q.option_c, q.option_d,
      q.correct, q.points, q.time_limit, q.difficulty, q.explanation
    FROM questions q JOIN subjects s ON s.id = q.subject_id ORDER BY q.id
  `).all();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="questions.csv"');
  res.send(`\uFEFF${toCsv(rows)}`);
});

export default router;
