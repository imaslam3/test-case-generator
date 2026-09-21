import { useState } from 'react';

export default function ReviewList({ title, items, onBulkStatus, onMarkExplicit, renderMeta }) {
  const [selected, setSelected] = useState(new Set());

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function approveAll() {
    onBulkStatus(items.map((i) => i.id), 'approved');
    setSelected(new Set());
  }

  function approveSelected() {
    onBulkStatus([...selected], 'approved');
    setSelected(new Set());
  }

  function rejectSelected() {
    onBulkStatus([...selected], 'rejected');
    setSelected(new Set());
  }

  const approvedCount = items.filter((i) => i.status === 'approved').length;

  return (
    <div className="review-list">
      <div className="review-list__header">
        <h3>{title} ({items.length})</h3>
        <span className="muted">{approvedCount} / {items.length} approved</span>
      </div>

      <div className="review-list__items">
        {items.map((item) => (
          <div className={`review-item review-item--${item.status}`} key={item.id}>
            <input
              type="checkbox"
              checked={selected.has(item.id)}
              onChange={() => toggle(item.id)}
            />
            <div className="review-item__body">
              <p className="review-item__primary">{item.primary}</p>
              {item.secondary && <p className="review-item__secondary muted">{item.secondary}</p>}
              {renderMeta ? renderMeta(item) : null}
              <span className={`status-pill status-pill--${item.status}`}>{item.status}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="review-list__toolbar">
        <button type="button" onClick={approveAll} disabled={items.length === 0}>Approve all &amp; continue</button>
        {selected.size > 0 && (
          <>
            <button type="button" className="secondary" onClick={approveSelected}>Approve selected ({selected.size})</button>
            <button type="button" className="danger" onClick={rejectSelected}>Reject selected</button>
            {onMarkExplicit && (
              <button type="button" className="secondary" onClick={() => { onMarkExplicit([...selected]); setSelected(new Set()); }}>
                Mark as explicit
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
