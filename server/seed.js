import bcrypt from 'bcryptjs';
import { db } from './db.js';
import { ensureSpecialSubjects } from './special.js';
import { BANKS } from './questionBanks.js';

const subjects = [
  { name: 'Urdu', description: 'اردو ادب، قواعد اور شاعری', icon: '📜', color: '#14b8a6', rank: 'bronze' },
  { name: 'Mathematics', description: 'Arithmetic, algebra, geometry and logic.', icon: '➗', color: '#6366f1', rank: 'bronze' },
  { name: 'Biology', description: 'Life science: cells, genetics, human body and more.', icon: '🧬', color: '#84cc16', rank: 'bronze' },
  { name: 'Chemistry', description: 'Atoms, bonds, reactions and the periodic table.', icon: '⚗️', color: '#f43f5e', rank: 'bronze' },
  { name: 'Cricket', description: 'Records, legends and the laws of the game.', icon: '🏏', color: '#22c55e', rank: 'bronze' },
  { name: 'English', description: 'Grammar, vocabulary and comprehension.', icon: '📖', color: '#ec4899', rank: 'silver' },
  { name: 'Pakistan Geography', description: 'پاکستان کا جغرافیہ: پہاڑ، دریا، صوبے اور مقامات', icon: '🗺️', color: '#0ea5e9', rank: 'silver' },
  { name: 'Computer Science', description: 'Programming, hardware, networks and tech.', icon: '💻', color: '#3b82f6', rank: 'gold' },
  { name: 'History', description: 'Ancient and modern world history.', icon: '🏛️', color: '#8b5cf6', rank: 'gold' },
  { name: 'Islamiyat', description: 'اسلامی تعلیمات: ارکان، عقائد اور عبادات', icon: '🕌', color: '#10b981', rank: 'platinum' },
  { name: 'Islamic History', description: 'اسلامی تاریخ: خلافت، سلطنتیں اور عظیم شخصیات', icon: '🕋', color: '#f59e0b', rank: 'platinum' },
];

function seedAdmin() {
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@quizsphere.com');
  if (!exists) {
    db.prepare('INSERT INTO users (name, email, password, is_admin) VALUES (?, ?, ?, 1)')
      .run('Administrator', 'admin@quizsphere.com', bcrypt.hashSync('admin123', 10));
    console.log('Created admin user: admin@quizsphere.com / admin123');
  }
}

function seedSubjects() {
  const allowed = new Set(subjects.map((s) => s.name));
  const removed = db.prepare(`
    SELECT id, name FROM subjects WHERE is_visible = 1 AND name NOT IN (${subjects.map(() => '?').join(', ')})
  `).all(...subjects.map((s) => s.name));
  for (const r of removed) {
    db.prepare('DELETE FROM subjects WHERE id = ?').run(r.id);
    console.log(`Removed subject: ${r.name}`);
  }

  for (const s of subjects) {
    db.prepare('INSERT OR IGNORE INTO subjects (name, description, icon, color, is_visible, min_rank) VALUES (?, ?, ?, ?, 1, ?)')
      .run(s.name, s.description, s.icon, s.color, s.rank);
    db.prepare('UPDATE subjects SET description = ?, icon = ?, color = ?, is_visible = 1, min_rank = ? WHERE name = ?')
      .run(s.description, s.icon, s.color, s.rank, s.name);
  }
  ensureSpecialSubjects();
}

function seedQuestions() {
  for (const [subjectName, qs] of Object.entries(BANKS)) {
    const subject = db.prepare('SELECT id FROM subjects WHERE name = ?').get(subjectName);
    if (!subject) continue;
    const existing = db.prepare('SELECT COUNT(*) AS c FROM questions WHERE subject_id = ?').get(subject.id).c;
    if (existing > 0) {
      console.log(`Skipped ${subjectName} (already ${existing} questions)`);
      continue;
    }
    const insert = db.prepare(`
      INSERT INTO questions (subject_id, question, option_a, option_b, option_c, option_d, correct, points, time_limit, difficulty, explanation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of qs) {
      insert.run(subject.id, item.q, item.a, item.b, item.c, item.d, item.correct, item.points, item.time, item.diff, item.expl);
    }
    console.log(`Seeded ${qs.length} questions for ${subjectName}`);
  }
}

seedAdmin();
seedSubjects();
seedQuestions();

const totals = db.prepare(`
  SELECT s.name, s.is_visible, s.min_rank, (SELECT COUNT(*) FROM questions q WHERE q.subject_id = s.id) AS count
  FROM subjects s ORDER BY s.is_visible DESC, s.name
`).all();
console.log('\nDatabase ready:');
for (const t of totals) console.log(`  - ${t.name}${t.is_visible ? '' : ' (hidden mode)'} [${t.min_rank}]: ${t.count} questions`);
