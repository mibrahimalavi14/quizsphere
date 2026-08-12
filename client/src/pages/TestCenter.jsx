import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { canAccessRank } from '../ranks';
import Loading from '../components/Loading';

const COUNT_OPTIONS = [10, 20, 30];
const DIFFICULTY_OPTIONS = [
  { v: 'all', l: 'Mixed' },
  { v: 'easy', l: 'Easy' },
  { v: 'medium', l: 'Medium' },
  { v: 'hard', l: 'Hard' },
];
const PER_QUESTION_OPTIONS = [10, 20, 30, 60];
const TOTAL_OPTIONS = [5, 10, 15];

export default function TestCenter() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subjects, setSubjects] = useState(null);
  const [configFor, setConfigFor] = useState(null);
  const [cfg, setCfg] = useState({ count: 10, difficulty: 'all', timerType: 'per', perQuestion: 20, total: 5, negative: false, exam: false });

  useEffect(() => {
    api.get('/subjects').then(setSubjects).catch(() => setSubjects([]));
  }, []);

  const openConfig = (s) => {
    setCfg({ count: Math.min(10, s.question_count || 10), difficulty: 'all', timerType: 'per', perQuestion: 20, total: 5, negative: false, exam: false });
    setConfigFor(s);
  };

  const startMock = () => {
    if (!configFor) return;
    const qs = new URLSearchParams({
      count: cfg.count,
      difficulty: cfg.difficulty,
      perQuestion: cfg.timerType === 'per' ? cfg.perQuestion : 0,
      total: cfg.timerType === 'total' ? cfg.total * 60 : 0,
      negative: cfg.negative,
      exam: cfg.exam,
    });
    navigate(`/mock/${configFor.id}?${qs.toString()}`);
  };

  return (
    <section className="section">
      <div className="container">
        <div className="quiz-intro" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>🎯</div>
          <h2>Test Center</h2>
          <p className="desc" style={{ maxWidth: 560, margin: '0 auto' }}>
            Push yourself with the Weekly Challenge or build a full-length Mock Test with your own
            rules — custom timers, negative marking, exam mode and more.
          </p>
        </div>

        <div className="mode-cards">
          <Link to="/quiz/weekly" className="mode-card">
            <div className="m-icon">🏆</div>
            <h3>Weekly Challenge</h3>
            <p>A bigger 10-question challenge every week across all subjects. Bigger stakes, bigger XP.</p>
            <span className="m-tag">One attempt per week →</span>
          </Link>
          <Link to="/quiz/daily" className="mode-card">
            <div className="m-icon">📅</div>
            <h3>Daily Challenge</h3>
            <p>A fresh 5-question challenge every day. Keep your streak alive and earn double XP.</p>
            <span className="m-tag">One attempt per day →</span>
          </Link>
          <Link to="/quiz/rapid" className="mode-card">
            <div className="m-icon">🚀</div>
            <h3>Rapid Fire</h3>
            <p>10 questions, 10 seconds each. The ultimate speed test.</p>
            <span className="m-tag">Think fast →</span>
          </Link>
        </div>

        <div className="section-head" style={{ marginTop: 40, marginBottom: 16 }}>
          <h2>📝 Build a <span className="gradient-text">Mock Test</span></h2>
          <span className="badge badge-primary">Pass with 60%+ to earn a certificate</span>
        </div>

        {subjects === null ? (
          <Loading />
        ) : (
          <div className="subject-grid">
            {subjects.map((s) => {
              const locked = user && !canAccessRank(user.rankKey || 'bronze', s.min_rank);
              return (
                <div key={s.id} className={`subject-card ${locked ? 'locked' : ''}`} style={{ ['--subject-color']: s.color }}>
                  <div className="subject-icon" style={{ background: `${s.color}22` }}>{s.icon}</div>
                  <h3>{s.name}</h3>
                  <p>{s.description}</p>
                  <div className="subject-meta">
                    <span>{s.question_count} questions</span>
                    {locked && <span className="lock-tag">🔒</span>}
                  </div>
                  <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} disabled={locked} onClick={() => openConfig(s)}>
                    {locked ? `${s.requiredRank?.icon} ${s.requiredRank?.name} required` : 'Build Mock Test'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {configFor && (
        <div className="modal-backdrop" onClick={() => setConfigFor(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>⚙️ Mock Test Settings</h3>
            <p style={{ color: 'var(--text-dim)', fontSize: 13.5, marginBottom: 16 }}>
              {configFor.icon} {configFor.name} · {configFor.question_count} questions available
            </p>

            <div className="form-group">
              <label className="label">Number of questions</label>
              <div className="chip-row">
                {COUNT_OPTIONS.filter((c) => c <= (configFor.question_count || 30)).map((c) => (
                  <button key={c} className={`chip-opt ${cfg.count === c ? 'active' : ''}`} onClick={() => setCfg({ ...cfg, count: c })}>{c}</button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="label">Difficulty</label>
              <div className="chip-row">
                {DIFFICULTY_OPTIONS.map((d) => (
                  <button key={d.v} className={`chip-opt ${cfg.difficulty === d.v ? 'active' : ''}`} onClick={() => setCfg({ ...cfg, difficulty: d.v })}>{d.l}</button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="label">Timer</label>
              <div className="chip-row" style={{ marginBottom: 10 }}>
                <button className={`chip-opt ${cfg.timerType === 'per' ? 'active' : ''}`} onClick={() => setCfg({ ...cfg, timerType: 'per' })}>Per question</button>
                <button className={`chip-opt ${cfg.timerType === 'total' ? 'active' : ''}`} onClick={() => setCfg({ ...cfg, timerType: 'total' })}>Total duration</button>
              </div>
              {cfg.timerType === 'per' ? (
                <div className="chip-row">
                  {PER_QUESTION_OPTIONS.map((s) => (
                    <button key={s} className={`chip-opt ${cfg.perQuestion === s ? 'active' : ''}`} onClick={() => setCfg({ ...cfg, perQuestion: s })}>{s}s / q</button>
                  ))}
                </div>
              ) : (
                <div className="chip-row">
                  {TOTAL_OPTIONS.map((m) => (
                    <button key={m} className={`chip-opt ${cfg.total === m ? 'active' : ''}`} onClick={() => setCfg({ ...cfg, total: m })}>{m} min</button>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="toggle-row">
                <input type="checkbox" checked={cfg.negative} onChange={(e) => setCfg({ ...cfg, negative: e.target.checked })} />
                <span>Negative marking (−50% per wrong answer)</span>
              </label>
              <label className="toggle-row">
                <input type="checkbox" checked={cfg.exam} onChange={(e) => setCfg({ ...cfg, exam: e.target.checked })} />
                <span>🎯 Exam mode (locked navigation, no review, strict timer)</span>
              </label>
            </div>

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setConfigFor(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={startMock}>Start Mock Test →</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
