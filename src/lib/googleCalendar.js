import { supabase, CASE_TYPES, COURT_LEVELS, CASE_STATUSES } from './supabase';

/**
 * Builds rich, formatted legal details for Google Calendar events
 */
export function buildRichLegalEvent(session, caseData, eventType = 'court_session') {
  const caseTypeArabic = CASE_TYPES[caseData?.case_type] || caseData?.case_type || 'دعوى قضائية';
  const courtLevelArabic = COURT_LEVELS[caseData?.court_level] || caseData?.court_level || 'ابتدائي';
  const statusArabic = CASE_STATUSES[session?.status || caseData?.status]?.label || 'متداول بالجلسة';

  const sessionDate = session?.event_date || (session?.session_date ? session.session_date.split('T')[0] : (caseData?.next_session_date ? caseData.next_session_date.split('T')[0] : new Date().toISOString().split('T')[0]));
  const sessionTime = session?.event_time || session?.session_time || caseData?.next_session_time || '09:00';

  let summary = `🏛️ جلسة: دعوى ${caseData?.case_number || ''}/${caseData?.case_year || ''} (${caseTypeArabic}) — ${caseData?.court_name || ''}`;
  let description = '';

  if (eventType === 'appeal_follow_up' || session?.event_type === 'appeal_follow_up') {
    summary = `⚖️ متابعة استئناف: دعوى ${caseData?.case_number || ''}/${caseData?.case_year || ''} — ${caseData?.court_name || ''}`;
    description =
`⚖️ تذكير موعد متابعة قيد الاستئناف:
────────────────────────────
• رقم الدعوى الأصلية: ${caseData?.case_number || ''} لسنة ${caseData?.case_year || ''} قضائية
• المحكمة: ${caseData?.court_name || ''}
• الموكل: ${caseData?.plaintiff_name || 'غير محدد'}
• الخصم: ${caseData?.defendant_name || 'غير محدد'}
• منطوق الحكم الصادر: ${session?.judgment_text || session?.ruling_text || caseData?.ruling_text || 'صدر حكم نهائي'}
• الإجراء المطلوب: التأكد من قيد وإيداع صحيفة الاستئناف وسداد الرسوم قبل فوات الميعاد القانوني.
────────────────────────────
الأجندة القضائية — نظام إدارة مكاتب المحاماة`;
  } else if (eventType === 'administrative_task' || session?.event_type === 'administrative_task') {
    summary = `📋 عمل إداري: ${session?.title || 'متابعة إدارية للدعوى'} (${caseData?.case_number || ''}/${caseData?.case_year || ''})`;
    description =
`📋 تفاصيل العمل الإداري:
────────────────────────────
• الموضوع: ${session?.title || 'متابعة إدارية'}
• رقم الدعوى: ${caseData?.case_number || ''} لسنة ${caseData?.case_year || ''}
• المحكمة / الجهة: ${session?.location || caseData?.court_name || 'جهة الاختصاص'}
• المطلوب والملاحظات: ${session?.requirements || session?.notes || 'مباشرة الإجراء'}
────────────────────────────
الأجندة القضائية — نظام إدارة مكاتب المحاماة`;
  } else {
    description = 
`⚖️ بيانات الجلسة والدعوى القضائية:
────────────────────────────
• رقم الدعوى: ${caseData?.case_number || ''} لسنة ${caseData?.case_year || ''} قضائية
• نوع الدعوى: ${caseTypeArabic} (${courtLevelArabic})
• المحكمة: ${caseData?.court_name || ''}
• القاعة / الدائرة: ${caseData?.court_room || session?.court_room || 'الدائرة المختصة'}
• الموقف الحالي: ${statusArabic}

👥 أطراف الخصومة:
• المدعي (الموكل/الطرف الأول): ${caseData?.plaintiff_name || 'غير محدد'}
• المدعى عليه (الخصم/الطرف الثاني): ${caseData?.defendant_name || 'غير محدد'}
• موضوع الدعوى: ${caseData?.case_title || 'حضور الجلسة وإبداء الدفاع'}

📋 المطلوب والقرارات بالجلسة:
• القرار / المطلوب: ${session?.notes || session?.adjournment_reason || caseData?.notes || 'تقديم المذكرات وأصل المستندات والمرافعة'}
${session?.ruling_text || caseData?.ruling_text ? '• منطوق القرار/الحكم: ' + (session.ruling_text || caseData.ruling_text) : ''}

⏰ التنبيهات:
• تم ضبط إشعار صوتي تلقائي قبل موعد الجلسة بـ 24 ساعة وساعة واحدة.
────────────────────────────
الأجندة القضائية — نظام إدارة مكاتب المحاماة`;
  }

  const location = `${caseData?.court_name || ''}${caseData?.court_room ? ' - قاعة ' + caseData.court_room : ''}`;

  return {
    summary,
    description,
    location,
    sessionDate,
    sessionTime,
  };
}

/**
 * Automatically creates an event directly in the lawyer's Google Calendar
 */
export async function syncSessionToGoogleCalendar(session, caseData, eventType = 'court_session') {
  try {
    const { summary, description, location, sessionDate, sessionTime } = buildRichLegalEvent(session, caseData, eventType);

    const { data: { session: authSession } } = await supabase.auth.getSession();
    const providerToken = authSession?.provider_token;

    const startDateTime = `${sessionDate}T${sessionTime}:00`;
    const endDate = new Date(`${sessionDate}T${sessionTime}:00`);
    endDate.setHours(endDate.getHours() + 3); // 3-hour window for court session
    const endDateTime = endDate.toISOString();

    const eventPayload = {
      summary,
      description,
      location,
      start: {
        dateTime: new Date(startDateTime).toISOString(),
        timeZone: 'Africa/Cairo',
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'Africa/Cairo',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 60 },      // 1 hour before
          { method: 'email', minutes: 24 * 60 },  // Email 1 day before
        ],
      },
    };

    // If OAuth token is present, call Google Calendar REST API directly in the background
    if (providerToken) {
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${providerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventPayload),
      });

      if (response.ok) {
        const result = await response.json();
        return { success: true, eventId: result.id, link: result.htmlLink };
      }
    }

    // Direct URL generator with rich details
    const titleEnc = encodeURIComponent(summary);
    const detailsEnc = encodeURIComponent(description);
    const locEnc = encodeURIComponent(location);
    const dateFormatted = sessionDate.replace(/-/g, '');
    const startTimeFormatted = sessionTime.replace(':', '') + '00';
    const fallbackUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titleEnc}&dates=${dateFormatted}T${startTimeFormatted}/${dateFormatted}T140000&details=${detailsEnc}&location=${locEnc}&sf=true&output=xml`;

    return { success: true, isFallback: true, fallbackUrl };
  } catch (err) {
    console.error('Google Calendar Automatic Sync Error:', err);
    return { success: false, error: err.message };
  }
}
