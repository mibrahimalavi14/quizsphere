import { Router } from 'express';
import { db } from '../db.js';
import { RANKS } from '../ranks.js';

const router = Router();

router.get('/', (req, res) => {
  const daily = db.prepare(`SELECT min_rank FROM subjects WHERE name = 'Daily Challenge'`).get();
  const rapid = db.prepare(`SELECT min_rank FROM subjects WHERE name = 'Rapid Fire'`).get();
  res.json({
    ranks: RANKS,
    modes: [
      {
        key: 'daily',
        name: 'Daily Challenge',
        icon: '📅',
        minRank: daily?.min_rank || 'bronze',
        description: 'A fresh 5-question challenge every day with double XP.',
      },
      {
        key: 'rapid',
        name: 'Rapid Fire',
        icon: '⚡',
        minRank: rapid?.min_rank || 'silver',
        description: '10 questions from all subjects with just 10 seconds each.',
      },
    ],
  });
});

export default router;
