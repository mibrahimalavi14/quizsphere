# 🧠 QuizSphere

A full-featured quiz platform with subject-wise MCQs, gamification (XP, levels, badges, streaks), multiple quiz modes, per-question timers, leaderboards, user accounts and a separate admin panel.

## ✨ Features

### 🎮 Quiz Modes
- **Subject quizzes** — random questions from any subject, with a choice of test/practice mode, difficulty filter and question count
- **Daily Challenge** — a fresh 5-question challenge every day (deterministic, same for everyone), double XP, one attempt per day
- **Rapid Fire** — 10 mixed questions with 10-second timers, fast XP

### 🏆 Gamification
- **XP & Levels** — earn XP for correct answers, completion and perfect scores
- **Badges** — 12 achievements (first quiz, perfect score, streak milestones, daily player, rapid fire, etc.)
- **Streaks** — daily play streaks with max streak tracking
- **Daily bonus** — daily challenge earns 2× XP

### 📝 Question Experience
- Per-question countdown timer with visual warnings
- Difficulty levels (easy / medium / hard) — filter questions or play all
- **Practice mode** — no timer, no XP, instant answer reveal with explanations
- **Negative marking** — optional, wrong answers deduct half points
- Post-answer explanations after each quiz

### 👤 Accounts & Profiles
- Registration / login (JWT auth)
- Advanced profile: XP progress bar, level, streaks, avatar picker, bio
- Badge collection wall
- Best-per-subject cards + full attempt history with mode badges and XP
- **Password reset** flow (forgot / reset)
- **Result sharing** — share your score on WhatsApp, Facebook / X, or copy a summary

### 🛡️ Admin Panel (separate app)
- Dashboard with advanced analytics: 7-day activity, subject popularity, difficulty distribution, avg score/accuracy, top players, mode counts (daily/rapid)
- Manage subjects (add / edit / delete / **hide from public site**)
- Manage questions (CRUD, search, subject + **difficulty filter**, pagination, **difficulty & explanation fields**, per-question **performance stats**)
- Bulk JSON import of questions
- **Announcements manager** (live banner on the home page, show/hide)
- Manage users (make admin, delete) with level / XP / streak columns
- View all quiz attempts (filterable)
- **CSV exports** for users, attempts and questions

## 🛠 Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite + React Router |
| Admin | React 18 + Vite (separate app) |
| Backend | Node.js + Express |
| Database | SQLite (built-in `node:sqlite`, zero native deps) |
| Auth | JWT + bcrypt |

## 📁 Project Structure

```
QuizSphere/
├── server/          # Express REST API + SQLite database
├── client/          # Main quiz website (React)
├── admin/           # Admin panel (React, separate app)
├── start.bat        # Production launcher (Windows)
├── dev.bat          # Dev launcher with hot reload (Windows)
└── build.bat        # Install + build everything (Windows)
```

## 🚀 Getting Started

### Prerequisites
- Node.js **v22.5+** (uses built-in `node:sqlite` module)

### Option A — Quick start (Windows)
1. Run `build.bat` once (installs deps, seeds DB, builds both apps).
2. Double-click `start.bat`.
3. Open http://localhost:5000 (website) and http://localhost:5000/admin (admin).

### Option B — Manual
```bash
# 1. Install dependencies
cd server && npm install
cd client && npm install
cd admin  && npm install

# 2. Seed the database (creates 6 subjects, 60 questions + admin)
cd server && npm run seed

# 3. Development (hot reload)
cd server && npm start            # API  : http://localhost:5000
cd client && npm run dev          # Site : http://localhost:5173
cd admin  && npm run dev          # Admin: http://localhost:5174

# 4. Production (server serves both built apps on one port)
cd client && npm run build
cd admin  && npm run build
cd server && npm start            # http://localhost:5000 + /admin
```

**Admin login:** `admin@quizsphere.com` / `admin123`

## 🌐 Deploy to Vercel (Get a Public Link)

The app normally uses a local SQLite file, but Vercel's serverless environment
doesn't allow persistent file writes. So for Vercel we switch the database to
**Turso** (a cloud, SQLite-compatible database). All code paths are identical —
only `TURSO_URL` / `TURSO_AUTH_TOKEN` env vars change the data layer.

