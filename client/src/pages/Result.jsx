import { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import Loading from '../components/Loading';

const OPTION_KEYS = ['A', 'B', 'C', 'D'];

export default function Result() {
  const { attemptId } = useParams();
  const location = useLocation();
  const { push } = useToast();
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const submitResult = location.state?.result || null;

  useEffect(() => {
    api.get(`/user/attempts/${attemptId}`).then(setResult).catch((e) => setError(e.message));
  }, [attemptId]);

  if (error) {
    return (
      <div className="container empty-state">
        <div className="icon">😕</div>
        <h3>{error}</h3>
        <Link to="/subjects" className="btn btn-primary">Browse Subjects</Link>
      </div>
    );
  }

  if (!result) return <Loading />;

  const pct = result.total_questions ? Math.round((result.correct_answers / result.total_questions) * 100) : 0;
  const passed = pct >= 50;
  const newBadges = submitResult?.newBadges || [];
  const levelInfo = submitResult?.levelInfo || null;
  const xpEarned = result.xp_earned ?? submitResult?.xpEarned ?? 0;

  const shareText = `I scored ${result.score}% on the ${result.subject_name} quiz on QuizSphere! 🧠`;
  const shareUrl = window.location.origin;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      setCopied(true);
      push('Result link copied!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      push('Could not copy', 'error');
    }
  };

  const modeBadge = {
    quiz: <span className="mode-badge mode-quiz">Test Mode</span>,
    practice: <span className="mode-badge mode-practice">Practice</span>,
    daily: <span className="mode-badge mode-daily">Daily Challenge</span>,
    rapid: <span className="mode-badge mode-rapid">Rapid Fire</span>,
  }[result.mode];

  return (
    <div className="container">
      <div className="result-hero">
        <h2>Quiz Complete! 🎉</h2>
        <p style={{ color: 'var(--text-dim)' }}>
          {result.subject_icon} {result.subject_name} · {modeBadge}
        </p>
        <div className="result-score" style={{ ['--pct']: pct }}>
          <div className="inner">
            <div className="pct">{pct}%</div>
            <div className="pct-label">{passed ? 'Passed' : 'Keep Practicing'}</div>
          </div>
        </div>
      </div>

      {xpEarned > 0 && (
        <div className="xp-banner">
          <span>⚡ +{xpEarned} XP earned</span>
          {levelInfo && (
            <span className="level-badge">
              Level {levelInfo.level} · {levelInfo.current}/{levelInfo.needed} XP
            </span>
          )}
        </div>
      )}

      {newBadges.length > 0 && (
        <div className="badge-ribbon">
          {newBadges.map((b) => (
            <span key={b.key} className="badge-chip">{b.icon} {b.name} unlocked!</span>
          ))}
        </div>
      )}

      <div className="share-row">
        <a
          className="share-btn share-wa"
          href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noreferrer"
        >WhatsApp</a>
        <a
          className="share-btn share-fb"
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noreferrer"
        >Facebook</a>
        <a
          className="share-btn share-x"
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noreferrer"
        >𝕏 Twitter</a>
        <button className="share-btn share-copy" onClick={copyLink}>{copied ? 'Copied!' : 'Copy Link'}</button>
      </div>

      <div className="result-stats">
        <div className="result-stat">
          <div className="v" style={{ color: '#a5b4fc' }}>{result.score}</div>
          <div className="l">Score / 100</div>
        </div>
        <div className="result-stat">
          <div className="v" style={{ color: 'var(--success)' }}>{result.correct_answers}</div>
          <div className="l">Correct</div>
        </div>
        <div className="result-stat">
          <div className="v" style={{ color: 'var(--danger)' }}>{result.total_questions - result.correct_answers}</div>
          <div className="l">Wrong</div>
        </div>
        <div className="result-stat">
          <div className="v" style={{ color: 'var(--warning)' }}>+{result.earned_points}</div>
          <div className="l">Points</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, margin: '10px 0 30px', flexWrap: 'wrap' }}>
        {result.mode === 'daily' ? (
          <Link to="/" className="btn btn-primary">Back to Home</Link>
        ) : result.mode === 'rapid' ? (
          <Link to="/quiz/rapid" className="btn btn-primary">Play Again 🔁</Link>
        ) : (
          <Link to={`/subjects/${result.subject_id}/quiz`} className="btn btn-primary">Play Again</Link>
        )}
        <Link to="/leaderboard" className="btn btn-ghost">View Leaderboard</Link>
        <Link to="/profile" className="btn btn-outline">My Profile</Link>
      </div>

      <div className="result-breakdown">
        <div className="card" style={{ padding: '22px 26px' }}>
          <h3 style={{ marginBottom: 14, fontSize: 20 }}>Answer Review</h3>
          {result.answers.map((a, i) => (
            <div key={a.questionId} className="rq">
              <div className="rq-text">{i + 1}. {a.question}</div>
              <div className={a.isCorrect ? 'rq-correct' : 'rq-wrong'}>
                {a.isCorrect ? '✔ Correct' : '✘ Wrong'}
                <span style={{ color: 'var(--text-faint)' }}>
                  {' '}· {a.pointsEarned >= 0 ? `+${a.pointsEarned}` : a.pointsEarned}/{a.points} pts
                </span>
              </div>
              {!a.isCorrect && (
                <div className="rq-correct" style={{ fontSize: 13 }}>
                  Correct answer: {OPTION_KEYS[a.correctAnswer]}. {a.options[a.correctAnswer]}
                  {a.selected !== null && a.selected !== undefined && (
                    <span style={{ color: 'var(--text-dim)' }}>
                      {' '}· Your answer: {OPTION_KEYS[a.selected]}. {a.options[a.selected]}
                    </span>
                  )}
                </div>
              )}
              {a.explanation && (
                <div style={{ color: 'var(--text-faint)', fontSize: 13, marginTop: 4 }}>💡 {a.explanation}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
