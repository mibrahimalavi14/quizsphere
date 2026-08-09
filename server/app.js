import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';
import { ensureSpecialSubjects } from './special.js';
import authRoutes from './routes/auth.js';
import subjectRoutes from './routes/subjects.js';
import quizRoutes from './routes/quizzes.js';
import leaderboardRoutes from './routes/leaderboard.js';
import userRoutes from './routes/user.js';
import announcementRoutes from './routes/announcements.js';
import adminRoutes from './routes/admin.js';
import rankRoutes from './routes/ranks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function findStaticDir(candidates) {
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'index.html'))) return dir;
  }
  return null;
}

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ ok: true, time: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/subjects', subjectRoutes);
  app.use('/api/quizzes', quizRoutes);
  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/announcements', announcementRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/ranks', rankRoutes);

  const adminDist = findStaticDir([
    path.join(__dirname, 'deploy', 'admin'),
    path.join(__dirname, '..', 'admin', 'dist'),
  ]);
  if (adminDist) {
    app.use('/admin', express.static(adminDist));
    app.get('/admin/*', (req, res) => res.sendFile(path.join(adminDist, 'index.html')));
  }

  const clientDist = findStaticDir([
    path.join(__dirname, 'deploy', 'website'),
    path.join(__dirname, '..', 'client', 'dist'),
  ]);
  if (clientDist) {
    app.use(express.static(clientDist));
    app.get(/^\/(?!api|admin).*/, (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  ensureSpecialSubjects();

  return app;
}

export { db };
