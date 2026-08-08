export const XP_PER_POINT = 10;
export const COMPLETION_BONUS = 5;
export const PERFECT_BONUS = 25;
export const RAPID_XP_PER_CORRECT = 20;
export const DAILY_XP_MULTIPLIER = 2;

export function xpForLevelStart(level) {
  return 100 * ((level - 1) * level) / 2;
}

export function levelForXp(xp) {
  return Math.max(1, Math.floor((1 + Math.sqrt(1 + (8 * xp) / 100)) / 2));
}

export function levelInfo(xp) {
  const level = levelForXp(xp);
  const levelStart = xpForLevelStart(level);
  const nextLevelStart = xpForLevelStart(level + 1);
  return {
    level,
    current: xp - levelStart,
    needed: nextLevelStart - levelStart,
    totalXp: xp,
    progress: Math.min(100, Math.round(((xp - levelStart) / (nextLevelStart - levelStart)) * 100)),
  };
}
