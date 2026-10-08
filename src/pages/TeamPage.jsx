import React, { useState } from 'react';
import { Plus, Briefcase, Edit3, Trash2, X, ClipboardList, Send } from 'lucide-react';
import { useData } from '../context/DataContext';
import { USER_ROLES, CASE_TYPES } from '../lib/supabase';
import RowAction, { RowActions } from '../components/common/RowAction';
import PhoneField from '../components/common/PhoneField';
import AssignModal from '../components/team/AssignModal';
import { confirmDialog, notify } from '../lib/dialog';
import Select from '../components/common/Select';
import PersonFileDialog from '../components/history/PersonFileDialog';
import { formatEgyptPhone } from '../lib/phone';

const fmtDay = (d) => new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
const caseOwner = (c) => (c.next_steps ? c.next_steps.replace('assigned:', '') : null);

export default function TeamPage() {
  const {
    team, cases, adminTasks, bailiffTasks,
    addTeamMember, updateTeamMember, deleteTeamMember,
    updateCase, updateAdminTask, updateBailiffTask,
  } = useData();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [fileMember, setFileMember] = useState(null);
  const [editingMember, setEditingMember] = useState(null);

  // one assignment dialog for the three kinds of work
  const [assign, setAssign] = useState(null); // { kind, member }
  const [selectedIds, setSelectedIds] = useState([]);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [role, setRole] = useState('authorizedLawyer');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];
  const memberName = (id) => team.find((m) => m.id === id)?.name || null;

  const KINDS = {
    cases: {
      title: 'إسناد القضايا',
      noun: 'قضية',
      placeholder: 'رقم القضية، الموضوع، الخصم أو المحكمة',
      items: cases.filter((c) => !c.is_archived),
      owner: caseOwner,
      save: async (item, memberId) => updateCase(item.id, { next_steps: memberId }),
      matches: (c, q) =>
        [c.case_number, c.case_year, c.case_title, c.plaintiff_name, c.defendant_name, c.court_name].some(
          (v) => v && String(v).toLowerCase().includes(q)
        ),
      describe: (c) => ({
        title: `دعوى ${c.case_number}/${c.case_year}`,
        tag: CASE_TYPES[c.case_type] || c.case_type,
        meta: [c.case_title, c.court_name, c.plaintiff_name && `ضد ${c.defendant_name || '—'}`,
          c.next_session_date && `جلسة ${fmtDay(c.next_session_date)}`].filter(Boolean),
      }),
    },
    admin: {
      title: 'إسناد الأعمال الإدارية',
      noun: 'عمل',
      placeholder: 'العنوان، الموكل، المكان',
      items: adminTasks.filter((t) => t.status !== 'completed'),
      owner: (t) => t.assigned_to || null,
      save: async (item, memberId) => updateAdminTask(item.id, { assigned_to: memberId }),
      matches: (t, q) =>
        [t.title, t.client_name, t.location, t.requirements].some((v) => v && String(v).toLowerCase().includes(q)),
      describe: (t) => ({
        title: t.title,
        tag: '',
        meta: [t.client_name, t.location, t.execution_date && `التنفيذ ${fmtDay(t.execution_date)}`].filter(Boolean),
      }),
    },
    bailiff: {
      title: 'إسناد أوراق المحضرين',
      noun: 'ورقة',
      placeholder: 'طبيعة الإعلان، رقم المحضر، الموكل، المحكمة',
      items: bailiffTasks.filter((b) => b.status !== 'delivered'),
      owner: (b) => b.assigned_to || null,
      save: async (item, memberId) => updateBailiffTask(item.id, { assigned_to: memberId }),
      matches: (b, q) =>
        [b.notice_nature, b.bailiff_number, b.client_name, b.court_name, b.bailiff_office].some(
          (v) => v && String(v).toLowerCase().includes(q)
        ),
      describe: (b) => ({
        title: b.notice_nature,
        tag: b.bailiff_number && `رقم ${b.bailiff_number}`,
        meta: [b.client_name, b.court_name, b.bailiff_office, b.delivery_date && `التسليم ${fmtDay(b.delivery_date)}`].filter(Boolean),
      }),
    },
  };

  const openAssign = (kind, member, fromFile = false) => {
    setSelectedIds(KINDS[kind].items.filter((it) => KINDS[kind].owner(it) === member.id).map((it) => it.id));
    setAssign({ kind, member, fromFile });
  };

  // Leaving an assignment opened from a member's file goes back to that file.
  const closeAssign = () => {
    const back = assign?.fromFile ? assign.member : null;
    setAssign(null);
    if (back) setFileMember(back);
  };

  const saveAssign = async () => {
    const { kind, member } = assign;
    const cfg = KINDS[kind];
    setSaving(true);
    try {
      for (const item of cfg.items) {
        const mine = cfg.owner(item) === member.id;
        const ticked = selectedIds.includes(item.id);
        if (ticked && !mine) await cfg.save(item, member.id);
        else if (!ticked && mine) await cfg.save(item, null);
      }
      if (kind === 'cases') await updateTeamMember(member.id, { active_cases_count: selectedIds.length });
      notify('تم حفظ الإسناد', 'success');
      closeAssign();
    } catch (err) {
      notify('خطأ أثناء حفظ الإسناد: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await addTeamMember({
        name, role,
        phone: phone || null,
        email: email || null,
        active_cases_count: 0,
        today_sessions_count: 0,
        pending_tasks_count: 0,
        documents_for_review_count: 0,
      });
      setIsAddModalOpen(false);
      setName('');
      setPhone('');
      setEmail('');
    } catch (err) {
      notify('خطأ أثناء إضافة المحامي: ' + err.message);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editingMember) return;
    try {
      await updateTeamMember(editingMember.id, {
        name: editingMember.name,
        role: editingMember.role,
        phone: editingMember.phone || null,
        email: editingMember.email || null,
      });
      setEditingMember(null);
    } catch (err) {
      notify('خطأ أثناء التعديل: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (await confirmDialog('هل تريد إزالة هذا العضو من فريق العمل؟')) {
      await deleteTeamMember(id);
    }
  };

  const memberForm = (value, setValue, isEdit) => (
    <div className="modal-body">
      <div className="form-group">
        <label className="form-label">الاسم بالكامل<span className="req"> *</span></label>
        <input type="text" className="form-input" required value={value.name} onChange={(e) => setValue({ ...value, name: e.target.value })} />
      </div>
      <div className="form-row">
      <div className="form-group">
        <label className="form-label">الدرجة المهنية</label>
        <Select className="form-select" value={value.role} onChange={(e) => setValue({ ...value, role: e.target.value })}>
          {Object.entries(USER_ROLES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>
      </div>
      <div className="form-group">
        <label className="form-label">رقم الهاتف</label>
        <PhoneField value={value.phone || ''} onChange={(v) => setValue({ ...value, phone: v })} />
      </div>
      </div>
      <div className="form-group">
        <label className="form-label">البريد الإلكتروني</label>
        <input type="email" className="form-input" value={value.email || ''} onChange={(e) => setValue({ ...value, email: e.target.value })} />
      </div>
      {isEdit && null}
    </div>
  );

  return (
    <div className="page-wrapper">
      <div className="page-head">
        <div>
          <h1>فريق العمل</h1>
          <p className="page-sub">{team.length} {team.length === 1 ? 'عضو' : 'أعضاء'}</p>
        </div>
        <div className="page-head-actions">
          <button type="button" className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
            <Plus size={16} /> إضافة عضو
          </button>
        </div>
      </div>

      {team.length === 0 ? (
        <div className="card empty-block">
          <h3>لا يوجد أعضاء في الفريق بعد</h3>
          <p>أضف المحامين المعاونين وسكرتارية المكتب لتوزيع القضايا والمهام عليهم.</p>
        </div>
      ) : (
        <div className="card row-list">
          {team.map((member) => {
            const memberCases = cases.filter((c) => !c.is_archived && caseOwner(c) === member.id);
            const todaySessions = memberCases.filter((c) => c.next_session_date && c.next_session_date.startsWith(todayStr));
            const openAdmin = adminTasks.filter((t) => t.assigned_to === member.id && t.status !== 'completed');
            const openBailiff = bailiffTasks.filter((b) => b.assigned_to === member.id && b.status !== 'delivered');

            return (
              <article key={member.id} className="list-row">
                <div className="list-row-main">
                  <div className="list-row-body list-row-person is-clickable" onClick={() => setFileMember(member)}>
                    <div className="list-row-person-text">
                      <div className="list-row-top">
                        <button type="button" className="row-title row-title-link"><span className="row-title-text">الأستاذ / {member.name}</span></button>
                        <span className="status-chip" style={{ '--dot': 'var(--accent)' }}>{USER_ROLES[member.role] || member.role}</span>
                      </div>
                      <p className="list-row-sub">
                        {[member.phone && formatEgyptPhone(member.phone), member.email].filter(Boolean).join(' · ') || 'لا توجد بيانات اتصال'}
                      </p>
                    </div>
                  </div>

                  <dl className="list-row-facts is-four">
                    <div><dt>قضايا</dt><dd>{memberCases.length}</dd></div>
                    <div><dt>جلسات اليوم</dt><dd className={todaySessions.length > 0 ? 'is-warn' : ''}>{todaySessions.length}</dd></div>
                    <div><dt>أعمال إدارية</dt><dd>{openAdmin.length}</dd></div>
                    <div><dt>محضرون</dt><dd>{openBailiff.length}</dd></div>
                  </dl>

                  <div className="list-row-actions">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => openAssign('cases', member)}>
                      <Briefcase size={14} /> إسناد القضايا
                    </button>
                    <RowActions>
                      <RowAction icon={ClipboardList} label="إسناد أعمال إدارية" onClick={() => openAssign('admin', member)} />
                      <RowAction icon={Send} label="إسناد أوراق محضرين" onClick={() => openAssign('bailiff', member)} />
                      <RowAction icon={Edit3} label="تعديل" onClick={() => setEditingMember({ ...member })} />
                      <RowAction icon={Trash2} label="حذف" tone="danger" onClick={() => handleDelete(member.id)} />
                    </RowActions>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {fileMember && (
        <PersonFileDialog
          kind="member"
          person={fileMember}
          onClose={() => setFileMember(null)}
          facts={[
            ['الدرجة', USER_ROLES[fileMember.role] || fileMember.role],
            ['الهاتف', fileMember.phone ? formatEgyptPhone(fileMember.phone) : ''],
            ['البريد', fileMember.email],
          ]}
          actions={(
            <>
              <button type="button" className="btn btn-primary" onClick={() => { const m = fileMember; setFileMember(null); openAssign('cases', m, true); }}>
                <Briefcase size={15} /> إسناد القضايا
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => { const m = fileMember; setFileMember(null); openAssign('admin', m, true); }}>
                <ClipboardList size={15} /> الأعمال الإدارية
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => { const m = fileMember; setFileMember(null); openAssign('bailiff', m, true); }}>
                <Send size={15} /> المحضرون
              </button>
            </>
          )}
        />
      )}

      {assign && (() => {
        const cfg = KINDS[assign.kind];
        return (
          <AssignModal
            title={cfg.title}
            noun={cfg.noun}
            member={assign.member}
            items={cfg.items}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            isTaken={(it) => !!cfg.owner(it)}
            ownerName={(it) => {
              const o = cfg.owner(it);
              return o && o !== assign.member.id ? memberName(o) : null;
            }}
            matches={cfg.matches}
            describe={cfg.describe}
            searchPlaceholder={cfg.placeholder}
            saving={saving}
            onSave={saveAssign}
            onClose={closeAssign}
            backLabel={assign.fromFile ? `ملف ${assign.member.name}` : null}
          />
        );
      })()}

      {isAddModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-dialog member-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>إضافة عضو جديد</h3>
              <button type="button" className="icon-btn" onClick={() => setIsAddModalOpen(false)} aria-label="إغلاق">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAdd}>
              {memberForm(
                { name, role, phone, email },
                (v) => { setName(v.name); setRole(v.role); setPhone(v.phone); setEmail(v.email); },
                false
              )}
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">إضافة</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingMember && (
        <div className="modal-backdrop" onClick={() => setEditingMember(null)}>
          <div className="modal-dialog member-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>تعديل بيانات {editingMember.name}</h3>
              <button type="button" className="icon-btn" onClick={() => setEditingMember(null)} aria-label="إغلاق">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEdit}>
              {memberForm(editingMember, setEditingMember, true)}
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingMember(null)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">حفظ التعديلات</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
