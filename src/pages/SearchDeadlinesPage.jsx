import React, { useState } from 'react';
import { Search, Clock, AlertTriangle, Calculator, Calendar, ArrowLeft, ShieldAlert } from 'lucide-react';
import { useData } from '../context/DataContext';
import { CASE_TYPES, CASE_STATUSES } from '../lib/supabase';

export default function SearchDeadlinesPage({ searchTerm, setSearchTerm, setActiveTab }) {
  const { cases, clients } = useData();
  const [activeTabSub, setActiveTabSub] = useState('search');

  // Calculator State
  const [rulingDate, setRulingDate] = useState(new Date().toISOString().split('T')[0]);
  const [appealType, setAppealType] = useState('civil_appeal'); // 40 days

  const DEADLINE_PRESETS = {
    civil_appeal: { title: 'استئناف مدني وتجاري', days: 40, law: 'مادة 227 مرافعات (40 يوماً من تاريخ صدور الحكم)' },
    misdemeanor_appeal: { title: 'استئناف جنح', days: 10, law: 'مادة 406 إجراءات جنائية (10 أيام من تاريخ الحكم الحضوري أو إعلان الغيابي)' },
    cassation: { title: 'طعن بالنقض (مدني / جنائي)', days: 60, law: 'قانون 57 لسنة 1959 (60 يوماً من تاريخ صدور الحكم)' },
    state_council_appeal: { title: 'طعن أمام الإدارية العليا', days: 60, law: 'قانون مجلس الدولة رقم 47 لسنة 1972 (60 يوماً)' },
    opposition: { title: 'معارضة في حكم جنحة غيابي', days: 10, law: 'مادة 398 إجراءات جنائية (10 أيام من تاريخ إعلان الحكم)' },
    labor_appeal: { title: 'استئناف قضايا عمالية', days: 40, law: 'قانون العمل وقانون المرافعات' },
  };

  // Calculate deadline date
  const calcDeadline = () => {
    if (!rulingDate) return null;
    const date = new Date(rulingDate);
    const days = DEADLINE_PRESETS[appealType]?.days || 40;
    date.setDate(date.getDate() + days);
    return date;
  };

  const deadlineDate = calcDeadline();

  // Search results
  const query = searchTerm.toLowerCase();
  const matchingCases = cases.filter(c => {
    if (!query) return true;
    return (
      (c.case_number && c.case_number.toLowerCase().includes(query)) ||
      (c.case_title && c.case_title.toLowerCase().includes(query)) ||
      (c.plaintiff_name && c.plaintiff_name.toLowerCase().includes(query)) ||
      (c.defendant_name && c.defendant_name.toLowerCase().includes(query)) ||
      (c.court_name && c.court_name.toLowerCase().includes(query)) ||
      (c.ruling_text && c.ruling_text.toLowerCase().includes(query)) ||
      (c.notes && c.notes.toLowerCase().includes(query))
    );
  });

  const matchingClients = clients.filter(c => {
    if (!query) return true;
    return (
      (c.name && c.name.toLowerCase().includes(query)) ||
      (c.phone && c.phone.includes(query)) ||
      (c.national_id && c.national_id.includes(query)) ||
      (c.power_of_attorney_number && c.power_of_attorney_number.toLowerCase().includes(query))
    );
  });

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '800' }}>البحث الشامل وحاسبة المواعيد والطعون</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            محرك بحث في جميع سجلات المكتب وحاسبة دقيقة للعد التنازلي لمواعيد الاستئناف والنقض والمعارضة.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className={`btn ${activeTabSub === 'search' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTabSub('search')}
          >
            <Search size={16} />
            <span>البحث الشامل</span>
          </button>
          <button 
            className={`btn ${activeTabSub === 'deadlines' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTabSub('deadlines')}
          >
            <Calculator size={16} />
            <span>حاسبة المواعيد والطعون</span>
          </button>
        </div>
      </div>

      {activeTabSub === 'search' && (
        <>
          {/* Search Input Bar */}
          <div className="card" style={{ marginBottom: '1.5rem', padding: '1.2rem 1.5rem' }}>
            <div className="header-search" style={{ width: '100%' }}>
              <Search size={20} style={{ color: 'var(--text-subtle)' }} />
              <input 
                type="text" 
                placeholder="ابحث بأي كلمة: رقم قضية، اسم موكل، اسم خصم، محكمة، تاريخ، أو منطوق حكم..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          {/* Results Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
            
            {/* Cases Results */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <span>نتائج القضايا والدعاوى ({matchingCases.length})</span>
                </div>
              </div>

              {matchingCases.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>لا توجد قضايا مطابقة للبحث</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {matchingCases.map(c => (
                    <div key={c.id} style={{ padding: '0.9rem', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                        <strong style={{ fontSize: '1rem', color: 'var(--primary-700)' }}>
                          دعوى رقم {c.case_number}/{c.case_year} — {c.case_title || c.plaintiff_name}
                        </strong>
                        <span className="badge" style={{ background: 'var(--primary-100)', color: 'var(--primary-700)' }}>
                          {CASE_TYPES[c.case_type] || c.case_type}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', gap: '1.2rem' }}>
                        <span><strong>المحكمة:</strong> {c.court_name}</span>
                        <span><strong>الخصم:</strong> {c.defendant_name}</span>
                        {c.next_session_date && (
                          <span><strong>الجلسة:</strong> {new Date(c.next_session_date).toLocaleDateString('ar-EG')}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Clients Results */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <span>الموكلين المطابقين ({matchingClients.length})</span>
                </div>
              </div>

              {matchingClients.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>لا يوجد موكلين مطابقين</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {matchingClients.map(c => (
                    <div key={c.id} style={{ padding: '0.8rem', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                      <strong style={{ fontSize: '0.95rem' }}>{c.name}</strong>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        {c.phone ? `هاتف: ${c.phone}` : 'بدون هاتف'} | {c.power_of_attorney_number ? `توكيل: ${c.power_of_attorney_number}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </>
      )}

      {activeTabSub === 'deadlines' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
          {/* Calculator Card */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Calculator size={20} color="var(--primary-600)" />
                <span>حاسبة ميعاد الطعن القانوني والعد التنازلي</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">نوع الطعن / الإجراء القانوني *</label>
              <select 
                className="form-select" 
                value={appealType} 
                onChange={(e) => setAppealType(e.target.value)}
              >
                {Object.entries(DEADLINE_PRESETS).map(([k, v]) => (
                  <option key={k} value={k}>{v.title} ({v.days} يوماً)</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">تاريخ صدور الحكم أو الإعلان *</label>
              <input 
                type="date" 
                className="form-input" 
                value={rulingDate} 
                onChange={(e) => setRulingDate(e.target.value)} 
              />
            </div>

            {/* Calculated Result Box */}
            <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, var(--primary-900), var(--primary-700))', color: '#ffffff', borderRadius: 'var(--radius-lg)', marginTop: '1.5rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#fed65b', marginBottom: '0.3rem' }}>
                آخر ميعاد قانوني لإيداع التقرير بالطعن:
              </div>
              <h2 style={{ fontSize: '1.8rem', color: '#ffffff', fontWeight: '800' }}>
                {deadlineDate ? deadlineDate.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#c2d5ec', marginTop: '0.6rem' }}>
                السند القانوني: {DEADLINE_PRESETS[appealType]?.law}
              </p>
            </div>
          </div>

          {/* Legal Rules Reference */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <ShieldAlert size={20} color="var(--accent-gold)" />
                <span>دليل المدد الإجرائية ومواعيد السقوط</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', fontSize: '0.85rem' }}>
              {Object.entries(DEADLINE_PRESETS).map(([k, v]) => (
                <div key={k} style={{ padding: '0.8rem', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <strong style={{ color: 'var(--primary-700)' }}>{v.title}</strong>
                    <span className="badge" style={{ background: 'var(--primary-100)', color: 'var(--primary-700)' }}>
                      {v.days} يوم
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-muted)' }}>{v.law}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
