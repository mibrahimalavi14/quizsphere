export const XP_RULES = {
  PER_CORRECT: 10,
  COMPLETION_BONUS: 5,
  FIRST_QUIZ_BONUS: 25,
  DAILY_BONUS: 15,
  WEEKLY_BONUS: 30,
  RAPID_XP_PER_CORRECT: 20,
  MILESTONES: [
    { minScore: 100, xp: 50, label: '100% score' },
    { minScore: 90, xp: 30, label: '90%+ score' },
    { minScore: 80, xp: 20, label: '80%+ score' },
  ],
};

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
