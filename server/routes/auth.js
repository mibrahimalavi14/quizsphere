import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { db } from '../db.js';
import { signToken, requireAuth } from '../middleware/auth.js';
import { levelInfo } from '../levels.js';

const router = Router();

function publicUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    is_admin: u.is_admin,
    avatar: u.avatar || '',
    bio: u.bio || '',
    xp: u.xp || 0,
    ...levelInfo(u.xp || 0),
  };
}

router.post('/register', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (exists) return res.status(409).json({ error: 'Email already registered' });

  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)')
    .run(name.trim(), email.toLowerCase(), hash);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

router.post('/forgot-password', (req, res) => {
  const email = (req.body?.email || '').toLowerCase();
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (!user) return res.status(200).json({ message: 'If an account exists for that email, a reset link has been sent.' });

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(user.id);
  db.prepare('INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)').run(user.id, token, expiresAt);

  console.log(`[password-reset] ${email} → /reset-password?token=${token}`);
  res.status(200).json({
    message: 'If an account exists for that email, a reset link has been sent.',
    devResetToken: token,
  });
});

router.post('/reset-password', (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) return res.status(400).json({ error: 'Token and new password are required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const reset = db.prepare('SELECT * FROM password_resets WHERE token = ? AND used = 0').get(token);
  if (!reset) return res.status(400).json({ error: 'Invalid or expired reset token' });
  if (new Date(reset.expires_at) < new Date()) {
    return res.status(400).json({ error: 'Reset token has expired' });
  }

  const hash = bcrypt.hashSync(password, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, reset.user_id);
  db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(reset.id);
  res.json({ message: 'Password updated successfully. You can now login.' });
});

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: publicUser(user) });
});

export default router;
