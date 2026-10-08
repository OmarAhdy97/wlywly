import React from 'react';

export const fmtDate = (d, opts = { day: 'numeric', month: 'long', year: 'numeric' }) =>
  d ? new Date(d).toLocaleDateString('ar-EG', opts) : '—';

const TONES = {
  adjourned: 'adjourned',
  final: 'judgment',
  prelim: 'prelim',
  appeal: 'reserved',
  admin: 'settled',
  done: 'active',
  cancelled: 'dismissed',
  scheduled: 'settled',
};

export function buildTimeline({ current, sessions, appeals, adminTasks, adminTaskUpdates }) {
  const caseSessions = (sessions || []).filter((s) => s.case_id === current.id);
  const caseAppeals = (appeals || []).filter((a) => a.case_id === current.id);
  const caseTasks = (adminTasks || []).filter((t) => t.case_id === current.id);
  const caseUpdates = (adminTaskUpdates || []).filter(
    (u) => u.case_id === current.id || caseTasks.some((t) => t.id === u.admin_task_id)
  );

  const MILESTONE = {
    postponed: ['تأجيل متابعة إدارية', 'adjourned'],
    completed: ['إتمام عمل إداري', 'done'],
    reassigned: ['إعادة إسناد عمل إداري', 'adjourned'],
    cancelled: ['إلغاء عمل إداري', 'cancelled'],
  };

  const milestones = caseUpdates
    .filter((u) => MILESTONE[u.action_type])
    .map((u) => {
      const task = caseTasks.find((t) => t.id === u.admin_task_id);
      const [label, tone] = MILESTONE[u.action_type];
      return {
        id: 'm' + u.id,
        date: u.created_at,
        tone,
        badge: label,
        title: `${label}: ${task ? task.title : 'عمل إداري'}`,
        notes: u.update_text,
        extra: u.new_due_date
          ? `موعد المتابعة الجديد ${fmtDate(u.new_due_date)}${u.previous_due_date ? ` (كان ${fmtDate(u.previous_due_date)})` : ''}`
          : '',
      };
    });

  const items = [
    ...caseSessions.map((s) => {
      let badge = 'مؤجلة';
      let tone = 'adjourned';
      if (s.status === 'finalJudgment') [badge, tone] = ['حكم نهائي', 'final'];
      else if (s.status === 'preliminaryJudgment') [badge, tone] = ['حكم تمهيدي', 'prelim'];
      else if (s.status === 'scheduled') [badge, tone] = ['جلسة قادمة', 'scheduled'];
      return {
        id: 's' + s.id,
        date: s.session_date || s.created_at,
        tone,
        badge,
        title: `جلسة ${fmtDate(s.session_date || s.created_at)}`,
        lines: [
          s.adjournment_reason && ['سبب التأجيل', s.adjournment_reason],
          s.ruling_text && ['منطوق الحكم', s.ruling_text],
        ].filter(Boolean),
        notes: s.notes && s.notes !== s.adjournment_reason ? s.notes : '',
      };
    }),
    ...caseAppeals.map((a) => ({
      id: 'a' + a.id,
      date: a.judgment_date || a.created_at,
      tone: 'appeal',
      badge: 'استئناف',
      title: `ميعاد استئناف ${fmtDate(a.judgment_date || a.created_at)}`,
      lines: a.judgment_text ? [['منطوق الحكم', a.judgment_text]] : [],
      extra: a.follow_up_date ? `متابعة الاستئناف في ${fmtDate(a.follow_up_date)}` : '',
      notes: a.notes,
    })),
    ...caseTasks.map((t) => ({
      id: 't' + t.id,
      date: t.execution_date || t.created_at,
      tone: 'admin',
      badge: 'عمل إداري',
      title: t.title,
      lines: [t.requirements && ['المطلوب', t.requirements], t.location && ['المكان', t.location]].filter(Boolean),
      notes: t.notes,
    })),
    ...milestones,
  ];

  items.sort((a, b) => new Date(b.date) - new Date(a.date));
  return { items, caseTasks };
}

export function CaseTimeline({ items }) {
  return (
    <ol className="tl">
      {items.map((it) => (
        <li key={it.id} className="tl-item" style={{ '--tone': `var(--status-${TONES[it.tone]})`, '--tone-bg': `var(--status-${TONES[it.tone]}-bg)` }}>
          <div className="tl-head">
            <strong>{it.title}</strong>
            <span className="tl-badge">{it.badge}</span>
          </div>
          {it.lines?.map(([k, v]) => (
            <p key={k} className="tl-line"><span>{k}:</span> {v}</p>
          ))}
          {it.extra && <p className="tl-line tl-extra">{it.extra}</p>}
          {it.notes && <p className="tl-line tl-notes">{it.notes}</p>}
        </li>
      ))}
    </ol>
  );
}

