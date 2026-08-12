import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import QuizRunner from '../components/QuizRunner';
import Loading from '../components/Loading';

export default function RetakeQuiz() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/quizzes/retake/${attemptId}/questions`)
      .then((d) => {
        if (d.questions.length === 0) setError('No questions available for this attempt.');
        else setData(d);
      })
      .catch((e) => setError(e.message));
  }, [attemptId]);

  if (error) {
    return (
      <div className="container empty-state">
        <div className="icon">😕</div>
        <h3>{error}</h3>
        <button className="btn btn-primary" onClick={() => navigate('/tests')}>Back to Test Center</button>
      </div>
    );
  }

  if (!data) return <Loading text="Restoring your attempt…" />;

  return (
    <QuizRunner
      subject={data.subject}
      questions={data.questions}
      mode={data.mode}
      submitUrl={`/quizzes/${data.subject.id}/submit`}
      extraPayload={{ retakeOf: data.retakeOf }}
    />
  );
}
