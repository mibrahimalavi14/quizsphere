import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';

export default function Leaderboard() {
  const { user } = useAuth();
  const [subjectId, setSubjectId] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [board, setBoard] = useState(null);
  const [filter, setFilter] = useState('overall');

  useEffect(() => {
    api.get('/subjects').then(setSubjects).catch(() => setSubjects([]));
  }, []);

  useEffect(() => {
    setBoard(null);
    const path = filter === 'overall'
      ? '/leaderboard'
      : `/leaderboard?subjectId=${subjectId}`;
    api.get(path).then(setBoard).catch(() => setBoard([]));
  }, [filter, subjectId]);

  const rankClass = (rank) => (rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '');
  const medal = (rank) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`);

  const avatar = (row) => {
    if (row.avatar) {
      return <span className="avatar" style={{ background: 'var(--bg-card-2)', fontSize: 18 }}>{row.avatar}</span>;
    }
    return <span className="avatar">{row.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}</span>;
  };

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div>
            <h2>🏆 <span className="gradient-text">Leaderboard</span></h2>
            <p style={{ color: 'var(--text-dim)', fontSize: 14, marginTop: 4 }}>
              Top performers ranked by points. Practice mode doesn't count.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              className="btn btn-ghost btn-sm"
              style={filter === 'overall' ? { background: 'var(--gradient)', color: '#fff', border: 'none' } : {}}
              onClick={() => { setFilter('overall'); setSubjectId(''); }}
            >
              Overall
            </button>
            <select
              className="input"
              style={{ maxWidth: 220, padding: '8px 14px' }}
              value={filter === 'subject' ? subjectId : ''}
              onChange={(e) => { setFilter('subject'); setSubjectId(e.target.value); }}
            >
              <option value="" disabled>Filter by subject…</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="leaderboard">
          {board === null ? (
            <Loading />
          ) : board.length === 0 ? (
            <div className="lb-empty">
              <div style={{ fontSize: 40, marginBottom: 12 }}>🏅</div>
              <h3>No scores yet</h3>
              <p style={{ marginTop: 6 }}>Be the first to play and top the leaderboard!</p>
              <Link to="/subjects" className="btn btn-primary" style={{ marginTop: 18 }}>Start Playing</Link>
            </div>
          ) : (
            board.map((row) => (
              <div key={row.user_id} className={`lb-row ${user && row.user_id === user.id ? 'me' : ''}`}>
                <div className={`lb-rank ${rankClass(row.rank)}`}>{medal(row.rank)}</div>
                <div className="lb-user">
                  {avatar(row)}
                  <div style={{ minWidth: 0 }}>
                    <div className="lb-name">
                      {row.name} {user && row.user_id === user.id && <span className="badge badge-primary">You</span>}
                    </div>
                    <div className="lb-sub">
                      {filter === 'overall'
                        ? `${row.subjects_played} subject${row.subjects_played === 1 ? '' : 's'} played · ⚡ ${row.xp} XP`
                        : `Best score: ${row.best_score}`}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="lb-pts">{filter === 'overall' ? row.total_points : row.best_points} <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>pts</span></div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
