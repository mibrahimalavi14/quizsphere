import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const subjectId = req.query.subjectId ? Number(req.query.subjectId) : null;

  if (subjectId) {
    const rows = db.prepare(`
      SELECT u.id AS user_id, u.name, u.email, u.avatar, u.xp,
        MAX(a.earned_points) AS best_points,
        MAX(a.score) AS best_score,
        MAX(a.created_at) AS last_played
      FROM attempts a
      JOIN users u ON u.id = a.user_id
      WHERE a.subject_id = ? AND a.mode != 'practice'
      GROUP BY u.id
      ORDER BY best_points DESC, best_score DESC, last_played ASC
      LIMIT ?
    `).all(subjectId, limit);
    return res.json(rows.map((r, i) => ({ ...r, rank: i + 1 })));
  }

  const rows = db.prepare(`
    SELECT u.id AS user_id, u.name, u.email, u.avatar, u.xp,
      SUM(sub.best) AS total_points,
      COUNT(sub.subject_id) AS subjects_played,
      MAX(sub.last_played) AS last_played
    FROM users u
    LEFT JOIN (
      SELECT user_id, subject_id, MAX(earned_points) AS best, MAX(created_at) AS last_played
      FROM attempts
      WHERE mode != 'practice'
      GROUP BY user_id, subject_id
    ) sub ON sub.user_id = u.id
    GROUP BY u.id
    HAVING subjects_played > 0
    ORDER BY total_points DESC, last_played ASC
    LIMIT ?
  `).all(limit);

  res.json(rows.map((r, i) => ({ ...r, rank: i + 1 })));
});

export default router;
