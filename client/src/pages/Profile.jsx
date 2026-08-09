import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import Loading from '../components/Loading';

const AVATARS = ['🧑', '👩', '👨', '🧑‍🎓', '👩‍🎓', '🦊', '🐼', '🦁', '🐯', '🦉', '🐸', '🐙', '🤖', '👑', '🦄', '🚀'];

function formatDate(d) {
  const date = new Date(d + (d.includes('T') ? '' : 'Z'));
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

const modeBadge = (m) => ({
  quiz: <span className="mode-badge mode-quiz">Test</span>,
  practice: <span className="mode-badge mode-practice">Practice</span>,
  daily: <span className="mode-badge mode-daily">Daily</span>,
  rapid: <span className="mode-badge mode-rapid">Rapid</span>,
}[m] || <span className="mode-badge mode-quiz">{m}</span>);

export default function Profile() {
  const { push } = useToast();
  const [data, setData] = useState(null);
  const [badges, setBadges] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ name: '', bio: '', avatar: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/user/stats').then(setData).catch(() => setData(null));
    api.get('/user/badges').then(setBadges).catch(() => setBadges(null));
  }, []);

  if (!data) return <Loading />;

  const { user, totals, bestPerSubject, attempts } = data;

  const openEdit = () => {
    setForm({ name: user.name, bio: user.bio, avatar: user.avatar });
    setEditOpen(true);
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.patch('/user/profile', form);
      setData((d) => ({ ...d, user: { ...d.user, ...updated } }));
      setEditOpen(false);
      push('Profile updated!', 'success');
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="section">
      <div className="container">
        <div className="profile-grid">
          <div>
            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {user.avatar ? (
                  <span className="avatar-display">{user.avatar}</span>
                ) : (
                  <span className="avatar" style={{ width: 52, height: 52, fontSize: 20 }}>
                    {user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                  </span>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ fontSize: 22 }}>{user.name}</h2>
                  <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>{user.email}</p>
                  {user.bio && <p style={{ fontSize: 13.5, marginTop: 4, color: 'var(--text-dim)' }}>{user.bio}</p>}
                </div>
                <button className="btn btn-outline btn-sm" onClick={openEdit}>Edit</button>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
                <span className="rank-badge" style={{ color: user.rankColor, borderColor: user.rankColor }}>{user.rankIcon} {user.rankName}</span>
                <span className="level-badge">Level {user.level}</span>
                <span className="badge badge-warning">🔥 {user.currentStreak} day streak</span>
                <span className="badge badge-dim">Best streak: {user.maxStreak}</span>
              </div>
            </div>

            {user.nextRank && (
              <div className="rank-progress" style={{ marginBottom: 20 }}>
                <div className="rank-progress-head">
                  <span>Next rank: {user.nextRank.icon} {user.nextRank.name}</span>
                  <span>Reach Level {user.nextRank.minLevel}</span>
                </div>
                <div className="rank-progress-bar">
                  <div
                    className="rank-progress-fill"
                    style={{
                      width: `${Math.min(100, ((user.level - user.rankMinLevel) / (user.nextRank.minLevel - user.rankMinLevel)) * 100)}%`,
                      background: user.nextRank.color,
                    }}
                  ></div>
                </div>
                <div className="rank-progress-meta">
                  <span>{user.nextRank.minLevel - user.level} levels to go</span>
                  <span>⚡ {user.totalXp} total XP</span>
                </div>
              </div>
            )}

            <div className="xp-bar-wrap" style={{ marginBottom: 20 }}>
              <div className="xp-bar-head">
                <span className="lv">Level {user.level}</span>
                <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>⚡ {user.totalXp} total XP</span>
              </div>
              <div className="xp-progress">
                <div className="fill" style={{ width: `${user.progress}%` }}></div>
              </div>
              <div className="xp-bar-meta">
                <span>{user.current} / {user.needed} XP to next level</span>
                <span>{user.progress}%</span>
              </div>
            </div>

            <div className="result-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
              <div className="result-stat"><div className="v">{totals.gradedAttempts}</div><div className="l">Quizzes</div></div>
              <div className="result-stat"><div className="v" style={{ color: 'var(--success)' }}>{totals.correctAnswers}</div><div className="l">Correct</div></div>
              <div className="result-stat"><div className="v" style={{ color: 'var(--warning)' }}>{totals.totalPoints}</div><div className="l">Points</div></div>
              <div className="result-stat"><div className="v">{totals.accuracy}%</div><div className="l">Accuracy</div></div>
            </div>
          </div>

          <div>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 18 }}>🏅 Badges</h3>
                {badges && (
                  <span className="badge badge-dim">{badges.totalEarned} / {badges.totalAvailable}</span>
                )}
              </div>
              {badges === null ? (
                <Loading />
              ) : (
                <div className="badges-grid">
                  {badges.badges.map((b) => (
                    <div key={b.key} className={`badge-cell ${b.earned ? 'earned' : ''}`}>
                      <div className="b-icon">{b.icon}</div>
                      <div className="b-name">{b.name}</div>
                      <div className="b-desc">{b.desc}</div>
                      {b.earned && <div className="b-tag">Unlocked 🎉</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 28 }}>
          <h3 style={{ marginBottom: 16, fontSize: 20 }}>Best Per Subject</h3>
          {bestPerSubject.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🎯</div>
              <p>You haven't played any quizzes yet.</p>
              <Link to="/subjects" className="btn btn-primary" style={{ marginTop: 16 }}>Start Playing</Link>
            </div>
          ) : (
            <div className="subject-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              {bestPerSubject.map((b) => (
                <Link key={b.id} to={`/subjects/${b.id}/quiz`} className="subject-card" style={{ ['--subject-color']: b.color }}>
                  <div className="subject-icon" style={{ background: `${b.color}22` }}>{b.icon}</div>
                  <h3>{b.name}</h3>
                  <div className="subject-meta">
                    <span>Best score: <b style={{ color: '#a5b4fc' }}>{b.best_score}%</b></span>
                    <span>⚡ {b.best_points} pts</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: 28 }}>
          <h3 style={{ marginBottom: 16, fontSize: 20 }}>Recent Attempts</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Mode</th>
                  <th>Subject</th>
                  <th>Score</th>
                  <th>Correct</th>
                  <th>Points</th>
                  <th>XP</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((a) => (
                  <tr key={a.id}>
                    <td>{modeBadge(a.mode)}</td>
                    <td>{a.subject_icon} {a.subject_name}</td>
                    <td><b>{a.score}</b>/100</td>
                    <td>{a.correct_answers}/{a.total_questions}</td>
                    <td style={{ color: 'var(--warning)' }}>+{a.earned_points}</td>
                    <td style={{ color: '#a5b4fc' }}>+{a.xp_earned}</td>
                    <td>{formatDate(a.created_at)}</td>
                    <td><Link to={`/result/${a.id}`} className="btn btn-ghost btn-sm">View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editOpen && (
        <div className="modal-backdrop" onClick={() => setEditOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Profile</h3>
            <form onSubmit={saveProfile}>
              <div className="form-group">
                <label className="label">Full name</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="label">Bio</label>
                <textarea className="input" rows={2} maxLength={300} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Tell everyone about yourself…"></textarea>
              </div>
              <div className="form-group">
                <label className="label">Avatar</label>
                <div className="avatar-picker">
                  {AVATARS.map((a) => (
                    <button type="button" key={a} className={`avatar-opt ${form.avatar === a ? 'active' : ''}`} onClick={() => setForm({ ...form, avatar: a })}>{a}</button>
                  ))}
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setEditOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
