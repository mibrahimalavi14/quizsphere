import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const announcements = db.prepare(`
    SELECT id, title, body, created_at FROM announcements
    WHERE is_active = 1 ORDER BY id DESC LIMIT 10
  `).all();
  res.json(announcements);
});

export default router;
