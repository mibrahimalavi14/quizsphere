import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getToken } from '../api';
import Loading from '../components/Loading';

const statMeta = [
  { key: 'users', icon: '👥', label: 'Total Users' },
  { key: 'subjects', icon: '🗂️', label: 'Subjects' },
  { key: 'questions', icon: '❓', label: 'Questions' },
  { key: 'attempts', icon: '📝', label: 'Quizzes Played' },
  { key: 'dailyChallenges', icon: '📅', label: 'Daily Challenges' },
  { key: 'rapidFire', icon: '⚡', label: 'Rapid Fire' },
];

const difficultyColor = (d) => (d === 'easy' ? 'var(--success)' : d === 'hard' ? 'var(--danger)' : 'var(--warning)');
const difficultyLabel = (d) => d[0].toUpperCase() + d.slice(1);

function formatDate(d) {
  const date = new Date(d + (d.includes('T') ? '' : 'Z'));
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

const barColors = ['#818cf8', '#a5b4fc', '#c7d2fe', '#6366f1', '#8b5cf6', '#6d28d9', '#c084fc'];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/stats').then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!data) return <Loading />;

  const { counts, avgScore, attemptsLast7Days, subjectPopularity, difficultyDistribution, topPlayers, recentAttempts, recentUsers } = data;
  const maxDay = Math.max(...attemptsLast7Days.map((d) => d.count), 1);
  const maxSubject = Math.max(...subjectPopularity.map((s) => s.attempts), 1);
  const totalQuestions = difficultyDistribution.reduce((s, d) => s + d.count, 0) || 1;
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const download = async (kind) => {
    try {
      const res = await fetch(`/api/admin/export/${kind}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${kind}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Export failed: ' + e.message);
    }
  };

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1>Dashboard</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: 13.5 }}>Overview of QuizSphere activity.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={() => download('users')}>⬇ Users CSV</button>
          <button className="btn btn-outline btn-sm" onClick={() => download('attempts')}>⬇ Attempts CSV</button>
          <button className="btn btn-outline btn-sm" onClick={() => download('questions')}>⬇ Questions CSV</button>
          <Link to="/questions" className="btn btn-primary">+ Add Question</Link>
        </div>
      </div>

      <div className="stat-grid">
        {statMeta.map((s) => (
          <div className="stat-card" key={s.key}>
            <span className="icon">{s.icon}</span>
            <span className="num">{counts[s.key] ?? 0}</span>
            <span className="lbl">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="stat-card" style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <span className="icon" style={{ margin: 0 }}>🎯</span>
          <div>
            <span className="num" style={{ fontSize: 26 }}>{avgScore.avg_score.toFixed(1)}</span>
            <span className="lbl" style={{ fontSize: 12 }}>Avg Score (out of 100)</span>
          </div>
        </div>
        <div className="stat-card" style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <span className="icon" style={{ margin: 0 }}>📈</span>
          <div>
            <span className="num" style={{ fontSize: 26 }}>{avgScore.avg_accuracy.toFixed(1)}%</span>
            <span className="lbl" style={{ fontSize: 12 }}>Avg Accuracy</span>
          </div>
        </div>
        <div className="stat-card" style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <span className="icon" style={{ margin: 0 }}>🏆</span>
          <div>
            <span className="num" style={{ fontSize: 26 }}>{topPlayers.reduce((s, u) => s + u.total_points, 0)}</span>
            <span className="lbl" style={{ fontSize: 12 }}>Total Points Earned</span>
          </div>
        </div>
      </div>

      <div className="panel-grid">
        <div className="card">
          <h3 style={{ marginBottom: 16, fontSize: 17 }}>Activity — Last 7 Days</h3>
          {attemptsLast7Days.length === 0 ? (
            <p style={{ color: 'var(--text-faint)', fontSize: 13.5 }}>No quiz activity yet.</p>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 150 }}>
              {attemptsLast7Days.map((d, i) => (
                <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)' }}>{d.count}</span>
                  <div
                    style={{
                      width: '100%',
                      maxWidth: 44,
                      height: Math.max((d.count / maxDay) * 100, 4),
                      background: 'var(--gradient)',
                      borderRadius: '8px 8px 0 0',
                      transition: 'height 0.3s',
                    }}
                  ></div>
                  <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{dayLabels[i] || '—'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 16, fontSize: 17 }}>Subject Popularity</h3>
          {subjectPopularity.length === 0 ? (
            <p style={{ color: 'var(--text-faint)', fontSize: 13.5 }}>No data yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {subjectPopularity.slice(0, 6).map((s, i) => (
                <div key={s.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                    <span>{s.icon} {s.name}</span>
                    <span style={{ color: 'var(--text-dim)' }}>{s.attempts} plays · avg {s.avg_score.toFixed(0)}</span>
                  </div>
                  <div className="xp-progress">
                    <div className="fill" style={{ width: `${(s.attempts / maxSubject) * 100}%`, background: barColors[i % barColors.length] }}></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 16, fontSize: 17 }}>Difficulty Distribution</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {difficultyDistribution.map((d) => (
              <div key={d.difficulty}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                  <span style={{ color: difficultyColor(d.difficulty) }}>● {difficultyLabel(d.difficulty)}</span>
                  <span style={{ color: 'var(--text-dim)' }}>{d.count} ({((d.count / totalQuestions) * 100).toFixed(0)}%)</span>
                </div>
                <div className="xp-progress">
                  <div className="fill" style={{ width: `${(d.count / totalQuestions) * 100}%`, background: difficultyColor(d.difficulty) }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 16, fontSize: 17 }}>Top Players</h3>
          {topPlayers.length === 0 ? (
            <p style={{ color: 'var(--text-faint)', fontSize: 13.5 }}>No players yet.</p>
          ) : (
            <div>
              {topPlayers.map((u, i) => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--border)', fontSize: 13.5 }}>
                  <span className="lb-rank" style={{ fontSize: 15 }}>{['🥇', '🥈', '🥉'][i] || `#${i + 1}`}</span>
                  <span className="avatar" style={{ width: 28, height: 28, fontSize: 12 }}>
                    {u.avatar || u.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>{u.quizzes} quizzes · 🔥 best {u.max_streak}</div>
                  </div>
                  <span className="level-badge">Lv {u.level || 1}</span>
                  <span style={{ color: '#a5b4fc', fontWeight: 700 }}>⚡{u.xp}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="panel-grid">
        <div className="card">
          <h3 style={{ marginBottom: 16, fontSize: 17 }}>Recent Registrations</h3>
          {recentUsers.length === 0 ? (
            <p style={{ color: 'var(--text-faint)', fontSize: 13.5 }}>No users yet.</p>
          ) : (
            <div>
              {recentUsers.map((u) => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--border)', fontSize: 13.5 }}>
                  <span className="avatar" style={{ width: 28, height: 28, fontSize: 12 }}>
                    {u.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>{u.email}</div>
                  </div>
                  {u.is_admin ? <span className="badge badge-primary">Admin</span> : <span className="badge badge-dim">User</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 17 }}>Recent Quizzes Played</h3>
          </div>
          <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Subject</th>
                  <th>Mode</th>
                  <th>Score</th>
                  <th>Correct</th>
                  <th>Points</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentAttempts.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{a.user_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>{a.user_email}</div>
                    </td>
                    <td>{a.subject_name}</td>
                    <td>
                      <span className={`mode-badge mode-${a.mode}`}>{a.mode[0].toUpperCase() + a.mode.slice(1)}</span>
                    </td>
                    <td><b>{a.score}</b>/100</td>
                    <td>{a.correct_answers}/{a.total_questions}</td>
                    <td style={{ color: 'var(--warning)' }}>+{a.earned_points}</td>
                    <td style={{ color: 'var(--text-dim)' }}>{formatDate(a.created_at)}</td>
                  </tr>
                ))}
                {recentAttempts.length === 0 && (
                  <tr><td colSpan={7} className="empty-state">No quizzes played yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
