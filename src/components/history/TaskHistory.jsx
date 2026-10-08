import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { ADMIN_TASK_STATUSES } from '../common/AdministrativeTaskUpdateModal';

export function taskHistoryItems(task, adminTaskUpdates) {
  const updates = (adminTaskUpdates || [])
    .filter((u) => u.admin_task_id === task.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  if (updates.length) return updates;
  return [{
    id: `init_${task.id}`,
    action_type: 'created',
    new_status: task.status || 'pending',
    update_text: task.requirements || 'تم إنشاء العمل الإداري',
    created_at: task.created_at || new Date().toISOString(),
    created_by: null,
  }];
}

function describe(item) {
  if (item.action_type === 'created') return ['إنشاء العمل الإداري', 'prelim'];
  if (item.action_type === 'postponed' || item.new_status === 'postponed') return ['تأجيل المتابعة', 'adjourned'];
  if (item.action_type === 'completed' || item.new_status === 'completed') return ['إتمام العمل', 'active'];
  if (item.action_type === 'reopened') return ['إعادة فتح المهمة', 'reserved'];
  if (item.action_type === 'cancelled' || item.new_status === 'cancelled') return ['إلغاء العمل', 'dismissed'];
  if (item.action_type === 'reassigned') return ['إعادة إسناد المهمة', 'settled'];
  return ['تحديث مسار العمل', 'settled'];
}

// The full update log of one administrative task, newest first.
export default function TaskHistory({ task }) {
  const { adminTaskUpdates, team = [], officeProfile } = useData();
  const items = taskHistoryItems(task, adminTaskUpdates);

  const actor = (id) => {
    if (!id) return 'المسؤول';
    const m = team.find((t) => t.id === id);
    if (m) return `أ/ ${m.name}`;
    return officeProfile?.lawyer_name ? `أ/ ${officeProfile.lawyer_name}` : 'المكتب';
  };
  const assignee = (id) => {
    const m = id && team.find((t) => t.id === id);
    return m ? `أ/ ${m.name}` : 'غير محدد';
  };

  return (
    <ol className="tl task-history">
      {items.map((item, idx) => {
        const status = ADMIN_TASK_STATUSES[item.new_status] || ADMIN_TASK_STATUSES.pending;
        const d = new Date(item.created_at);
        const when = `${d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })} — ${d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`;
        const [title, tone] = describe(item);
        return (
          <li key={item.id || idx} className="tl-item" style={{ '--tone': `var(--status-${tone})`, '--tone-bg': `var(--status-${tone}-bg)` }}>
            <div className="tl-head">
              <strong>{title}</strong>
              <span className="cell-sub">{when}</span>
            </div>
            <p className="tl-line">
              <span>الحالة:</span>{' '}
              {item.previous_status && item.previous_status !== item.new_status && (
                <><s>{ADMIN_TASK_STATUSES[item.previous_status]?.label || item.previous_status}</s> <ArrowRight size={11} />{' '}</>
              )}
              <b>{status.label}</b>
            </p>
            {item.previous_assigned_to !== item.new_assigned_to && item.new_assigned_to && (
              <p className="tl-line">
                <span>المسؤول:</span>{' '}
                {item.previous_assigned_to && <><s>{assignee(item.previous_assigned_to)}</s> <ArrowRight size={11} />{' '}</>}
                <b>{assignee(item.new_assigned_to)}</b>
              </p>
            )}
            {item.previous_due_date !== item.new_due_date && item.new_due_date && (
              <p className="tl-line tl-extra">
                المتابعة: {item.previous_due_date ? `كانت ${item.previous_due_date.split('T')[0]}` : 'لم تكن محددة'} ← الجديد {item.new_due_date.split('T')[0]}
              </p>
            )}
            {item.update_text && <p className="tl-line tl-notes">{item.update_text}</p>}
            <p className="tl-line tl-by">بواسطة {actor(item.created_by)}</p>
          </li>
        );
      })}
    </ol>
  );
}
