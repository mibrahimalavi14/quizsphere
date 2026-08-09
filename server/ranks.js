import { levelForXp } from './levels.js';

export const RANKS = [
  { key: 'bronze', name: 'Bronze', icon: '🥉', color: '#cd7f32', minLevel: 1 },
  { key: 'silver', name: 'Silver', icon: '🥈', color: '#b8b8c0', minLevel: 3 },
  { key: 'gold', name: 'Gold', icon: '🥇', color: '#ffd700', minLevel: 5 },
  { key: 'platinum', name: 'Platinum', icon: '💠', color: '#67e8f9', minLevel: 7 },
  { key: 'diamond', name: 'Diamond', icon: '💎', color: '#60a5fa', minLevel: 10 },
  { key: 'master', name: 'Master', icon: '🏆', color: '#a78bfa', minLevel: 14 },
  { key: 'grandmaster', name: 'Grandmaster', icon: '👑', color: '#f472b6', minLevel: 19 },
  { key: 'legend', name: 'Legend', icon: '🌟', color: '#fb923c', minLevel: 26 },
];

export function rankIndex(key) {
  return RANKS.findIndex((r) => r.key === key);
}

export function rankMeta(key) {
  return RANKS[rankIndex(key)] || null;
}

export function rankForLevel(level) {
  let current = RANKS[0];
  for (const r of RANKS) {
    if (level >= r.minLevel) current = r;
  }
  return current;
}

export function canAccess(level, requiredKey) {
  if (!requiredKey) return true;
  return rankIndex(rankForLevel(level).key) >= rankIndex(requiredKey);
}

export function rankInfoForXp(xp) {
  const level = levelForXp(xp || 0);
  const rank = rankForLevel(level);
  const next = RANKS[rankIndex(rank.key) + 1] || null;
  return {
    rankKey: rank.key,
    rankName: rank.name,
    rankIcon: rank.icon,
    rankColor: rank.color,
    rankMinLevel: rank.minLevel,
    nextRank: next
      ? { key: next.key, name: next.name, icon: next.icon, color: next.color, minLevel: next.minLevel }
      : null,
  };
}

export function requiredRankError(requiredKey) {
  const required = rankMeta(requiredKey) || RANKS[0];
  const err = new Error(
    `This content requires ${required.name} rank. Keep playing quizzes to earn XP and unlock it!`
  );
  err.status = 403;
  err.rank = { key: required.key, name: required.name, icon: required.icon, color: required.color, minLevel: required.minLevel };
  return err;
}

export function assertRank(userXp, requiredKey) {
  if (!canAccess(levelForXp(userXp || 0), requiredKey)) {
    throw requiredRankError(requiredKey);
  }
}
