import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronRight, 
  ChevronLeft, 
  Clock, 
  MapPin, 
  ExternalLink, 
  Download, 
  Share2, 
  Briefcase, 
  AlertCircle,
  Plus,
  Check
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { CASE_TYPES, CASE_STATUSES } from '../lib/supabase';

export default function CalendarPage({ onOpenQuickAction, setActiveTab }) {
  const { cases } = useData();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date().toISOString().split('T')[0]);
  const [eventFilter, setEventFilter] = useState('ALL');

  // Month navigation
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDay(today.toISOString().split('T')[0]);
  };

  // Calendar Calculation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // In Arabic/Egyptian calendar, Saturday is day 6 or start of week
  const startDay = (firstDayOfMonth.getDay() + 1) % 7; // Saturday = 0, Sunday = 1, ...
  const totalDays = lastDayOfMonth.getDate();

  // Active cases with next session date
  const activeCases = cases.filter(c => !c.is_archived);

  // Map events by date (YYYY-MM-DD)
  const eventsByDate = {};
  activeCases.forEach(c => {
    if (c.next_session_date) {
      const dateKey = c.next_session_date.split('T')[0];
      if (!eventsByDate[dateKey]) eventsByDate[dateKey] = [];
      eventsByDate[dateKey].push({
        type: 'session',
        title: `جلسة: دعوى ${c.case_number}/${c.case_year}`,
        subtitle: c.case_title || c.plaintiff_name,
        court: c.court_name,
        courtRoom: c.court_room,
        time: c.next_session_time || '09:00',
        caseData: c,
      });
    }
  });

  // Selected Day Events
  const selectedEvents = (eventsByDate[selectedDay] || []).filter(e => {
    if (eventFilter === 'ALL') return true;
    return e.type === eventFilter;
  });

  // Google Calendar URL Generator
  const createGoogleCalendarUrl = (event) => {
    const c = event.caseData;
    const sessionDateStr = c.next_session_date.split('T')[0].replace(/-/g, '');
    const startTime = (c.next_session_time || '09:00').replace(':', '') + '00';
    const endTime = '140000'; // Default 2 PM

    const title = encodeURIComponent(`جلسة قضائية: دعوى رقم ${c.case_number}/${c.case_year} — ${c.court_name}`);
    const details = encodeURIComponent(
      `موضوع الدعوى: ${c.case_title || '—'}\n` +
      `المدعي: ${c.plaintiff_name}\n` +
      `المدعى عليه: ${c.defendant_name}\n` +
      `المحكمة: ${c.court_name} (قاعة: ${c.court_room || 'غير محددة'})\n` +
      `ملاحظات: ${c.notes || 'حضور الجلسة وإبداء الدفاع والمستندات'}`
    );
    const location = encodeURIComponent(c.court_name);

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${sessionDateStr}T${startTime}/${sessionDateStr}T${endTime}&details=${details}&location=${location}&sf=true&output=xml`;
  };

  // Export All Upcoming Sessions as iCal (.ics) file
  const downloadIcsFile = () => {
    const upcoming = activeCases.filter(c => c.next_session_date);
    if (upcoming.length === 0) {
      alert('لا توجد جلسات مستقبلية لتصديرها.');
      return;
    }

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Damietta Legal Agenda//Egyptian Courts Calendar//AR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:أجندة دمياط القضائية'
    ];

    upcoming.forEach(c => {
      const dateStr = c.next_session_date.split('T')[0].replace(/-/g, '');
      const timeStr = (c.next_session_time || '09:00').replace(':', '') + '00';

      icsContent.push(
        'BEGIN:VEVENT',
        `UID:case-${c.id}-${dateStr}@agenda-damietta.com`,
        `DTSTAMP:${dateStr}T000000Z`,
        `DTSTART:${dateStr}T${timeStr}`,
        `DTEND:${dateStr}T140000`,
        `SUMMARY:جلسة دعوى ${c.case_number}/${c.case_year} - ${c.court_name}`,
        `DESCRIPTION:المدعي: ${c.plaintiff_name} | المدعى عليه: ${c.defendant_name} | الموضوع: ${c.case_title || ''}`,
        `LOCATION:${c.court_name}`,
        'BEGIN:VALARM',
        'TRIGGER:-P1D',
        'ACTION:DISPLAY',
        'DESCRIPTION:تذكير: موعد جلسة قضائية غداً',
        'END:VALARM',
        'END:VEVENT'
      );
    });

    icsContent.push('END:VCALENDAR');

    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `damietta-court-calendar-${year}-${month + 1}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const weekDayNames = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

  return (
    <div className="page-wrapper">
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '800' }}>التقويم القضائي ومواعيد الجلسات</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            تقويم شهري تفاعلي ومزامنة فورية مع Google Calendar لتلقي إشعارات الجلسات على هاتفك.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={downloadIcsFile} title="تصدير ملف التقويم للهاتف">
            <Download size={17} />
            <span>تصدير لتقويم Google / الهاتف (.ics)</span>
          </button>
          <button className="btn btn-primary" onClick={onOpenQuickAction}>
            <Plus size={17} />
            <span>إضافة موعد / جلسة</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Month Calendar & Day Schedule */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1.5rem' }}>
        
        {/* Calendar View Card */}
        <div className="card" style={{ padding: '1.5rem' }}>
          {/* Month Switcher Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <CalendarIcon size={22} color="var(--primary-600)" />
              <h2 style={{ fontSize: '1.3rem', fontWeight: '800' }}>
                {currentDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
              </h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button className="btn btn-secondary btn-icon" onClick={prevMonth} title="الشهر السابق">
                <ChevronRight size={18} />
              </button>
              <button className="btn btn-secondary" onClick={goToToday} style={{ fontSize: '0.82rem', padding: '0.35rem 0.8rem', minHeight: 'auto' }}>
                اليوم
              </button>
              <button className="btn btn-secondary btn-icon" onClick={nextMonth} title="الشهر القادم">
                <ChevronLeft size={18} />
              </button>
            </div>
          </div>

          {/* Week Days Header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', gap: '4px', marginBottom: '6px', fontWeight: '700', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            {weekDayNames.map(day => (
              <div key={day} style={{ padding: '6px 0' }}>{day}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
            {/* Blank padding days before first of month */}
            {Array.from({ length: startDay }).map((_, index) => (
              <div key={`blank-${index}`} style={{ minHeight: '68px', opacity: 0.2 }}></div>
            ))}

            {/* Actual Days */}
            {Array.from({ length: totalDays }).map((_, index) => {
              const dayNum = index + 1;
              const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayEvents = eventsByDate[formattedDate] || [];
              const isSelected = selectedDay === formattedDate;
              const isToday = new Date().toISOString().split('T')[0] === formattedDate;

              return (
                <div
                  key={formattedDate}
                  onClick={() => setSelectedDay(formattedDate)}
                  style={{
                    minHeight: '74px',
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected 
                      ? 'linear-gradient(135deg, var(--primary-800), var(--primary-600))' 
                      : (isToday ? 'var(--primary-50)' : 'var(--bg-card-subtle)'),
                    color: isSelected ? '#ffffff' : 'var(--text-main)',
                    border: isToday && !isSelected ? '2px solid var(--accent-gold)' : '1px solid var(--border-color)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 4px 12px rgba(0, 31, 63, 0.25)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: isToday || isSelected ? '800' : '600', fontSize: '0.95rem' }}>
                      {dayNum}
                    </span>
                    {isToday && (
                      <span style={{ fontSize: '0.65rem', background: isSelected ? 'rgba(254, 214, 91, 0.3)' : 'var(--accent-gold-bg)', color: isSelected ? '#fed65b' : 'var(--secondary)', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>
                        اليوم
                      </span>
                    )}
                  </div>

                  {/* Event Badges Indicator */}
                  {dayEvents.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                      <span style={{
                        fontSize: '0.68rem',
                        padding: '2px 4px',
                        borderRadius: '4px',
                        background: isSelected ? 'rgba(254, 214, 91, 0.3)' : 'var(--status-adjourned-bg)',
                        color: isSelected ? '#fed65b' : 'var(--status-adjourned)',
                        fontWeight: '700',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {dayEvents.length} {dayEvents.length === 1 ? 'جلسة' : 'جلسات'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day Schedule & Google Calendar Sync Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          
          {/* Day Schedule Card */}
          <div className="card" style={{ flex: 1 }}>
            <div className="card-header">
              <div className="card-title">
                <Clock size={18} color="var(--primary-600)" />
                <span>جلسات يوم {new Date(selectedDay).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              </div>
            </div>

            {selectedEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
                <CalendarIcon size={40} style={{ margin: '0 auto 0.8rem', opacity: 0.4 }} />
                <h4 style={{ fontSize: '1rem', marginBottom: '0.3rem' }}>لا توجد جلسات مسجلة لهذا التاريخ</h4>
                <p style={{ fontSize: '0.85rem' }}>يمكنك النقر على زر الإضافة لتحديد موعد جلسة جديدة.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {selectedEvents.map((evt, idx) => (
                  <div 
                    key={idx} 
                    style={{
                      padding: '1rem',
                      background: 'var(--bg-card-subtle)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.6rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <strong style={{ fontSize: '0.95rem', color: 'var(--primary-700)' }}>
                          {evt.title}
                        </strong>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', marginTop: '0.15rem' }}>
                          {evt.subtitle}
                        </div>
                      </div>
                      <span className="badge" style={{ background: 'var(--status-adjourned-bg)', color: 'var(--status-adjourned)', fontSize: '0.72rem' }}>
                        {CASE_STATUSES[evt.caseData.status]?.label || 'منظورة'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: '0.8rem' }}>
                      <span><strong>المحكمة:</strong> {evt.court}</span>
                      {evt.courtRoom && <span><strong>قاعة:</strong> {evt.courtRoom}</span>}
                    </div>

                    {/* Google Calendar Direct Sync Button */}
                    <div style={{ paddingTop: '0.4rem', borderTop: '1px solid var(--border-subtle)' }}>
                      <a 
                        href={createGoogleCalendarUrl(evt)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ width: '100%', fontSize: '0.82rem', padding: '0.4rem', minHeight: 'auto', gap: '0.4rem' }}
                      >
                        {/* Google Calendar Icon */}
                        <svg width="15" height="15" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z"/>
                        </svg>
                        <span>إضافة تذكير فوري في Google Calendar</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Google Calendar Auto Sync Info Card */}
          <div className="card" style={{ background: 'linear-gradient(135deg, var(--bg-card), var(--primary-50))' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
              <svg width="22" height="22" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z"/>
              </svg>
              <h4 style={{ fontSize: '0.95rem', fontWeight: '700' }}>مزامنة التقويم التلقائية</h4>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.8rem' }}>
              انقر على زر <strong>"تصدير لتقويم Google (.ics)"</strong> بالأعلى لتنزيل جدول الجلسات واستيراده في تطبيق التقويم على هاتفك لتصلك إشعارات وتنبيهات الجلسات قبل موعدها بـ 24 ساعة.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
