import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import Loading from '../components/Loading';

const AVATARS = ['🧑', '👩', '👨', '🧑‍🎓', '👩‍🎓', '🦊', '🐼', '🦁', '🐯', '🦉', '🐸', '🐙', '🤖', '👑', '🦄', '🚀'];

function formatDate(d) {
  const date = new Date(d + (d.includes('T') ? '' : 'Z'));
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(sec) {
  const s = Math.max(0, Number(sec) || 0);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function gradeFor(pct) {
  if (pct >= 80) return 'A';
  if (pct >= 65) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 40) return 'D';
  return 'F';
}

const modeBadge = (m) => ({
  quiz: <span className="mode-badge mode-quiz">Test</span>,
  practice: <span className="mode-badge mode-practice">Practice</span>,
  daily: <span className="mode-badge mode-daily">Daily</span>,
  rapid: <span className="mode-badge mode-rapid">Rapid</span>,
}[m] || <span className="mode-badge mode-quiz">{m}</span>);

export default function Profile() {
  const navigate = useNavigate();
  const { push } = useToast();
  const [data, setData] = useState(null);
  const [badges, setBadges] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ name: '', bio: '', avatar: '' });
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    api.get('/user/dashboard').then(setData).catch(() => setData(null));
    api.get('/user/badges').then(setBadges).catch(() => setBadges(null));
  }, []);

  if (!data) return <Loading />;

  const { user, summary, cwu, subjects, timeline, attempts, recommendations, ranks } = data;
  const strongest = data.strongest;
  const weakest = data.weakest;
  const recent = attempts.slice(0, 5);

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

  const retryPath = (a) => (
    a.mode === 'daily' ? '/' :
    a.mode === 'rapid' ? '/quiz/rapid' :
    a.mode === 'practice' ? `/subjects/${a.subject_id}/play?mode=practice` :
    `/subjects/${a.subject_id}/play`
  );

  const recPath = (r) => (
    r.mode === 'practice' ? `/subjects/${r.subjectId}/play?mode=practice` :
    r.difficulty ? `/subjects/${r.subjectId}/play?difficulty=${r.difficulty}` :
    `/subjects/${r.subjectId}/play`
  );

  const cwuPct = cwu.total ? (n) => Math.round((n / cwu.total) * 100) : () => 0;

  const summaryCards = [
    { icon: '🧪', label: 'Quizzes Attempted', value: summary.quizzes, color: 'var(--text)' },
    { icon: '❓', label: 'Questions Solved', value: summary.questionsSolved, color: 'var(--text)' },
    { icon: '📊', label: 'Average Percentage', value: `${summary.avgScore}%`, color: '#a5b4fc' },
    { icon: '🏆', label: 'Highest Score', value: `${summary.highest}%`, color: 'var(--success)' },
    { icon: '⚡', label: 'Total XP', value: summary.totalXp, color: 'var(--warning)' },
    { icon: '✅', label: 'Passed / Failed', value: `${summary.passed} / ${summary.failed}`, color: summary.failed > summary.passed ? 'var(--danger)' : 'var(--success)' },
  ];

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
                      {b.earned ? (
                        <div className="b-tag">Unlocked 🎉</div>
                      ) : (
                        <div className="badge-progress-wrap" title={`${b.current} / ${b.target}`}>
                          <div className="badge-progress-track">
                            <div className="badge-progress-fill" style={{ width: `${b.progress}%` }}></div>
                          </div>
                          <div className="badge-progress-label">{b.progress}% · {b.current}/{b.target}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rank-summary">
          <div className="rank-summary-item">
            <div className="rank-summary-value">#{ranks?.global ?? '—'}</div>
            <div className="rank-summary-label">🏆 Global Rank</div>
          </div>
          <div className="rank-summary-item">
            <div className="rank-summary-value">#{ranks?.weekly ?? '—'}</div>
            <div className="rank-summary-label">📅 Weekly Rank</div>
          </div>
          <div className="rank-summary-item">
            <div className="rank-summary-value">#{ranks?.monthly ?? '—'}</div>
            <div className="rank-summary-label">📆 Monthly Rank</div>
          </div>
          <div className="rank-summary-item">
            <div className="rank-summary-value">{badges ? badges.totalEarned : '—'}</div>
            <div className="rank-summary-label">🏅 Badges Earned</div>
          </div>
        </div>

        <div className="tab-bar" style={{ marginTop: 30 }}>
          {[
            { k: 'overview', l: '📊 Overview' },
            { k: 'analytics', l: '📈 Performance' },
            { k: 'history', l: '📚 Quiz History' },
          ].map((t) => (
            <button key={t.k} className={tab === t.k ? 'active' : ''} onClick={() => setTab(t.k)}>{t.l}</button>
          ))}
        </div>

        {tab === 'overview' && (
          <>
            <div className="dash-stats">
              {summaryCards.map((c) => (
                <div key={c.label} className="dash-stat">
                  <div className="dash-stat-icon">{c.icon}</div>
                  <div className="dash-stat-value" style={{ color: c.color }}>{c.value}</div>
                  <div className="dash-stat-label">{c.label}</div>
                </div>
              ))}
            </div>

            {summary.quizzes === 0 ? (
              <div className="empty-state" style={{ marginTop: 24 }}>
                <div className="icon">🎯</div>
                <h3>Welcome to your dashboard!</h3>
                <p style={{ color: 'var(--text-dim)' }}>Play your first quiz to see stats, analytics and recommendations.</p>
                <Link to="/subjects" className="btn btn-primary" style={{ marginTop: 16 }}>Start Playing</Link>
              </div>
            ) : (
              <>
                <div className="analytics-grid" style={{ marginTop: 26 }}>
                  <div className="panel">
                    <h3 className="panel-title">Strongest Subject</h3>
                    {strongest ? (
                      <div className="mini-subject">
                        <div className="subject-icon" style={{ background: `${strongest.color}22` }}>{strongest.icon}</div>
                        <div>
                          <div style={{ fontWeight: 700 }}>{strongest.name}</div>
                          <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                            Avg <b style={{ color: 'var(--success)' }}>{strongest.avg_score}%</b> · Best {strongest.best}% · {strongest.attempts} quiz{strongest.attempts > 1 ? 'zes' : ''}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p style={{ color: 'var(--text-faint)', fontSize: 14 }}>No data yet.</p>
                    )}
                  </div>
                  <div className="panel">
                    <h3 className="panel-title">Weakest Subject</h3>
                    {weakest ? (
                      <div className="mini-subject">
                        <div className="subject-icon" style={{ background: `${weakest.color}22` }}>{weakest.icon}</div>
                        <div>
                          <div style={{ fontWeight: 700 }}>{weakest.name}</div>
                          <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                            Avg <b style={{ color: 'var(--danger)' }}>{weakest.avg_score}%</b> · Best {weakest.best}% · {weakest.attempts} quiz{weakest.attempts > 1 ? 'zes' : ''}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p style={{ color: 'var(--text-faint)', fontSize: 14 }}>Play more subjects to see this.</p>
                    )}
                  </div>
                </div>

                {recommendations.length > 0 && (
                  <div style={{ marginTop: 30 }}>
                    <div className="section-head" style={{ marginBottom: 16 }}>
                      <h3 style={{ fontSize: 20 }}>🎯 Recommended For You</h3>
                      <span className="badge badge-primary">{recommendations.length} tips</span>
                    </div>
                    <div className="rec-grid">
                      {recommendations.map((r) => (
                        <button key={`${r.type}-${r.subjectId}`} className="rec-card" onClick={() => navigate(recPath(r))}>
                          <div className="rec-top">
                            <div className="subject-icon" style={{ background: `${r.color}22` }}>{r.icon}</div>
                            <span className={`badge ${r.type === 'weak' ? 'badge-danger' : r.type === 'hard' ? 'badge-primary' : 'badge-success'}`}>
                              {r.type === 'weak' ? 'Needs practice' : r.type === 'hard' ? 'Level up' : 'New'}
                            </span>
                          </div>
                          <div className="rec-title">{r.title}</div>
                          <div className="rec-reason">{r.reason}</div>
                          <div className="rec-cta">
                            {r.mode === 'practice' ? 'Practice now →' : r.difficulty === 'hard' ? 'Play hard quiz →' : 'Try it →'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 30 }}>
                  <div className="section-head" style={{ marginBottom: 16 }}>
                    <h3 style={{ fontSize: 20 }}>🕒 Recent Attempts</h3>
                    <Link to="/profile" className="btn btn-ghost btn-sm" onClick={() => setTab('history')}>View all →</Link>
                  </div>
                  <div className="recent-list">
                    {recent.map((a) => (
                      <Link to={`/result/${a.id}`} key={a.id} className="recent-item">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 600 }}>{a.subject_icon} {a.subject_name}</span>
                            {modeBadge(a.mode)}
                            <span className={`score-chip ${a.score >= 40 ? 'pass' : 'fail'}`}>{a.score}%</span>
                          </div>
                          <div style={{ fontSize: 12.5, color: 'var(--text-faint)', marginTop: 4 }}>
                            {formatDate(a.created_at)} · {a.correct_answers}/{a.total_questions} correct · Grade {gradeFor(a.score)}
                          </div>
                        </div>
                        <span className="recent-arrow">→</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {tab === 'analytics' && (
          <>
            <div className="analytics-grid" style={{ marginTop: 4 }}>
              <div className="panel">
                <h3 className="panel-title">📈 Performance Over Time</h3>
                {timeline.length < 2 ? (
                  <p style={{ color: 'var(--text-faint)', fontSize: 14 }}>Play at least 2 quizzes to see your progress trend.</p>
                ) : (
                  <div className="trend-chart">
                    {timeline.map((t, i) => (
                      <div key={i} className="trend-col" title={`${t.day}: ${t.score}%`}>
                        <div className="trend-bar" style={{ height: `${Math.max(t.score, 2)}%`, background: t.score >= 40 ? 'var(--success)' : 'var(--danger)' }}></div>
                        <div className="trend-val">{t.score}</div>
                        <div className="trend-label">{timeline.length <= 8 ? t.day.slice(5) : (i % Math.ceil(timeline.length / 8) === 0 ? t.day.slice(5) : '')}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="panel">
                <h3 className="panel-title">🎯 Correct vs Wrong vs Unanswered</h3>
                {cwu.total === 0 ? (
                  <p style={{ color: 'var(--text-faint)', fontSize: 14 }}>No data yet.</p>
                ) : (
                  <>
                    <div className="stack-row">
                      <div className="stack-label"><span className="dot dot-answered"></span> Correct</div>
                      <div className="stack-track"><div className="stack-fill" style={{ width: `${cwuPct(cwu.correct)}%`, background: 'var(--success)' }}></div></div>
                      <div className="stack-count">{cwu.correct} <span>({cwuPct(cwu.correct)}%)</span></div>
                    </div>
                    <div className="stack-row">
                      <div className="stack-label"><span className="dot dot-review"></span> Wrong</div>
                      <div className="stack-track"><div className="stack-fill" style={{ width: `${cwuPct(cwu.wrong)}%`, background: 'var(--danger)' }}></div></div>
                      <div className="stack-count">{cwu.wrong} <span>({cwuPct(cwu.wrong)}%)</span></div>
                    </div>
                    <div className="stack-row">
                      <div className="stack-label"><span className="dot dot-unanswered"></span> Unanswered</div>
                      <div className="stack-track"><div className="stack-fill" style={{ width: `${cwuPct(cwu.unanswered)}%`, background: 'var(--border)' }}></div></div>
                      <div className="stack-count">{cwu.unanswered} <span>({cwuPct(cwu.unanswered)}%)</span></div>
                    </div>
                    <div className="accuracy-donut-wrap">
                      <div className="accuracy-donut" style={{ ['--acc']: cwuPct(cwu.correct) }}>
                        <div>{cwuPct(cwu.correct)}%</div>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Overall accuracy</div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="panel" style={{ marginTop: 26 }}>
              <h3 className="panel-title">📚 Subject-wise Performance</h3>
              {subjects.length === 0 ? (
                <p style={{ color: 'var(--text-faint)', fontSize: 14 }}>No data yet.</p>
              ) : (
                <div className="subj-bars">
                  {subjects.map((s) => (
                    <Link to={`/subjects/${s.id}/play`} key={s.id} className="subj-bar-row" title="Retry this subject">
                      <div className="subj-bar-name" style={{ ['--subject-color']: s.color }}>
                        <span>{s.icon}</span>
                        <span>{s.name}</span>
                      </div>
                      <div className="subj-bar-track">
                        <div className="subj-bar-fill" style={{ width: `${Math.min(s.avg_score, 100)}%`, background: s.color }}></div>
                      </div>
                      <div className="subj-bar-meta">
                        <b>{s.avg_score}%</b> <span className="subj-bar-sub">best {s.best}% · {s.attempts} quiz{s.attempts > 1 ? 'zes' : ''}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'history' && (
          <div style={{ marginTop: 4 }}>
            {attempts.length === 0 ? (
              <div className="empty-state">
                <div className="icon">📚</div>
                <h3>No quiz history yet</h3>
                <Link to="/subjects" className="btn btn-primary" style={{ marginTop: 16 }}>Take your first quiz</Link>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Quiz</th>
                      <th>Date</th>
                      <th>Score</th>
                      <th>%</th>
                      <th>Grade</th>
                      <th>Time</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 150 }}>
                            <span>{a.subject_icon}</span>
                            <span style={{ fontWeight: 600 }}>{a.subject_name}</span>
                            {modeBadge(a.mode)}
                          </div>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatDate(a.created_at)}</td>
                        <td><b>{a.score}</b>/100</td>
                        <td>{a.total_questions ? Math.round((a.correct_answers / a.total_questions) * 100) : a.score}%</td>
                        <td>
                          <span className={`grade-chip g-${gradeFor(a.score).toLowerCase()}`}>{gradeFor(a.score)}</span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatTime(a.duration_seconds)}</td>
                        <td>
                          <span className={`score-chip ${a.score >= 40 ? 'pass' : 'fail'}`}>{a.score >= 40 ? 'Passed' : 'Failed'}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <Link to={`/result/${a.id}`} className="btn btn-ghost btn-sm">View</Link>
                            <Link to={retryPath(a)} className="btn btn-primary btn-sm">Retry</Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
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