### Step 1 — Create a free Turso database
1. Sign up at https://turso.tech
2. Install CLI: `npm install -g @libsql/... ` — easiest: use the dashboard at
   https://app.turso.tech and create a database called `quizsphere`.
3. Copy the **Database URL** (looks like `libsql://quizsphere-<org>.turso.io`).
4. Create an **auth token**: dashboard → your database → Create token (looks
   like `eyJhbGciOi...`).

### Step 2 — Seed the cloud database (adds admin + 60 sample questions)
Open PowerShell in `D:\QuizSphere\server` and run:
```powershell
$env:TURSO_URL="libsql://quizsphere-<org>.turso.io"
$env:TURSO_AUTH_TOKEN="eyJhbGciOi..."
npm.cmd run seed
```

### Step 3 — Build & deploy
Double-click `deploy-vercel.bat` (or run these commands manually):
```powershell
cd client; npm.cmd run build
cd ..\admin; $env:VITE_BASE="/admin/"; npm.cmd run build; Remove-Item Env:VITE_BASE
cd ..; npx vercel --prod
```
First deploy asks you to log in to Vercel and link the project.

### Step 4 — Set environment variables on Vercel
Vercel dashboard → your project → **Settings → Environment Variables**:
| Name | Value |
|---|---|
| `TURSO_URL` | your `libsql://…turso.io` URL |
| `TURSO_AUTH_TOKEN` | your token |
| `JWT_SECRET` | any long random string |

Then **Redeploy** (Deployments → ⋯ → Redeploy). Vercel gives you a public URL
like `https://quizsphere.vercel.app`.

### How it works on Vercel
- `vercel.json` routes every request to one Express function (`server/api/index.js`).
- `deploy-vercel.bat` builds the website + admin and stages them in
  `server/deploy/` (website at `/`, admin at `/admin`), which the function serves.
- The database lives on Turso, so scores/accounts persist across restarts.

## 🔌 API Overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/forgot-password` | Request reset link (dev mode returns a token) |
| POST | `/api/auth/reset-password` | Reset password with token |
| GET | `/api/subjects` | Visible subjects with question counts |
| GET | `/api/quizzes/:id/questions?limit=&difficulty=` | Random questions (auth) |
| POST | `/api/quizzes/:id/submit` | Submit answers (supports practice / negative marking) |
| GET | `/api/quizzes/daily` | Today's daily challenge (auth) |
| GET | `/api/quizzes/rapid` | Rapid fire questions (auth) |
| GET | `/api/leaderboard?subjectId=` | Global / per-subject leaderboard |
| GET | `/api/user/stats` | Stats, level, streaks, history (auth) |
| PATCH | `/api/user/profile` | Update name / bio / avatar (auth) |
| GET | `/api/user/badges` | Badge collection (auth) |
| GET | `/api/announcements` | Active announcements |
| GET | `/api/admin/stats` | Advanced dashboard analytics (admin) |
| CRUD | `/api/admin/subjects` | Manage subjects incl. visibility (admin) |
| CRUD | `/api/admin/questions` | Manage questions incl. difficulty/explanation (admin) |
| POST | `/api/admin/questions/import` | Bulk JSON import (admin) |
| CRUD | `/api/admin/announcements` | Announcements manager (admin) |
| GET | `/api/admin/users` | List users with level/XP (admin) |
| GET | `/api/admin/attempts` | All attempts (admin) |
| GET | `/api/admin/export/users|attempts|questions` | CSV exports (admin) |

## 🎮 How It Works

1. Users register / log in. Passwords are hashed, sessions use JWTs.
2. Pick a subject (or Daily Challenge / Rapid Fire), choose test vs practice mode and difficulty.
3. Each question has a countdown timer — answer before it hits zero.
4. Correct answers earn points (+XP); wrong answers can deduct points when negative marking is on.
5. Results show score, XP earned, level-up, new badges and share buttons; practice mode reveals answers with explanations.
6. XP feeds levels; badges and streaks build the collection; leaderboard ranks everyone (practice excluded).
7. Admins manage subjects, questions, users, attempts, announcements and analytics from the admin panel.

## 🔐 Security Notes
- Passwords hashed with bcrypt
- JWT tokens with 7-day expiry
- Admin routes protected by role-based middleware
- Password reset tokens expire after 1 hour and are single-use
- Change `JWT_SECRET` via environment variable before production
- In production, email delivery is stubbed — the reset token is returned in the API response (dev mode)
