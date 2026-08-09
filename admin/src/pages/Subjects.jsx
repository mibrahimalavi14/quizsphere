import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import Loading from '../components/Loading';

const COLORS = ['#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#0ea5e9', '#14b8a6'];
const ICONS = ['📘', '🌍', '🔬', '➗', '💻', '🏛️', '📖', '🗺️', '🎨', '🎵', '⚗️', '💰', '🏀', '🚀', '🧮', '⚙️'];
const RANKS = [
  { key: 'bronze', name: 'Bronze', icon: '🥉' },
  { key: 'silver', name: 'Silver', icon: '🥈' },
  { key: 'gold', name: 'Gold', icon: '🥇' },
  { key: 'platinum', name: 'Platinum', icon: '💠' },
  { key: 'diamond', name: 'Diamond', icon: '💎' },
  { key: 'master', name: 'Master', icon: '🏆' },
  { key: 'grandmaster', name: 'Grandmaster', icon: '👑' },
  { key: 'legend', name: 'Legend', icon: '🌟' },
];

const empty = { name: '', description: '', icon: ICONS[0], color: COLORS[0], is_visible: 1, min_rank: 'bronze' };

export default function Subjects() {
  const { push } = useToast();
  const [subjects, setSubjects] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [confirmName, setConfirmName] = useState('');

  const load = () => api.get('/admin/subjects').then(setSubjects).catch(() => setSubjects([]));
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(empty); setModal('add'); };
  const openEdit = (s) => { setForm({ name: s.name, description: s.description, icon: s.icon, color: s.color, is_visible: s.is_visible, min_rank: s.min_rank || 'bronze' }); setModal('edit'); setConfirmId(s.id); };

  const toggleVisible = async (s) => {
    try {
      await api.put(`/admin/subjects/${s.id}`, { is_visible: s.is_visible ? 0 : 1 });
      load();
    } catch (err) {
      push(err.message, 'error');
    }
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { push('Subject name is required', 'error'); return; }
    setSaving(true);
    try {
      if (modal === 'add') {
        await api.post('/admin/subjects', form);
        push('Subject created', 'success');
      } else {
        await api.put(`/admin/subjects/${confirmId}`, form);
        push('Subject updated', 'success');
      }
      setModal(null);
      load();
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    try {
      await api.delete(`/admin/subjects/${confirmId}`);
      push('Subject deleted', 'success');
      setModal(null);
      setConfirmId(null);
      load();
    } catch (err) {
      push(err.message, 'error');
    }
  };

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1>Subjects</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: 13.5 }}>Manage quiz subjects.</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Subject</button>
      </div>

      {subjects === null ? (
        <Loading />
      ) : subjects.length === 0 ? (
        <div className="card empty-state">
          <div className="icon">🗂️</div>
          <p>No subjects yet. Create your first subject.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Icon</th>
                <th>Name</th>
                <th>Description</th>
                <th>Questions</th>
                <th>Required Rank</th>
                <th>Status</th>
                <th>Color</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontSize: 22 }}>{s.icon}</td>
                  <td><b>{s.name}</b></td>
                  <td style={{ color: 'var(--text-dim)', maxWidth: 320 }}>{s.description}</td>
                  <td><span className="badge badge-primary">{s.question_count}</span></td>
                  <td>
                    <span className="badge badge-dim">
                      {RANKS.find((r) => r.key === s.min_rank)?.icon} {RANKS.find((r) => r.key === s.min_rank)?.name || s.min_rank}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`btn btn-sm ${s.is_visible ? 'btn-success' : 'btn-outline'}`}
                      onClick={() => toggleVisible(s)}
                      title="Toggle visibility on the public site"
                    >
                      {s.is_visible ? '● Visible' : '○ Hidden'}
                    </button>
                  </td>
                  <td><span style={{ display: 'inline-block', width: 22, height: 22, borderRadius: 6, background: s.color }}></span></td>
                  <td>
                    <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                      <Link to={`/questions?subjectId=${s.id}`} className="btn btn-ghost btn-sm">Questions</Link>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(s)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => { setConfirmId(s.id); setConfirmName(s.name); setModal('delete'); }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && modal !== 'delete' && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{modal === 'add' ? 'Add Subject' : 'Edit Subject'}</h3>
            <form onSubmit={save}>
              <div className="form-group">
                <label className="label">Name</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mathematics" required />
              </div>
              <div className="form-group">
                <label className="label">Description</label>
                <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short description"></textarea>
              </div>
              <div className="form-group">
                <label className="label">Icon</label>
                <div className="color-picker">
                  {ICONS.map((ic) => (
                    <button type="button" key={ic} className="swatch" style={{ display: 'grid', placeItems: 'center', fontSize: 18, background: 'var(--bg-card-2)' }} onClick={() => setForm({ ...form, icon: ic })}>{ic}</button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="label">Accent Color</label>
                <div className="color-picker">
                  {COLORS.map((c) => (
                    <button type="button" key={c} className={`swatch ${form.color === c ? 'active' : ''}`} style={{ background: c }} onClick={() => setForm({ ...form, color: c })}></button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="label">Visibility</label>
                <select className="input" value={form.is_visible} onChange={(e) => setForm({ ...form, is_visible: Number(e.target.value) })}>
                  <option value={1}>Visible on the public site</option>
                  <option value={0}>Hidden (used by special modes)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="label">Required Rank (min level to play)</label>
                <select className="input" value={form.min_rank} onChange={(e) => setForm({ ...form, min_rank: e.target.value })}>
                  {RANKS.map((r) => (
                    <option key={r.key} value={r.key}>{r.icon} {r.name}</option>
                  ))}
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
            <h3>Delete Subject?</h3>
            <p className="confirm-text">
              This will permanently delete <b>{confirmName}</b> and all its questions. This cannot be undone.
            </p>
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
