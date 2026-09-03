import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Phone, 
  CreditCard, 
  FileText, 
  Briefcase, 
  Edit3, 
  Trash2, 
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useData } from '../context/DataContext';

export default function ClientsPage({ setActiveTab }) {
  const { clients, cases, updateClient, deleteClient } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [editingClient, setEditingClient] = useState(null);

  const filteredClients = clients.filter(c => {
    return (
      (c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.phone && c.phone.includes(searchTerm)) ||
      (c.national_id && c.national_id.includes(searchTerm)) ||
      (c.power_of_attorney_number && c.power_of_attorney_number.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const handleDeleteClient = async (id) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الموكل؟')) {
      await deleteClient(id);
      if (selectedClient?.id === id) setSelectedClient(null);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingClient) return;
    try {
      await updateClient(editingClient.id, {
        name: editingClient.name,
        phone: editingClient.phone || null,
        national_id: editingClient.national_id || null,
        power_of_attorney_number: editingClient.power_of_attorney_number || null,
        power_of_attorney_type: editingClient.power_of_attorney_type || null,
        financial_balance: parseFloat(editingClient.financial_balance) || 0,
      });
      setEditingClient(null);
    } catch (err) {
      alert('خطأ أثناء تعديل بيانات الموكل: ' + err.message);
    }
  };

  return (
    <div className="page-wrapper" style={{ maxWidth: '1400px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.25rem',
        flexWrap: 'wrap',
        gap: '1rem',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-gold)' }}></span>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--primary-700)', textTransform: 'uppercase' }}>
              قاعدة بيانات الموكلين والتوكيلات
            </span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
            سجل الموكلين والتوكيلات
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge" style={{ background: 'var(--primary-100)', color: 'var(--primary-800)', fontWeight: '700', padding: '0.4rem 0.85rem', fontSize: '0.82rem' }}>
            {filteredClients.length} موكل مسجل
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '0.9rem 1.15rem', borderRadius: '14px' }}>
        <div className="header-search" style={{ width: '100%', minHeight: '40px', borderRadius: '10px' }}>
          <Search size={17} style={{ color: 'var(--text-subtle)' }} />
          <input 
            type="text" 
            placeholder="ابحث باسم الموكل، رقم الهاتف، الرقم القومي، أو التوكيل..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ fontSize: '0.88rem' }}
          />
        </div>
      </div>

      {/* Clients Grid */}
      {filteredClients.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-muted)' }}>
          <Users size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>لا يوجد موكلين مطابقين للبحث</h3>
          <p style={{ fontSize: '0.9rem' }}>يمكنك إضافة موكل جديد باستخدام زر الإضافة أعلاه.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {filteredClients.map((client) => {
            const clientCases = cases.filter(c => c.client_id === client.id);
            const isDebtor = client.financial_balance < 0;

            return (
              <div key={client.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div className="avatar" style={{ background: 'linear-gradient(135deg, var(--primary-700), var(--primary-500))', width: '44px', height: '44px', fontSize: '1.1rem' }}>
                        {client.name ? client.name.charAt(0) : 'م'}
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>{client.name}</h3>
                        {client.phone && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', direction: 'ltr' }}>
                            <span>🇪🇬 +20</span>
                            <span>{client.phone.startsWith('0') ? client.phone.substring(1) : client.phone}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <button 
                        className="btn btn-secondary btn-icon" 
                        style={{ width: '30px', height: '30px', padding: 0 }}
                        onClick={() => setEditingClient({ ...client })}
                        title="تعديل"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button 
                        className="btn btn-danger btn-icon" 
                        style={{ width: '30px', height: '30px', padding: 0 }}
                        onClick={() => handleDeleteClient(client.id)}
                        title="حذف"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* PoA Info */}
                  <div style={{ padding: '0.75rem', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '0.8rem', fontSize: '0.82rem' }}>
                    <div><strong>رقم التوكيل:</strong> {client.power_of_attorney_number || 'غير مسجل'}</div>
                    <div style={{ color: 'var(--text-muted)', marginTop: '0.2rem' }}>{client.power_of_attorney_type || 'توكيل رسمي في القضايا'}</div>
                  </div>

                  {/* Financial Balance & Cases count */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '1rem', fontSize: '0.82rem' }}>
                    <div style={{ padding: '0.6rem', background: isDebtor ? 'var(--status-dismissed-bg)' : 'var(--status-active-bg)', borderRadius: 'var(--radius-sm)', color: isDebtor ? 'var(--status-dismissed)' : 'var(--status-active)', fontWeight: '700' }}>
                      {isDebtor ? `مستحق: ${Math.abs(client.financial_balance)} ج.م` : `رصيد مسدد: ${client.financial_balance} ج.م`}
                    </div>

                    <div style={{ padding: '0.6rem', background: 'var(--primary-50)', borderRadius: 'var(--radius-sm)', color: 'var(--primary-700)', fontWeight: '700', textAlign: 'center' }}>
                      {clientCases.length} قضايا متداولة
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <button 
                  className="btn btn-secondary" 
                  style={{ width: '100%', fontSize: '0.85rem', padding: '0.5rem' }}
                  onClick={() => setSelectedClient(client)}
                >
                  عرض ملف الموكل والدعاوى
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Client Details Modal */}
      {selectedClient && (
        <div className="modal-backdrop" onClick={() => setSelectedClient(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>ملف الموكل: {selectedClient.name}</h3>
              <button className="btn btn-secondary btn-icon" onClick={() => setSelectedClient(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>الهاتف:</span>
                  <div style={{ fontWeight: '600' }}>{selectedClient.phone || 'غير مسجل'}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>الرقم القومي:</span>
                  <div style={{ fontWeight: '600' }}>{selectedClient.national_id || 'غير مسجل'}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>التوكيل:</span>
                  <div style={{ fontWeight: '600' }}>{selectedClient.power_of_attorney_number || 'غير مسجل'}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>الموقف المالي:</span>
                  <div style={{ fontWeight: '700', color: selectedClient.financial_balance < 0 ? 'var(--status-dismissed)' : 'var(--status-active)' }}>
                    {selectedClient.financial_balance} ج.م
                  </div>
                </div>
              </div>

              <h4 style={{ marginBottom: '0.8rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                الدعاوى القضائية المربوطة بهذا الموكل
              </h4>
              {cases.filter(c => c.client_id === selectedClient.id).length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>لا توجد دعاوى قضائية مسجلة باسم هذا الموكل حالياً.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {cases.filter(c => c.client_id === selectedClient.id).map(c => (
                    <div key={c.id} style={{ padding: '0.8rem', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontWeight: '700', color: 'var(--primary-700)' }}>
                        دعوى {c.case_number}/{c.case_year} — {c.case_title || c.plaintiff_name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        المحكمة: {c.court_name} | الجلسة القادمة: {c.next_session_date ? new Date(c.next_session_date).toLocaleDateString('ar-EG') : 'غير محدد'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedClient(null)}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {editingClient && (
        <div className="modal-backdrop" onClick={() => setEditingClient(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>تعديل بيانات الموكل: {editingClient.name}</h3>
              <button className="btn btn-secondary btn-icon" onClick={() => setEditingClient(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveEdit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">الاسم بالكامل *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    required 
                    value={editingClient.name} 
                    onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })} 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">رقم الهاتف (مصر)</label>
                    <div style={{ display: 'flex', direction: 'ltr', alignItems: 'center' }}>
                      <span style={{ 
                        padding: '0.6rem 0.75rem', 
                        background: 'var(--bg-card-subtle)', 
                        border: '1px solid var(--border-color)', 
                        borderRight: 'none', 
                        borderRadius: 'var(--radius-md) 0 0 var(--radius-md)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.35rem', 
                        fontWeight: '700', 
                        fontSize: '0.85rem' 
                      }}>
                        <span>🇪🇬</span>
                        <span>+20</span>
                      </span>
                      <input 
                        type="text" 
                        className="form-input" 
                        style={{ borderRadius: '0 var(--radius-md) var(--radius-md) 0', textAlign: 'left', direction: 'ltr' }}
                        value={editingClient.phone || ''} 
                        onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })} 
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">الرقم القومي</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={editingClient.national_id || ''} 
                      onChange={(e) => setEditingClient({ ...editingClient, national_id: e.target.value })} 
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">رقم التوكيل</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={editingClient.power_of_attorney_number || ''} 
                      onChange={(e) => setEditingClient({ ...editingClient, power_of_attorney_number: e.target.value })} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">نوع التوكيل</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={editingClient.power_of_attorney_type || ''} 
                      onChange={(e) => setEditingClient({ ...editingClient, power_of_attorney_type: e.target.value })} 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">الرصيد المالي (الأتعاب)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={editingClient.financial_balance} 
                    onChange={(e) => setEditingClient({ ...editingClient, financial_balance: e.target.value })} 
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingClient(null)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">حفظ التعديلات</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
