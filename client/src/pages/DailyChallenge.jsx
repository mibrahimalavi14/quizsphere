import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import QuizRunner from '../components/QuizRunner';
import Loading from '../components/Loading';

export default function DailyChallenge() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/quizzes/daily').then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="container empty-state">
        <div className="icon">😕</div>
        <h3>{error}</h3>
        <Link to="/" className="btn btn-primary">Go Home</Link>
      </div>
    );
  }

  if (!data) return <Loading text="Loading today's challenge…" />;

  if (data.done) {
    const a = data.attempt;
    return (
      <div className="container">
        <div className="quiz-intro">
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
            <h2>Done for today!</h2>
            <p className="desc">
              You already completed today's Daily Challenge. Come back tomorrow for a fresh one.
            </p>
            <div className="result-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' }}>
              <div className="result-stat"><div className="v">{a.score}</div><div className="l">Score</div></div>
              <div className="result-stat"><div className="v" style={{ color: 'var(--success)' }}>{a.correct_answers}</div><div className="l">Correct</div></div>
              <div className="result-stat"><div className="v" style={{ color: 'var(--warning)' }}>+{a.xp_earned}</div><div className="l">XP</div></div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 16 }}>
              <button className="btn btn-outline" onClick={() => navigate(`/result/${a.id}`)}>View Details</button>
              <Link to="/subjects" className="btn btn-primary">Play More Quizzes</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (data.questions.length === 0) {
    return (
      <div className="container empty-state">
        <div className="icon">📅</div>
        <h3>No questions available yet</h3>
        <Link to="/" className="btn btn-primary">Go Home</Link>
      </div>
    );
  }

  return (
    <QuizRunner
      subject={data.subject}
      questions={data.questions}
      mode="daily"
      submitUrl="/quizzes/daily/submit"
    />
  );
}
