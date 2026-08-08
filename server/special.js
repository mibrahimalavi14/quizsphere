import { db } from './db.js';

export function ensureSpecialSubjects() {
  const daily = db.prepare(`SELECT id FROM subjects WHERE name = 'Daily Challenge'`).get();
  if (!daily) {
    db.prepare('INSERT INTO subjects (name, description, icon, color, is_visible) VALUES (?, ?, ?, ?, 0)')
      .run('Daily Challenge', 'A fresh 5-question challenge every day.', '📅', '#f43f5e');
  }
  const rapid = db.prepare(`SELECT id FROM subjects WHERE name = 'Rapid Fire'`).get();
  if (!rapid) {
    db.prepare('INSERT INTO subjects (name, description, icon, color, is_visible) VALUES (?, ?, ?, ?, 0)')
      .run('Rapid Fire', '10 questions, 10 seconds each. How fast can you think?', '🚀', '#0ea5e9');
  }
}
