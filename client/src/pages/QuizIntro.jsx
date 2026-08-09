import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { canAccessRank } from '../ranks';
import Loading from '../components/Loading';

export default function QuizIntro() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subject, setSubject] = useState(null);
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState('all');
  const [mode, setMode] = useState('quiz');
  const [negative, setNegative] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/subjects/${id}`).then(setSubject).catch(() => setError('Subject not found'));
  }, [id]);

  if (error) {
    return (
      <div className="container empty-state">
        <div className="icon">😕</div>
        <h3>{error}</h3>
        <Link to="/subjects" className="btn btn-primary">Browse Subjects</Link>
      </div>
    );
  }

  if (!subject) return <Loading />;

  const isLocked = !canAccessRank(user?.rankKey || 'bronze', subject.min_rank);

  if (isLocked) {
    return (
      <div className="container">
        <div className="quiz-intro">
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 8 }}>🔒</div>
            <h2>Subject locked</h2>
            <p className="desc" style={{ marginTop: 8 }}>
              <b style={{ color: subject.requiredRank?.color }}>{subject.requiredRank?.icon} {subject.requiredRank?.name} rank</b>{' '}
              is required to play <b>{subject.name}</b>.
            </p>
            <p style={{ color: 'var(--text-dim)', fontSize: 14, marginTop: 6 }}>
              You are currently <b style={{ color: user?.rankColor }}>{user?.rankIcon} {user?.rankName}</b> (Level {user?.level}).
              Keep playing quizzes to earn XP and reach Level {subject.requiredRank?.minLevel}.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 18 }}>
              <Link to="/ranks" className="btn btn-primary">See Ranks & Rewards</Link>
              <Link to="/subjects" className="btn btn-outline">Browse Subjects</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const maxCount = Math.min(subject.question_count, 20);
  const safeCount = Math.min(Math.max(count, 5), Math.max(maxCount, 5));

  const start = () => {
    const qs = new URLSearchParams({ count: safeCount, mode });
    if (difficulty !== 'all') qs.set('difficulty', difficulty);
    if (negative) qs.set('negative', 'true');
    navigate(`/subjects/${id}/play?${qs.toString()}`);
  };

  return (
    <div className="container">
      <div className="quiz-intro">
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <div className="subject-icon" style={{ background: `${subject.color}22` }}>{subject.icon}</div>
            <div>
              <h2>{subject.name}</h2>
              <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>{subject.description}</p>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: 8 }}>
            <label className="label">Mode</label>
            <div className="seg">
              <button type="button" className={mode === 'quiz' ? 'active' : ''} onClick={() => setMode('quiz')}>
                ⏱️ Test Mode
              </button>
              <button type="button" className={mode === 'practice' ? 'active' : ''} onClick={() => setMode('practice')}>
                📖 Practice (no timer)
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="label">Difficulty</label>
            <div className="seg">
              {[
                { v: 'all', l: 'All' },
                { v: 'easy', l: 'Easy' },
                { v: 'medium', l: 'Medium' },
                { v: 'hard', l: 'Hard' },
              ].map((d) => (
                <button key={d.v} type="button" className={difficulty === d.v ? 'active' : ''} onClick={() => setDifficulty(d.v)}>
                  {d.l}
                </button>
              ))}
            </div>
          </div>

          {mode === 'quiz' && (
            <div className="toggle-row">
              <div>
                <div className="toggle-label">Negative marking</div>
                <div className="toggle-sub">Wrong answer deducts half the question's points</div>
              </div>
              <label className="switch">
                <input type="checkbox" checked={negative} onChange={(e) => setNegative(e.target.checked)} />
                <span className="slider"></span>
              </label>
            </div>
          )}

          <div className="form-group" style={{ marginTop: 18 }}>
            <label className="label">Number of questions</label>
            <input
              type="range"
              min={5}
              max={Math.max(maxCount, 5)}
              value={safeCount}
              onChange={(e) => setCount(Number(e.target.value))}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-dim)' }}>
              <span>{safeCount} questions</span>
              <span>{subject.question_count} available</span>
            </div>
          </div>

          <div className="rule" style={{ marginTop: 14 }}>
            <span className="icon">🏆</span>
            <span>Earn XP and badges. Best score per subject counts towards the leaderboard.</span>
          </div>

          <button className="btn btn-primary" style={{ width: '100%', padding: '14px', marginTop: 18 }} onClick={start}>
            {mode === 'practice' ? 'Start Practicing →' : 'Start Quiz →'}
          </button>
          <Link to="/subjects" className="btn btn-ghost" style={{ width: '100%', marginTop: 10 }}>Cancel</Link>
        </div>
      </div>
    </div>
  );
}
