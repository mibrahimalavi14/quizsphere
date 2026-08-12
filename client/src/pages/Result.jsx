import { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import Loading from '../components/Loading';

const OPTION_KEYS = ['A', 'B', 'C', 'D'];

const difficultyChip = (d) => (
  <span className={`difficulty-chip difficulty-${d}`}>
    {d === 'easy' ? 'Easy' : d === 'hard' ? 'Hard' : 'Medium'}
  </span>
);

export default function Result() {
  const { attemptId } = useParams();
  const location = useLocation();
  const { push } = useToast();
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [certId, setCertId] = useState(null);
  const submitResult = location.state?.result || null;

  useEffect(() => {
    api.get(`/user/attempts/${attemptId}`).then(setResult).catch((e) => setError(e.message));
  }, [attemptId]);

  useEffect(() => {
    if (result?.mode !== 'mock' || result?.score < 60) return;
    api.get('/user/certificates')
      .then((certs) => {
        const c = certs.find((x) => x.attempt_id === Number(attemptId));
        if (c) setCertId(c.id);
      })
      .catch(() => {});
  }, [result?.mode, result?.score, attemptId]);

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

  const answeredArr = result.answers || [];
  const answered = answeredArr.filter((a) => a.selected !== null && a.selected !== undefined).length;
  const unanswered = result.total_questions - answered;
  const correctCount = result.correct_answers;
  const wrongCount = Math.max(answered - correctCount, 0);
  const pct = result.total_questions ? Math.round((result.correct_answers / result.total_questions) * 100) : 0;
  const passed = pct >= 40;
  const grade =
    pct >= 80 ? { letter: 'A', msg: 'Excellent work!' } :
    pct >= 65 ? { letter: 'B', msg: 'Great job!' } :
    pct >= 50 ? { letter: 'C', msg: 'Good effort!' } :
    pct >= 40 ? { letter: 'D', msg: 'Keep practicing — you are close!' } :
    { letter: 'F', msg: 'Don\'t give up — review the answers and try again!' };

  const formatTime = (sec) => {
    const s = Math.max(0, Number(sec) || 0);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
  };

  const newBadges = submitResult?.newBadges || [];
  const levelInfo = submitResult?.levelInfo || null;
  const xpEarned = result.xp_earned ?? submitResult?.xpEarned ?? 0;
  const isPractice = result.mode === 'practice';
  const practiceXp = result.practiceType === 'mistakes' ? xpEarned : 0;

  const shareText = `I scored ${result.score}% (Grade ${grade.letter}) on the ${result.subject_name} quiz on QuizSphere! 🧠`;
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
    weekly: <span className="mode-badge mode-weekly">Weekly Challenge</span>,
    mock: <span className="mode-badge mode-mock">Mock Test</span>,
  }[result.mode];

  const formatSec = (sec) => {
    const s = Math.max(0, Number(sec) || 0);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
  };

  const isMock = result.mode === 'mock';
  const passedMock = isMock && result.score >= 60;
  const analysis = isMock && result.answers?.length
    ? (() => {
        const byDiff = {};
        let totalMs = 0;
        for (const a of result.answers) {
          const d = a.difficulty || 'medium';
          if (!byDiff[d]) byDiff[d] = { correct: 0, total: 0 };
          byDiff[d].total += 1;
          if (a.isCorrect) byDiff[d].correct += 1;
          totalMs += a.timeTakenMs || 0;
        }
        const sorted = result.answers.slice().sort((x, y) => (y.timeTakenMs || 0) - (x.timeTakenMs || 0));
        return {
          byDiff,
          totalMs,
          avgMs: result.answers.length ? totalMs / result.answers.length : 0,
          slowest: sorted[0] || null,
          fastest: sorted[sorted.length - 1] || null,
        };
      })()
    : null;

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
            <div className="pct-label">
              {passed ? 'Passed' : 'Failed'} · Grade <b>{grade.letter}</b>
            </div>
          </div>
        </div>
        <p style={{ color: 'var(--text-dim)', marginTop: 12 }}>{grade.msg}</p>
      </div>

      {xpEarned > 0 && !isPractice && (
        <div className="xp-banner">
          <span>⚡ +{xpEarned} XP earned</span>
          {submitResult?.firstQuizBonus > 0 && (
            <span className="badge badge-primary">🎯 +{submitResult.firstQuizBonus} first quiz bonus</span>
          )}
          {levelInfo && (
            <span className="level-badge">
              Level {levelInfo.level} · {levelInfo.current}/{levelInfo.needed} XP
            </span>
          )}
        </div>
      )}

      {isPractice && (
        <div className="practice-xp-banner">
          <span>🧠 Practice XP earned</span>
          <span className="badge badge-primary">⚡ +{practiceXp} XP</span>
          {(result.newlyMastered ?? submitResult?.newlyMastered ?? 0) > 0 && (
            <span className="badge badge-success">✅ {result.newlyMastered ?? submitResult?.newlyMastered ?? 0} mastered</span>
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
          <div className="v" style={{ color: 'var(--warning)' }}>{result.earned_points}/{result.total_points}</div>
          <div className="l">Marks</div>
        </div>
        <div className="result-stat">
          <div className="v" style={{ color: '#a5b4fc' }}>{pct}%</div>
          <div className="l">Percentage</div>
        </div>
        <div className="result-stat">
          <div className="v" style={{ color: 'var(--text)' }}>{grade.letter}</div>
          <div className="l">Grade</div>
        </div>
        <div className="result-stat">
          <div className="v" style={{ color: 'var(--success)' }}>{correctCount}</div>
          <div className="l">Correct</div>
        </div>
        <div className="result-stat">
          <div className="v" style={{ color: 'var(--danger)' }}>{wrongCount}</div>
          <div className="l">Wrong</div>
        </div>
        <div className="result-stat">
          <div className="v" style={{ color: 'var(--text-faint)' }}>{unanswered}</div>
          <div className="l">Unanswered</div>
        </div>
        <div className="result-stat">
          <div className="v" style={{ color: 'var(--text-dim)' }}>{formatTime(result.duration_seconds)}</div>
          <div className="l">Time Taken</div>
        </div>
        <div className="result-stat">
          <div className="v" style={{ color: '#a5b4fc' }}>+{result.xp_earned ?? 0}</div>
          <div className="l">XP Earned</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, margin: '10px 0 30px', flexWrap: 'wrap' }}>
        {isPractice && result.practiceType === 'mistakes' ? (
          <Link to="/quiz/mistakes" className="btn btn-primary">Practice Next Mistakes 🔁</Link>
        ) : result.mode === 'weekly' ? (
          <Link to="/tests" className="btn btn-primary">Back to Test Center</Link>
        ) : result.mode === 'daily' ? (
          <Link to="/" className="btn btn-primary">Back to Home</Link>
        ) : result.mode === 'rapid' ? (
          <Link to="/quiz/rapid" className="btn btn-primary">Play Again 🔁</Link>
        ) : result.mode === 'mock' ? (
          <Link to={`/retake/${result.id}`} className="btn btn-primary">Retake 🔁</Link>
        ) : (
          <Link to={`/subjects/${result.subject_id}/quiz`} className="btn btn-primary">Play Again</Link>
        )}
        {!isPractice && result.mode !== 'mock' && (
          <Link to="/quiz/mistakes" className="btn btn-outline">🧠 Practice Mistakes</Link>
        )}
        {passedMock && (
          <Link to={certId ? `/certificate/${certId}` : '/tests'} className="btn btn-success">
            🏅 {certId ? 'View Certificate' : 'Get Certificate'}
          </Link>
        )}
        <Link to="/leaderboard" className="btn btn-ghost">View Leaderboard</Link>
        <Link to="/profile" className="btn btn-outline">My Profile</Link>
      </div>

      {analysis && (
        <div className="result-breakdown" style={{ marginTop: 26 }}>
          <div className="card" style={{ padding: '22px 26px' }}>
            <h3 style={{ marginBottom: 14, fontSize: 20 }}>📊 Mock Test Analysis</h3>
            <div className="analytics-grid" style={{ marginTop: 4 }}>
              <div className="panel">
                <h3 className="panel-title">🎯 Accuracy by Difficulty</h3>
                <div className="stack-row">
                  <div className="stack-label"><span className="dot dot-answered"></span> Easy</div>
                  <div className="stack-track"><div className="stack-fill" style={{ width: `${(analysis.byDiff.easy?.total ? (analysis.byDiff.easy.correct / analysis.byDiff.easy.total) * 100 : 0)}%`, background: 'var(--success)' }}></div></div>
                  <div className="stack-count">{analysis.byDiff.easy?.correct || 0}/{analysis.byDiff.easy?.total || 0}</div>
                </div>
                <div className="stack-row">
                  <div className="stack-label"><span className="dot dot-review"></span> Medium</div>
                  <div className="stack-track"><div className="stack-fill" style={{ width: `${(analysis.byDiff.medium?.total ? (analysis.byDiff.medium.correct / analysis.byDiff.medium.total) * 100 : 0)}%`, background: 'var(--warning)' }}></div></div>
                  <div className="stack-count">{analysis.byDiff.medium?.correct || 0}/{analysis.byDiff.medium?.total || 0}</div>
                </div>
                <div className="stack-row">
                  <div className="stack-label"><span className="dot dot-unanswered"></span> Hard</div>
                  <div className="stack-track"><div className="stack-fill" style={{ width: `${(analysis.byDiff.hard?.total ? (analysis.byDiff.hard.correct / analysis.byDiff.hard.total) * 100 : 0)}%`, background: 'var(--danger)' }}></div></div>
                  <div className="stack-count">{analysis.byDiff.hard?.correct || 0}/{analysis.byDiff.hard?.total || 0}</div>
                </div>
              </div>
              <div className="panel">
                <h3 className="panel-title">⏱ Time Analysis</h3>
                <div className="result-stats" style={{ gridTemplateColumns: 'repeat(2, 1fr)', margin: '10px 0 0', maxWidth: 'none' }}>
                  <div className="result-stat"><div className="v" style={{ fontSize: 20 }}>{formatSec(analysis.totalMs / 1000)}</div><div className="l">Total time</div></div>
                  <div className="result-stat"><div className="v" style={{ fontSize: 20 }}>{formatSec(analysis.avgMs / 1000)}</div><div className="l">Avg / question</div></div>
                  <div className="result-stat"><div className="v" style={{ fontSize: 16 }}>{formatSec(analysis.slowest?.timeTakenMs / 1000 || 0)}</div><div className="l">Slowest question</div></div>
                  <div className="result-stat"><div className="v" style={{ fontSize: 16 }}>{formatSec(analysis.fastest?.timeTakenMs / 1000 || 0)}</div><div className="l">Fastest question</div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="result-breakdown">
        <div className="card" style={{ padding: '22px 26px' }}>
          <h3 style={{ marginBottom: 14, fontSize: 20 }}>Answer Review</h3>
          {result.answers.map((a, i) => {
            const unanswered = a.selected === null || a.selected === undefined;
            const status = a.isCorrect ? 'correct' : unanswered ? 'unanswered' : 'wrong';
            return (
              <div key={a.questionId} className="rq">
                <div className="rq-text">
                  {i + 1}. {a.question}
                  {a.difficulty && <span style={{ marginLeft: 8 }}>{difficultyChip(a.difficulty)}</span>}
                  {analysis && (
                    <span className="badge badge-dim" style={{ marginLeft: 8 }}>⏱ {formatSec((a.timeTakenMs || 0) / 1000)}</span>
                  )}
                </div>
                <div className={`rq-${status}`}>
                  {a.isCorrect ? '✔ Correct' : unanswered ? '○ Unanswered' : '✘ Wrong'}
                  <span style={{ color: 'var(--text-faint)' }}>
                    {' '}· {a.pointsEarned >= 0 ? `+${a.pointsEarned}` : a.pointsEarned}/{a.points} pts
                  </span>
                </div>
                <div className="rq-correct" style={{ fontSize: 13 }}>
                  Correct answer: {OPTION_KEYS[a.correctAnswer]}. {a.options[a.correctAnswer]}
                  {!unanswered && (
                    <span style={{ color: a.isCorrect ? 'var(--text-dim)' : 'var(--danger)' }}>
                      {' '}· Your answer: {OPTION_KEYS[a.selected]}. {a.options[a.selected]}
                    </span>
                  )}
                </div>
                {a.explanation && (
                  <div style={{ color: 'var(--text-faint)', fontSize: 13, marginTop: 4 }}>💡 {a.explanation}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
