import React from 'react';
import { 
  Briefcase, 
  Calendar, 
  Users, 
  AlertCircle, 
  Gavel, 
  Clock, 
  ArrowLeft,
  CheckCircle2,
  TrendingUp,
  Scale
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { CASE_TYPES, CASE_STATUSES } from '../lib/supabase';

export default function DashboardPage({ setActiveTab, onOpenQuickAction }) {
  const { cases, clients, sessions, loading } = useData();

  const activeCases = cases.filter(c => !c.is_archived);
  const archivedCases = cases.filter(c => c.is_archived);
  
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySessions = cases.filter(c => c.next_session_date && c.next_session_date.startsWith(todayStr));

  // Debtor clients count
  const debtorClients = clients.filter(c => c.financial_balance < 0);

  // Urgent hearings (next 7 days)
  const upcomingCases = activeCases
    .filter(c => c.next_session_date && c.next_session_date >= todayStr)
    .sort((a, b) => new Date(a.next_session_date) - new Date(b.next_session_date))
    .slice(0, 6);

  // Recent judgments / settled
  const recentRulings = cases
    .filter(c => c.ruling_text || c.status === 'finalJudgment' || c.status === 'preliminaryJudgment')
    .slice(0, 5);

  return (
    <div className="page-wrapper">
      {/* Top Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #001f3f 0%, #0a2e5c 100%)',
        borderRadius: 'var(--radius-lg)',
        padding: '2rem',
        color: '#ffffff',
        marginBottom: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: 'var(--shadow-lg)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ zIndex: 2 }}>
          <span style={{ 
            background: 'rgba(254, 214, 91, 0.2)', 
            color: '#fed65b', 
            padding: '0.35rem 0.85rem', 
            borderRadius: '999px', 
            fontSize: '0.85rem',
            fontWeight: '600',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            marginBottom: '0.8rem'
          }}>
            <Scale size={15} />
            أجندة محاكم دمياط ورأس البر وفارسكور
          </span>
          <h1 style={{ color: '#ffffff', fontSize: '1.8rem', fontWeight: '800', marginBottom: '0.4rem' }}>
            لوحة الإدارة والمتابعة القانونية
          </h1>
          <p style={{ color: '#c2d5ec', fontSize: '0.95rem' }}>
            مرحباً بك، لديك <strong style={{ color: '#fed65b' }}>{todaySessions.length} جلسات</strong> مقررة لليوم، و <strong style={{ color: '#fed65b' }}>{activeCases.length} قضية نشطة</strong> متداولة.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.8rem', zIndex: 2 }}>
          <button 
            className="btn btn-gold" 
            onClick={onOpenQuickAction}
            style={{ padding: '0.8rem 1.4rem' }}
          >
            + إضافة دعوى / جلسة جديدة
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        {/* Card 1: Active Cases */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', cursor: 'pointer' }} onClick={() => setActiveTab('cases')}>
          <div style={{ width: '54px', height: '54px', borderRadius: '14px', background: 'var(--primary-100)', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Briefcase size={28} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>إجمالي القضايا المتداولة</span>
            <h3 style={{ fontSize: '1.7rem', fontWeight: '800', marginTop: '0.1rem' }}>{activeCases.length}</h3>
          </div>
        </div>

        {/* Card 2: Today Sessions */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', cursor: 'pointer' }} onClick={() => setActiveTab('agenda')}>
          <div style={{ width: '54px', height: '54px', borderRadius: '14px', background: 'var(--status-adjourned-bg)', color: 'var(--status-adjourned)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={28} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>جلسات اليوم بالمحاكم</span>
            <h3 style={{ fontSize: '1.7rem', fontWeight: '800', marginTop: '0.1rem' }}>{todaySessions.length}</h3>
          </div>
        </div>

        {/* Card 3: Clients */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', cursor: 'pointer' }} onClick={() => setActiveTab('clients')}>
          <div style={{ width: '54px', height: '54px', borderRadius: '14px', background: 'var(--status-active-bg)', color: 'var(--status-active)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={28} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>سجل الموكلين</span>
            <h3 style={{ fontSize: '1.7rem', fontWeight: '800', marginTop: '0.1rem' }}>{clients.length}</h3>
          </div>
        </div>

        {/* Card 4: Debtor Clients */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', cursor: 'pointer' }} onClick={() => setActiveTab('clients')}>
          <div style={{ width: '54px', height: '54px', borderRadius: '14px', background: 'var(--status-dismissed-bg)', color: 'var(--status-dismissed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertCircle size={28} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>موكلين عليهم مستحقات</span>
            <h3 style={{ fontSize: '1.7rem', fontWeight: '800', marginTop: '0.1rem' }}>{debtorClients.length}</h3>
          </div>
        </div>
      </div>

      {/* Main Grid: Upcoming Sessions & Recent Rulings */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Urgent Hearings Roll */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Clock size={20} color="var(--primary-600)" />
              <span>أقرب الجلسات القادمة بالمحاكم</span>
            </div>
            <button className="btn btn-secondary" onClick={() => setActiveTab('agenda')} style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
              عرض الأجندة كاملة
              <ArrowLeft size={15} />
            </button>
          </div>

          {upcomingCases.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={40} style={{ margin: '0 auto 0.8rem', color: 'var(--status-active)' }} />
              <p>لا توجد جلسات محددة خلال الأيام القادمة.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>تاريخ الجلسة</th>
                    <th>رقم الدعوى</th>
                    <th>المحكمة / القاعة</th>
                    <th>الخصوم والموضوع</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingCases.map((c) => {
                    const st = CASE_STATUSES[c.status] || CASE_STATUSES.active;
                    return (
                      <tr key={c.id}>
                        <td style={{ fontWeight: '700', color: 'var(--primary-700)' }}>
                          {c.next_session_date ? new Date(c.next_session_date).toLocaleDateString('ar-EG', { weekday: 'short', month: 'numeric', day: 'numeric' }) : '—'}
                        </td>
                        <td>
                          <strong>{c.case_number}</strong> / {c.case_year}
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{CASE_TYPES[c.case_type] || c.case_type}</div>
                        </td>
                        <td>
                          <div>{c.court_name}</div>
                          {c.court_room && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>قاعة: {c.court_room}</div>}
                        </td>
                        <td>
                          <div style={{ fontWeight: '600' }}>{c.case_title || c.plaintiff_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ضد: {c.defendant_name}</div>
                        </td>
                        <td>
                          <span className="badge" style={{ background: st.bg, color: st.color }}>
                            {st.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Side Panel: Recent Rulings & Law Office Distribution */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Recent Rulings */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Gavel size={20} color="var(--accent-gold)" />
                <span>آخر الأحكام والقرارات</span>
              </div>
            </div>

            {recentRulings.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', textAlign: 'center', padding: '1rem 0' }}>
                لم يتم تسجيل أحكام نهائية مؤخراً.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {recentRulings.map((r) => (
                  <div key={r.id} style={{ padding: '0.8rem', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                      <strong style={{ fontSize: '0.88rem' }}>دعوى {r.case_number}/{r.case_year}</strong>
                      <span className="badge" style={{ background: 'var(--status-judgment-bg)', color: 'var(--status-judgment)', fontSize: '0.72rem' }}>
                        {r.status === 'finalJudgment' ? 'حكم نهائي' : 'قرار جلسة'}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineBreak: 'anywhere' }}>
                      {r.ruling_text || r.notes || 'تم إصدار الحكم'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Action Box */}
          <div className="card" style={{ background: 'linear-gradient(135deg, var(--bg-card), var(--primary-50))' }}>
            <h4 style={{ marginBottom: '0.6rem', fontSize: '1rem' }}>طباعة رول الجلسة اليومي</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              قم بتجهيز وطباعة رول جلسات اليوم للمحامين لحضوره أمام الدائرة القضائية.
            </p>
            <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setActiveTab('agenda')}>
              الانتقال إلى رول الجلسات والطباعة
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
