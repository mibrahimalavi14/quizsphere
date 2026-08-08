import { useEffect, useState } from 'react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import Loading from '../components/Loading';

function formatDate(d) {
  const date = new Date(d + (d.includes('T') ? '' : 'Z'));
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Announcements() {
  const { push } = useToast();
  const [list, setList] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ title: '', body: '', is_active: 1 });
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  const load = () => api.get('/admin/announcements').then(setList).catch(() => setList([]));

  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm({ title: '', body: '', is_active: 1 }); setModal('add'); };
  const openEdit = (a) => { setForm({ title: a.title, body: a.body, is_active: a.is_active }); setModal('edit'); setConfirmId(a.id); };

  const save = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { push('Title is required', 'error'); return; }
    setSaving(true);
    try {
      if (modal === 'add') {
        await api.post('/admin/announcements', form);
        push('Announcement created', 'success');
      } else {
        await api.put(`/admin/announcements/${confirmId}`, form);
        push('Announcement updated', 'success');
      }
      setModal(null);
      await load();
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (a) => {
    try {
      await api.put(`/admin/announcements/${a.id}`, { is_active: a.is_active ? 0 : 1 });
      await load();
    } catch (err) {
      push(err.message, 'error');
    }
  };

  const doDelete = async () => {
    try {
      await api.delete(`/admin/announcements/${confirmId}`);
      push('Announcement deleted', 'success');
      setModal(null);
      await load();
    } catch (err) {
      push(err.message, 'error');
    }
  };

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1>Announcements</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: 13.5 }}>
            Shown as a banner on the public site home page.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ New Announcement</button>
      </div>

      {list === null ? (
        <Loading />
      ) : list.length === 0 ? (
        <div className="card empty-state">
          <div className="icon">📢</div>
          <p>No announcements yet. Create one to broadcast to all players.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Title</th>
                  <th>Body</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <button
                        className={`btn btn-sm ${a.is_active ? 'btn-success' : 'btn-outline'}`}
                        onClick={() => toggle(a)}
                        title="Click to toggle visibility"
                      >
                        {a.is_active ? '● Live' : '○ Hidden'}
                      </button>
                    </td>
                    <td><b>{a.title}</b></td>
                    <td style={{ color: 'var(--text-dim)', maxWidth: 360 }}>{a.body || '—'}</td>
                    <td style={{ color: 'var(--text-dim)' }}>{formatDate(a.created_at)}</td>
                    <td>
                      <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(a)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => { setConfirmId(a.id); setModal('delete'); }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && modal !== 'delete' && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <h3>{modal === 'add' ? 'New Announcement' : 'Edit Announcement'}</h3>
            <form onSubmit={save}>
              <div className="form-group">
                <label className="label">Title</label>
                <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. New Science quiz added!" required />
              </div>
              <div className="form-group">
                <label className="label">Body (optional)</label>
                <textarea className="input" rows={3} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Additional details…"></textarea>
              </div>
              <div className="form-group">
                <label className="label">Status</label>
                <select className="input" value={form.is_active} onChange={(e) => setForm({ ...form, is_active: Number(e.target.value) })}>
                  <option value={1}>Active (visible on site)</option>
                  <option value={0}>Hidden (draft)</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === 'delete' && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <h3>Delete Announcement?</h3>
            <p className="confirm-text">This announcement will be permanently removed.</p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={doDelete}>Yes, delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
