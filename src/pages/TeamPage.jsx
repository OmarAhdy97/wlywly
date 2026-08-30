import React, { useState } from 'react';
import { UserCheck, Plus, Phone, Mail, Briefcase, Calendar, CheckSquare, Edit3, Trash2, X } from 'lucide-react';
import { useData } from '../context/DataContext';
import { USER_ROLES } from '../lib/supabase';

export default function TeamPage() {
  const { team, addTeamMember, updateTeamMember, deleteTeamMember } = useData();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [role, setRole] = useState('authorizedLawyer');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await addTeamMember({
        name,
        role,
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
      alert('خطأ أثناء إضافة المحامي: ' + err.message);
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
      alert('خطأ أثناء التعديل: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('هل أنت متأكد من إزالة هذا العضو من فريق العمل؟')) {
      await deleteTeamMember(id);
    }
  };

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '800' }}>فريق العمل والمحامين المعاونين</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            توزيع القضايا والجلسات، ومتابعة المهام الإجرائية لأعضاء مكتب المحاماة.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
          <Plus size={18} />
          <span>إضافة محامي / إداري</span>
        </button>
      </div>

      {team.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-muted)' }}>
          <UserCheck size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>لم يتم تسجيل أعضاء في الفريق بعد</h3>
          <p style={{ fontSize: '0.9rem' }}>أضف محامين معاونين أو سكرتارية المكتب لتوزيع الحضور والجلسات.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {team.map((member) => (
            <div key={member.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <div className="avatar" style={{ background: 'linear-gradient(135deg, #001f3f, #133e75)', width: '46px', height: '46px', fontSize: '1.1rem' }}>
                      {member.name ? member.name.charAt(0) : 'م'}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>الأستاذ / {member.name}</h3>
                      <span className="badge" style={{ background: 'var(--primary-100)', color: 'var(--primary-700)', marginTop: '0.2rem' }}>
                        {USER_ROLES[member.role] || member.role}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button 
                      className="btn btn-secondary btn-icon" 
                      style={{ width: '30px', height: '30px', padding: 0 }}
                      onClick={() => setEditingMember({ ...member })}
                    >
                      <Edit3 size={14} />
                    </button>
                    <button 
                      className="btn btn-danger btn-icon" 
                      style={{ width: '30px', height: '30px', padding: 0 }}
                      onClick={() => handleDelete(member.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Contact Info */}
                <div style={{ padding: '0.75rem', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1rem', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  {member.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Phone size={13} color="var(--primary-600)" />
                      <span>{member.phone}</span>
                    </div>
                  )}
                  {member.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Mail size={13} color="var(--primary-600)" />
                      <span>{member.email}</span>
                    </div>
                  )}
                </div>

                {/* Workload Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', fontSize: '0.82rem' }}>
                  <div style={{ padding: '0.6rem', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-muted)' }}>قضايا مسندة</div>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--primary-700)' }}>{member.active_cases_count || 0}</strong>
                  </div>
                  <div style={{ padding: '0.6rem', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-muted)' }}>جلسات اليوم</div>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--accent-gold)' }}>{member.today_sessions_count || 0}</strong>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>إضافة عضو / محامي جديد للمكتب</h3>
              <button className="btn btn-secondary btn-icon" onClick={() => setIsAddModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAdd}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">الاسم بالكامل *</label>
                  <input type="text" className="form-input" required value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">الدرجة / الصفة المهنية *</label>
                  <select className="form-select" value={role} onChange={(e) => setRole(e.target.value)}>
                    {Object.entries(USER_ROLES).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">رقم الهاتف</label>
                  <input type="tel" className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">البريد الإلكتروني</label>
                  <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">إضافة المحامي</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingMember && (
        <div className="modal-backdrop" onClick={() => setEditingMember(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>تعديل بيانات المحامي: {editingMember.name}</h3>
              <button className="btn btn-secondary btn-icon" onClick={() => setEditingMember(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEdit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">الاسم بالكامل *</label>
                  <input type="text" className="form-input" required value={editingMember.name} onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">الدرجة المهنية</label>
                  <select className="form-select" value={editingMember.role} onChange={(e) => setEditingMember({ ...editingMember, role: e.target.value })}>
                    {Object.entries(USER_ROLES).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">رقم الهاتف</label>
                  <input type="tel" className="form-input" value={editingMember.phone || ''} onChange={(e) => setEditingMember({ ...editingMember, phone: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">البريد الإلكتروني</label>
                  <input type="email" className="form-input" value={editingMember.email || ''} onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })} />
                </div>
              </div>
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
