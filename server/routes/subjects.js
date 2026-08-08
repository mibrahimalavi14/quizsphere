import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const subjects = db.prepare(`
    SELECT s.id, s.name, s.description, s.icon, s.color,
      (SELECT COUNT(*) FROM questions q WHERE q.subject_id = s.id) AS question_count
    FROM subjects s
    WHERE s.is_visible = 1
    ORDER BY s.name
  `).all();
  res.json(subjects);
});

router.get('/:id', (req, res) => {
  const subject = db.prepare(`
    SELECT s.id, s.name, s.description, s.icon, s.color,
      (SELECT COUNT(*) FROM questions q WHERE q.subject_id = s.id) AS question_count
    FROM subjects s WHERE s.id = ? AND s.is_visible = 1
  `).get(req.params.id);
  if (!subject) return res.status(404).json({ error: 'Subject not found' });
  res.json(subject);
});

export default router;
