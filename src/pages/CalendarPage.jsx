import React, { useState } from "react";
import { ChevronRight, ChevronLeft, Download, CheckCircle2, ExternalLink } from "lucide-react";
import { useData } from "../context/DataContext";
import { CASE_STATUSES } from "../lib/supabase";
import {
  syncSessionToGoogleCalendar,
  buildRichLegalEvent,
} from "../lib/googleCalendar";
import { notify } from '../lib/dialog';

export default function CalendarPage({ setActiveTab }) {
  const { cases, appeals, adminTasks } = useData();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [syncingId, setSyncingId] = useState(null);
  const [syncNotice, setSyncNotice] = useState("");

  // Month navigation
  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
    );
  };

  const prevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
    );
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDay(today.toISOString().split("T")[0]);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // In Arabic/Egyptian calendar: Saturday is day 6 or start of week
  const startDay = (firstDayOfMonth.getDay() + 1) % 7;
  const totalDays = lastDayOfMonth.getDate();

  const activeCases = cases.filter((c) => !c.is_archived);

  // Map events by date (YYYY-MM-DD)
  const eventsByDate = {};

  // 1. Actual Court Sessions
  activeCases.forEach((c) => {
    if (c.next_session_date) {
      const dateKey = c.next_session_date.split("T")[0];
      if (!eventsByDate[dateKey]) eventsByDate[dateKey] = [];
      eventsByDate[dateKey].push({
        id: c.id,
        type: 'court_session',
        badgeText: 'جلسة محكمة',
        title: `دعوى ${c.case_number}/${c.case_year}`,
        subtitle: c.case_title || c.plaintiff_name,
        court: c.court_name,
        courtRoom: c.court_room,
        time: c.next_session_time || "09:00",
        caseData: c,
      });
    }
  });

  // 2. Appeal Follow-up Reminders
  (appeals || []).forEach((a) => {
    if (a.follow_up_date) {
      const dateKey = a.follow_up_date.split("T")[0];
      const relCase = cases.find(c => c.id === a.case_id);
      if (!eventsByDate[dateKey]) eventsByDate[dateKey] = [];
      eventsByDate[dateKey].push({
        id: a.id,
        type: 'appeal_follow_up',
        badgeText: 'متابعة استئناف',
        title: relCase ? `متابعة استئناف: ${relCase.case_number}/${relCase.case_year}` : 'متابعة قيد استئناف',
        subtitle: a.judgment_text || 'ميعاد متابعة قيد الاستئناف وسداد الرسوم',
        court: relCase?.court_name || 'محكمة الاستئناف',
        courtRoom: null,
        time: "09:00",
        caseData: relCase || { case_number: '—', case_year: '—', court_name: 'الاستئناف' },
      });
    }
  });

  // 3. Administrative Tasks
  (adminTasks || []).forEach((t) => {
    if (t.execution_date) {
      const dateKey = t.execution_date.split("T")[0];
      const relCase = t.case_id ? cases.find(c => c.id === t.case_id) : null;
      if (!eventsByDate[dateKey]) eventsByDate[dateKey] = [];
      eventsByDate[dateKey].push({
        id: t.id,
        type: 'administrative_task',
        badgeText: 'عمل إداري',
        title: t.title,
        subtitle: t.requirements || t.notes || 'عمل إداري بمكتب المحاماة',
        court: t.location || relCase?.court_name || 'مكتب الخبراء / المحكمة',
        courtRoom: null,
        time: "09:00",
        caseData: relCase || { case_number: '—', case_year: '—', court_name: t.location || 'إداري' },
      });
    }
  });

  const selectedEvents = eventsByDate[selectedDay] || [];

  // Direct Sync Handler with full rich legal payload & event typing
  const handleDirectSync = async (sessionEvent) => {
    setSyncingId(sessionEvent.id);
    const result = await syncSessionToGoogleCalendar(
      {
        session_date: selectedDay,
        session_time: sessionEvent.time,
        title: sessionEvent.title,
        requirements: sessionEvent.subtitle,
        event_type: sessionEvent.type,
      },
      sessionEvent.caseData,
      sessionEvent.type
    );

    setSyncingId(null);
    if (result.success) {
      if (result.isFallback && result.fallbackUrl) {
        window.open(result.fallbackUrl, "_blank");
      } else {
        setSyncNotice(
          `تمت مزامنة (${sessionEvent.badgeText}) مع Google Calendar بنجاح!`,
        );
        setTimeout(() => setSyncNotice(""), 4000);
      }
    } else {
      notify("خطأ أثناء المزامنة: " + result.error);
    }
  };

  // Export All Upcoming Sessions as iCal (.ics) file with rich details
  const downloadIcsFile = () => {
    const upcoming = activeCases.filter((c) => c.next_session_date);
    if (upcoming.length === 0) {
      notify("لا توجد جلسات مستقبلية لتصديرها.", 'warn');
      return;
    }

    let icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Damietta Legal Agenda//Egyptian Courts Calendar//AR",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:الديوان",
    ];

    upcoming.forEach((c) => {
      const dateStr = c.next_session_date.split("T")[0].replace(/-/g, "");
      const timeStr = (c.next_session_time || "09:00").replace(":", "") + "00";
      const { summary, description, location } = buildRichLegalEvent({}, c);

      // Clean description for iCalendar format
      const icsDesc = description.replace(/\n/g, "\\n");

      icsContent.push(
        "BEGIN:VEVENT",
        `UID:case-${c.id}-${dateStr}@agenda-damietta.com`,
        `DTSTAMP:${dateStr}T000000Z`,
        `DTSTART:${dateStr}T${timeStr}`,
        `DTEND:${dateStr}T140000`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${icsDesc}`,
        `LOCATION:${location}`,
        "BEGIN:VALARM",
        "TRIGGER:-P1D",
        "ACTION:DISPLAY",
        "DESCRIPTION:تذكير: موعد جلسة قضائية غداً",
        "END:VALARM",
        "BEGIN:VALARM",
        "TRIGGER:-PT1H",
        "ACTION:DISPLAY",
        "DESCRIPTION:تذكير: موعد الجلسة بعد ساعة واحدة",
        "END:VALARM",
        "END:VEVENT",
      );
    });

    icsContent.push("END:VCALENDAR");

    const blob = new Blob([icsContent.join("\r\n")], {
      type: "text/calendar;charset=utf-8",
    });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute(
      "download",
      `damietta-court-calendar-${year}-${month + 1}.ics`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setSyncNotice("تم تنزيل وتصدير جميع الجلسات بتفاصيلها الكاملة!");
    setTimeout(() => setSyncNotice(""), 4000);
  };

  const weekDays = [
    "السبت",
    "الأحد",
    "الاثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
    "الجمعة",
  ];

  const todayKey = new Date().toISOString().split("T")[0];
  const TYPE_TONE = {
    court_session: 'is-session',
    appeal_follow_up: 'is-appeal',
    administrative_task: 'is-admin',
  };

  return (
    <div className="page-wrapper">
      <div className="page-head">
        <div>
          <h1>التقويم</h1>
          <p className="page-sub">الجلسات والمتابعات والأعمال الإدارية حسب التاريخ</p>
        </div>
        <div className="page-head-actions">
          <button type="button" className="btn btn-secondary" onClick={downloadIcsFile}>
            <Download size={16} /> تصدير iCal
          </button>
        </div>
      </div>

      {syncNotice && (
        <div className="inline-notice" role="status">
          <CheckCircle2 size={18} />
          <span>{syncNotice}</span>
        </div>
      )}

      <div className="cal-desktop-container">
        <div className="card cal-desktop-card">
          <div className="cal-controls-row">
            <h2 className="cal-title">
              {currentDate.toLocaleDateString("ar-EG", { month: "long", year: "numeric" })}
            </h2>
            <div className="cal-nav">
              <button type="button" className="icon-btn" onClick={prevMonth} title="الشهر السابق" aria-label="الشهر السابق">
                <ChevronRight size={18} />
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={goToToday}>اليوم</button>
              <button type="button" className="icon-btn" onClick={nextMonth} title="الشهر القادم" aria-label="الشهر القادم">
                <ChevronLeft size={18} />
              </button>
            </div>
          </div>

          <div className="cal-grid-weekdays">
            {weekDays.map((day) => (
              <div key={day} className="cal-grid-weekday-title">{day}</div>
            ))}
          </div>

          <div className="cal-grid-cells">
            {Array.from({ length: startDay }).map((_, index) => (
              <div key={`blank-${index}`} className="cal-cell cal-cell-blank"></div>
            ))}

            {Array.from({ length: totalDays }).map((_, index) => {
              const dayNum = index + 1;
              const formattedDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
              const dayEvents = eventsByDate[formattedDate] || [];
              const isSelected = selectedDay === formattedDate;
              const isToday = todayKey === formattedDate;
              const hasEvents = dayEvents.length > 0;

              return (
                <div
                  key={formattedDate}
                  onClick={() => setSelectedDay(formattedDate)}
                  className={`cal-cell ${isSelected ? "is-selected" : ""} ${isToday ? "is-today" : ""} ${hasEvents ? "has-sessions" : ""}`}
                >
                  <div className="cal-cell-header">
                    <span className="cal-cell-number">{dayNum}</span>
                  </div>

                  <div className="cal-cell-events-desktop">
                    {dayEvents.slice(0, 2).map((evt, idx) => (
                      <div
                        key={idx}
                        className="cal-event-pill"
                        title={`${evt.title} - ${evt.court}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDay(formattedDate);
                        }}
                      >
                        <span className="event-pill-time">{evt.time}</span>
                        <span className="event-pill-title">{evt.title}</span>
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="cal-more-pill">+{dayEvents.length - 2} أخرى</span>
                    )}
                  </div>

                  {hasEvents && (
                    <div className="cal-cell-events-mobile">
                      <span className="mobile-event-dot"></span>
                      {dayEvents.length > 1 && <span className="mobile-event-count">{dayEvents.length}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="card cal-side-agenda">
          <div className="cal-side-head">
            <h3>
              {new Date(selectedDay).toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" })}
            </h3>
            <span className="cell-sub">{selectedEvents.length === 0 ? 'لا مواعيد' : `${selectedEvents.length} موعد`}</span>
          </div>

          {selectedEvents.length === 0 ? (
            <p className="empty-line">لا توجد مواعيد في هذا اليوم. اختر يوماً عليه علامة لعرض تفاصيله.</p>
          ) : (
            <div className="cal-agenda-list">
              {selectedEvents.map((evt, idx) => (
                <div key={idx} className={`cal-agenda-card ${TYPE_TONE[evt.type] || ''}`}>
                  <div className="cal-agenda-top">
                    <div>
                      <strong>{evt.title}</strong>
                      <div className="cal-agenda-sub">{evt.subtitle}</div>
                    </div>
                    <span className="cal-agenda-badge">
                      {evt.badgeText || CASE_STATUSES[evt.caseData?.status]?.label || "متداول"}
                    </span>
                  </div>

                  <dl className="cal-agenda-meta">
                    <div><dt>المكان</dt><dd>{evt.court}{evt.courtRoom ? ` (قاعة ${evt.courtRoom})` : ''}</dd></div>
                    <div><dt>الموعد</dt><dd>الساعة {evt.time}</dd></div>
                    {evt.caseData?.plaintiff_name && (
                      <div>
                        <dt>الخصوم</dt>
                        <dd>{evt.caseData.plaintiff_name}{evt.caseData.defendant_name ? ` ضد ${evt.caseData.defendant_name}` : ''}</dd>
                      </div>
                    )}
                  </dl>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm cal-sync-btn"
                    onClick={() => handleDirectSync(evt)}
                    disabled={syncingId === evt.id}
                  >
                    <span>{syncingId === evt.id ? "جاري المزامنة…" : "إضافة إلى Google Calendar"}</span>
                    <ExternalLink size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
