import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { CASE_STATUSES, CASE_TYPES } from '../../lib/supabase';
import { formatMoney, getTransactionMeta, isDebitTransaction } from '../../lib/financialCalculations';
import { ADMIN_TASK_STATUSES } from '../common/AdministrativeTaskUpdateModal';
import { buildTimeline, CaseTimeline, fmtDate } from './CaseTimeline';
import TaskHistory from './TaskHistory';
import ExpandList from './ExpandList';

const short = { day: 'numeric', month: 'short', year: 'numeric' };
const caseOwner = (c) => (c.next_steps ? c.next_steps.replace('assigned:', '') : null);

/*
 * The file of a client or a team member: who they are, everything linked to them,
 * and the history of each linked case or task, in one dialog.
 * kind: 'client' | 'member'
 */
export default function PersonFileDialog({ kind, person, onClose, facts = [], actions = null }) {
  const { cases = [], sessions, appeals, adminTasks = [], adminTaskUpdates, bailiffTasks = [], transactions = [] } = useData();
  const [tab, setTab] = useState('activity');

  const linked = useMemo(() => {
    const isClient = kind === 'client';
    const myCases = cases.filter((c) => (isClient ? c.client_id === person.id : caseOwner(c) === person.id));
    const caseIds = new Set(myCases.map((c) => c.id));
    const myTasks = adminTasks.filter((t) => (isClient
      ? caseIds.has(t.case_id) || (t.client_name && t.client_name === person.name)
      : t.assigned_to === person.id));
    const myBailiffs = bailiffTasks.filter((b) => (isClient
      ? (b.client_name && b.client_name === person.name) || caseIds.has(b.case_id)
      : b.assigned_to === person.id));
    const myTx = isClient ? transactions.filter((t) => String(t.client_id) === String(person.id)) : [];
    return { myCases, myTasks, myBailiffs, myTx };
  }, [kind, person, cases, adminTasks, bailiffTasks, transactions]);

  // One feed across everything linked to this person, newest first.
  const activity = useMemo(() => {
    const feed = [];
    linked.myCases.forEach((c) => {
      buildTimeline({ current: c, sessions, appeals, adminTasks, adminTaskUpdates }).items.forEach((it) => {
        feed.push({ ...it, id: `${c.id}_${it.id}`, caseLabel: `دعوى ${c.case_number}/${c.case_year}` });
      });
    });
    const caseIds = new Set(linked.myCases.map((c) => c.id));
    linked.myTasks.filter((t) => !caseIds.has(t.case_id)).forEach((t) => {
      feed.push({ id: `t${t.id}`, date: t.execution_date || t.created_at, tone: 'admin', badge: 'عمل إداري', title: t.title, notes: t.notes });
    });
    linked.myBailiffs.forEach((b) => {
      feed.push({
        id: `b${b.id}`,
        date: b.receipt_date || b.delivery_date || b.created_at,
        tone: b.status === 'delivered' ? 'done' : 'adjourned',
        badge: b.status === 'delivered' ? 'مستلمة' : 'لدى المحضرين',
        title: `ورقة محضرين: ${b.notice_nature || ''}`,
        lines: [b.court_name && ['المحكمة', b.court_name]].filter(Boolean),
      });
    });
    linked.myTx.forEach((t) => {
      const meta = getTransactionMeta(t.type);
      feed.push({
        id: `x${t.id}`,
        date: t.date || t.created_at,
        tone: isDebitTransaction(t.type) ? 'adjourned' : 'done',
        badge: meta.label,
        title: `${meta.label}: ${formatMoney(parseFloat(t.amount) || 0)}`,
        notes: t.description,
      });
    });
    return feed
      .filter((f) => f.date)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map((f) => (f.caseLabel ? { ...f, title: `${f.caseLabel} — ${f.title}` } : f));
  }, [linked, sessions, appeals, adminTasks, adminTaskUpdates]);

  const caseItems = linked.myCases.map((c) => {
    const st = CASE_STATUSES[c.status] || CASE_STATUSES.active;
    return {
      id: c.id,
      title: `${c.case_number}/${c.case_year} — ${c.case_title || CASE_TYPES[c.case_type] || 'قضية'}`,
      sub: [c.court_name, c.is_archived ? 'مؤرشفة' : null, c.next_session_date ? `الجلسة القادمة ${fmtDate(c.next_session_date, short)}` : null].filter(Boolean).join(' · '),
      chip: { label: st.label, color: st.color },
      render: () => {
        const items = buildTimeline({ current: c, sessions, appeals, adminTasks, adminTaskUpdates }).items;
        return items.length ? <CaseTimeline items={items} /> : <p className="empty-line">لا توجد جلسات أو قرارات مسجلة بعد.</p>;
      },
    };
  });

  const taskItems = linked.myTasks.map((t) => {
    const st = ADMIN_TASK_STATUSES[t.status] || ADMIN_TASK_STATUSES.pending;
    return {
      id: t.id,
      title: t.title,
      sub: [t.client_name, t.location, t.execution_date ? `المتابعة ${fmtDate(t.execution_date, short)}` : 'بدون موعد'].filter(Boolean).join(' · '),
      chip: { label: st.label, color: st.color },
      render: () => <TaskHistory task={t} />,
    };
  });

  const bailiffItems = linked.myBailiffs.map((b) => ({
    id: b.id,
    title: b.notice_nature || 'ورقة محضرين',
    sub: [b.bailiff_number && `رقم ${b.bailiff_number}`, b.court_name, b.bailiff_office].filter(Boolean).join(' · '),
    chip: { label: b.status === 'delivered' ? 'مستلمة' : 'غير مستلمة', color: b.status === 'delivered' ? 'var(--success)' : 'var(--status-adjourned)' },
    render: () => (
      <dl className="facts facts-flat">
        <div><dt>التسليم</dt><dd>{b.delivery_date ? fmtDate(b.delivery_date) : '—'}</dd></div>
        <div><dt>الاستلام</dt><dd>{b.receipt_date ? fmtDate(b.receipt_date) : 'قيد الإعلان'}</dd></div>
        {b.session_date && <div><dt>الجلسة</dt><dd>{fmtDate(b.session_date)}</dd></div>}
        {b.notes && <div><dt>ملاحظات</dt><dd>{b.notes}</dd></div>}
      </dl>
    ),
  }));

  const openTasks = linked.myTasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled').length;
  const tabs = [
    ['activity', `النشاط (${activity.length})`],
    ['cases', `القضايا (${linked.myCases.length})`],
    ['tasks', `الأعمال الإدارية (${linked.myTasks.length})`],
    ['bailiffs', `المحضرون (${linked.myBailiffs.length})`],
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog person-dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="case-dialog-title">
            <h3>{kind === 'member' ? `الأستاذ / ${person.name}` : person.name}</h3>
            <span className="cell-sub">{kind === 'member' ? 'ملف عضو الفريق' : 'ملف الموكل'}</span>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="إغلاق"><X size={18} /></button>
        </div>

        <div className="modal-body">
          <div className="person-stats">
            <div><b>{linked.myCases.filter((c) => !c.is_archived).length}</b><span>قضية جارية</span></div>
            <div><b>{openTasks}</b><span>عمل إداري مفتوح</span></div>
            <div><b>{linked.myBailiffs.filter((b) => b.status !== 'delivered').length}</b><span>ورقة لدى المحضرين</span></div>
          </div>

          {facts.length > 0 && (
            <dl className="facts">
              {facts.filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
            </dl>
          )}
          {actions && <div className="case-dialog-actions">{actions}</div>}

          <div className="seg-tabs person-tabs" role="tablist">
            {tabs.map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} className={`seg-tab ${tab === id ? 'is-active' : ''}`} onClick={() => setTab(id)}>
                {label}
              </button>
            ))}
          </div>

          {tab === 'activity' && (activity.length
            ? <CaseTimeline items={activity.slice(0, 60)} />
            : <p className="empty-line">لا يوجد نشاط مسجل بعد.</p>)}
          {tab === 'cases' && <ExpandList items={caseItems} empty="لا توجد قضايا مرتبطة." />}
          {tab === 'tasks' && <ExpandList items={taskItems} empty="لا توجد أعمال إدارية." />}
          {tab === 'bailiffs' && <ExpandList items={bailiffItems} empty="لا توجد أوراق محضرين." />}
        </div>
      </div>
    </div>
  );
}
