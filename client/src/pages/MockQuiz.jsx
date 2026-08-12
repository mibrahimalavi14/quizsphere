import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import QuizRunner from '../components/QuizRunner';
import Loading from '../components/Loading';

export default function MockQuiz() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const count = Math.min(Math.max(Number(searchParams.get('count')) || 10, 1), 50);
  const difficulty = searchParams.get('difficulty') || 'all';
  const perQuestion = Math.max(Number(searchParams.get('perQuestion')) || 0, 0);
  const total = Math.max(Number(searchParams.get('total')) || 0, 0);
  const negative = searchParams.get('negative') === 'true';
  const exam = searchParams.get('exam') === 'true';

  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const qs = new URLSearchParams({ limit: count, mode: 'mock' });
    if (difficulty !== 'all') qs.set('difficulty', difficulty);
    api.get(`/quizzes/${id}/questions?${qs.toString()}`)
      .then((d) => {
        if (d.questions.length === 0) setError('No questions available for this selection.');
        else {
          if (perQuestion > 0) d.questions = d.questions.map((q) => ({ ...q, timeLimit: perQuestion }));
          setData(d);
        }
      })
      .catch((e) => setError(e.message));
  }, [id, count, difficulty, perQuestion]);

  if (error) {
    if (typeof error === 'object' && error.rank) {
      return (
        <div className="container empty-state">
          <div className="icon">🔒</div>
          <h3>Mock Test locked</h3>
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
        <h3>{typeof error === 'string' ? error : error.message}</h3>
        <button className="btn btn-primary" onClick={() => navigate('/tests')}>Back to Test Center</button>
      </div>
    );
  }

  if (!data) return <Loading text="Preparing your mock test…" />;

  return (
    <QuizRunner
      subject={data.subject}
      questions={data.questions}
      mode="mock"
      negative={negative}
      examMode={exam}
      totalTime={total}
      submitUrl={`/quizzes/${id}/submit`}
      extraPayload={{ config: { count, difficulty, perQuestion, total, negative, exam } }}
    />
  );
}
