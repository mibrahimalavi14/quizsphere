import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { canAccessRank } from '../ranks';
import Loading from '../components/Loading';

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [subjects, setSubjects] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [stats, setStats] = useState({ subjects: 0, questions: 0 });
  const [me, setMe] = useState(null);

  useEffect(() => {
    api.get('/subjects')
      .then((data) => {
        setSubjects(data);
        setStats({ subjects: data.length, questions: data.reduce((s, x) => s + x.question_count, 0) });
      })
      .catch(() => setSubjects([]));
    api.get('/announcements').then(setAnnouncements).catch(() => setAnnouncements([]));
    if (isAuthenticated) {
      api.get('/user/stats').then((d) => setMe(d.user)).catch(() => {});
    }
  }, [isAuthenticated]);

  const display = me || user;
  const myRank = isAuthenticated ? ((me || user)?.rankKey || 'bronze') : null;
  const modeLocked = (key) => myRank !== null && !canAccessRank(myRank, key);

  return (
    <>
      {announcements.length > 0 && (
        <div className="announcement-bar">
          <div className="container announcement-inner">
            <span>📢</span>
            {announcements.map((a) => (
              <span key={a.id}>
                <span className="a-title">{a.title}</span>
                {a.body && <span className="a-body"> — {a.body}</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      <section className="hero">
        <div className="container">
          <h1>
            Challenge your brain with <span className="gradient-text">QuizSphere</span>
          </h1>
          <p>
            Play subject-wise quizzes, race the clock, earn XP and badges, and climb to the top of
            the leaderboard.
          </p>
          <div className="stats-row">
            <div className="stat-chip">
              <span className="num">{stats.subjects || '…'}</span>
              <span className="lbl">Subjects</span>
            </div>
            <div className="stat-chip">
              <span className="num">{stats.questions || '…'}</span>
              <span className="lbl">Questions</span>
            </div>
            {isAuthenticated && display && (
              <>
                <div className="stat-chip">
                  <span className="num" style={{ color: display.rankColor }}>{display.rankIcon} {display.rankName}</span>
                  <span className="lbl">Your Rank</span>
                </div>
                <div className="stat-chip">
                  <span className="num" style={{ color: '#a5b4fc' }}>{display.level ?? 1}</span>
                  <span className="lbl">Your Level</span>
                </div>
                <div className="stat-chip">
                  <span className="num" style={{ color: '#f87171' }}>{display.currentStreak ?? 0}🔥</span>
                  <span className="lbl">Day Streak</span>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="mode-cards">
            <Link to="/quiz/daily" className="mode-card">
              <div className="m-icon">📅</div>
              <h3>Daily Challenge</h3>
              <p>A fresh 5-question challenge every day. Earn double XP and keep your streak alive.</p>
              <span className="m-tag">One attempt per day →</span>
            </Link>
            {modeLocked('silver') ? (
              <Link to="/ranks" className="mode-card locked">
                <div className="m-icon">🚀</div>
                <h3>Rapid Fire</h3>
                <p>10 questions from all subjects with just 10 seconds each. Think fast, score big!</p>
                <span className="m-tag">🔒 Silver rank required →</span>
              </Link>
            ) : (
              <Link to="/quiz/rapid" className="mode-card">
                <div className="m-icon">🚀</div>
                <h3>Rapid Fire</h3>
                <p>10 questions from all subjects with just 10 seconds each. Think fast, score big!</p>
                <span className="m-tag">Global mixed questions →</span>
              </Link>
            )}
            {!isAuthenticated && (
              <Link to="/register" className="mode-card">
                <div className="m-icon">🏆</div>
                <h3>Join the Leaderboard</h3>
                <p>Create a free account to track XP, earn badges and compete with everyone.</p>
                <span className="m-tag">Sign up free →</span>
              </Link>
            )}
          </div>

          <div className="section-head">
            <h2>Popular <span className="gradient-text">Subjects</span></h2>
            <Link to="/subjects" className="btn btn-ghost btn-sm">View all</Link>
          </div>
          {subjects === null ? (
            <Loading />
          ) : (
          <div className="subject-grid">
            {subjects.slice(0, 6).map((s) =>
              myRank && !canAccessRank(myRank, s.min_rank) ? (
                <Link key={s.id} to="/ranks" className="subject-card locked" style={{ ['--subject-color']: s.color }}>
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
                    <span className="btn btn-primary btn-sm">See Ranks</span>
                  </div>
                </Link>
              ) : (
                <Link key={s.id} to={`/subjects/${s.id}/quiz`} className="subject-card" style={{ ['--subject-color']: s.color }}>
                  <div className="subject-icon" style={{ background: `${s.color}22` }}>{s.icon}</div>
                  <h3>{s.name}</h3>
                  <p>{s.description}</p>
                  <div className="subject-meta">
                    <span>{s.question_count} questions</span>
                    <span>→</span>
                  </div>
                </Link>
              )
            )}
          </div>
          )}
        </div>
      </section>
    </>
  );
}
