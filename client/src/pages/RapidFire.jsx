import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import QuizRunner from '../components/QuizRunner';
import Loading from '../components/Loading';

export default function RapidFire() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/quizzes/rapid?limit=10').then(setData).catch((e) => setError(e.message));
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

  if (!data) return <Loading text="Loading rapid fire…" />;

  return (
    <QuizRunner
      subject={data.subject}
      questions={data.questions}
      mode="rapid"
      submitUrl="/quizzes/rapid/submit"
    />
  );
}
