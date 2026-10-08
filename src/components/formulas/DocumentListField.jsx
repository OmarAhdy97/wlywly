import React from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

export default function DocumentListField({ value = [], onChange, label = 'قائمة المستندات' }) {
  const items = Array.isArray(value) ? value : [];

  const renumber = (list) => list.map((item, i) => ({ ...item, number: i + 1 }));

  const handleAddItem = () => onChange([...items, { number: items.length + 1, title: '', date: '', notes: '' }]);
  const handleRemoveItem = (index) => onChange(renumber(items.filter((_, i) => i !== index)));
  const handleUpdateItem = (index, field, val) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: val };
    onChange(updated);
  };
  const handleMove = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const updated = [...items];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    onChange(renumber(updated));
  };

  return (
    <div className="doc-list">
      <div className="doc-list-head">
        <strong>{label} ({items.length})</strong>
        <button type="button" onClick={handleAddItem} className="btn btn-secondary btn-sm">
          <Plus size={15} />
          <span>إضافة مستند</span>
        </button>
      </div>

      {items.length === 0 ? (
        <p className="empty-line">لا توجد مستندات بعد. اضغط «إضافة مستند» لبدء الإدراج.</p>
      ) : (
        <div className="doc-list-rows">
          {items.map((item, index) => (
            <div key={index} className="doc-row">
              <span className="doc-num">{index + 1}</span>
              <input
                type="text"
                className="form-input"
                placeholder="مضمون المستند (أصل التوكيل الرسمي)"
                value={item.title || ''}
                onChange={(e) => handleUpdateItem(index, 'title', e.target.value)}
              />
              <input
                type="text"
                className="form-input"
                placeholder="تاريخ المستند"
                value={item.date || ''}
                onChange={(e) => handleUpdateItem(index, 'date', e.target.value)}
              />
              <input
                type="text"
                className="form-input"
                placeholder="وجه الدلالة (سند الوكالة، إثبات الدين)"
                value={item.notes || ''}
                onChange={(e) => handleUpdateItem(index, 'notes', e.target.value)}
              />
              <div className="doc-controls">
                <button type="button" title="تحريك لأعلى" aria-label="تحريك لأعلى" disabled={index === 0} onClick={() => handleMove(index, -1)} className="icon-btn">
                  <ArrowUp size={14} />
                </button>
                <button type="button" title="تحريك لأسفل" aria-label="تحريك لأسفل" disabled={index === items.length - 1} onClick={() => handleMove(index, 1)} className="icon-btn">
                  <ArrowDown size={14} />
                </button>
                <button type="button" title="حذف المستند" aria-label="حذف المستند" onClick={() => handleRemoveItem(index)} className="icon-btn is-danger">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
