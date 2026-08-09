import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { canAccessRank } from '../ranks';
import Loading from '../components/Loading';

export default function Subjects() {
  const { user, isAuthenticated } = useAuth();
  const [subjects, setSubjects] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/subjects').then(setSubjects).catch(() => setSubjects([]));
  }, []);

  const filtered = (subjects || []).filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const myRank = isAuthenticated ? (user?.rankKey || 'bronze') : null;

  const locked = (s) => myRank !== null && !canAccessRank(myRank, s.min_rank);

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div>
            <h2>All <span className="gradient-text">Subjects</span></h2>
            <p style={{ color: 'var(--text-dim)', fontSize: 14, marginTop: 4 }}>
              Pick a subject and start playing. Higher ranks unlock more subjects.
            </p>
          </div>
          <input
            className="input"
            style={{ maxWidth: 260 }}
            placeholder="Search subjects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {subjects === null ? (
          <Loading />
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🔍</div>
            <h3>No subjects found</h3>
            <p>Try a different search term.</p>
          </div>
        ) : (
          <div className="subject-grid">
            {filtered.map((s) =>
              locked(s) ? (
                <div key={s.id} className="subject-card locked" style={{ ['--subject-color']: s.color }}>
                  <div className="subject-icon" style={{ background: `${s.color}22` }}>{s.icon}</div>
                  <h3>{s.name}</h3>
                  <p>{s.description}</p>
                  <div className="subject-meta">
                    <span>{s.question_count} questions</span>
                    <span className="lock-tag">🔒</span>
                  </div>
                  <div className="locked-overlay">
                    <div className="locked-badge">
                      <div className="locked-icon" style={{ color: s.requiredRank?.color }}>🔒</div>
                      <div>
                        <b style={{ color: s.requiredRank?.color }}>{s.requiredRank?.icon} {s.requiredRank?.name} required</b>
                        <small>Reach level {s.requiredRank?.minLevel} to unlock</small>
                      </div>
                    </div>
                    <Link to="/ranks" className="btn btn-primary btn-sm">See Ranks</Link>
                  </div>
                </div>
              ) : (
                <Link key={s.id} to={`/subjects/${s.id}/quiz`} className="subject-card" style={{ ['--subject-color']: s.color }}>
                  <div className="subject-icon" style={{ background: `${s.color}22` }}>{s.icon}</div>
                  <h3>{s.name}</h3>
                  <p>{s.description}</p>
                  <div className="subject-meta">
                    <span>{s.question_count} questions</span>
                    <span>Play →</span>
                  </div>
                </Link>
              )
            )}
          </div>
        )}
      </div>
    </section>
  );
}
