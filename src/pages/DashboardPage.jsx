import React, { useState, useMemo } from 'react';
import {
  Plus,
  Gavel,
  CalendarClock,
  AlertTriangle,
  ClipboardList,
  Scale,
  Wallet,
  HandCoins,
  ArrowLeft,
  CheckCircle2,
  FileSearch,
  Activity
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { CASE_STATUSES } from '../lib/supabase';
import {
  getTodayLocalStr,
  addDaysToDate,
  isPastDate,
  getDaysOverdue,
  formatArabicDate,
  formatRelativeTime
} from '../lib/dateRules';
import { formatMoney } from '../lib/financialCalculations';
import { buildFinanceOverview } from '../lib/financeOverview';
import SessionDecisionModal from '../components/common/SessionDecisionModal';
import AdministrativeTaskUpdateModal from '../components/common/AdministrativeTaskUpdateModal';
import CountUp from '../components/common/CountUp';
import QuickActionModal from '../components/layout/QuickActionModal';

const dayOf = (v) => (v || '').split('T')[0];
const isDone = (t) => t.status === 'completed' || t.status === 'cancelled';
const isOpenCase = (c) => !c.is_archived && !['finalJudgment', 'settled', 'dismissed'].includes(c.status);

const WEEKDAY = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

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
    transactions = [],
    officeProfile,
  } = useData();

  const [scope, setScope] = useState('ALL'); // ALL | MY
  const [agendaRange, setAgendaRange] = useState('today'); // today | tomorrow | week
  const [decision, setDecision] = useState(null); // { caseItem, date }
  const [taskToUpdate, setTaskToUpdate] = useState(null);
  const [quick, setQuick] = useState({ open: false, mode: 'case' });

  const todayStr = getTodayLocalStr();
  const tomorrowStr = addDaysToDate(todayStr, 1);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'صباح الخير' : hour < 17 ? 'مساء الخير' : 'مساء النور';
  const lawyerName = officeProfile?.lawyer_name || user?.user_metadata?.full_name || 'الأستاذ';

  const me = useMemo(
    () => (user ? team.find(m => m.user_id === user.id || m.name === lawyerName) : null),
    [user, team, lawyerName]
  );

  const myCases = useMemo(() => {
    if (scope === 'MY' && me) {
      return cases.filter(c => c.next_steps === me.id || (c.next_steps || '').includes(me.id));
    }
    return cases;
  }, [cases, scope, me]);

  const myTasks = useMemo(
    () => (scope === 'MY' && me ? adminTasks.filter(t => t.assigned_to === me.id) : adminTasks),
    [adminTasks, scope, me]
  );

  const openCases = useMemo(() => myCases.filter(isOpenCase), [myCases]);

  // ---- court sessions ----
  const sessionOn = (date) => openCases.filter(c => dayOf(c.next_session_date) === date);
  const todaySessions = sessionOn(todayStr);
  const tomorrowSessions = sessionOn(tomorrowStr);

  const weekStrip = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDaysToDate(todayStr, i);
      const [y, m, d] = date.split('-').map(Number);
      return {
        date,
        day: WEEKDAY[new Date(y, m - 1, d).getDay()],
        num: d,
        count: openCases.filter(c => dayOf(c.next_session_date) === date).length,
        isToday: i === 0,
      };
    });
  }, [openCases, todayStr]);

  const agendaList = useMemo(() => {
    if (agendaRange === 'today') return todaySessions;
    if (agendaRange === 'tomorrow') return tomorrowSessions;
    const end = addDaysToDate(todayStr, 6);
    return openCases
      .filter(c => c.next_session_date && dayOf(c.next_session_date) >= todayStr && dayOf(c.next_session_date) <= end)
      .sort((a, b) => dayOf(a.next_session_date).localeCompare(dayOf(b.next_session_date)));
  }, [agendaRange, todaySessions, tomorrowSessions, openCases, todayStr]);

  // ---- things that slipped ----
  const missedSessions = useMemo(
    () => openCases
      .filter(c => c.next_session_date && dayOf(c.next_session_date) < todayStr)
      .sort((a, b) => dayOf(a.next_session_date).localeCompare(dayOf(b.next_session_date))),
    [openCases, todayStr]
  );

  const overdueTasks = useMemo(
    () => myTasks
      .filter(t => t.execution_date && isPastDate(t.execution_date) && !isDone(t))
      .sort((a, b) => new Date(a.execution_date) - new Date(b.execution_date)),
    [myTasks]
  );

  const dueTodayTasks = useMemo(
    () => myTasks.filter(t => t.execution_date && dayOf(t.execution_date) === todayStr && !isDone(t)),
    [myTasks, todayStr]
  );

  const todayAppeals = useMemo(
    () => appeals.filter(a => a.follow_up_date && dayOf(a.follow_up_date) === todayStr),
    [appeals, todayStr]
  );

  const unscheduled = useMemo(() => openCases.filter(c => !c.next_session_date && c.status !== 'preliminaryJudgment'), [openCases]);

  const upcomingTasks = useMemo(
    () => myTasks
      .filter(t => !isDone(t))
      .sort((a, b) => {
        if (!a.execution_date) return 1;
        if (!b.execution_date) return -1;
        return new Date(a.execution_date) - new Date(b.execution_date);
      })
      .slice(0, 5),
    [myTasks]
  );

  // ---- money ----
  const finance = useMemo(() => buildFinanceOverview(transactions, clients, cases), [transactions, clients, cases]);
  const topDebtors = useMemo(
    () => finance.rows.filter(r => r.balance > 0.01).sort((a, b) => b.balance - a.balance).slice(0, 3),
    [finance]
  );

  // ---- portfolio ----
  const statusCounts = useMemo(() => {
    const map = {};
    openCases.forEach(c => { map[c.status || 'active'] = (map[c.status || 'active'] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [openCases]);

  // ---- recent activity ----
  const activity = useMemo(() => {
    const list = [];
    sessions.forEach(s => {
      if (!['adjourned', 'preliminaryJudgment', 'finalJudgment'].includes(s.status)) return;
      const c = cases.find(x => x.id === s.case_id);
      const title = s.status === 'adjourned' ? 'تأجيل جلسة' : s.status === 'finalJudgment' ? 'صدور حكم نهائي' : 'صدور حكم تمهيدي';
      list.push({
        id: `s_${s.id}`,
        at: s.created_at || s.session_date,
        title,
        detail: s.adjournment_reason || (s.ruling_text ? s.ruling_text.slice(0, 60) : ''),
        caseItem: c,
        tone: s.status === 'adjourned' ? 'adjourned' : s.status === 'finalJudgment' ? 'final' : 'prelim',
      });
    });
    appeals.forEach(a => list.push({
      id: `a_${a.id}`,
      at: a.created_at,
      title: 'قيد متابعة استئناف',
      detail: a.follow_up_date ? `الموعد: ${a.follow_up_date}` : '',
      caseItem: cases.find(x => x.id === a.case_id),
      tone: 'appeal',
    }));
    adminTaskUpdates.forEach(u => list.push({
      id: `u_${u.id}`,
      at: u.created_at,
      title: u.action_type === 'completed' ? 'إتمام عمل إداري' : u.action_type === 'postponed' ? 'تأجيل متابعة إدارية' : 'تحديث عمل إداري',
      detail: u.update_text || '',
      caseItem: cases.find(x => x.id === u.case_id),
      tone: u.action_type === 'completed' ? 'done' : 'adjourned',
    }));
    return list.filter(i => i.at).sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 6);
  }, [sessions, appeals, adminTaskUpdates, cases]);

  const attention = [
    { key: 'missed', label: 'جلسات فاتت بلا قرار', count: missedSessions.length, tone: 'danger', icon: Gavel, hint: 'سجّل القرار لتحديث الأجندة', action: () => setAgendaRange('today') },
    { key: 'overdue', label: 'مهام متأخرة', count: overdueTasks.length, tone: 'danger', icon: AlertTriangle, hint: 'تجاوزت موعد التنفيذ', action: () => setActiveTab && setActiveTab('administrative') },
    { key: 'appeals', label: 'متابعات استئناف اليوم', count: todayAppeals.length, tone: 'warn', icon: Scale, hint: 'ميعاد الطعن يقترب', action: () => setActiveTab && setActiveTab('cases') },
    { key: 'unscheduled', label: 'قضايا بلا جلسة قادمة', count: unscheduled.length, tone: 'muted', icon: CalendarClock, hint: 'تحتاج تحديد موعد', action: () => setActiveTab && setActiveTab('cases') },
  ];
  const attentionTotal = attention.reduce((n, a) => n + a.count, 0);

  const openQuick = (mode) => setQuick({ open: true, mode });
  const go = (tab) => () => setActiveTab && setActiveTab(tab);

  const sessionRow = (c, date) => (
    <li key={`${c.id}_${date}`} className="dash-row">
      <div className="dash-row-main">
        <b>دعوى {c.case_number}/{c.case_year} — {c.case_title || CASE_STATUSES[c.status]?.label}</b>
        <span className="cell-sub">
          {c.court_name}{c.court_room ? ` — دائرة ${c.court_room}` : ''} · {c.plaintiff_name || '—'} ضد {c.defendant_name || '—'}
        </span>
      </div>
      {agendaRange === 'week' && <span className="dash-date-chip">{formatArabicDate(dayOf(c.next_session_date), true)}</span>}
      <button type="button" className="btn btn-secondary dash-row-btn" onClick={() => setDecision({ caseItem: c, date })}>
        <Gavel size={15} />
        <span>تسجيل القرار</span>
      </button>
    </li>
  );

  return (
    <div className="page-wrapper">
      <div className="page-head">
        <div>
          <div className="page-eyebrow"><span className="page-dot" />{formatArabicDate(todayStr, true)}</div>
          <h1>{greeting}، {lawyerName}</h1>
        </div>
        <div className="page-head-actions">
          <div className="seg-tabs">
            <button type="button" className={`seg-tab ${scope === 'ALL' ? 'is-active' : ''}`} onClick={() => setScope('ALL')}>المكتب كله</button>
            <button type="button" className={`seg-tab ${scope === 'MY' ? 'is-active' : ''}`} onClick={() => setScope('MY')}>أعمالي</button>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => openQuick('case')}>
            <Plus size={16} />
            <span>قضية جديدة</span>
          </button>
        </div>
      </div>

      {/* Attention strip: only things that need a decision */}
      <div className="dash-attn">
        {attention.map(a => (
          <button key={a.key} type="button" className={`dash-attn-item ${a.count > 0 ? `is-${a.tone}` : 'is-zero'}`} onClick={a.action}>
            <span className="dash-attn-icon"><a.icon size={18} /></span>
            <span className="dash-attn-text">
              <b><CountUp value={a.count} /></b>
              <span>{a.label}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="dash-layout">
        <div className="dash-col">
          {/* Week strip */}
          <section className="card dash-card">
            <div className="dash-card-head">
              <h3><CalendarClock size={18} /> الأسبوع القادم</h3>
              <button type="button" className="dash-link" onClick={go('calendar')}>التقويم <ArrowLeft size={14} /></button>
            </div>
            <div className="dash-week">
              {weekStrip.map(d => (
                <div key={d.date} className={`dash-day ${d.isToday ? 'is-today' : ''} ${d.count ? 'has-items' : ''}`}>
                  <span className="dash-day-name">{d.day}</span>
                  <b className="dash-day-num">{d.num}</b>
                  <span className="dash-day-count">{d.count ? `${d.count} جلسة` : '—'}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Agenda */}
          <section className="card dash-card">
            <div className="dash-card-head">
              <h3><Gavel size={18} /> جلسات المحكمة</h3>
              <div className="seg-tabs">
                <button type="button" className={`seg-tab ${agendaRange === 'today' ? 'is-active' : ''}`} onClick={() => setAgendaRange('today')}>اليوم ({todaySessions.length})</button>
                <button type="button" className={`seg-tab ${agendaRange === 'tomorrow' ? 'is-active' : ''}`} onClick={() => setAgendaRange('tomorrow')}>غدًا ({tomorrowSessions.length})</button>
                <button type="button" className={`seg-tab ${agendaRange === 'week' ? 'is-active' : ''}`} onClick={() => setAgendaRange('week')}>الأسبوع</button>
              </div>
            </div>

            {agendaRange === 'today' && missedSessions.length > 0 && (
              <div className="dash-missed">
                <div className="dash-missed-title"><AlertTriangle size={16} /> {missedSessions.length} جلسة فاتت ولم يُسجَّل لها قرار</div>
                <ul className="dash-list">
                  {missedSessions.slice(0, 4).map(c => (
                    <li key={`m_${c.id}`} className="dash-row">
                      <div className="dash-row-main">
                        <b>دعوى {c.case_number}/{c.case_year}</b>
                        <span className="cell-sub">كانت يوم {formatArabicDate(dayOf(c.next_session_date), true)} — {c.court_name}</span>
                      </div>
                      <button type="button" className="btn btn-secondary dash-row-btn" onClick={() => setDecision({ caseItem: c, date: dayOf(c.next_session_date) })}>
                        <Gavel size={15} />
                        <span>تسجيل القرار</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {agendaList.length === 0 ? (
              <div className="dash-empty">
                <CheckCircle2 size={28} />
                <b>{agendaRange === 'today' ? 'لا توجد جلسات اليوم' : agendaRange === 'tomorrow' ? 'لا توجد جلسات غدًا' : 'لا توجد جلسات خلال الأسبوع'}</b>
              </div>
            ) : (
              <ul className="dash-list">
                {agendaList.map(c => sessionRow(c, dayOf(c.next_session_date)))}
              </ul>
            )}
          </section>

          {/* Tasks */}
          <section className="card dash-card">
            <div className="dash-card-head">
              <h3><ClipboardList size={18} /> المهام والمتابعات</h3>
              <button type="button" className="dash-link" onClick={go('administrative')}>كل المهام <ArrowLeft size={14} /></button>
            </div>
            {upcomingTasks.length === 0 ? (
              <div className="dash-empty"><CheckCircle2 size={28} /><b>لا توجد مهام مفتوحة</b></div>
            ) : (
              <ul className="dash-list">
                {upcomingTasks.map(t => {
                  const late = t.execution_date && isPastDate(t.execution_date);
                  return (
                    <li key={t.id} className="dash-row">
                      <div className="dash-row-main">
                        <b>{t.title}</b>
                        <span className={`cell-sub ${late ? 'is-debt' : ''}`}>
                          {t.execution_date
                            ? (late ? `متأخرة ${getDaysOverdue(t.execution_date)} يوم — ` : '') + formatArabicDate(dayOf(t.execution_date), false)
                            : 'بدون موعد'}
                          {t.client_name ? ` · ${t.client_name}` : ''}
                        </span>
                      </div>
                      <button type="button" className="btn btn-secondary dash-row-btn" onClick={() => setTaskToUpdate(t)}>تحديث</button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <div className="dash-col">
          {/* Money */}
          <section className="card dash-card">
            <div className="dash-card-head">
              <h3><Wallet size={18} /> الموقف المالي</h3>
              <button type="button" className="dash-link" onClick={go('finance')}>المالية <ArrowLeft size={14} /></button>
            </div>
            <div className="dash-money">
              <div className="dash-money-main">
                <span>مستحق لدى الموكلين</span>
                <b className={finance.outstanding > 0 ? 'is-debt' : ''}>{formatMoney(finance.outstanding)}</b>
              </div>
              <div className="dash-money-sub">
                <div><span>محصّل هذا الشهر</span><b className="is-credit">{formatMoney(finance.collectedMonth)}</b></div>
                <div><span>مقيّد هذا الشهر</span><b>{formatMoney(finance.billedMonth)}</b></div>
              </div>
            </div>
            {topDebtors.length > 0 && (
              <>
                <div className="dash-subtitle">أعلى المستحقات</div>
                <ul className="dash-list is-compact">
                  {topDebtors.map(r => (
                    <li key={r.client.id} className="dash-row">
                      <div className="dash-row-main"><b>{r.client.name}</b></div>
                      <b className="is-debt">{formatMoney(r.balance)}</b>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <button type="button" className="btn btn-secondary dash-wide-btn" onClick={go('finance')}>
              <HandCoins size={16} />
              <span>تحصيل دفعة / كشف حساب</span>
            </button>
          </section>

          {/* Portfolio */}
          <section className="card dash-card">
            <div className="dash-card-head">
              <h3><FileSearch size={18} /> محفظة القضايا</h3>
              <button type="button" className="dash-link" onClick={go('cases')}>{openCases.length} متداولة <ArrowLeft size={14} /></button>
            </div>
            {statusCounts.length === 0 ? (
              <div className="dash-empty"><b>لا توجد قضايا متداولة</b></div>
            ) : (
              <ul className="dash-bars">
                {statusCounts.map(([status, n]) => {
                  const st = CASE_STATUSES[status] || CASE_STATUSES.active;
                  return (
                    <li key={status}>
                      <div className="dash-bar-top"><span>{st.label}</span><b>{n}</b></div>
                      <div className="dash-bar"><span style={{ width: `${(n / openCases.length) * 100}%`, background: st.color }} /></div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Activity */}
          <section className="card dash-card">
            <div className="dash-card-head">
              <h3><Activity size={18} /> آخر النشاط</h3>
            </div>
            {activity.length === 0 ? (
              <div className="dash-empty"><b>لا يوجد نشاط مسجّل بعد</b></div>
            ) : (
              <ul className="dash-feed">
                {activity.map(i => (
                  <li key={i.id}>
                    <span className={`dash-dot is-${i.tone}`} />
                    <div>
                      <b>{i.title}{i.caseItem ? ` — دعوى ${i.caseItem.case_number}/${i.caseItem.case_year}` : ''}</b>
                      {i.detail && <span className="cell-sub">{i.detail}</span>}
                      <span className="cell-sub">{formatRelativeTime(i.at)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {attentionTotal === 0 && todaySessions.length === 0 && (
        <p className="dash-footnote">لا توجد بنود عاجلة الآن.</p>
      )}

      {decision && (
        <SessionDecisionModal
          isOpen
          caseItem={decision.caseItem}
          currentSessionDate={decision.date}
          onClose={() => setDecision(null)}
        />
      )}
      {taskToUpdate && (
        <AdministrativeTaskUpdateModal isOpen task={taskToUpdate} onClose={() => setTaskToUpdate(null)} />
      )}
      <QuickActionModal isOpen={quick.open} initialMode={quick.mode} onClose={() => setQuick(q => ({ ...q, open: false }))} />
    </div>
  );
}
