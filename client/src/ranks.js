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

export function rankForLevel(level) {
  let current = RANKS[0];
  for (const r of RANKS) {
    if (level >= r.minLevel) current = r;
  }
  return current;
}

export function canAccessRank(userRankKey, requiredKey) {
  if (!requiredKey) return true;
  return rankIndex(userRankKey) >= rankIndex(requiredKey);
}
