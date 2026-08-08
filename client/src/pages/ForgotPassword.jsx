import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useToast } from '../context/ToastContext';

export default function ForgotPassword() {
  const { push } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devToken, setDevToken] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      push('Reset link sent to your email.', 'success');
      if (res.devResetToken) {
        setDevToken(res.devResetToken);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Reset password 🔑</h2>
        <p className="sub">Enter your email and we'll send you a reset link.</p>
        {error && <div className="alert alert-error">{error}</div>}
        {devToken ? (
          <div className="alert alert-success" style={{ wordBreak: 'break-all' }}>
            Dev mode: use this token on the reset page — <Link to="/reset-password" state={{ token: devToken, email }}><b>Go to reset →</b></Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}
        <div className="auth-switch">
          <Link to="/login">← Back to login</Link>
        </div>
      </div>
    </div>
  );
}
