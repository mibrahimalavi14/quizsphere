import { useEffect, useState } from 'react';
import { api } from '../api';
import Loading from '../components/Loading';

function formatDate(d) {
  const date = new Date(d + (d.includes('T') ? '' : 'Z'));
  return date.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function Attempts() {
  const [data, setData] = useState(null);
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    api.get(`/admin/attempts?limit=${limit}`).then(setData).catch(() => setData([]));
  }, [limit]);

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1>Quiz Attempts</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: 13.5 }}>All quiz sessions played on the platform.</p>
        </div>
        <select
          className="input"
          style={{ maxWidth: 160 }}
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
        >
          <option value={25}>Last 25</option>
          <option value={50}>Last 50</option>
          <option value={100}>Last 100</option>
          <option value={250}>Last 250</option>
        </select>
      </div>

      {data === null ? (
        <Loading />
      ) : data.length === 0 ? (
        <div className="card empty-state">
          <div className="icon">📝</div>
          <p>No quiz attempts yet.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Subject</th>
                <th>Score</th>
                <th>Correct</th>
                <th>Points</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {data.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{a.user_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>{a.user_email}</div>
                  </td>
                  <td>{a.subject_icon} {a.subject_name}</td>
                  <td>
                    <span className={`badge ${a.score >= 70 ? 'badge-success' : a.score >= 40 ? 'badge-warning' : 'badge-danger'}`}>
                      {a.score}%
                    </span>
                  </td>
                  <td>{a.correct_answers}/{a.total_questions}</td>
                  <td style={{ color: 'var(--warning)' }}>+{a.earned_points}</td>
                  <td style={{ color: 'var(--text-dim)' }}>{formatDate(a.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
