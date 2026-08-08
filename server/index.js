import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';
import { createApp } from './app.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 5000;

const app = createApp();

app.listen(PORT, () => {
  console.log(`QuizSphere API running at http://localhost:${PORT}`);
  const counts = db.prepare('SELECT (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM subjects) AS subjects, (SELECT COUNT(*) FROM questions) AS questions').get();
  console.log(`Users: ${counts.users}, Subjects: ${counts.subjects}, Questions: ${counts.questions}`);
  const clientDist = path.join(__dirname, 'deploy', 'website');
  const adminDist = path.join(__dirname, 'deploy', 'admin');
  if (fs.existsSync(path.join(clientDist, 'index.html'))) console.log(`Website served at http://localhost:${PORT}/`);
  if (fs.existsSync(path.join(adminDist, 'index.html'))) console.log(`Admin served at http://localhost:${PORT}/admin`);
});
