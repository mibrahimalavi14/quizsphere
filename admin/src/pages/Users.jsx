import { useEffect, useState } from 'react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import Loading from '../components/Loading';

function formatDate(d) {
  const date = new Date(d + (d.includes('T') ? '' : 'Z'));
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Users() {
  const { push } = useToast();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [confirmId, setConfirmId] = useState(null);
  const [confirmName, setConfirmName] = useState('');

  const perPage = 15;

  useEffect(() => {
    const params = new URLSearchParams({ page, perPage });
    if (search) params.set('search', search);
    api.get(`/admin/users?${params.toString()}`).then(setData).catch(() => setData({ users: [], total: 0, pages: 1 }));
  }, [page, search]);

  const toggleAdmin = async (u) => {
    try {
      await api.patch(`/admin/users/${u.id}`, { is_admin: u.is_admin ? 0 : 1 });
      push(`${u.name} is now ${u.is_admin ? 'a regular user' : 'an admin'}`, 'success');
      setData(await api.get(`/admin/users?${new URLSearchParams({ page, perPage })}`));
    } catch (err) {
      push(err.message, 'error');
    }
  };

  const doDelete = async () => {
    try {
      await api.delete(`/admin/users/${confirmId}`);
      push('User deleted', 'success');
      setConfirmId(null);
      setData(await api.get(`/admin/users?${new URLSearchParams({ page, perPage })}`));
    } catch (err) {
      push(err.message, 'error');
    }
  };

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1>Users</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: 13.5 }}>
            {data ? `${data.total} registered user${data.total === 1 ? '' : 's'}` : 'Manage registered users.'}
          </p>
        </div>
        <input
          className="input"
          style={{ maxWidth: 280 }}
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {data === null ? (
        <Loading />
      ) : data.users.length === 0 ? (
        <div className="card empty-state">
          <div className="icon">👥</div>
          <p>No users found.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Level</th>
                <th>Quizzes</th>
                <th>Total Points</th>
                <th>Streak</th>
                <th>Joined</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="avatar" style={{ width: 30, height: 30, fontSize: 12 }}>
                        {u.avatar || u.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                      </span>
                      <div>
                        <div style={{ fontWeight: 600 }}>{u.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {u.is_admin ? (
                      <span className="badge badge-primary">Admin</span>
                    ) : (
                      <span className="badge badge-dim">User</span>
                    )}
                  </td>
                  <td>
                    <span className="level-badge">Lv {u.level ?? 1}</span>
                    <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 3 }}>⚡ {u.xp ?? 0} XP</div>
                  </td>
                  <td>{u.attempts_count}</td>
                  <td style={{ color: 'var(--warning)' }}>{u.total_points}</td>
                  <td>
                    <span style={{ fontSize: 13 }}>🔥 {u.current_streak ?? 0}</span>
                    <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>best {u.max_streak ?? 0}</div>
                  </td>
                  <td style={{ color: 'var(--text-dim)' }}>{formatDate(u.created_at)}</td>
                  <td>
                    <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => toggleAdmin(u)}>
                        {u.is_admin ? 'Remove admin' : 'Make admin'}
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => { setConfirmId(u.id); setConfirmName(u.name); }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.pages > 1 && (
        <div className="pagination">
          <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
          <span>Page {data.page} / {data.pages}</span>
          <button className="btn btn-outline btn-sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next →</button>
        </div>
      )}

      {confirmId && (
        <div className="modal-backdrop" onClick={() => setConfirmId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <h3>Delete User?</h3>
            <p className="confirm-text">
              <b>{confirmName}</b> and all their quiz records will be permanently deleted.
            </p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setConfirmId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={doDelete}>Yes, delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
