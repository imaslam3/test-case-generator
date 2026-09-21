import { useState } from 'react';

const CATEGORIES = ['positive', 'negative', 'edge_case', 'validation'];

function EditForm({ testCase, onSave, onCancel }) {
  const [title, setTitle] = useState(testCase.title);
  const [category, setCategory] = useState(testCase.category);
  const [preconditions, setPreconditions] = useState(testCase.preconditions || '');
  const [steps, setSteps] = useState(testCase.steps.join('\n'));
  const [expectedResult, setExpectedResult] = useState(testCase.expectedResult || '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(testCase.id, {
        title: title.trim(),
        category,
        preconditions: preconditions.trim(),
        steps: steps.split('\n').map((s) => s.trim()).filter(Boolean),
        expectedResult: expectedResult.trim(),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="tc-edit-form">
      <label>
        Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label>
        Category
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      <label>
        Preconditions
        <textarea rows={2} value={preconditions} onChange={(e) => setPreconditions(e.target.value)} />
      </label>
      <label>
        Steps (one per line)
        <textarea rows={4} value={steps} onChange={(e) => setSteps(e.target.value)} />
      </label>
      <label>
        Expected result
        <textarea rows={2} value={expectedResult} onChange={(e) => setExpectedResult(e.target.value)} />
      </label>
      <div className="tc-edit-form__actions">
        <button type="button" onClick={handleSave} disabled={saving || !title.trim()}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className="secondary" onClick={onCancel} disabled={saving}>Cancel</button>
      </div>
    </div>
  );
}

export default function TestCaseReviewList({ testCases, onBulkStatus, onEditSave }) {
  const [selected, setSelected] = useState(new Set());
  const [editingId, setEditingId] = useState(null);

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const approvedCount = testCases.filter((tc) => tc.status === 'approved').length;

  return (
    <div className="review-list">
      <div className="review-list__header">
        <h3>Generated Testcases ({testCases.length})</h3>
        <span className="muted">{approvedCount} / {testCases.length} approved</span>
      </div>

      <div className="review-list__items">
        {testCases.map((tc) => (
          <div className={`review-item review-item--${tc.status}`} key={tc.id}>
            {editingId === tc.id ? (
              <EditForm
                testCase={tc}
                onCancel={() => setEditingId(null)}
                onSave={async (id, payload) => {
                  await onEditSave(id, payload);
                  setEditingId(null);
                }}
              />
            ) : (
              <>
                <input type="checkbox" checked={selected.has(tc.id)} onChange={() => toggle(tc.id)} />
                <div className="review-item__body">
                  <p className="review-item__primary">{tc.title}</p>
                  <span className="explicit-tag">{tc.category.replace('_', ' ')}</span>
                  {tc.expectedResult && <p className="review-item__secondary muted">Expected: {tc.expectedResult}</p>}
                  {tc.steps.length > 0 && (
                    <ol className="tc-steps-preview">
                      {tc.steps.map((s, i) => <li key={i}>{s}</li>)}
                    </ol>
                  )}
                  <div className="review-item__row">
                    <span className={`status-pill status-pill--${tc.status}`}>{tc.status}</span>
                    <button type="button" className="link-btn" onClick={() => setEditingId(tc.id)}>Edit</button>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="review-list__toolbar">
        <button type="button" onClick={() => onBulkStatus(testCases.map((t) => t.id), 'approved')}>
          Approve all & continue
        </button>
        {selected.size > 0 && (
          <>
            <button type="button" className="secondary" onClick={() => { onBulkStatus([...selected], 'approved'); setSelected(new Set()); }}>
              Approve selected ({selected.size})
            </button>
            <button type="button" className="danger" onClick={() => { onBulkStatus([...selected], 'rejected'); setSelected(new Set()); }}>
              Reject selected
            </button>
          </>
        )}
      </div>
    </div>
  );
}
