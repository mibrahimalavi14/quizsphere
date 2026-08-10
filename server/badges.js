import { db } from './db.js';
import { levelForXp } from './levels.js';

export const BADGES = [
  { key: 'first_quiz', icon: '🎯', name: 'First Steps', desc: 'Complete your first quiz', target: 1 },
  { key: 'quiz_starter', icon: '🔥', name: 'Quiz Starter', desc: 'Complete 5 quizzes', target: 5 },
  { key: 'quiz_master', icon: '⚡', name: 'Quiz Master', desc: 'Complete 25 quizzes', target: 25 },
  { key: 'perfect_score', icon: '💯', name: 'Perfect Score', desc: 'Score 100% on any quiz', target: 1 },
  { key: 'knowledge_pro', icon: '🧠', name: 'Knowledge Pro', desc: 'Score 80%+ on 10 quizzes', target: 10 },
  { key: 'high_achiever', icon: '🚀', name: 'High Achiever', desc: 'Maintain a 90%+ average score', target: 90 },
  { key: 'top_10', icon: '🏆', name: 'Top 10', desc: 'Reach the global Top 10 leaderboard', target: 10 },
  { key: 'subject_expert', icon: '📚', name: 'Subject Expert', desc: 'Average 85%+ in any subject', target: 85 },
  { key: 'streak_3', icon: '🔥', name: 'On Fire', desc: 'Maintain a 3-day streak', target: 3 },
  { key: 'streak_7', icon: '⚡', name: 'Unstoppable', desc: 'Maintain a 7-day streak', target: 7 },
  { key: 'daily_1', icon: '📅', name: 'Daily Player', desc: 'Complete a daily challenge', target: 1 },
  { key: 'rapid_10', icon: '🚀', name: 'Speedster', desc: 'Play 10 rapid fire rounds', target: 10 },
  { key: 'all_subjects', icon: '🌐', name: 'Explorer', desc: 'Play every subject', target: 0 },
  { key: 'correct_10', icon: '🎖️', name: 'Sharpshooter', desc: 'Answer 10 questions correctly', target: 10 },
  { key: 'correct_100', icon: '🏹', name: 'Centurion', desc: 'Answer 100 questions correctly', target: 100 },
  { key: 'level_5', icon: '⭐', name: 'Rising Star', desc: 'Reach level 5', target: 5 },
  { key: 'level_10', icon: '🌟', name: 'Prodigy', desc: 'Reach level 10', target: 10 },
  { key: 'points_500', icon: '💰', name: 'High Roller', desc: 'Earn 500 total points', target: 500 },
];

