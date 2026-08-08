import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import Loading from '../components/Loading';

const OPTION_KEYS = ['A', 'B', 'C', 'D'];

const emptyQuestion = {
  subject_id: '',
  question: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct: 0,
  points: 1,
  time_limit: 20,
  difficulty: 'medium',
  explanation: '',
};

export default function Questions() {
  const { push } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [subjects, setSubjects] = useState([]);
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [subjectId, setSubjectId] = useState(searchParams.get('subjectId') || '');
  const [difficulty, setDifficulty] = useState('all');

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyQuestion);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importSubject, setImportSubject] = useState('');
  const [importing, setImporting] = useState(false);

  const perPage = 15;

  useEffect(() => {
    api.get('/admin/subjects').then(setSubjects).catch(() => setSubjects([]));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({ page, perPage });
    if (search) params.set('search', search);
    if (subjectId) params.set('subjectId', subjectId);
    if (difficulty !== 'all') params.set('difficulty', difficulty);
    api.get(`/admin/questions?${params.toString()}`).then(setData).catch(() => setData({ questions: [], total: 0, pages: 1 }));
  }, [page, search, subjectId, difficulty]);

  useEffect(() => {
    if (subjectId) setSearchParams({ subjectId });
    else setSearchParams({});
  }, [subjectId, setSearchParams]);

  const openAdd = () => { setForm({ ...emptyQuestion, subject_id: subjectId || '' }); setModal('add'); };
  const openEdit = (q) => {
    setForm({
      subject_id: q.subject_id,
      question: q.question,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct: q.correct,
      points: q.points,
      time_limit: q.time_limit,
      difficulty: q.difficulty,
      explanation: q.explanation,
    });
    setModal('edit');
    setConfirmId(q.id);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.subject_id || !form.question) { push('Subject and question are required', 'error'); return; }
    setSaving(true);
    try {
      if (modal === 'add') {
        await api.post('/admin/questions', form);
        push('Question created', 'success');
      } else {
        await api.put(`/admin/questions/${confirmId}`, form);
        push('Question updated', 'success');
      }
      setModal(null);
      setPage(1);
      const params = new URLSearchParams({ page: 1, perPage });
      if (subjectId) params.set('subjectId', subjectId);
      setData(await api.get(`/admin/questions?${params.toString()}`));
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    try {
      await api.delete(`/admin/questions/${confirmId}`);
      push('Question deleted', 'success');
      setModal(null);
      const params = new URLSearchParams({ page, perPage });
      if (subjectId) params.set('subjectId', subjectId);
      setData(await api.get(`/admin/questions?${params.toString()}`));
    } catch (err) {
      push(err.message, 'error');
    }
  };

  const doImport = async () => {
    if (!importSubject) { push('Select a target subject', 'error'); return; }
    let parsed;
    try {
      parsed = JSON.parse(importText);
    } catch {
      push('Invalid JSON. Paste an array of question objects.', 'error');
      return;
    }
    if (!Array.isArray(parsed)) { push('JSON must be an array of questions.', 'error'); return; }
    setImporting(true);
    try {
      const res = await api.post('/admin/questions/import', { subject_id: Number(importSubject), questions: parsed });
      push(`Imported ${res.imported} questions${res.skipped ? `, skipped ${res.skipped}` : ''}`, 'success');
      setImportOpen(false);
      setImportText('');
      setPage(1);
      const params = new URLSearchParams({ page: 1, perPage });
      if (subjectId) params.set('subjectId', subjectId);
      setData(await api.get(`/admin/questions?${params.toString()}`));
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setImporting(false);
    }
  };

  const sampleJson = JSON.stringify([
    { question: 'What is 2 + 2?', option_a: '3', option_b: '4', option_c: '5', option_d: '6', correct: 1, points: 1, time_limit: 20, difficulty: 'easy', explanation: 'Two plus two equals four.' },
  ], null, 2);

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1>Questions</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: 13.5 }}>
            {data ? `${data.total} question${data.total === 1 ? '' : 's'} total` : 'Manage quiz questions.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => setImportOpen(true)}>📦 Bulk Import</button>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Question</button>
        </div>
      </div>

      <div className="toolbar">
        <div className="filters">
          <input
            className="input"
            style={{ maxWidth: 280 }}
            placeholder="Search questions…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <select
            className="input"
            style={{ maxWidth: 240 }}
            value={subjectId}
            onChange={(e) => { setSubjectId(e.target.value); setPage(1); }}
          >
            <option value="">All subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
            ))}
          </select>
          <select
            className="input"
            style={{ maxWidth: 150 }}
            value={difficulty}
            onChange={(e) => { setDifficulty(e.target.value); setPage(1); }}
          >
            <option value="all">All difficulty</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        {data && (
          <span style={{ color: 'var(--text-faint)', fontSize: 13 }}>
            Page {data.page} of {data.pages}
          </span>
        )}
      </div>

      {data === null ? (
        <Loading />
      ) : data.questions.length === 0 ? (
        <div className="card empty-state">
          <div className="icon">❓</div>
          <p>No questions found. Adjust filters or add a new question.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Question</th>
                <th>Difficulty</th>
                <th>Answer</th>
                <th>Pts</th>
                <th>Time</th>
                <th>Stats</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.questions.map((q) => {
                const acc = q.times_answered > 0 ? Math.round((q.times_correct / q.times_answered) * 100) : null;
                return (
                <tr key={q.id}>
                  <td>
                    <span className="badge badge-dim">{q.subject_icon} {q.subject_name}</span>
                  </td>
                  <td style={{ maxWidth: 340, minWidth: 200 }}>
                    <div style={{ fontWeight: 600 }}>{q.question}</div>
                    {q.explanation && (
                      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>
                        💡 {q.explanation}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 3 }}>
                      {OPTION_KEYS[0]}. {q.option_a} · {OPTION_KEYS[1]}. {q.option_b} · {OPTION_KEYS[2]}. {q.option_c} · {OPTION_KEYS[3]}. {q.option_d}
                    </div>
                  </td>
                  <td><span className={`difficulty-chip ${q.difficulty}`}><span className="dot"></span>{q.difficulty[0].toUpperCase() + q.difficulty.slice(1)}</span></td>
                  <td><span className="badge badge-success">{OPTION_KEYS[q.correct]}</span></td>
                  <td style={{ color: 'var(--warning)' }}>⭐ {q.points}</td>
                  <td>⏱ {q.time_limit}s</td>
                  <td>
                    <div style={{ fontSize: 12.5 }}>
                      <span style={{ color: 'var(--text-dim)' }}>{q.times_answered} plays</span>
                      <br />
                      {acc === null ? (
                        <span style={{ color: 'var(--text-faint)' }}>—</span>
                      ) : (
                        <span style={{ color: acc >= 70 ? 'var(--success)' : acc >= 40 ? 'var(--warning)' : 'var(--danger)', fontWeight: 700 }}>{acc}% correct</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(q)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => { setConfirmId(q.id); setModal('delete'); }}>Delete</button>
                    </div>
                  </td>
                </tr>
                );
              })}
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

      {modal && modal !== 'delete' && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{modal === 'add' ? 'Add Question' : 'Edit Question'}</h3>
            <form onSubmit={save}>
              <div className="form-group">
                <label className="label">Subject</label>
                <select className="input" value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })} required>
                  <option value="">Select subject…</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Question</label>
                <textarea className="input" rows={2} value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} required />
              </div>
              {OPTION_KEYS.map((k, i) => (
                <div key={k} className={`option-row ${form.correct === i ? 'correct' : ''}`}>
                  <span className="okey">{k}</span>
                  <input
                    className="input"
                    value={form[`option_${k.toLowerCase()}`]}
                    onChange={(e) => setForm({ ...form, [`option_${k.toLowerCase()}`]: e.target.value })}
                    placeholder={`Option ${k}`}
                    required
                  />
                </div>
              ))}
              <div className="row2" style={{ marginTop: 14 }}>
                <div className="form-group">
                  <label className="label">Correct answer</label>
                  <select className="input" value={form.correct} onChange={(e) => setForm({ ...form, correct: Number(e.target.value) })}>
                    {OPTION_KEYS.map((k, i) => <option key={k} value={i}>{k}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Points</label>
                  <input type="number" min={1} max={10} className="input" value={form.points} onChange={(e) => setForm({ ...form, points: Number(e.target.value) })} />
                </div>
              </div>
              <div className="row2">
                <div className="form-group">
                  <label className="label">Difficulty</label>
                  <select className="input" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Time limit (seconds)</label>
                  <input type="number" min={10} max={120} className="input" value={form.time_limit} onChange={(e) => setForm({ ...form, time_limit: Number(e.target.value) })} />
                </div>
              </div>
              <div className="form-group">
                <label className="label">Explanation (shown after answer)</label>
                <textarea className="input" rows={2} value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} placeholder="Why is this the right answer? (optional)"></textarea>
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
            <h3>Delete Question?</h3>
            <p className="confirm-text">This question will be permanently deleted.</p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={doDelete}>Yes, delete</button>
            </div>
          </div>
        </div>
      )}

      {importOpen && (
        <div className="modal-backdrop" onClick={() => setImportOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Bulk Import Questions</h3>
            <div className="form-group">
              <label className="label">Target subject</label>
              <select className="input" value={importSubject} onChange={(e) => setImportSubject(e.target.value)}>
                <option value="">Select subject…</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="label">JSON array of questions</label>
              <textarea
                className="input"
                rows={10}
                style={{ fontFamily: 'monospace', fontSize: 12.5 }}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={sampleJson}
              ></textarea>
            </div>
            <p style={{ color: 'var(--text-faint)', fontSize: 12.5, marginBottom: 14 }}>
              Fields: question, option_a, option_b, option_c, option_d, correct (0-3), points, time_limit, difficulty (easy/medium/hard), explanation
            </p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setImportOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={doImport} disabled={importing}>{importing ? 'Importing…' : 'Import'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
