import React, { useState, useMemo } from 'react';
import {
  Briefcase,
  Calendar,
  Users,
  Gavel,
  Clock,
  ArrowLeft,
  CheckCircle2,
  Building2,
  UserCheck,
  ClipboardList,
  ChevronRight,
  Scale,
  Sparkles,
  AlertTriangle,
  Ban,
  RotateCcw,
  Check,
  Plus,
  ArrowRight,
  ExternalLink,
  History,
  FileText,
  User,
  ShieldAlert,
  CalendarDays,
  FileCheck
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { CASE_TYPES, CASE_STATUSES, USER_ROLES } from '../lib/supabase';
import {
  getTodayLocalStr,
  getTomorrowLocalStr,
  isPastDate,
  getDaysOverdue,
  formatArabicDate,
  formatRelativeTime
} from '../lib/dateRules';
import SessionDecisionModal from '../components/common/SessionDecisionModal';
import AdministrativeTaskUpdateModal, { ADMIN_TASK_STATUSES } from '../components/common/AdministrativeTaskUpdateModal';
import QuickActionModal from '../components/layout/QuickActionModal';

export default function DashboardPage({ setActiveTab }) {
  const { user } = useAuth();
  const {
    cases = [],
    clients = [],
    sessions = [],
    adminTasks = [],
    adminTaskUpdates = [],
    appeals = [],
    team = [],
    officeProfile,
    loading
  } = useData();

  // Scope filter: 'ALL' (كافة أعمال المكتب) | 'MY' (أعمالي ومتابعاتي فقط)
  const [scope, setScope] = useState('ALL');

  // Modal states for direct in-page actions
  const [decisionCase, setDecisionCase] = useState(null);
  const [taskToUpdate, setTaskToUpdate] = useState(null);
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [quickActionMode, setQuickActionMode] = useState('case');

  // Current local dates
  const todayStr = getTodayLocalStr();
  const tomorrowStr = getTomorrowLocalStr();

  // Time-aware greeting
  const currentHour = new Date().getHours();
  const greetingText = currentHour < 12 ? 'صباح الخير' : (currentHour < 17 ? 'مساء الخير' : 'أهلاً بك');
  const lawyerDisplayName = officeProfile?.lawyer_name || user?.user_metadata?.full_name || 'الأستاذ';
  const todayFormatted = formatArabicDate(todayStr, true);

  // Find matching team member ID for current user (if any)
  const currentTeamMember = useMemo(() => {
    if (!user) return null;
    return team.find(m => m.user_id === user.id || m.name === lawyerDisplayName);
  }, [user, team, lawyerDisplayName]);

  // -------------------------------------------------------------------------
  // 1. DATA FILTERING BY SCOPE
  // -------------------------------------------------------------------------
  const scopedCases = useMemo(() => {
    if (scope === 'MY' && currentTeamMember) {
      return cases.filter(c =>
        c.next_steps === currentTeamMember.id ||
        (c.next_steps || '').includes(currentTeamMember.id) ||
        c.plaintiff_name === currentTeamMember.name
      );
    }
    return cases;
  }, [cases, scope, currentTeamMember]);

  const scopedAdminTasks = useMemo(() => {
    if (scope === 'MY' && currentTeamMember) {
      return adminTasks.filter(t => t.assigned_to === currentTeamMember.id);
    }
    return adminTasks;
  }, [adminTasks, scope, currentTeamMember]);

  // -------------------------------------------------------------------------
  // 2. METRICS & COUNTS
  // -------------------------------------------------------------------------
  // Active cases
  const activeCases = useMemo(() => {
    return scopedCases.filter(c => !c.is_archived && c.status !== 'finalJudgment' && c.status !== 'settled' && c.status !== 'dismissed');
  }, [scopedCases]);

  // Today's court sessions
  const todaySessions = useMemo(() => {
    return scopedCases.filter(c => !c.is_archived && c.next_session_date && c.next_session_date.startsWith(todayStr));
  }, [scopedCases, todayStr]);

  // Tomorrow's court sessions
  const tomorrowSessions = useMemo(() => {
    return scopedCases.filter(c => !c.is_archived && c.next_session_date && c.next_session_date.startsWith(tomorrowStr));
  }, [scopedCases, tomorrowStr]);

  // Overdue administrative tasks (due < today and active)
  const overdueTasks = useMemo(() => {
    return scopedAdminTasks.filter(t =>
      t.execution_date &&
      isPastDate(t.execution_date) &&
      t.status !== 'completed' &&
      t.status !== 'cancelled'
    ).sort((a, b) => new Date(a.execution_date) - new Date(b.execution_date));
  }, [scopedAdminTasks]);

  // Today's administrative follow-ups
  const todayAdminTasks = useMemo(() => {
    return scopedAdminTasks.filter(t =>
      t.execution_date &&
      t.execution_date.startsWith(todayStr) &&
      t.status !== 'completed' &&
      t.status !== 'cancelled'
    );
  }, [scopedAdminTasks, todayStr]);

  // Today's appeal follow-ups
  const todayAppeals = useMemo(() => {
    return appeals.filter(a => a.follow_up_date && a.follow_up_date.startsWith(todayStr));
  }, [appeals, todayStr]);

  // Total follow-ups due today
  const todayFollowUpsCount = todayAdminTasks.length + todayAppeals.length;

  // Active cases without any next court session date scheduled
  const unscheduledCases = useMemo(() => {
    return activeCases.filter(c => !c.next_session_date);
  }, [activeCases]);

  // Upcoming administrative tasks (today or future, not completed/cancelled)
  const upcomingAdminTasks = useMemo(() => {
    return scopedAdminTasks
      .filter(t => t.status !== 'completed' && t.status !== 'cancelled')
      .sort((a, b) => {
        if (!a.execution_date) return 1;
        if (!b.execution_date) return -1;
        return new Date(a.execution_date) - new Date(b.execution_date);
      })
      .slice(0, 6);
  }, [scopedAdminTasks]);

  // -------------------------------------------------------------------------
  // 3. RECENT MEANINGFUL CASE ACTIVITY
  // -------------------------------------------------------------------------
  const recentActivity = useMemo(() => {
    const list = [];

    // Sessions with decisions or judgments
    sessions.forEach(s => {
      if (s.created_at || s.session_date) {
        const relCase = cases.find(c => c.id === s.case_id);
        let title = 'جلسة مرافعة';
        let detail = s.notes || s.adjournment_reason || s.ruling_text || '';

        if (s.status === 'adjourned') {
          title = 'تأجيل جلسة';
          detail = s.adjournment_reason ? `السبب: ${s.adjournment_reason}` : (s.next_session_date ? `إلى ${s.next_session_date}` : '');
        } else if (s.status === 'preliminaryJudgment') {
          title = 'صدور حكم تمهيدي';
          detail = s.ruling_text ? `المنطوق: ${s.ruling_text.slice(0, 70)}...` : 'تم ندب خبير أو إجراء إثبات';
        } else if (s.status === 'finalJudgment') {
          title = 'صدور حكم نهائي قطعي';
          detail = s.ruling_text ? `المنطوق: ${s.ruling_text.slice(0, 70)}...` : '';
        }

        list.push({
          id: `sess_${s.id}`,
          type: 'session',
          timestamp: s.created_at || s.session_date,
          title,
          detail,
          caseItem: relCase,
          badgeColor: s.status === 'finalJudgment' ? '#15803d' : (s.status === 'preliminaryJudgment' ? '#1d4ed8' : '#9a3412')
        });
      }
    });

    // Appeals
    appeals.forEach(a => {
      const relCase = cases.find(c => c.id === a.case_id);
      list.push({
        id: `app_${a.id}`,
        type: 'appeal',
        timestamp: a.created_at,
        title: 'قيد ميعاد متابعة استئناف',
        detail: a.judgment_text ? `منطوق الحكم: ${a.judgment_text.slice(0, 60)}...` : (a.follow_up_date ? `ميعاد المتابعة: ${a.follow_up_date}` : ''),
        caseItem: relCase,
        badgeColor: '#2563eb'
      });
    });

    // Admin Task Updates
    adminTaskUpdates.forEach(u => {
      const relCase = cases.find(c => c.id === u.case_id);
      let title = 'تحديث عمل إداري';
      if (u.action_type === 'postponed') title = 'تأجيل متابعة إدارية';
      else if (u.action_type === 'completed') title = 'إتمام عمل إداري';
      else if (u.action_type === 'created') title = 'إسناد عمل إداري جديد';

      list.push({
        id: `upd_${u.id}`,
        type: 'task',
        timestamp: u.created_at,
        title,
        detail: u.update_text || (u.new_due_date ? `الموعد الجديد: ${u.new_due_date}` : ''),
        caseItem: relCase,
        badgeColor: u.action_type === 'completed' ? '#15803d' : (u.action_type === 'postponed' ? '#c2410c' : 'var(--primary-700)')
      });
    });

    return list
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 6);
  }, [sessions, appeals, adminTaskUpdates, cases]);

  // Helper to resolve assignee name
  const resolveMemberName = (id) => {
    if (!id) return 'غير محدد';
    const m = team.find(t => t.id === id);
    return m ? `أ/ ${m.name}` : 'غير محدد';
  };

  // Open quick action in specific mode
  const handleOpenQuick = (mode) => {
    setQuickActionMode(mode);
    setIsQuickActionOpen(true);
  };

  return (
    <div className="page-wrapper" style={{ maxWidth: '1400px' }}>
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & TIME-AWARE GREETING                                       */}
      {/* ========================================================================= */}
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
            <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--primary-700)', textTransform: 'uppercase' }}>
              مركز قيادة المكتب والمتابعة التشغيلية
            </span>
          </div>

          <h1 style={{ fontSize: '1.55rem', fontWeight: '900', margin: 0, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            {greetingText}، {lawyerDisplayName}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', color: 'var(--text-muted)', fontSize: '0.86rem' }}>
            <CalendarDays size={15} color="var(--primary-700)" />
            <span>{todayFormatted}</span>
          </div>
        </div>

        {/* Scope Switch: 'ALL' vs 'MY' */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-card)',
          padding: '0.25rem',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          gap: '0.25rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <button
            type="button"
            onClick={() => setScope('ALL')}
            style={{
              padding: '0.45rem 0.95rem',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: '800',
              cursor: 'pointer',
              background: scope === 'ALL' ? 'var(--primary-800)' : 'transparent',
              color: scope === 'ALL' ? '#ffffff' : 'var(--text-muted)',
              transition: 'all 0.15s ease'
            }}
          >
            كافة أعمال المكتب
          </button>
          <button
            type="button"
            onClick={() => setScope('MY')}
            style={{
              padding: '0.45rem 0.95rem',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: '800',
              cursor: 'pointer',
              background: scope === 'MY' ? 'var(--primary-800)' : 'transparent',
              color: scope === 'MY' ? '#ffffff' : 'var(--text-muted)',
              transition: 'all 0.15s ease'
            }}
          >
            مهامي ومتابعاتي
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SUMMARY METRICS ROW (ACTIONABLE CLICKABLE CARDS)                        */}
      {/* ========================================================================= */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
        gap: '0.85rem',
        marginBottom: '1.4rem'
      }}>
        {/* Card 1: Today Sessions */}
        <div
          className="card"
          onClick={() => setActiveTab && setActiveTab('agenda')}
          style={{
            padding: '1rem 1.1rem',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
            border: todaySessions.length > 0 ? '1.5px solid var(--primary-500)' : '1px solid var(--border-color)',
            background: 'var(--bg-card)',
            borderRadius: '14px',
            boxShadow: 'var(--shadow-sm)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700' }}>جلسات اليوم</span>
            <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-800)' }}>
              <Gavel size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: '900', color: 'var(--text-main)', lineHeight: 1.1 }}>
            {todaySessions.length}
          </div>
          <span style={{ fontSize: '0.74rem', color: todaySessions.length > 0 ? 'var(--primary-800)' : 'var(--text-subtle)', fontWeight: '700' }}>
            {todaySessions.length > 0 ? 'انقر لفتح رول الجلسات ←' : 'لا توجد جلسات اليوم'}
          </span>
        </div>

        {/* Card 2: Today Follow-ups */}
        <div
          className="card"
          onClick={() => setActiveTab && setActiveTab('administrative')}
          style={{
            padding: '1rem 1.1rem',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
            border: todayFollowUpsCount > 0 ? '1.5px solid #d97706' : '1px solid var(--border-color)',
            background: 'var(--bg-card)',
            borderRadius: '14px',
            boxShadow: 'var(--shadow-sm)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700' }}>متابعات اليوم</span>
            <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b45309' }}>
              <Clock size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: '900', color: 'var(--text-main)', lineHeight: 1.1 }}>
            {todayFollowUpsCount}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#b45309', fontWeight: '700' }}>
            {todayAdminTasks.length} إداري + {todayAppeals.length} استئناف
          </span>
        </div>

        {/* Card 3: Overdue Tasks */}
        <div
          className="card"
          onClick={() => setActiveTab && setActiveTab('administrative')}
          style={{
            padding: '1rem 1.1rem',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
            border: overdueTasks.length > 0 ? '1.5px solid #dc2626' : '1px solid var(--border-color)',
            background: overdueTasks.length > 0 ? '#fff5f5' : 'var(--bg-card)',
            borderRadius: '14px',
            boxShadow: 'var(--shadow-sm)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: overdueTasks.length > 0 ? '#dc2626' : 'var(--text-muted)', fontWeight: '800' }}>مهام متأخرة</span>
            <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: overdueTasks.length > 0 ? '#fee2e2' : 'var(--bg-card-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
              <AlertTriangle size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: '900', color: overdueTasks.length > 0 ? '#dc2626' : 'var(--text-main)', lineHeight: 1.1 }}>
            {overdueTasks.length}
          </div>
          <span style={{ fontSize: '0.74rem', color: overdueTasks.length > 0 ? '#b91c1c' : 'var(--text-subtle)', fontWeight: '700' }}>
            {overdueTasks.length > 0 ? 'تتطلب تدخلاً ومتابعة عاجلة' : 'لا توجد مهام متأخرة 🎉'}
          </span>
        </div>

        {/* Card 4: Active Cases */}
        <div
          className="card"
          onClick={() => setActiveTab && setActiveTab('cases')}
          style={{
            padding: '1rem 1.1rem',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-card)',
            borderRadius: '14px',
            boxShadow: 'var(--shadow-sm)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700' }}>القضايا المتداولة</span>
            <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-700)' }}>
              <Briefcase size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: '900', color: 'var(--text-main)', lineHeight: 1.1 }}>
            {activeCases.length}
          </div>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-subtle)' }}>
            ملفات الدعاوى النشطة بالمكتب
          </span>
        </div>

        {/* Card 5: Clients */}
        <div
          className="card"
          onClick={() => setActiveTab && setActiveTab('clients')}
          style={{
            padding: '1rem 1.1rem',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-card)',
            borderRadius: '14px',
            boxShadow: 'var(--shadow-sm)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700' }}>الموكلين</span>
            <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'var(--bg-card-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-700)' }}>
              <Users size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: '900', color: 'var(--text-main)', lineHeight: 1.1 }}>
            {clients.length}
          </div>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-subtle)' }}>
            سجل الموكلين والشركات
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN OPERATIONAL GRID (NEEDS ATTENTION + TODAY'S SESSIONS)             */}
      {/* ========================================================================= */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))',
        gap: '1.25rem',
        marginBottom: '1.5rem',
        alignItems: 'start'
      }}>
        {/* ===================================================================== */}
        {/* COLUMN A: ⚠️ يحتاج انتباهك (NEEDS ATTENTION) - TOP PRIORITY          */}
        {/* ===================================================================== */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          padding: '1.2rem',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                <ShieldAlert size={17} />
              </div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
                يحتاج انتباهك وإجراءاتك
              </h2>
            </div>

            <span style={{
              fontSize: '0.78rem',
              fontWeight: '800',
              padding: '0.2rem 0.6rem',
              borderRadius: '12px',
              background: overdueTasks.length > 0 ? '#fee2e2' : 'var(--bg-card-subtle)',
              color: overdueTasks.length > 0 ? '#dc2626' : 'var(--text-muted)'
            }}>
              {overdueTasks.length + todayAppeals.length + (tomorrowSessions.length > 0 ? 1 : 0) + (unscheduledCases.length > 0 ? 1 : 0)} تنبيهات
            </span>
          </div>

          {/* Attention Items Stream */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {/* Item 1: Overdue Administrative Tasks */}
            {overdueTasks.length > 0 && (
              <div style={{
                background: '#fff5f5',
                border: '1px solid #fecaca',
                borderRadius: '12px',
                padding: '0.8rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '800', color: '#b91c1c', fontSize: '0.88rem' }}>
                    <AlertTriangle size={16} />
                    <span>{overdueTasks.length} مهام إدارية متأخرة المتابعة</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab && setActiveTab('administrative')}
                    style={{ background: 'transparent', border: 'none', color: '#b91c1c', fontSize: '0.78rem', fontWeight: '800', cursor: 'pointer' }}
                  >
                    عرض الكل ←
                  </button>
                </div>

                {overdueTasks.slice(0, 3).map(tsk => {
                  const days = getDaysOverdue(tsk.execution_date);
                  const relCase = tsk.case_id ? cases.find(c => c.id === tsk.case_id) : null;
                  return (
                    <div
                      key={tsk.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: '#ffffff',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #fee2e2',
                        fontSize: '0.82rem'
                      }}
                    >
                      <div>
                        <strong style={{ color: 'var(--text-main)', display: 'block' }}>{tsk.title}</strong>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                          {relCase ? `دعوى ${relCase.case_number}/${relCase.case_year}` : (tsk.client_name || 'عمل عام')}
                          {' — '}
                          <span style={{ color: '#dc2626', fontWeight: '700' }}>متأخرة منذ {days} {days === 1 ? 'يوم' : 'أيام'}</span>
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setTaskToUpdate(tsk)}
                        style={{
                          background: '#dc2626',
                          color: '#ffffff',
                          border: 'none',
                          padding: '0.3rem 0.65rem',
                          borderRadius: '6px',
                          fontSize: '0.76rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          flexShrink: 0
                        }}
                      >
                        تحديث
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Item 2: Tomorrow's Sessions Reminder */}
            {tomorrowSessions.length > 0 && (
              <div
                onClick={() => setActiveTab && setActiveTab('agenda')}
                style={{
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: '12px',
                  padding: '0.75rem 0.95rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={18} color="#b45309" />
                  <div>
                    <strong style={{ fontSize: '0.88rem', color: '#92400e', display: 'block' }}>
                      لديك {tomorrowSessions.length} {tomorrowSessions.length === 1 ? 'جلسة غداً' : 'جلسات غداً'}
                    </strong>
                    <span style={{ fontSize: '0.75rem', color: '#78350f' }}>
                      راجع الملفات وأعد المذكرات مسبقاً قبل الذهاب للمحكمة
                    </span>
                  </div>
                </div>
                <ArrowLeft size={16} color="#b45309" />
              </div>
            )}

            {/* Item 3: Appeal Follow-ups Due Today */}
            {todayAppeals.length > 0 && (
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '12px',
                padding: '0.75rem 0.95rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#1e40af', fontWeight: '800', fontSize: '0.86rem' }}>
                  <Scale size={16} />
                  <span>متابعات استئناف مستحقة اليوم ({todayAppeals.length})</span>
                </div>
                {todayAppeals.map(a => {
                  const relCase = cases.find(c => c.id === a.case_id);
                  return (
                    <div key={a.id} style={{ fontSize: '0.8rem', color: '#1e3a8a', background: '#ffffff', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #dbeafe' }}>
                      <strong>دعوى {relCase ? `${relCase.case_number}/${relCase.case_year}` : 'محددة'}</strong>
                      {a.judgment_text ? ` — ${a.judgment_text.slice(0, 50)}...` : ' — ميعاد متابعة قيد الاستئناف'}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Item 4: Unscheduled Active Cases */}
            {unscheduledCases.length > 0 && (
              <div style={{
                background: 'var(--bg-card-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '0.75rem 0.95rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <strong style={{ fontSize: '0.86rem', color: 'var(--text-main)', display: 'block' }}>
                    {unscheduledCases.length} قضايا متداولة بدون موعد جلسة قادمة
                  </strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    حدد مواعيد الجلسات أو سجل القرارات لتحديث الأجندة
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab && setActiveTab('cases')}
                  style={{
                    background: 'var(--primary-800)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.76rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  عرض القضايا
                </button>
              </div>
            )}

            {/* Empty State when everything is clean */}
            {overdueTasks.length === 0 && tomorrowSessions.length === 0 && todayAppeals.length === 0 && unscheduledCases.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={36} color="#16a34a" style={{ margin: '0 auto 0.5rem', opacity: 0.8 }} />
                <h4 style={{ fontSize: '1rem', fontWeight: '800', margin: '0 0 0.2rem', color: 'var(--text-main)' }}>
                  المكتب في وضع ممتاز!
                </h4>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-subtle)' }}>
                  لا توجد مهام متأخرة أو تنبيهات عاجلة تتطلب انتباهك الآن 🎉
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ===================================================================== */}
        {/* COLUMN B: ⚖️ جلسات اليوم (TODAY'S SESSIONS)                          */}
        {/* ===================================================================== */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          padding: '1.2rem',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-800)' }}>
                <Gavel size={17} />
              </div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
                جلسات اليوم بالمحاكم
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab && setActiveTab('agenda')}
              style={{ background: 'transparent', border: 'none', color: 'var(--primary-800)', fontSize: '0.82rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <span>عرض رول الجلسات</span>
              <ArrowLeft size={14} />
            </button>
          </div>

          {todaySessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bg-card-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem', color: 'var(--text-subtle)' }}>
                <Calendar size={22} />
              </div>
              <h4 style={{ fontSize: '1.02rem', fontWeight: '800', margin: '0 0 0.2rem', color: 'var(--text-main)' }}>
                لا توجد جلسات بالمحاكم لهذا اليوم
              </h4>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-subtle)' }}>
                يمكنك مراجعة الأجندة أو الاستعداد لمتابعات الأيام القادمة 🎉
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {todaySessions.map((c) => {
                const caseTypeLabel = CASE_TYPES[c.case_type] || c.case_type || 'مدني';
                const assigned = team.find(m => m.id === c.next_steps || (c.next_steps || '').includes(m.id));

                return (
                  <div
                    key={c.id}
                    style={{
                      background: 'var(--bg-card-subtle)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '12px',
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.45rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <span style={{
                          background: 'var(--primary-800)',
                          color: '#ffffff',
                          fontWeight: '800',
                          fontSize: '0.75rem',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '6px'
                        }}>
                          {c.next_session_time || '09:00 ص'}
                        </span>

                        <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                          دعوى {c.case_number}/{c.case_year}
                        </strong>

                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: '700',
                          background: 'var(--bg-card)',
                          padding: '0.1rem 0.45rem',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-muted)'
                        }}>
                          {caseTypeLabel}
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          type="button"
                          onClick={() => setDecisionCase(c)}
                          style={{
                            background: 'var(--primary-800)',
                            color: '#ffffff',
                            border: '1px solid var(--accent-gold)',
                            padding: '0.3rem 0.75rem',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: '800',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}
                        >
                          <Plus size={13} />
                          <span>تسجيل القرار</span>
                        </button>
                      </div>
                    </div>

                    {/* Parties & Court */}
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>
                      <strong>{c.plaintiff_name || 'الموكل'}</strong>
                      {c.defendant_name && <span style={{ color: 'var(--text-muted)' }}> × {c.defendant_name}</span>}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', color: 'var(--text-muted)', borderTop: '1px dashed var(--border-subtle)', paddingTop: '0.35rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Building2 size={13} color="var(--primary-700)" />
                        <span>{c.court_name || 'محكمة دمياط الابتدائية'}</span>
                      </span>

                      {assigned && (
                        <span>المكلف: أ/ {assigned.name}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. LOWER GRID: UPCOMING ADMINISTRATIVE TASKS & RECENT CASE ACTIVITY       */}
      {/* ========================================================================= */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))',
        gap: '1.25rem',
        marginBottom: '1.5rem',
        alignItems: 'start'
      }}>
        {/* ===================================================================== */}
        {/* SECTION: 📋 المتابعات الإدارية القادمة                                */}
        {/* ===================================================================== */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          padding: '1.2rem',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b45309' }}>
                <ClipboardList size={17} />
              </div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
                المتابعات الإدارية القادمة
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab && setActiveTab('administrative')}
              style={{ background: 'transparent', border: 'none', color: 'var(--primary-800)', fontSize: '0.82rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <span>عرض كافة الأعمال</span>
              <ArrowLeft size={14} />
            </button>
          </div>

          {upcomingAdminTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={32} color="#16a34a" style={{ margin: '0 auto 0.5rem', opacity: 0.6 }} />
              <p style={{ margin: 0, fontSize: '0.84rem' }}>لا توجد أعمال إدارية قيد المتابعة حالياً</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {upcomingAdminTasks.map(t => {
                const isOverdue = t.execution_date && isPastDate(t.execution_date);
                const isToday = t.execution_date && t.execution_date.startsWith(todayStr);
                const relCase = t.case_id ? cases.find(c => c.id === t.case_id) : null;
                const statusConfig = ADMIN_TASK_STATUSES[t.status] || ADMIN_TASK_STATUSES.pending;

                return (
                  <div
                    key={t.id}
                    style={{
                      background: isOverdue ? '#fff5f5' : (isToday ? '#fffbeb' : 'var(--bg-card-subtle)'),
                      border: isOverdue ? '1px solid #fecaca' : (isToday ? '1px solid #fde68a' : '1px solid var(--border-subtle)'),
                      borderRadius: '10px',
                      padding: '0.75rem 0.95rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.6rem'
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '0.92rem', color: 'var(--text-main)' }}>
                          {t.title}
                        </strong>

                        {relCase && (
                          <span style={{ fontSize: '0.72rem', color: '#1d4ed8', background: '#eff6ff', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: '700' }}>
                            دعوى {relCase.case_number}/{relCase.case_year}
                          </span>
                        )}

                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: '800',
                          padding: '0.1rem 0.45rem',
                          borderRadius: '10px',
                          background: statusConfig.bg,
                          color: statusConfig.color,
                          border: `1px solid ${statusConfig.border}`
                        }}>
                          {statusConfig.label}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span>المكلف: {resolveMemberName(t.assigned_to)}</span>
                        {t.location && <span>المكان: {t.location}</span>}
                        {t.execution_date && (
                          <span style={{ color: isOverdue ? '#dc2626' : (isToday ? '#b45309' : 'var(--primary-800)'), fontWeight: '700' }}>
                            المتابعة: {t.execution_date.split('T')[0]} {isOverdue ? '(متأخرة)' : (isToday ? '(اليوم)' : '')}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setTaskToUpdate(t)}
                      style={{
                        background: 'var(--primary-800)',
                        color: '#ffffff',
                        border: 'none',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                    >
                      تحديث
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ===================================================================== */}
        {/* SECTION: ⚖️ آخر نشاط في القضايا (RECENT ACTIVITY)                    */}
        {/* ===================================================================== */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          padding: '1.2rem',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-800)' }}>
                <History size={17} />
              </div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
                آخر نشاط في القضايا
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab && setActiveTab('cases')}
              style={{ background: 'transparent', border: 'none', color: 'var(--primary-800)', fontSize: '0.82rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <span>سجل القضايا</span>
              <ArrowLeft size={14} />
            </button>
          </div>

          {recentActivity.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
              <History size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
              <p style={{ margin: 0, fontSize: '0.84rem' }}>لا توجد أنشطة مسجلة مؤخراً</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {recentActivity.map(act => {
                return (
                  <div
                    key={act.id}
                    style={{
                      background: 'var(--bg-card-subtle)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '0.7rem 0.9rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.4rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: act.badgeColor }}></span>
                        <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>{act.title}</strong>
                        {act.caseItem && (
                          <span style={{ fontSize: '0.74rem', color: 'var(--primary-800)', fontWeight: '800' }}>
                            — دعوى {act.caseItem.case_number}/{act.caseItem.case_year}
                          </span>
                        )}
                      </div>

                      <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>
                        {formatRelativeTime(act.timestamp)}
                      </span>
                    </div>

                    {act.detail && (
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                        {act.detail}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. QUICK ACTIONS COMPACT BAR                                              */}
      {/* ========================================================================= */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
        padding: '1.1rem 1.3rem',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.85rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={18} color="var(--accent-gold)" />
          <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>إجراءات سريعة:</strong>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleOpenQuick('case')}
            style={{
              background: 'var(--primary-800)',
              color: '#ffffff',
              borderRadius: '8px',
              padding: '0.45rem 1rem',
              fontSize: '0.84rem',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              border: '1px solid var(--accent-gold)'
            }}
          >
            <Plus size={15} />
            <span>قضية جديدة</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleOpenQuick('client')}
            style={{
              borderRadius: '8px',
              padding: '0.45rem 1rem',
              fontSize: '0.84rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <Plus size={15} />
            <span>موكل جديد</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setActiveTab && setActiveTab('administrative')}
            style={{
              borderRadius: '8px',
              padding: '0.45rem 1rem',
              fontSize: '0.84rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <Plus size={15} />
            <span>عمل إداري</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setActiveTab && setActiveTab('agenda')}
            style={{
              borderRadius: '8px',
              padding: '0.45rem 1rem',
              fontSize: '0.84rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <Calendar size={15} />
            <span>فتح الأجندة</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. MODALS                                                                 */}
      {/* ========================================================================= */}
      {/* Session Decision Modal */}
      {decisionCase && (
        <SessionDecisionModal
          isOpen={!!decisionCase}
          caseItem={decisionCase}
          currentSessionDate={todayStr}
          onClose={() => setDecisionCase(null)}
        />
      )}

      {/* Administrative Task Update Modal */}
      {taskToUpdate && (
        <AdministrativeTaskUpdateModal
          isOpen={!!taskToUpdate}
          task={taskToUpdate}
          onClose={() => setTaskToUpdate(null)}
        />
      )}

      {/* Quick Action Modal */}
      <QuickActionModal
        isOpen={isQuickActionOpen}
        initialMode={quickActionMode}
        onClose={() => setIsQuickActionOpen(false)}
      />
    </div>
  );
}
