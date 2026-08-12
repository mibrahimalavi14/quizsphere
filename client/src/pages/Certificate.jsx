import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import Loading from '../components/Loading';

function formatDate(d) {
  const date = new Date(d + (d.includes('T') ? '' : 'Z'));
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function Certificate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cert, setCert] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/user/certificates/${id}`).then(setCert).catch((e) => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <div className="container empty-state">
        <div className="icon">😕</div>
        <h3>{error}</h3>
        <Link to="/tests" className="btn btn-primary">Test Center</Link>
      </div>
    );
  }

  if (!cert) return <Loading text="Loading certificate…" />;

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 820 }}>
        <div className="certificate-sheet">
          <div className="cert-border">
            <div className="cert-top">QuizSphere</div>
            <div className="cert-title">Certificate of Achievement</div>
            <p className="cert-sub">This certificate is proudly presented to</p>
            <div className="cert-name">{cert.user_name}</div>
            <p className="cert-body">
              for successfully completing the <b>{cert.subject_icon} {cert.title}</b> with a score of
              <b> {cert.attempt_score}%</b> ({cert.correct_answers}/{cert.total_questions} correct)
            </p>
            <div className="cert-meta">
              <div>
                <div className="cert-meta-label">Issued on</div>
                <div className="cert-meta-value">{formatDate(cert.issued_at)}</div>
              </div>
              <div className="cert-seal">{cert.subject_icon}</div>
              <div>
                <div className="cert-meta-label">Certificate ID</div>
                <div className="cert-meta-value">{cert.cert_code}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="cert-actions">
          <button className="btn btn-primary" onClick={() => window.print()}>🖨 Print / Save PDF</button>
          <Link to="/profile" className="btn btn-ghost">My Profile</Link>
          <Link to="/tests" className="btn btn-outline">Test Center</Link>
        </div>
      </div>
    </section>
  );
}
