import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import QuizRunner from '../components/QuizRunner';
import Loading from '../components/Loading';

export default function Mistakes() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/quizzes/practice/mistakes?limit=10')
      .then((d) => {
        if (d.questions.length === 0) setError('empty');
        else setData(d);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error === 'empty') {
    return (
      <div className="container empty-state">
        <div className="icon">🧠</div>
        <h3>Nothing to practice — great job!</h3>
        <p style={{ color: 'var(--text-dim)' }}>You have no mistakes saved. Questions you get wrong in quizzes are added here automatically.</p>
        <Link to="/subjects" className="btn btn-primary">Take a Quiz</Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container empty-state">
        <div className="icon">😕</div>
        <h3>{error}</h3>
        <button className="btn btn-primary" onClick={() => navigate('/subjects')}>Browse Subjects</button>
      </div>
    );
  }

  if (!data) return <Loading text="Loading your mistakes…" />;

  return (
    <QuizRunner
      subject={data.subject}
      questions={data.questions}
      mode="practice"
      submitUrl="/quizzes/practice/mistakes/submit"
    />
  );
}
