import React, { useState, useMemo } from 'react';
import {
  Briefcase,
  Calendar,
  Users,
  Gavel,
  Clock,
  ArrowLeft,
  CheckCircle2,
  PieChart,
  BarChart3,
  Building2,
  UserCheck,
  Send,
  ClipboardList,
  ChevronRight,
  TrendingUp,
  Scale,
  Sparkles
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { CASE_TYPES, CASE_STATUSES, COURT_LEVELS, USER_ROLES } from '../lib/supabase';

// =========================================================================
// MINIMAL REUSABLE SVG PIE / DONUT CHART COMPONENT
// =========================================================================
function MinimalPieChart({ data = [], centerLabel = '', centerSub = '', height = 180 }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const total = useMemo(() => {
    return data.reduce((sum, item) => sum + (item.value || 0), 0);
  }, [data]);

  const slices = useMemo(() => {
    if (total === 0) return [];
    let currentAngle = 0;
    return data.map((item, index) => {
      const angle = (item.value / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle += angle;

      const percentage = Math.round((item.value / total) * 100);

      return {
        ...item,
        startAngle,
        endAngle,
        percentage,
        index
      };
    });
  }, [data, total]);

  const getPath = (slice, isHovered) => {
    const cx = 60;
    const cy = 60;
    const rOuter = isHovered ? 54 : 50;
    const rInner = 32;
    const { startAngle, endAngle } = slice;
    const angleDiff = endAngle - startAngle;

    if (angleDiff >= 359.9) {
      return `M ${cx} ${cy - rOuter} A ${rOuter} ${rOuter} 0 1 0 ${cx} ${cy + rOuter} A ${rOuter} ${rOuter} 0 1 0 ${cx} ${cy - rOuter} M ${cx} ${cy - rInner} A ${rInner} ${rInner} 0 1 1 ${cx} ${cy + rInner} A ${rInner} ${rInner} 0 1 1 ${cx} ${cy - rInner} Z`;
    }

    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;

    const x1 = cx + rOuter * Math.cos(startRad);
    const y1 = cy + rOuter * Math.sin(startRad);
    const x2 = cx + rOuter * Math.cos(endRad);
    const y2 = cy + rOuter * Math.sin(endRad);

    const x3 = cx + rInner * Math.cos(endRad);
    const y3 = cy + rInner * Math.sin(endRad);
    const x4 = cx + rInner * Math.cos(startRad);
    const y4 = cy + rInner * Math.sin(startRad);

    const largeArc = angleDiff > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4} ${y4} Z`;
  };

  if (total === 0 || slices.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
        <PieChart size={36} style={{ margin: '0 auto 0.5rem', opacity: 0.35 }} />
        <p style={{ margin: 0, fontSize: '0.85rem' }}>لا توجد بيانات كافية للرسم البياني</p>
      </div>
    );
  }

  const activeSlice = hoveredIdx !== null ? slices[hoveredIdx] : null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
      {/* SVG Donut */}
      <div style={{ position: 'relative', width: `${height}px`, height: `${height}px`, flexShrink: 0, margin: '0 auto' }}>
        <svg viewBox="0 0 120 120" style={{ width: '100%', height: '100%', transform: 'rotate(0deg)' }}>
          {slices.map((slice) => {
            const isHovered = hoveredIdx === slice.index;
            return (
              <path
                key={slice.index}
                d={getPath(slice, isHovered)}
                fill={slice.color}
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: hoveredIdx === null || isHovered ? 1 : 0.45,
                  filter: isHovered ? 'drop-shadow(0 2px 8px rgba(0,0,0,0.25))' : 'none'
                }}
                onMouseEnter={() => setHoveredIdx(slice.index)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
        </svg>

        {/* Center Label */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)', lineHeight: 1.1 }}>
            {activeSlice ? activeSlice.value : total}
          </span>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '600', marginTop: '2px', maxWidth: '65px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activeSlice ? activeSlice.label : (centerLabel || 'الإجمالي')}
          </span>
        </div>
      </div>

      {/* Clean Minimal Legend */}
      <div style={{ flex: '1 1 180px', width: '100%', minWidth: '140px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {slices.map((slice) => {
          const isHovered = hoveredIdx === slice.index;
          return (
            <div
              key={slice.index}
              onMouseEnter={() => setHoveredIdx(slice.index)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.3rem 0.5rem',
                borderRadius: '8px',
                background: isHovered ? 'var(--bg-card-subtle)' : 'transparent',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
                fontSize: '0.8rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: slice.color, flexShrink: 0 }}></span>
                <span style={{ color: isHovered ? 'var(--primary-800)' : 'var(--text-main)', fontWeight: isHovered ? '700' : '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {slice.label}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>{slice.value}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>({slice.percentage}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =========================================================================
// MAIN DASHBOARD PAGE (MINIMALIST & CLEAN)
// =========================================================================
export default function DashboardPage({ setActiveTab }) {
  const { cases, clients, adminTasks = [], bailiffTasks = [], team } = useData();
  const [timeHorizon, setTimeHorizon] = useState('ALL'); // 'ALL' | 'YEAR' | 'MONTH'

  const todayStr = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();
  const currentMonthStr = `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  // Filter cases based on selected time
  const activeCases = useMemo(() => {
    return cases.filter(c => {
      if (c.is_archived) return false;
      if (timeHorizon === 'MONTH') {
        return (c.next_session_date && c.next_session_date.startsWith(currentMonthStr)) || c.case_year === currentYear;
      }
      if (timeHorizon === 'YEAR') {
        return c.case_year === currentYear;
      }
      return true;
    });
  }, [cases, timeHorizon, currentMonthStr, currentYear]);

  // Today Sessions
  const todaySessions = useMemo(() => {
    return cases.filter(c => !c.is_archived && c.next_session_date && c.next_session_date.startsWith(todayStr));
  }, [cases, todayStr]);

  // Pending Admin Tasks & Bailiff Notices
  const pendingAdminTasks = useMemo(() => {
    return adminTasks.filter(t => t.status !== 'completed');
  }, [adminTasks]);

  const pendingBailiffs = useMemo(() => {
    return bailiffTasks.filter(b => b.status !== 'delivered');
  }, [bailiffTasks]);

  // -------------------------------------------------------------------------
  // 1. DATA FOR PIE CHART 1: Case Types (أنواع القضايا)
  // -------------------------------------------------------------------------
  const caseTypePieData = useMemo(() => {
    const counts = {};
    activeCases.forEach(c => {
      const typeKey = c.case_type || 'civil';
      const label = CASE_TYPES[typeKey] || typeKey;
      counts[label] = (counts[label] || 0) + 1;
    });

    const palette = [
      '#4f0810', '#c59828', '#0e7490', '#15803d', '#7c3aed', '#b91c1c', '#d97706', '#475569'
    ];

    return Object.entries(counts)
      .map(([label, value], idx) => ({
        label,
        value,
        color: palette[idx % palette.length]
      }))
      .sort((a, b) => b.value - a.value);
  }, [activeCases]);

  // -------------------------------------------------------------------------
  // 2. DATA FOR PIE CHART 2: Case Statuses (حالات الدعاوى)
  // -------------------------------------------------------------------------
  const caseStatusPieData = useMemo(() => {
    const counts = {};
    activeCases.forEach(c => {
      const stKey = c.status || 'active';
      const label = CASE_STATUSES[stKey]?.label || stKey;
      counts[label] = (counts[label] || 0) + 1;
    });

    const statusColors = {
      'متداول': '#0284c7',
      'مؤجلة': '#d97706',
      'محجوزة للحكم': '#7c3aed',
      'حكم نهائي': '#16a34a',
      'حكم تمهيدي': '#0d9488',
      'مشطوبة / مرفوضة': '#dc2626',
      'صلح / منتهية': '#059669'
    };

    return Object.entries(counts)
      .map(([label, value]) => ({
        label,
        value,
        color: statusColors[label] || '#64748b'
      }))
      .sort((a, b) => b.value - a.value);
  }, [activeCases]);

  // -------------------------------------------------------------------------
  // 3. DATA FOR PIE CHART 3: Litigation Stages (درجات التقاضي)
  // -------------------------------------------------------------------------
  const courtLevelPieData = useMemo(() => {
    const counts = {};
    activeCases.forEach(c => {
      const lvlKey = c.court_level || 'primary';
      const label = COURT_LEVELS[lvlKey] || lvlKey;
      counts[label] = (counts[label] || 0) + 1;
    });

    const levelColors = {
      'جزئي': '#0284c7',
      'ابتدائي': '#4f0810',
      'استئناف': '#c59828',
      'نقض': '#15803d',
      'مجلس الدولة': '#6d28d9'
    };

    return Object.entries(counts)
      .map(([label, value]) => ({
        label,
        value,
        color: levelColors[label] || '#475569'
      }))
      .sort((a, b) => b.value - a.value);
  }, [activeCases]);

  // -------------------------------------------------------------------------
  // 4. DATA FOR PIE CHART 4: Operational Tasks (الأعمال الإدارية والمحضرين)
  // -------------------------------------------------------------------------
  const operationalPieData = useMemo(() => {
    const completedAdmin = adminTasks.filter(t => t.status === 'completed').length;
    const pendingAdmin = adminTasks.filter(t => t.status !== 'completed').length;
    const deliveredBailiffs = bailiffTasks.filter(b => b.status === 'delivered').length;
    const pendingBailiffCount = bailiffTasks.filter(b => b.status !== 'delivered').length;

    const data = [
      { label: 'إداري منجز', value: completedAdmin, color: '#16a34a' },
      { label: 'إداري قيد التنفيذ', value: pendingAdmin, color: '#4f0810' },
      { label: 'محضرين مستلم', value: deliveredBailiffs, color: '#0d9488' },
      { label: 'محضرين قيد الإعلان', value: pendingBailiffCount, color: '#c59828' }
    ].filter(item => item.value > 0);

    return data;
  }, [adminTasks, bailiffTasks]);

  // Top Courts Summary
  const topCourts = useMemo(() => {
    const counts = {};
    activeCases.forEach(c => {
      const court = c.court_name || 'محكمة دمياط الابتدائية';
      counts[court] = (counts[court] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [activeCases]);

  return (
    <div className="page-wrapper" style={{ maxWidth: '1400px' }}>
      {/* Top Header & Horizon Filter */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-gold)' }}></span>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--primary-700)', textTransform: 'uppercase' }}>
              المكتب الرقمي القضائي
            </span>
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
            لوحة الإحصائيات والمؤشرات
          </h1>
        </div>

        {/* Minimal Horizon Filter */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-card)',
          padding: '0.25rem',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          gap: '0.25rem'
        }}>
          <button
            type="button"
            style={{
              padding: '0.45rem 0.95rem',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer',
              background: timeHorizon === 'ALL' ? 'var(--primary-800)' : 'transparent',
              color: timeHorizon === 'ALL' ? '#ffffff' : 'var(--text-muted)',
              transition: 'all 0.15s ease'
            }}
            onClick={() => setTimeHorizon('ALL')}
          >
            الكل
          </button>
          <button
            type="button"
            style={{
              padding: '0.45rem 0.95rem',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer',
              background: timeHorizon === 'YEAR' ? 'var(--primary-800)' : 'transparent',
              color: timeHorizon === 'YEAR' ? '#ffffff' : 'var(--text-muted)',
              transition: 'all 0.15s ease'
            }}
            onClick={() => setTimeHorizon('YEAR')}
          >
            سنة {currentYear}
          </button>
          <button
            type="button"
            style={{
              padding: '0.45rem 0.95rem',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer',
              background: timeHorizon === 'MONTH' ? 'var(--primary-800)' : 'transparent',
              color: timeHorizon === 'MONTH' ? '#ffffff' : 'var(--text-muted)',
              transition: 'all 0.15s ease'
            }}
            onClick={() => setTimeHorizon('MONTH')}
          >
            هذا الشهر
          </button>
        </div>
      </div>

      {/* 4 Clean Minimal KPI Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '0.85rem',
        marginBottom: '1.25rem'
      }}>
        {/* KPI 1: Active Cases */}
        <div
          className="card"
          style={{ padding: '1rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.4rem', transition: 'transform 0.15s ease' }}
          onClick={() => setActiveTab && setActiveTab('cases')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700' }}>الدعاوى المتداولة</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-700)' }}>
              <Briefcase size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-main)', lineHeight: 1 }}>
            {activeCases.length}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>
            إجمالي ملفات القضايا النشطة
          </span>
        </div>

        {/* KPI 2: Today Sessions */}
        <div
          className="card"
          style={{ padding: '1rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.4rem', transition: 'transform 0.15s ease' }}
          onClick={() => setActiveTab && setActiveTab('agenda')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700' }}>جلسات اليوم</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: todaySessions.length > 0 ? 'var(--status-adjourned-bg)' : 'var(--bg-card-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: todaySessions.length > 0 ? 'var(--status-adjourned)' : 'var(--text-muted)' }}>
              <Calendar size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: todaySessions.length > 0 ? 'var(--primary-800)' : 'var(--text-main)', lineHeight: 1 }}>
            {todaySessions.length}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>
            {todaySessions.length > 0 ? 'جلسات منعقدة اليوم بالمحاكم' : 'لا توجد جلسات مجدولة'}
          </span>
        </div>

        {/* KPI 3: Operational Tasks */}
        <div
          className="card"
          style={{ padding: '1rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.4rem', transition: 'transform 0.15s ease' }}
          onClick={() => setActiveTab && setActiveTab('administrative')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700' }}>أعمال إدارية جارية</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-700)' }}>
              <ClipboardList size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-main)', lineHeight: 1 }}>
            {pendingAdminTasks.length}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>
            + {pendingBailiffs.length} ورقة محضرين
          </span>
        </div>

        {/* KPI 4: Clients & Team */}
        <div
          className="card"
          style={{ padding: '1rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.4rem', transition: 'transform 0.15s ease' }}
          onClick={() => setActiveTab && setActiveTab('clients')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700' }}>سجل الموكلين</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--bg-card-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)' }}>
              <Users size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-main)', lineHeight: 1 }}>
            {clients.length}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>
            فريق العمل: {team.length} أعضاء
          </span>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2x2 GRID OF INTERACTIVE MINIMAL PIE / DONUT CHARTS                    */}
      {/* ===================================================================== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1rem',
        marginBottom: '1.25rem'
      }}>
        {/* CHART 1: Case Types Breakdown */}
        <div className="card" style={{ padding: '1.15rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <PieChart size={17} color="var(--primary-700)" />
              <h3 style={{ fontSize: '0.94rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
                توزيع القضايا حسب النوع
              </h3>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '700' }}>
              {caseTypePieData.length} تخصصات
            </span>
          </div>

          <MinimalPieChart
            data={caseTypePieData}
            centerLabel="قضية"
            height={150}
          />
        </div>

        {/* CHART 2: Case Statuses Breakdown */}
        <div className="card" style={{ padding: '1.15rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <BarChart3 size={17} color="var(--accent-gold)" />
              <h3 style={{ fontSize: '0.94rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
                حالات الدعاوى
              </h3>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '700' }}>
              {caseStatusPieData.length} حالات
            </span>
          </div>

          <MinimalPieChart
            data={caseStatusPieData}
            centerLabel="حالة"
            height={150}
          />
        </div>

        {/* CHART 3: Operational Tasks Breakdown */}
        <div className="card" style={{ padding: '1.15rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Send size={17} color="var(--accent-gold)" />
              <h3 style={{ fontSize: '0.94rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
                الأعمال الإدارية والمحضرين
              </h3>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '700' }}>
              إجمالي: {adminTasks.length + bailiffTasks.length}
            </span>
          </div>

          <MinimalPieChart
            data={operationalPieData}
            centerLabel="معاملة"
            height={150}
          />
        </div>
      </div>

      {/* ===================================================================== */}
      {/* BOTTOM ROW: TOP COURTS & TEAM WORKLOAD                                */}
      {/* ===================================================================== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1rem'
      }}>
        {/* Top Courts Distribution */}
        <div className="card" style={{ padding: '1.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={18} color="var(--primary-700)" />
              <h3 style={{ fontSize: '0.95rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
                أبرز المحاكم والدوائر
              </h3>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', minHeight: 'auto' }}
              onClick={() => setActiveTab && setActiveTab('cases')}
            >
              عرض الكل
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {topCourts.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem 0' }}>لا توجد قضايا مقيدة</p>
            ) : (
              topCourts.map((c, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.55rem 0.75rem', background: 'var(--bg-card-subtle)', borderRadius: '8px', fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Building2 size={14} color="var(--primary-700)" />
                    <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{c.name}</span>
                  </div>
                  <span className="badge" style={{ background: 'var(--primary-100)', color: 'var(--primary-800)', fontWeight: '700' }}>
                    {c.count} قضايا
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Team Workload Summary */}
        <div className="card" style={{ padding: '1.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserCheck size={18} color="var(--primary-700)" />
              <h3 style={{ fontSize: '0.95rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
                توزيع ملفات القضايا على الفريق
              </h3>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', minHeight: 'auto' }}
              onClick={() => setActiveTab && setActiveTab('team')}
            >
              إدارة الفريق
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {team.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem 0' }}>لم يتم تسجيل أعضاء بالفريق</p>
            ) : (
              team.slice(0, 4).map(member => {
                const count = activeCases.filter(c => c.next_steps === member.id || c.next_steps === 'assigned:' + member.id).length;
                return (
                  <div key={member.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.55rem 0.75rem', background: 'var(--bg-card-subtle)', borderRadius: '8px', fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div className="avatar" style={{ width: '28px', height: '28px', fontSize: '0.78rem', background: 'var(--primary-800)', color: '#ffffff' }}>
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>الأستاذ / {member.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{USER_ROLES[member.role] || member.role}</div>
                      </div>
                    </div>
                    <span className="badge" style={{ background: count > 0 ? 'var(--primary-100)' : 'var(--bg-card)', color: count > 0 ? 'var(--primary-800)' : 'var(--text-muted)', fontWeight: '700' }}>
                      {count} قضايا
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
