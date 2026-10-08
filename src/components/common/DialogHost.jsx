import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { subscribeDialogs } from '../../lib/dialog';

const TOAST_ICON = { success: CheckCircle2, error: XCircle, warn: AlertTriangle, info: Info };

export default function DialogHost() {
  const [confirms, setConfirms] = useState([]);
  const [toasts, setToasts] = useState([]);
  const confirmBtn = useRef(null);

  useEffect(() => subscribeDialogs((item) => {
    if (item.kind === 'confirm') setConfirms((q) => [...q, item]);
    else {
      setToasts((q) => [...q, item]);
      const ttl = Math.min(9000, 3500 + item.message.length * 40);
      setTimeout(() => setToasts((q) => q.filter((t) => t.id !== item.id)), ttl);
    }
  }), []);

  const current = confirms[0];

  useEffect(() => {
    if (!current) return undefined;
    confirmBtn.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') close(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function close(result) {
    if (!current) return;
    current.resolve(result);
    setConfirms((q) => q.slice(1));
  }

  return (
    <>
      {current && (
        <div className="modal-backdrop confirm-host-backdrop" onClick={() => close(false)}>
          <div className="modal-dialog confirm-host" role="alertdialog" aria-modal="true" aria-labelledby="confirm-host-title" onClick={(e) => e.stopPropagation()}>
            <div className={`confirm-host-icon ${current.danger ? 'is-danger' : ''}`}>
              <AlertTriangle size={22} />
            </div>
            <h3 id="confirm-host-title">{current.title || (current.danger ? 'تأكيد الحذف' : 'تأكيد')}</h3>
            <p>{current.message}</p>
            <div className="confirm-host-actions">
              <button type="button" className="btn btn-secondary" onClick={() => close(false)}>{current.cancelLabel}</button>
              <button ref={confirmBtn} type="button" className={`btn ${current.danger ? 'btn-danger-solid' : 'btn-primary'}`} onClick={() => close(true)}>
                {current.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => {
          const Icon = TOAST_ICON[t.tone] || Info;
          return (
            <div key={t.id} className={`toast is-${t.tone}`} role={t.tone === 'error' ? 'alert' : 'status'}>
              <Icon size={18} />
              <span>{t.message}</span>
              <button type="button" className="toast-close" aria-label="إغلاق" onClick={() => setToasts((q) => q.filter((x) => x.id !== t.id))}>
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
