import { db } from './db.js';
import { levelForXp } from './levels.js';

export const BADGES = [
  { key: 'first_quiz', icon: '🎯', name: 'First Steps', desc: 'Complete your first quiz' },
  { key: 'perfect_score', icon: '💯', name: 'Perfect', desc: 'Score 100% on any quiz' },
  { key: 'correct_10', icon: '🎖️', name: 'Sharpshooter', desc: 'Answer 10 questions correctly' },
  { key: 'correct_100', icon: '🏹', name: 'Centurion', desc: 'Answer 100 questions correctly' },
  { key: 'level_5', icon: '⭐', name: 'Rising Star', desc: 'Reach level 5' },
  { key: 'level_10', icon: '🌟', name: 'Prodigy', desc: 'Reach level 10' },
  { key: 'streak_3', icon: '🔥', name: 'On Fire', desc: 'Maintain a 3-day streak' },
  { key: 'streak_7', icon: '⚡', name: 'Unstoppable', desc: 'Maintain a 7-day streak' },
  { key: 'daily_1', icon: '📅', name: 'Daily Player', desc: 'Complete a daily challenge' },
  { key: 'rapid_10', icon: '🚀', name: 'Speedster', desc: 'Play 10 rapid fire rounds' },
  { key: 'all_subjects', icon: '🌐', name: 'Explorer', desc: 'Play every subject' },
  { key: 'points_500', icon: '💰', name: 'High Roller', desc: 'Earn 500 total points' },
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
      COUNT(DISTINCT CASE WHEN mode != 'practice' THEN subject_id END) AS subjects_played
    FROM attempts WHERE user_id = ?
  `).get(userId);

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
    subjectsPlayed: totals.subjects_played || 0,
    allSubjectsPlayed: (totals.subjects_played || 0) >= subjectTotal,
  };
}

function meetsCondition(badge, s) {
  switch (badge.key) {
    case 'first_quiz': return s.attemptsCount >= 1;
    case 'perfect_score': return s.perfectScore;
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
  return BADGES.map((b) => ({
    ...b,
    earned: earnedMap.has(b.key),
    earnedAt: earnedMap.get(b.key) || null,
  }));
}
