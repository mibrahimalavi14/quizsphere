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

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [reviewed, setReviewed] = useState({});
  const [revealed, setRevealed] = useState({});
  const [remaining, setRemaining] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const submittedRef = useRef(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    if (questions.length) {
      setRemaining(questions[0].timeLimit);
      startTimeRef.current = Date.now();
    }
  }, [questions]);

  const currentQuestion = questions[current];
  const answeredCount = Object.keys(answers).filter((qid) => answers[qid] !== null && answers[qid] !== undefined).length;
  const unansweredCount = questions.length - answeredCount;
  const reviewedCount = Object.keys(reviewed).filter((qid) => reviewed[qid]).length;

  const submitQuiz = async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
      const payload = questions.map((q) => ({
        questionId: q.id,
        selected: answersRef.current[q.id] === undefined ? null : answersRef.current[q.id],
      }));
      const result = await api.post(submitUrl, { answers: payload, mode, negative, durationSeconds });
      refreshUser().catch(() => {});
      navigate(`/result/${result.attemptId}`, { state: { result } });
    } catch (e) {
      push(e.message, 'error');
      setSubmitting(false);
      submittedRef.current = false;
      setShowConfirm(false);
    }
  };

  const goNext = () => {
    if (current >= questions.length - 1) {
      setShowConfirm(true);
    } else {
      const next = current + 1;
      setCurrent(next);
      setRemaining(questions[next].timeLimit);
      setRevealed((r) => ({ ...r, [currentQuestion.id]: r[currentQuestion.id] ?? false }));
    }
  };

  const goPrev = () => {
    if (current <= 0) return;
    const prev = current - 1;
    setCurrent(prev);
    setRemaining(questions[prev].timeLimit);
  };

  const jumpTo = (idx) => {
    if (idx === current) return;
    setCurrent(idx);
    setRemaining(questions[idx].timeLimit);
    setNavOpen(false);
  };

  useEffect(() => {
    if (!currentQuestion || practice || submitting) return;
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(t);
          setRevealed((rev) => ({ ...rev, [currentQuestion.id]: true }));
          if (current >= questions.length - 1) {
            submitQuiz();
          } else {
            goNext();
          }
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

  const toggleReview = () => {
    if (practice || submitting) return;
    setReviewed((r) => ({ ...r, [currentQuestion.id]: !r[currentQuestion.id] }));
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

  const navClass = (idx) => {
    const qid = questions[idx].id;
    let cls = 'qn';
    if (idx === current) cls += ' current';
    if (answers[qid] !== null && answers[qid] !== undefined) cls += ' answered';
    if (reviewed[qid]) cls += ' review';
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
        <div className="quiz-sidebar">
          <div className="qnav-card">
            <div className="qnav-head">
              <span>Questions</span>
              <span className="badge badge-dim">{answeredCount}/{questions.length} answered</span>
            </div>
            <div className="qnav-grid">
              {questions.map((q, i) => (
                <button key={q.id} className={navClass(i)} onClick={() => jumpTo(i)}>
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="qnav-legend">
              <span><i className="dot dot-answered"></i> Answered</span>
              <span><i className="dot dot-review"></i> For Review</span>
              <span><i className="dot dot-unanswered"></i> Unanswered</span>
            </div>
          </div>
        </div>

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
              {reviewed[currentQuestion.id] && <span className="badge badge-review">📌 For Review</span>}
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
              {!practice && (
                <button className="btn btn-outline" disabled={submitting} onClick={toggleReview}>
                  {reviewed[currentQuestion.id] ? '✓ Marked' : '📌 Review'}
                </button>
              )}
              <button className="btn btn-ghost" disabled={current === 0 || submitting} onClick={goPrev}>
                ← Prev
              </button>
              {current >= questions.length - 1 ? (
                <button className="btn btn-primary" disabled={submitting} onClick={() => setShowConfirm(true)}>
                  {submitting ? 'Submitting…' : 'Submit Quiz'}
                </button>
              ) : (
                <button className="btn btn-primary" disabled={submitting} onClick={goNext}>
                  Next →
                </button>
              )}
            </div>
            {!practice && (
              <button className="btn btn-ghost btn-sm nav-toggle" onClick={() => setNavOpen(!navOpen)}>
                {navOpen ? 'Hide question list ▲' : 'Show question list ▼'}
              </button>
            )}
          </div>
          {navOpen && (
            <div className="qnav-card qnav-mobile">
              <div className="qnav-grid">
                {questions.map((q, i) => (
                  <button key={q.id} className={navClass(i)} onClick={() => jumpTo(i)}>
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showConfirm && (
        <div className="modal-backdrop" onClick={() => !submitting && setShowConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Submit Quiz?</h3>
            <p style={{ color: 'var(--text-dim)', marginBottom: 14 }}>
              You are about to submit your quiz. This cannot be undone.
            </p>
            <div className="result-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))' }}>
              <div className="result-stat"><div className="v" style={{ color: 'var(--success)' }}>{answeredCount}</div><div className="l">Answered</div></div>
              <div className="result-stat"><div className="v" style={{ color: 'var(--danger)' }}>{unansweredCount}</div><div className="l">Unanswered</div></div>
              {reviewedCount > 0 && (
                <div className="result-stat"><div className="v" style={{ color: 'var(--warning)' }}>{reviewedCount}</div><div className="l">For Review</div></div>
              )}
            </div>
            {unansweredCount > 0 && (
              <p style={{ color: 'var(--warning)', fontSize: 13.5, marginTop: 10 }}>
                ⚠ {unansweredCount} question{unansweredCount > 1 ? 's' : ''} unanswered will be marked wrong.
              </p>
            )}
            <div className="modal-actions">
              <button className="btn btn-outline" disabled={submitting} onClick={() => setShowConfirm(false)}>Keep Working</button>
              <button className="btn btn-primary" disabled={submitting} onClick={submitQuiz}>
                {submitting ? 'Submitting…' : 'Submit Quiz'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
