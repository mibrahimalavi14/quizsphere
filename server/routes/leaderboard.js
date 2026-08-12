import { Router } from 'express';
import { db } from '../db.js';
import { optionalAuth } from '../middleware/auth.js';
import { levelForXp } from '../levels.js';
import { rankForLevel } from '../ranks.js';

const router = Router();

const PERIOD_WHERE = {
  week: "a.created_at >= datetime('now', '-7 days')",
  month: "a.created_at >= datetime('now', '-30 days')",
};

function periodStart(period) {
  if (period === 'week') return `datetime('now', '-7 days')`;
  if (period === 'month') return `datetime('now', '-30 days')`;
  return null;
}

function decorate(rows) {
  return rows.map((r, i) => {
    const rank = rankForLevel(levelForXp(r.xp || 0));
    return {
      ...r,
      rank: i + 1,
      playerRank: rank.key,
      playerRankName: rank.name,
      playerRankIcon: rank.icon,
      playerRankColor: rank.color,
    };
  });
}

function scopeClause(subjectId) {
  return subjectId ? 'a.subject_id = ? AND ' : '';
}

function scopeParams(subjectId, userId) {
  return subjectId ? [subjectId, userId] : [userId];
}

router.get('/', optionalAuth, (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const period = ['week', 'month'].includes(req.query.period) ? req.query.period : 'all';
  const subjectId = req.query.subjectId ? Number(req.query.subjectId) : null;
  const userId = req.user ? req.user.id : null;
  const dateFilter = period === 'all' ? '' : `AND ${PERIOD_WHERE[period]}`;

  const rows = db.prepare(`
    SELECT u.id AS user_id, u.name, u.email, u.avatar, u.xp,
      COALESCE(SUM(a.xp_earned), 0) AS period_xp,
      COUNT(a.id) AS quizzes,
      ROUND(AVG(a.score)) AS avg_score,
      MAX(a.score) AS best_score
    FROM users u
    JOIN attempts a ON a.user_id = u.id
      AND a.mode != 'practice' AND a.total_questions >= 2 ${dateFilter}
    WHERE ${scopeClause(subjectId)}u.is_admin = 0
    GROUP BY u.id
    HAVING quizzes > 0
    ORDER BY ${period === 'all' ? 'u.rank_xp' : 'period_xp'} DESC, best_score DESC, u.id ASC
    LIMIT ?
  `).all(...(subjectId ? [subjectId] : []), limit);

  let me = null;
  if (userId) {
    if (period === 'all' && !subjectId) {
      const r = db.prepare('SELECT COUNT(*) + 1 AS rank FROM users WHERE is_admin = 0 AND rank_xp > ?').get(
        db.prepare('SELECT rank_xp FROM users WHERE id = ?').get(userId)?.rank_xp || 0
      );
      me = { rank: r.rank };
    } else {
      const myRow = db.prepare(`
        SELECT COALESCE(SUM(a.xp_earned), 0) AS period_xp,
          COUNT(a.id) AS quizzes,
          ROUND(AVG(a.score)) AS avg_score,
          MAX(a.score) AS best_score
        FROM attempts a
        WHERE ${scopeClause(subjectId)}a.user_id = ? AND a.mode != 'practice' AND a.total_questions >= 2 ${dateFilter}
      `).get(...scopeParams(subjectId, userId));
      const ahead = db.prepare(`
        SELECT COUNT(*) + 1 AS rank FROM (
          SELECT a.user_id, SUM(a.xp_earned) AS px
          FROM attempts a
          WHERE ${scopeClause(subjectId)}a.user_id IN (SELECT id FROM users WHERE is_admin = 0)
            AND a.mode != 'practice' AND a.total_questions >= 2 ${dateFilter}
          GROUP BY a.user_id
          HAVING px > ?
        )
      `).get(...scopeParams(subjectId, myRow.period_xp || 0));
      me = { ...myRow, rank: ahead.rank };
    }
  }

  res.json({ rows: decorate(rows), me, period, subjectId });
});

export default router;