export function getUserStats(userId) {
  const user = db.prepare('SELECT xp, current_streak, max_streak FROM users WHERE id = ?').get(userId);
  const totals = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN mode != 'practice' THEN correct_answers END), 0) AS total_correct,
      COALESCE(SUM(CASE WHEN mode != 'practice' THEN earned_points END), 0) AS total_points,
      COUNT(CASE WHEN mode = 'daily' THEN 1 END) AS daily_count,
      COUNT(CASE WHEN mode = 'rapid' THEN 1 END) AS rapid_count,
      COUNT(CASE WHEN mode != 'practice' THEN 1 END) AS attempts_count,
      COUNT(CASE WHEN mode != 'practice' AND score >= 80 THEN 1 END) AS score80_count,
      ROUND(AVG(CASE WHEN mode != 'practice' THEN score END)) AS avg_score,
      COUNT(DISTINCT CASE WHEN mode != 'practice' THEN subject_id END) AS subjects_played
    FROM attempts WHERE user_id = ?
  `).get(userId);

  const bestSubject = db.prepare(`
    SELECT MAX(sub.avg) AS best_avg FROM (
      SELECT subject_id, AVG(score) AS avg
      FROM attempts WHERE user_id = ? AND mode != 'practice'
      GROUP BY subject_id
    ) sub
  `).get(userId);

  const rankRow = db.prepare('SELECT COUNT(*) + 1 AS rank FROM users WHERE xp > ?').get(user?.xp || 0);

  const subjectTotal = db.prepare('SELECT COUNT(*) AS c FROM subjects').get().c;
  const level = levelForXp(user?.xp || 0);

  return {
    xp: user?.xp || 0,
    level,
    currentStreak: user?.current_streak || 0,
    maxStreak: user?.max_streak || 0,
    totalCorrect: totals.total_correct || 0,
    totalPoints: totals.total_points || 0,
    dailyCount: totals.daily_count || 0,
    rapidCount: totals.rapid_count || 0,
    attemptsCount: totals.attempts_count || 0,
    score80Count: totals.score80_count || 0,
    avgScore: totals.avg_score || 0,
    subjectsPlayed: totals.subjects_played || 0,
    allSubjectsPlayed: (totals.subjects_played || 0) >= subjectTotal,
    globalRank: rankRow.rank || 1,
    bestSubjectAvg: bestSubject.best_avg || 0,
  };
}

function meetsCondition(badge, s) {
  switch (badge.key) {
    case 'first_quiz': return s.attemptsCount >= 1;
    case 'quiz_starter': return s.attemptsCount >= 5;
    case 'quiz_master': return s.attemptsCount >= 25;
    case 'perfect_score': return s.perfectScore;
    case 'knowledge_pro': return s.score80Count >= 10;
    case 'high_achiever': return s.attemptsCount > 0 && s.avgScore >= 90;
    case 'top_10': return s.globalRank <= 10;
    case 'subject_expert': return s.bestSubjectAvg >= 85;
    case 'correct_10': return s.totalCorrect >= 10;
    case 'correct_100': return s.totalCorrect >= 100;
    case 'level_5': return s.level >= 5;
    case 'level_10': return s.level >= 10;
    case 'streak_3': return s.maxStreak >= 3;
    case 'streak_7': return s.maxStreak >= 7;
    case 'daily_1': return s.dailyCount >= 1;
    case 'rapid_10': return s.rapidCount >= 10;
    case 'all_subjects': return s.allSubjectsPlayed;
    case 'points_500': return s.totalPoints >= 500;
    default: return false;
  }
}

function badgeProgress(badge, s) {
  switch (badge.key) {
    case 'first_quiz': return s.attemptsCount;
    case 'quiz_starter': return s.attemptsCount;
    case 'quiz_master': return s.attemptsCount;
    case 'perfect_score': return s.perfectScore ? 1 : 0;
    case 'knowledge_pro': return s.score80Count;
    case 'high_achiever': return s.avgScore;
    case 'top_10': return s.globalRank;
    case 'subject_expert': return s.bestSubjectAvg;
    case 'correct_10': return s.totalCorrect;
    case 'correct_100': return s.totalCorrect;
    case 'level_5': return s.level;
    case 'level_10': return s.level;
    case 'streak_3': return s.maxStreak;
    case 'streak_7': return s.maxStreak;
    case 'daily_1': return s.dailyCount;
    case 'rapid_10': return s.rapidCount;
    case 'all_subjects': return s.subjectsPlayed;
    case 'points_500': return s.totalPoints;
    default: return 0;
  }
}

export function checkAndAwardBadges(userId, extras = {}) {
  const stats = { ...getUserStats(userId), ...extras };
  const earned = db.prepare('SELECT badge_key FROM badges WHERE user_id = ?').all(userId).map((b) => b.badge_key);
  const earnedSet = new Set(earned);
  const newlyEarned = [];
  const insert = db.prepare('INSERT INTO badges (user_id, badge_key) VALUES (?, ?)');

  for (const badge of BADGES) {
    if (earnedSet.has(badge.key)) continue;
    if (meetsCondition(badge, stats)) {
      insert.run(userId, badge.key);
      earnedSet.add(badge.key);
      newlyEarned.push(badge);
    }
  }
  return newlyEarned;
}

export function getUserBadges(userId) {
  const earned = db.prepare('SELECT badge_key, earned_at FROM badges WHERE user_id = ? ORDER BY id').all(userId);
  const earnedMap = new Map(earned.map((b) => [b.badge_key, b.earned_at]));
  const stats = getUserStats(userId);
  return BADGES.map((b) => {
    const current = badgeProgress(b, stats);
    const target = b.key === 'all_subjects'
      ? db.prepare('SELECT COUNT(*) AS c FROM subjects').get().c
      : b.target;
    return {
      ...b,
      earned: earnedMap.has(b.key),
      earnedAt: earnedMap.get(b.key) || null,
      target,
      progress: Math.min(100, target ? Math.round((Math.min(current, target) / target) * 100) : 0),
      current,
    };
  });
}
