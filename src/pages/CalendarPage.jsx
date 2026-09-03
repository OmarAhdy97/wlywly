import React, { useState } from "react";
import {
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronLeft,
  Clock,
  MapPin,
  ExternalLink,
  Download,
  Briefcase,
  CheckCircle2,
  Bell,
  Sparkles,
  Gavel,
} from "lucide-react";
import { useData } from "../context/DataContext";
import { CASE_TYPES, CASE_STATUSES } from "../lib/supabase";
import {
  syncSessionToGoogleCalendar,
  buildRichLegalEvent,
} from "../lib/googleCalendar";

export default function CalendarPage({ setActiveTab }) {
  const { cases } = useData();
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
  activeCases.forEach((c) => {
    if (c.next_session_date) {
      const dateKey = c.next_session_date.split("T")[0];
      if (!eventsByDate[dateKey]) eventsByDate[dateKey] = [];
      eventsByDate[dateKey].push({
        id: c.id,
        title: `دعوى ${c.case_number}/${c.case_year}`,
        subtitle: c.case_title || c.plaintiff_name,
        court: c.court_name,
        courtRoom: c.court_room,
        time: c.next_session_time || "09:00",
        caseData: c,
      });
    }
  });

  const selectedEvents = eventsByDate[selectedDay] || [];

  // Direct Sync Handler with full rich legal payload
  const handleDirectSync = async (sessionEvent) => {
    setSyncingId(sessionEvent.id);
    const result = await syncSessionToGoogleCalendar(
      {
        session_date: sessionEvent.caseData.next_session_date,
        session_time: sessionEvent.time,
      },
      sessionEvent.caseData,
    );

    setSyncingId(null);
    if (result.success) {
      if (result.isFallback && result.fallbackUrl) {
        window.open(result.fallbackUrl, "_blank");
      } else {
        setSyncNotice(
          `تمت المزامنة التلقائية لجلسة دعوى ${sessionEvent.caseData.case_number} مع Google Calendar!`,
        );
        setTimeout(() => setSyncNotice(""), 4000);
      }
    } else {
      alert("خطأ أثناء المزامنة: " + result.error);
    }
  };

  // Export All Upcoming Sessions as iCal (.ics) file with rich details
  const downloadIcsFile = () => {
    const upcoming = activeCases.filter((c) => c.next_session_date);
    if (upcoming.length === 0) {
      alert("لا توجد جلسات مستقبلية لتصديرها.");
      return;
    }

    let icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Damietta Legal Agenda//Egyptian Courts Calendar//AR",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:أجندة دمياط القضائية",
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

  return (
    <div className="page-wrapper" style={{ maxWidth: "1400px" }}>
      {/* Top Header */}
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
              التقويم والمواعيد القضائية
            </span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
            التقويم القضائي ومواعيد الجلسات
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ borderRadius: '10px', padding: '0.55rem 1rem', fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}
            onClick={downloadIcsFile}
          >
            <Download size={16} />
            <span>تصدير iCal للموبايل</span>
          </button>
        </div>
      </div>

      {syncNotice && (
        <div
          style={{
            padding: "0.8rem 1.2rem",
            background: "var(--status-active-bg)",
            color: "var(--status-active)",
            borderRadius: "var(--radius-md)",
            marginBottom: "1.2rem",
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            fontWeight: "600",
            animation: "fadeIn 0.2s ease",
          }}
        >
          <CheckCircle2 size={18} />
          <span>{syncNotice}</span>
        </div>
      )}

      {/* Main Full-Width Calendar Layout */}
      <div className="cal-desktop-container">
        {/* Full-Featured Desktop Calendar Card */}
        <div className="card cal-desktop-card">
          {/* Controls Bar */}
          <div className="cal-controls-row">
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}
            >
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "10px",
                  background: "var(--primary-100)",
                  color: "var(--primary-700)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CalendarIcon size={20} />
              </div>
              <h2 style={{ fontSize: "1.35rem", fontWeight: "800" }}>
                {currentDate.toLocaleDateString("ar-EG", {
                  month: "long",
                  year: "numeric",
                })}
              </h2>
            </div>

            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <button
                className="btn btn-secondary btn-icon"
                onClick={prevMonth}
                title="الشهر السابق"
              >
                <ChevronRight size={18} />
              </button>
              <button
                className="btn btn-secondary"
                onClick={goToToday}
                style={{ fontSize: "0.88rem", padding: "0.4rem 1rem" }}
              >
                اليوم
              </button>
              <button
                className="btn btn-secondary btn-icon"
                onClick={nextMonth}
                title="الشهر القادم"
              >
                <ChevronLeft size={18} />
              </button>
            </div>
          </div>

          {/* Weekdays Header */}
          <div className="cal-grid-weekdays">
            {weekDays.map((day) => (
              <div key={day} className="cal-grid-weekday-title">
                {day}
              </div>
            ))}
          </div>

          {/* Large Responsive Days Grid */}
          <div className="cal-grid-cells">
            {Array.from({ length: startDay }).map((_, index) => (
              <div
                key={`blank-${index}`}
                className="cal-cell cal-cell-blank"
              ></div>
            ))}

            {Array.from({ length: totalDays }).map((_, index) => {
              const dayNum = index + 1;
              const formattedDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
              const dayEvents = eventsByDate[formattedDate] || [];
              const isSelected = selectedDay === formattedDate;
              const isToday =
                new Date().toISOString().split("T")[0] === formattedDate;
              const hasEvents = dayEvents.length > 0;

              return (
                <div
                  key={formattedDate}
                  onClick={() => setSelectedDay(formattedDate)}
                  className={`cal-cell ${isSelected ? "is-selected" : ""} ${isToday ? "is-today" : ""} ${hasEvents ? "has-sessions" : ""}`}
                >
                  <div className="cal-cell-header">
                    <span className="cal-cell-number">{dayNum}</span>
                    {/* Clean day header without extra badges */}
                  </div>

                  {/* Desktop Events List inside the Cell */}
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
                      <span className="cal-more-pill">
                        +{dayEvents.length - 2} جلسات أخرى
                      </span>
                    )}
                  </div>

                  {/* Mobile Indicator Dot */}
                  {hasEvents && (
                    <div className="cal-cell-events-mobile">
                      <span className="mobile-event-dot"></span>
                      {dayEvents.length > 1 && (
                        <span className="mobile-event-count">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day Agenda Sidebar Panel */}
        <div className="card cal-side-agenda">
          <div className="card-header" style={{ marginBottom: "1rem" }}>
            <div className="card-title" style={{ fontSize: "1.05rem" }}>
              <Clock size={18} color="var(--primary-600)" />
              <span>
                جلسات:{" "}
                {new Date(selectedDay).toLocaleDateString("ar-EG", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </span>
            </div>
            <span
              className="badge"
              style={{
                background: "var(--primary-100)",
                color: "var(--primary-700)",
              }}
            >
              {selectedEvents.length} جلسات
            </span>
          </div>

          {selectedEvents.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "3rem 1rem",
                color: "var(--text-muted)",
              }}
            >
              <CalendarIcon
                size={38}
                style={{ margin: "0 auto 0.8rem", opacity: 0.35 }}
              />
              <h4 style={{ fontSize: "1rem", marginBottom: "0.3rem" }}>
                لا توجد جلسات محددة
              </h4>
              <p style={{ fontSize: "0.85rem" }}>
                انقر على أي يوم مسجل عليه جلسات لاستعراض ملفاتها.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.9rem",
              }}
            >
              {selectedEvents.map((evt, idx) => (
                <div key={idx} className="cal-agenda-card">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "0.5rem",
                    }}
                  >
                    <div>
                      <strong
                        style={{
                          fontSize: "0.98rem",
                          color: "var(--primary-700)",
                        }}
                      >
                        {evt.title}
                      </strong>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--text-main)",
                          marginTop: "0.2rem",
                        }}
                      >
                        {evt.subtitle}
                      </div>
                    </div>
                    <span
                      className="badge"
                      style={{
                        background: "var(--status-adjourned-bg)",
                        color: "var(--status-adjourned)",
                        fontSize: "0.72rem",
                      }}
                    >
                      {CASE_STATUSES[evt.caseData.status]?.label || "متداول"}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: "0.82rem",
                      color: "var(--text-muted)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.25rem",
                      marginTop: "0.5rem",
                    }}
                  >
                    <div>
                      📍 <strong>المحكمة:</strong> {evt.court}{" "}
                      {evt.courtRoom && `(قاعة: ${evt.courtRoom})`}
                    </div>
                    <div>
                      ⏰ <strong>الموعد:</strong> الساعة {evt.time} صباحاً
                    </div>
                    <div>
                      ⚖️ <strong>الخصوم:</strong> {evt.caseData.plaintiff_name}{" "}
                      ضد {evt.caseData.defendant_name}
                    </div>
                  </div>

                  {/* Google Calendar Automatic Sync Button */}
                  <div
                    style={{
                      marginTop: "0.8rem",
                      paddingTop: "0.6rem",
                      borderTop: "1px solid var(--border-subtle)",
                    }}
                  >
                    <button
                      className="btn btn-secondary"
                      style={{
                        width: "100%",
                        fontSize: "0.82rem",
                        padding: "0.45rem",
                        gap: "0.5rem",
                        minHeight: "36px",
                      }}
                      onClick={() => handleDirectSync(evt)}
                      disabled={syncingId === evt.id}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z"
                        />
                      </svg>
                      <span>
                        {syncingId === evt.id
                          ? "جاري المزامنة مع Google..."
                          : "مزامنة مع Google Calendar (تنبيه 24h)"}
                      </span>
                      <ExternalLink size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Automatic Sync Feature Highlight */}
          <div
            style={{
              marginTop: "1.2rem",
              padding: "1rem",
              background: "var(--primary-50)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--primary-100)",
              fontSize: "0.82rem",
              color: "var(--primary-900)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                fontWeight: "700",
                marginBottom: "0.3rem",
              }}
            >
              <Sparkles size={16} color="var(--primary-700)" />
              <span>المزامنة التلقائية الكاملة:</span>
            </div>
            يتم حفظ جميع بيانات الدعوى (رقم القضية، المحكمة، القاعة، أسماء
            الخصوم، وموضوع الدعوى) تلقائياً في تقويم Google وتفعيل إشعار مسبق
            بيوم وبساعة.
          </div>
        </div>
      </div>
    </div>
  );
}
