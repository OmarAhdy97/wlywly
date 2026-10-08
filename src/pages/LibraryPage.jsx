import React, { useEffect, useMemo, useState, useDeferredValue } from 'react';
import { Search, Scale, Star, ExternalLink, Copy, Check, X, Landmark, BookMarked, Filter } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  loadSccDataset,
  searchRulings,
  highlightParts,
  buildCitation,
  OUTCOMES,
} from '../lib/sccLibrary';
import Select from '../components/common/Select';

const PAGE = 30;

const OUTCOME_TABS = [
  { id: 'all', label: 'الكل' },
  { id: 'unconstitutional', label: 'عدم دستورية' },
  { id: 'rejected', label: 'رفض الدعوى' },
  { id: 'inadmissible', label: 'عدم قبول' },
  { id: 'procedural', label: 'إجرائي' },
];

const fmtDate = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

function Marked({ text, query }) {
  return highlightParts(text, query).map((p, i) =>
    p.hit ? <mark key={i} className="lib-mark">{p.text}</mark> : <React.Fragment key={i}>{p.text}</React.Fragment>
  );
}

export default function LibraryPage() {
  const { user } = useAuth();
  const savedKey = `scc_saved_${user?.id || 'guest'}`;

  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [outcome, setOutcome] = useState('all');
  const [type, setType] = useState('all');
  const [court, setCourt] = useState('all');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [view, setView] = useState('all'); // all | saved
  const [shown, setShown] = useState(PAGE);
  const [selected, setSelected] = useState(null);
  const [copied, setCopied] = useState('');
  const [saved, setSaved] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(savedKey) || '[]')); } catch { return new Set(); }
  });

  useEffect(() => {
    let alive = true;
    loadSccDataset().then(d => alive && setData(d)).catch(e => alive && setError(e.message));
    return () => { alive = false; };
  }, []);

  useEffect(() => { setShown(PAGE); }, [deferredQuery, outcome, type, court, yearFrom, yearTo, view]);

  const persistSaved = (next) => {
    setSaved(next);
    try { localStorage.setItem(savedKey, JSON.stringify([...next])); } catch { /* storage unavailable */ }
  };
  const toggleSaved = (id) => {
    const next = new Set(saved);
    if (next.has(id)) next.delete(id); else next.add(id);
    persistSaved(next);
  };

  const results = useMemo(() => {
    if (!data) return [];
    return searchRulings(data.items, {
      query: deferredQuery,
      outcome,
      type,
      court,
      yearFrom: yearFrom ? Number(yearFrom) : null,
      yearTo: yearTo ? Number(yearTo) : null,
      onlyIds: view === 'saved' ? saved : null,
    });
  }, [data, deferredQuery, outcome, type, court, yearFrom, yearTo, view, saved]);

  const years = useMemo(() => {
    if (!data) return [];
    const { minYear, maxYear } = data.meta;
    return Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i);
  }, [data]);

  const copy = async (kind, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(''), 1800);
    } catch { /* clipboard blocked */ }
  };

  const reset = () => { setQuery(''); setOutcome('all'); setType('all'); setCourt('all'); setYearFrom(''); setYearTo(''); };
  const hasFilters = query || outcome !== 'all' || type !== 'all' || court !== 'all' || yearFrom || yearTo;

  return (
    <div className="page-wrapper">
      <div className="page-head">
        <div>
          <h1>أحكام المحكمة الدستورية العليا</h1>
        </div>
        <div className="page-head-actions">
          <div className="seg-tabs">
            <button type="button" className={`seg-tab ${view === 'all' ? 'is-active' : ''}`} onClick={() => setView('all')}>
              <Landmark size={14} /> كل الأحكام
            </button>
            <button type="button" className={`seg-tab ${view === 'saved' ? 'is-active' : ''}`} onClick={() => setView('saved')}>
              <Star size={14} /> المحفوظة <span className="seg-count">{saved.size}</span>
            </button>
          </div>
        </div>
      </div>

      {error && <div className="sd-alert sd-alert-danger">{error}</div>}

      <div className="lib-search card">
        <div className="fin-search page-search lib-search-box">
          <Search size={16} />
          <input
            type="search"
            className="form-input"
            placeholder="ابحث بكلمة أو مادة أو قانون: مثال «الحبس الاحتياطي» أو «المادة 78 التأمينات» أو «رقم الدعوى»..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="lib-filters">
          <div className="seg-tabs">
            {OUTCOME_TABS.map(t => (
              <button key={t.id} type="button" className={`seg-tab ${outcome === t.id ? 'is-active' : ''}`} onClick={() => setOutcome(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="lib-selects">
            <Select className="form-select" value={type} onChange={(e) => setType(e.target.value)} aria-label="نوع الدعوى">
              <option value="all">كل أنواع الدعاوى</option>
              <option value="دستورية">دستورية</option>
              <option value="تنازع">تنازع</option>
              <option value="تفسير">تفسير تشريعي</option>
            </Select>
            <Select className="form-select" value={court} onChange={(e) => setCourt(e.target.value)} aria-label="المحكمة">
              <option value="all">كل المحاكم</option>
              <option value="scc">المحكمة الدستورية العليا</option>
              <option value="high">المحكمة العليا (1970–1979)</option>
            </Select>
            <Select className="form-select" value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} aria-label="من سنة">
              <option value="">من سنة</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </Select>
            <Select className="form-select" value={yearTo} onChange={(e) => setYearTo(e.target.value)} aria-label="إلى سنة">
              <option value="">إلى سنة</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </Select>
            {hasFilters && (
              <button type="button" className="btn btn-secondary" onClick={reset}><X size={14} /> مسح</button>
            )}
          </div>
        </div>
      </div>

      {!data && !error && <div className="card dash-empty"><Scale size={28} /><b>جارٍ تحميل مكتبة الأحكام...</b></div>}

      {data && (
        <>
          <div className="lib-count">
            <b>{results.length.toLocaleString('ar-EG')}</b> حكم
            {view === 'saved' ? ' محفوظ' : ''}
            <span className="cell-sub"> من أصل {data.items.length.toLocaleString('ar-EG')}</span>
          </div>

          {results.length === 0 ? (
            <div className="card dash-empty">
              <Filter size={28} />
              <b>{view === 'saved' ? 'لم تحفظ أي حكم بعد — اضغط النجمة على أي حكم لحفظه' : 'لا توجد أحكام مطابقة. جرّب كلمات أقل أو امسح الفلاتر.'}</b>
            </div>
          ) : (
            <ul className="lib-list">
              {results.slice(0, shown).map(it => {
                const oc = OUTCOMES[it.oc] || OUTCOMES.other;
                return (
                  <li key={it.id} className="card lib-item">
                    <div className="lib-item-top">
                      <button type="button" className="lib-item-title" onClick={() => setSelected(it)}>
                        <Marked text={it.ci || `الدعوى رقم ${it.n} لسنة ${it.y}`} query={deferredQuery} />
                      </button>
                      <button
                        type="button"
                        className={`icon-btn ${saved.has(it.id) ? 'is-primary' : ''}`}
                        title={saved.has(it.id) ? 'إزالة من المحفوظات' : 'حفظ الحكم'}
                        aria-label="حفظ الحكم"
                        onClick={() => toggleSaved(it.id)}
                      >
                        <Star size={16} strokeWidth={1.9} fill={saved.has(it.id) ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                    <div className="lib-meta">
                      <span className={`badge lib-oc is-${oc.tone}`}>{oc.label}</span>
                      <span className="cell-sub">جلسة {fmtDate(it.d)}</span>
                      {it.c === 'high' && <span className="cell-sub">المحكمة العليا</span>}
                    </div>
                    {it.s && <p className="lib-subject"><Marked text={it.s} query={deferredQuery} /></p>}
                    {it.w && <p className="lib-ruling"><b>المنطوق:</b> <Marked text={it.w} query={deferredQuery} /></p>}
                    {it.law && <p className="cell-sub lib-law"><BookMarked size={13} /> <Marked text={it.law} query={deferredQuery} /></p>}
                    <button type="button" className="dash-link" onClick={() => setSelected(it)}>التفاصيل والإشارة</button>
                  </li>
                );
              })}
            </ul>
          )}

          {results.length > shown && (
            <div className="lib-more">
              <button type="button" className="btn btn-secondary" onClick={() => setShown(s => s + PAGE)}>
                عرض المزيد ({(results.length - shown).toLocaleString('ar-EG')} متبقي)
              </button>
            </div>
          )}

          <p className="lib-source">
            المصدر: {data.meta.source}. آخر تحديث للبيانات: {data.meta.fetchedAt}. للاستشهاد الرسمي ارجع دائمًا إلى النص المنشور بالجريدة الرسمية أو بموقع المحكمة.
          </p>
        </>
      )}

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal-dialog lib-dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="fin-header-main">
                <div className="fin-header-icon"><Scale size={20} /></div>
                <div className="fin-header-text">
                  <h3>{selected.ci || `الدعوى رقم ${selected.n} لسنة ${selected.y}`}</h3>
                  <div className="fin-header-sub">جلسة {fmtDate(selected.d)} · {(OUTCOMES[selected.oc] || OUTCOMES.other).label}</div>
                </div>
              </div>
              <button type="button" className="btn btn-secondary btn-icon" onClick={() => setSelected(null)} aria-label="إغلاق"><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="lib-cite">
                <span className="cell-sub">الإشارة للمذكرات</span>
                <p>{buildCitation(selected)}</p>
                <button type="button" className="btn btn-secondary" onClick={() => copy('cite', buildCitation(selected))}>
                  {copied === 'cite' ? <Check size={15} /> : <Copy size={15} />}
                  <span>{copied === 'cite' ? 'تم النسخ' : 'نسخ الإشارة'}</span>
                </button>
              </div>

              <dl className="client-facts">
                <div><dt>نوع الدعوى</dt><dd>{selected.t || '—'}</dd></div>
                <div><dt>تاريخ الحكم</dt><dd>{fmtDate(selected.d)}</dd></div>
                <div><dt>المحكمة</dt><dd>{selected.c === 'high' ? 'المحكمة العليا' : 'المحكمة الدستورية العليا'}</dd></div>
              </dl>

              {selected.s && <><h4 className="client-section-title">موضوع الدعوى</h4><p className="lib-text">{selected.s}</p></>}
              {selected.rq && selected.rq !== selected.s && <><h4 className="client-section-title">الطلبات</h4><p className="lib-text">{selected.rq}</p></>}
              {selected.w && <><h4 className="client-section-title">منطوق الحكم</h4><p className="lib-text">{selected.w}</p></>}
              {selected.law && <><h4 className="client-section-title">التشريع محل الدعوى</h4><p className="lib-text">{selected.law}</p></>}
              {selected.kw && <><h4 className="client-section-title">كلمات دالة</h4><p className="lib-text">{selected.kw}</p></>}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => toggleSaved(selected.id)}>
                <Star size={15} fill={saved.has(selected.id) ? 'currentColor' : 'none'} />
                <span>{saved.has(selected.id) ? 'إزالة من المحفوظات' : 'حفظ'}</span>
              </button>
              {selected.u && (
                <a className="btn btn-primary" href={selected.u} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={15} />
                  <span>النص الكامل على موقع المحكمة</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
