import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import QuizRunner from '../components/QuizRunner';
import Loading from '../components/Loading';

export default function WeeklyChallenge() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/quizzes/weekly').then(setData).catch((e) => setError(e));
  }, []);

  if (error) {
    if (error.rank) {
      return (
        <div className="container empty-state">
          <div className="icon">🔒</div>
          <h3>Weekly Challenge locked</h3>
          <p style={{ marginTop: 6 }}>
            <b style={{ color: error.rank.color }}>{error.rank.icon} {error.rank.name} rank</b> is required.
            You need to reach Level {error.rank.minLevel}.
          </p>
          <Link to="/ranks" className="btn btn-primary" style={{ marginTop: 16 }}>See Ranks</Link>
        </div>
      );
    }
    return (
      <div className="container empty-state">
        <div className="icon">😕</div>
        <h3>{error.message || error}</h3>
        <Link to="/" className="btn btn-primary">Go Home</Link>
      </div>
    );
  }

  if (!data) return <Loading text="Loading this week's challenge…" />;

  if (data.done) {
    const a = data.attempt;
    return (
      <div className="container">
        <div className="quiz-intro">
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
            <h2>Done for this week!</h2>
            <p className="desc">
              You already completed this week's Weekly Challenge ({data.range.start} → {data.range.end}).
              Come back next week for a fresh one.
            </p>
            <div className="result-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' }}>
              <div className="result-stat"><div className="v">{a.score}</div><div className="l">Score</div></div>
              <div className="result-stat"><div className="v" style={{ color: 'var(--success)' }}>{a.correct_answers}</div><div className="l">Correct</div></div>
              <div className="result-stat"><div className="v" style={{ color: 'var(--warning)' }}>+{a.xp_earned}</div><div className="l">XP</div></div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 16 }}>
              <button className="btn btn-outline" onClick={() => navigate(`/result/${a.id}`)}>View Details</button>
              <Link to="/tests" className="btn btn-primary">Test Center</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (data.questions.length === 0) {
    return (
      <div className="container empty-state">
        <div className="icon">🏆</div>
        <h3>No questions available yet</h3>
        <Link to="/tests" className="btn btn-primary">Test Center</Link>
      </div>
    );
  }

  return (
    <QuizRunner
      subject={data.subject}
      questions={data.questions}
      mode="weekly"
      submitUrl="/quizzes/weekly/submit"
    />
  );
}
