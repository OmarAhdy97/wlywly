import React from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, FileText } from 'lucide-react';

export default function DocumentListField({ value = [], onChange, label = 'قائمة المستندات' }) {
  const items = Array.isArray(value) ? value : [];

  const handleAddItem = () => {
    const newItem = {
      number: items.length + 1,
      title: '',
      date: '',
      notes: ''
    };
    onChange([...items, newItem]);
  };

  const handleRemoveItem = (index) => {
    const updated = items.filter((_, i) => i !== index).map((item, i) => ({
      ...item,
      number: i + 1
    }));
    onChange(updated);
  };

  const handleUpdateItem = (index, field, val) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      [field]: val
    };
    onChange(updated);
  };

  const handleMove = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const updated = [...items];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    // re-number
    const renumbered = updated.map((item, i) => ({ ...item, number: i + 1 }));
    onChange(renumbered);
  };

  return (
    <div style={{
      background: 'var(--bg-card-subtle, rgba(0,0,0,0.02))',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-md, 8px)',
      padding: '1rem',
      marginBottom: '1rem'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.85rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
          <FileText size={18} style={{ color: 'var(--accent-gold)' }} />
          <span>{label} ({items.length} مستند)</span>
        </div>
        <button
          type="button"
          onClick={handleAddItem}
          className="btn btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem' }}
        >
          <Plus size={16} />
          <span>إضافة مستند جديد</span>
        </button>
      </div>

      {items.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '1.5rem',
          color: 'var(--text-muted)',
          border: '1px dashed var(--border-color)',
          borderRadius: '6px'
        }}>
          لا توجد مستندات مسجلة بالحافظة حتى الآن. اضغط "إضافة مستند جديد" لبدء الإدراج.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {items.map((item, index) => (
            <div
              key={index}
              style={{
                display: 'grid',
                gridTemplateColumns: '40px 2fr 1.2fr 1.5fr auto',
                gap: '0.5rem',
                alignItems: 'center',
                background: 'var(--bg-card, #fff)',
                border: '1px solid var(--border-color)',
                padding: '0.6rem 0.75rem',
                borderRadius: '6px'
              }}
            >
              {/* Number */}
              <div style={{
                fontWeight: 'bold',
                textAlign: 'center',
                background: 'var(--bg-app)',
                borderRadius: '4px',
                padding: '0.4rem 0',
                fontSize: '0.85rem'
              }}>
                {index + 1}
              </div>

              {/* Title */}
              <div>
                <input
                  type="text"
                  placeholder="مضمون المستند (مثال: أصل التوكيل الرسمي)"
                  value={item.title || ''}
                  onChange={(e) => handleUpdateItem(index, 'title', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.65rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              {/* Date */}
              <div>
                <input
                  type="text"
                  placeholder="تاريخ المستند (اختياري)"
                  value={item.date || ''}
                  onChange={(e) => handleUpdateItem(index, 'date', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.65rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              {/* Notes / Legal Significance */}
              <div>
                <input
                  type="text"
                  placeholder="وجه الدلالة (مثال: سند الوكالة / إثبات الدين)"
                  value={item.notes || ''}
                  onChange={(e) => handleUpdateItem(index, 'notes', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.65rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button
                  type="button"
                  title="تحريك لأعلى"
                  disabled={index === 0}
                  onClick={() => handleMove(index, -1)}
                  className="btn btn-secondary btn-icon"
                  style={{ width: '28px', height: '28px', padding: 0 }}
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  title="تحريك لأسفل"
                  disabled={index === items.length - 1}
                  onClick={() => handleMove(index, 1)}
                  className="btn btn-secondary btn-icon"
                  style={{ width: '28px', height: '28px', padding: 0 }}
                >
                  <ArrowDown size={14} />
                </button>
                <button
                  type="button"
                  title="حذف المستند"
                  onClick={() => handleRemoveItem(index)}
                  className="btn btn-danger btn-icon"
                  style={{ width: '28px', height: '28px', padding: 0 }}
                >
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
