import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';

const PERIODS = [
  { k: 'all', l: '🏆 All Time' },
  { k: 'week', l: '📅 This Week' },
  { k: 'month', l: '📆 This Month' },
];

const XP_RULES = [
  { icon: '✅', text: '+10 XP per correct answer', sub: 'Every correct answer in a quiz' },
  { icon: '🎬', text: '+5 XP for completing a quiz', sub: 'Finish any timed quiz' },
  { icon: '🚀', text: '+20 XP for 80%+ score', sub: 'Performance milestone' },
  { icon: '💪', text: '+30 XP for 90%+ score', sub: 'Performance milestone' },
  { icon: '💯', text: '+50 XP for a perfect 100%', sub: 'Performance milestone' },
  { icon: '🎯', text: '+25 XP bonus for your first quiz', sub: 'One-time welcome bonus' },
  { icon: '📅', text: '+15 XP daily challenge bonus', sub: 'On top of regular quiz XP' },
  { icon: '⚡', text: '+20 XP per correct in Rapid Fire', sub: 'Speed round special rules' },
  { icon: '🚫', text: 'Practice mode earns 0 XP', sub: 'Practice is for learning, not ranking' },
];

export default function Leaderboard() {
  const { user } = useAuth();
  const [period, setPeriod] = useState('all');
  const [subjectId, setSubjectId] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [board, setBoard] = useState(null);

  useEffect(() => {
    api.get('/subjects').then(setSubjects).catch(() => setSubjects([]));
  }, []);

  useEffect(() => {
    setBoard(null);
    const qs = new URLSearchParams({ period });
    if (subjectId) qs.set('subjectId', subjectId);
    api.get(`/leaderboard?${qs.toString()}`).then(setBoard).catch(() => setBoard({ rows: [], me: null }));
  }, [period, subjectId]);

  const rankClass = (rank) => (rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '');
  const medal = (rank) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`);

  const avatar = (row) => {
    if (row.avatar) {
      return <span className="avatar" style={{ background: 'var(--bg-card-2)', fontSize: 18 }}>{row.avatar}</span>;
    }
    return <span className="avatar">{row.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}</span>;
  };

  const xpLabel = period === 'all' ? 'Total XP' : subjectId ? 'XP (period)' : 'XP (period)';

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div>
            <h2>🏆 <span className="gradient-text">Leaderboard</span></h2>
            <p style={{ color: 'var(--text-dim)', fontSize: 14, marginTop: 4 }}>
              Ranked by XP. Only completed quizzes count — practice mode doesn't.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <select
              className="input"
              style={{ maxWidth: 220, padding: '8px 14px' }}
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
            >
              <option value="">🌍 Global</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="lb-periods">
          {PERIODS.map((p) => (
            <button key={p.k} className={`lb-period ${period === p.k ? 'active' : ''}`} onClick={() => setPeriod(p.k)}>
              {p.l}
            </button>
          ))}
        </div>

        {board === null ? (
          <Loading />
        ) : (
          <>
            <div className="lb-me-grid">
              <div className="panel lb-me-card">
                <div className="lb-me-label">Your Global Rank</div>
                {user ? (
                  <div className="lb-me-rank">#{board.me?.rank ?? '—'}</div>
                ) : (
                  <div className="lb-me-login"><Link to="/login" className="btn btn-primary btn-sm">Login to see your rank</Link></div>
                )}
                {user && board.me && (
                  <div className="lb-me-sub">
                    {period === 'all'
                      ? `${board.me.quizzes ?? 0} quiz attempts · avg ${board.me.avg_score ?? 0}% · best ${board.me.best_score ?? 0}%`
                      : `${board.me.period_xp ?? 0} XP this ${period === 'week' ? 'week' : 'month'}`}
                  </div>
                )}
              </div>
              <div className="lb-me-stats">
                <div className="panel lb-mini-stat"><div className="lb-me-rank small">{user ? '#' + (board.me?.rank ?? '—') : '—'}</div><div className="lb-me-label">Rank</div></div>
                <div className="panel lb-mini-stat"><div className="lb-me-rank small">{subjectId ? 'Scope' : 'Global'}</div><div className="lb-me-label">Board</div></div>
                <div className="panel lb-mini-stat"><div className="lb-me-rank small">{board.rows.length}</div><div className="lb-me-label">Players</div></div>
              </div>
            </div>

            <div className="leaderboard">
              {board.rows.length === 0 ? (
                <div className="lb-empty">
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🏅</div>
                  <h3>No scores yet</h3>
                  <p style={{ marginTop: 6 }}>Be the first to play and top the leaderboard!</p>
                  <Link to="/subjects" className="btn btn-primary" style={{ marginTop: 18 }}>Start Playing</Link>
                </div>
              ) : (
                board.rows.map((row) => (
                  <div key={row.user_id} className={`lb-row ${user && row.user_id === user.id ? 'me' : ''}`}>
                    <div className={`lb-rank ${rankClass(row.rank)}`}>{medal(row.rank)}</div>
                    <div className="lb-user">
                      {avatar(row)}
                      <div style={{ minWidth: 0 }}>
                        <div className="lb-name">
                          {row.playerRankIcon && (
                            <span className="rank-badge lb-rank-icon" style={{ color: row.playerRankColor, borderColor: row.playerRankColor }}>{row.playerRankIcon}</span>
                          )}
                          {row.name} {user && row.user_id === user.id && <span className="badge badge-primary">You</span>}
                        </div>
                        <div className="lb-sub">
                          {row.quizzes} quiz{row.quizzes === 1 ? '' : 'zes'} · avg {row.avg_score}% · best {row.best_score}%
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="lb-pts">{period === 'all' ? row.xp : row.period_xp} <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>XP</span></div>
                      <div className="lb-sub">{period === 'all' ? 'all-time' : period}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="panel" style={{ marginTop: 34 }}>
              <h3 className="panel-title">📜 How XP Works</h3>
              <p style={{ color: 'var(--text-dim)', fontSize: 13.5, marginBottom: 16 }}>
                XP is calculated and stored server-side for every completed quiz — it can't be tampered with. Leaderboards only count valid completed attempts (2+ questions).
              </p>
              <div className="xp-rules-grid">
                {XP_RULES.map((r) => (
                  <div key={r.text} className="xp-rule">
                    <div className="xp-rule-icon">{r.icon}</div>
                    <div>
                      <div className="xp-rule-text">{r.text}</div>
                      <div className="xp-rule-sub">{r.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
