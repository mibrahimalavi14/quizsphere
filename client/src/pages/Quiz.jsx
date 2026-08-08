import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import QuizRunner from '../components/QuizRunner';
import Loading from '../components/Loading';

export default function Quiz() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const count = Math.min(Math.max(Number(searchParams.get('count')) || 10, 5), 50);
  const difficulty = searchParams.get('difficulty') || 'all';
  const mode = searchParams.get('mode') === 'practice' ? 'practice' : 'quiz';
  const negative = searchParams.get('negative') === 'true';

  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const qs = new URLSearchParams({ limit: count, mode });
    if (difficulty !== 'all') qs.set('difficulty', difficulty);
    api.get(`/quizzes/${id}/questions?${qs.toString()}`)
      .then((d) => {
        if (d.questions.length === 0) setError('No questions available for this selection.');
        else setData(d);
      })
      .catch((e) => setError(e.message));
  }, [id, count, difficulty, mode]);

  if (error) {
    return (
      <div className="container empty-state">
        <div className="icon">😕</div>
        <h3>{error}</h3>
        <button className="btn btn-primary" onClick={() => navigate('/subjects')}>Browse Subjects</button>
      </div>
    );
  }

  if (!data) return <Loading text="Preparing your quiz…" />;

  return (
    <QuizRunner
      subject={data.subject}
      questions={data.questions}
      mode={mode}
      negative={negative}
      submitUrl={`/quizzes/${id}/submit`}
    />
  );
}
