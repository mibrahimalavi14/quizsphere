import { db } from './db.js';

export function ensureSpecialSubjects() {
  const daily = db.prepare(`SELECT id FROM subjects WHERE name = 'Daily Challenge'`).get();
  if (!daily) {
    db.prepare('INSERT INTO subjects (name, description, icon, color, is_visible, min_rank) VALUES (?, ?, ?, ?, 0, ?)')
      .run('Daily Challenge', 'A fresh 5-question challenge every day.', '📅', '#f43f5e', 'bronze');
  } else {
    db.prepare(`UPDATE subjects SET min_rank = 'bronze', is_visible = 0 WHERE name = 'Daily Challenge'`).run();
  }
  const rapid = db.prepare(`SELECT id FROM subjects WHERE name = 'Rapid Fire'`).get();
  if (!rapid) {
    db.prepare('INSERT INTO subjects (name, description, icon, color, is_visible, min_rank) VALUES (?, ?, ?, ?, 0, ?)')
      .run('Rapid Fire', '10 questions, 10 seconds each. How fast can you think?', '🚀', '#0ea5e9', 'silver');
  } else {
    db.prepare(`UPDATE subjects SET min_rank = 'silver', is_visible = 0 WHERE name = 'Rapid Fire'`).run();
  }
  const practice = db.prepare(`SELECT id FROM subjects WHERE name = 'Practice Mistakes'`).get();
  if (!practice) {
    db.prepare('INSERT INTO subjects (name, description, icon, color, is_visible, min_rank) VALUES (?, ?, ?, ?, 0, ?)')
      .run('Practice Mistakes', 'Revisit the questions you got wrong and master them.', '🧠', '#a855f7', 'bronze');
  } else {
    db.prepare(`UPDATE subjects SET min_rank = 'bronze', is_visible = 0 WHERE name = 'Practice Mistakes'`).run();
  }
  const weekly = db.prepare(`SELECT id FROM subjects WHERE name = 'Weekly Challenge'`).get();
  if (!weekly) {
    db.prepare('INSERT INTO subjects (name, description, icon, color, is_visible, min_rank) VALUES (?, ?, ?, ?, 0, ?)')
      .run('Weekly Challenge', 'A bigger 10-question challenge every week. Bigger stakes, bigger XP.', '🏆', '#f59e0b', 'silver');
  } else {
    db.prepare(`UPDATE subjects SET min_rank = 'silver', is_visible = 0 WHERE name = 'Weekly Challenge'`).run();
  }
}
