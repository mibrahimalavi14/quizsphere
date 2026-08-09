import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';

function xpForLevel(level) {
  return (100 * ((level - 1) * level)) / 2;
}

export default function Ranks() {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const [data, setData] = useState(null);
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    if (isAuthenticated) refreshUser().catch(() => {});
    api.get('/ranks').then(setData).catch(() => setData(null));
    api.get('/subjects').then(setSubjects).catch(() => setSubjects([]));
  }, [isAuthenticated]);

  if (!data) return <Loading text="Loading ranks…" />;

  const myKey = user?.rankKey || null;
  const myIdx = data.ranks.findIndex((r) => r.key === myKey);

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div>
            <h2>🎖️ Rank <span className="gradient-text">Ladder</span></h2>
            <p style={{ color: 'var(--text-dim)', fontSize: 14, marginTop: 4 }}>
              Level up to climb ranks and unlock new subjects and game modes.
            </p>
          </div>
        </div>

        {isAuthenticated && user && (
          <div className="card" style={{ marginBottom: 24, textAlign: 'center', padding: 22 }}>
            <div style={{ fontSize: 44 }}>{user.rankIcon}</div>
            <h3 style={{ marginTop: 4 }}>You are <span style={{ color: user.rankColor }}>{user.rankName}</span></h3>
            <p style={{ color: 'var(--text-dim)', fontSize: 14, marginTop: 4 }}>
              Level {user.level} · ⚡ {user.totalXp} XP
            </p>
            {user.nextRank ? (
              <div className="rank-progress" style={{ maxWidth: 420, margin: '16px auto 0' }}>
                <div className="rank-progress-head">
                  <span>Next: {user.nextRank.icon} {user.nextRank.name}</span>
                  <span>Level {user.nextRank.minLevel}</span>
                </div>
                <div className="rank-progress-bar">
                  <div
                    className="rank-progress-fill"
                    style={{ width: `${Math.min(100, ((user.level - user.rankMinLevel) / (user.nextRank.minLevel - user.rankMinLevel)) * 100)}%`, background: user.nextRank.color }}
                  ></div>
                </div>
                <div className="rank-progress-meta">
                  <span>Reach level {user.nextRank.minLevel}</span>
                  <span>{user.nextRank.minLevel - user.level} levels to go</span>
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--warning)', marginTop: 10 }}>You reached the highest rank. Legend! 🌟</p>
            )}
          </div>
        )}

        <div className="rank-ladder">
          {data.ranks.map((r, i) => {
            const unlocked = myIdx >= i;
            const unlocks = subjects.filter((s) => s.min_rank === r.key);
            const modes = data.modes.filter((m) => m.minRank === r.key);
            return (
              <div key={r.key} className={`rank-card ${unlocked && myKey ? 'current' : ''} ${i === myIdx ? 'is-me' : ''}`} style={{ ['--rank-color']: r.color }}>
                <div className="rank-card-left">
                  <div className="rank-icon" style={{ background: `${r.color}22` }}>{r.icon}</div>
                  <div>
                    <div className="rank-name" style={{ color: r.color }}>{r.name}</div>
                    <div className="rank-level">Level {r.minLevel}+ · {xpForLevel(r.minLevel).toLocaleString()} XP</div>
                  </div>
                </div>
                <div className="rank-unlocks">
                  <span className="rank-unlock-label">Unlocks</span>
                  <div className="rank-unlock-chips">
                    {unlocks.map((s) => (
                      <span key={s.id} className="rank-chip">{s.icon} {s.name}</span>
                    ))}
                    {modes.map((m) => (
                      <span key={m.key} className="rank-chip">{m.icon} {m.name}</span>
                    ))}
                    {unlocks.length === 0 && modes.length === 0 && <span className="rank-chip dim">—</span>}
                  </div>
                </div>
                {i === myIdx && myKey && <div className="rank-you">You are here</div>}
              </div>
            );
          })}
        </div>

        {!isAuthenticated && (
          <div className="card empty-state" style={{ marginTop: 24 }}>
            <div className="icon">🏆</div>
            <h3>Create a free account to start climbing</h3>
            <p>Earn XP from quizzes to unlock higher ranks and more content.</p>
            <Link to="/register" className="btn btn-primary" style={{ marginTop: 16 }}>Sign Up Free</Link>
          </div>
        )}
      </div>
    </section>
  );
}
