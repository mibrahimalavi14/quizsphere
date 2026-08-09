import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const OPTION_KEYS = ['A', 'B', 'C', 'D'];

export default function QuizRunner({ subject, questions, mode = 'quiz', negative = false, submitUrl }) {
  const navigate = useNavigate();
  const { push } = useToast();
  const { refreshUser } = useAuth();

  const practice = mode === 'practice';
  const noBack = mode === 'daily' || mode === 'rapid';

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [revealed, setRevealed] = useState({});
  const [remaining, setRemaining] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  useEffect(() => {
    if (questions.length) setRemaining(questions[0].timeLimit);
  }, [questions]);

  const currentQuestion = questions[current];
  const answeredCount = Object.keys(answers).filter((qid) => answers[qid] !== null && answers[qid] !== undefined).length;

  const submitQuiz = async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const payload = questions.map((q) => ({
        questionId: q.id,
        selected: answersRef.current[q.id] === undefined ? null : answersRef.current[q.id],
      }));
      const result = await api.post(submitUrl, { answers: payload, mode, negative });
      refreshUser().catch(() => {});
      navigate(`/result/${result.attemptId}`, { state: { result } });
    } catch (e) {
      push(e.message, 'error');
      setSubmitting(false);
      submittedRef.current = false;
    }
  };

  const goNext = () => {
    if (current >= questions.length - 1) {
      submitQuiz();
    } else {
      const next = current + 1;
      setCurrent(next);
      setRemaining(questions[next].timeLimit);
      setRevealed((r) => ({ ...r, [currentQuestion.id]: r[currentQuestion.id] ?? false }));
    }
  };

  useEffect(() => {
    if (!currentQuestion || practice || submitting) return;
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(t);
          setRevealed((rev) => ({ ...rev, [currentQuestion.id]: true }));
          goNext();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, currentQuestion, practice, submitting]);

  const selectOption = (idx) => {
    if (submitting) return;
    if (practice && revealed[currentQuestion.id]) return;
    setAnswers((a) => ({ ...a, [currentQuestion.id]: idx }));
    if (practice) {
      setRevealed((r) => ({ ...r, [currentQuestion.id]: true }));
    } else {
      setTimeout(goNext, 220);
    }
  };

  const timeBar = useMemo(() => {
    if (!currentQuestion || practice) return 100;
    return Math.max((remaining / currentQuestion.timeLimit) * 100, 0);
  }, [remaining, currentQuestion, practice]);

  const timerClass = remaining <= 5 ? 'timer danger' : remaining <= 10 ? 'timer warn' : 'timer';

  const optionClass = (i) => {
    let cls = 'option';
    if (practice && revealed[currentQuestion.id]) {
      if (i === currentQuestion.correct) cls += ' correct-answer';
      else if (answers[currentQuestion.id] === i) cls += ' wrong-answer';
      cls += ' disabled';
    } else if (answers[currentQuestion.id] === i) {
      cls += ' selected';
    }
    return cls;
  };

  const modeBadge = {
    quiz: <span className="mode-badge mode-quiz">Test Mode</span>,
    practice: <span className="mode-badge mode-practice">Practice</span>,
    daily: <span className="mode-badge mode-daily">Daily Challenge</span>,
    rapid: <span className="mode-badge mode-rapid">Rapid Fire</span>,
  }[mode];

  const difficultyChip = (d) => (
    <span className={`difficulty-chip difficulty-${d}`}>
      {d === 'easy' ? 'Easy' : d === 'hard' ? 'Hard' : 'Medium'}
    </span>
  );

  return (
    <div className="container">
      <div className="quiz-layout">
        <div className="quiz-main">
          <div className="quiz-topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24 }}>{subject.icon}</span>
              <div>
                <div style={{ fontWeight: 700 }}>{subject.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                  Question {current + 1} of {questions.length} · {modeBadge}
                </div>
              </div>
            </div>
            {!practice && (
              <div className={timerClass}>⏱ {remaining}s</div>
            )}
          </div>

          {!practice && (
            <div className="quiz-progress" style={{ marginBottom: 18 }}>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${timeBar}%` }}></div>
              </div>
            </div>
          )}

          <div className="question-card">
            <div className="q-tag">
              {currentQuestion.difficulty && difficultyChip(currentQuestion.difficulty)}
              <span className="badge badge-primary">⭐ {currentQuestion.points} pts</span>
              {!practice && <span className="badge badge-dim">⏱ {currentQuestion.timeLimit}s</span>}
              <span className="badge badge-success">✔ {answeredCount} answered</span>
            </div>
            <div className="q-text">{currentQuestion.question}</div>
            <div className="option-list">
              {currentQuestion.options.map((opt, i) => (
                <button key={i} className={optionClass(i)} onClick={() => selectOption(i)}>
                  <span className="option-key">{OPTION_KEYS[i]}</span>
                  <span>{opt}</span>
                </button>
              ))}
            </div>
            {practice && revealed[currentQuestion.id] && (
              <div className="explanation-box">
                <div className="e-label">
                  {answers[currentQuestion.id] === currentQuestion.correct ? '✅ Correct!' : `❌ Wrong — correct answer is ${OPTION_KEYS[currentQuestion.correct]}.`}
                </div>
                {currentQuestion.explanation && <div>{currentQuestion.explanation}</div>}
              </div>
            )}
            <div className="quiz-actions">
              <button
                className="btn btn-ghost"
                disabled={current === 0 || submitting || noBack}
                onClick={() => {
                  setCurrent((c) => c - 1);
                  setRemaining(questions[current - 1].timeLimit);
                }}
              >
                ← Back
              </button>
              <button
                className="btn btn-primary"
                disabled={submitting || (practice && !revealed[currentQuestion.id])}
                onClick={goNext}
              >
                {current >= questions.length - 1
                  ? (submitting ? 'Submitting…' : 'Finish')
                  : practice ? 'Next →' : 'Next →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
