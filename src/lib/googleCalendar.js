import { supabase } from './supabase';

/**
 * Automatically creates an event directly in the lawyer's Google Calendar
 * using their authenticated Google OAuth token or Google Calendar API.
 */
export async function syncSessionToGoogleCalendar(session, caseData) {
  try {
    const { data: { session: authSession } } = await supabase.auth.getSession();
    const providerToken = authSession?.provider_token;

    const sessionDate = session.session_date ? session.session_date.split('T')[0] : caseData.next_session_date.split('T')[0];
    const sessionTime = session.session_time || caseData.next_session_time || '09:00';
    const startDateTime = `${sessionDate}T${sessionTime}:00`;
    
    // Default 2-hour court session window
    const endDate = new Date(`${sessionDate}T${sessionTime}:00`);
    endDate.setHours(endDate.getHours() + 2);
    const endDateTime = endDate.toISOString();

    const eventPayload = {
      summary: `جلسة قضائية: دعوى ${caseData.case_number}/${caseData.case_year} — ${caseData.court_name}`,
      description: `موضوع الدعوى: ${caseData.case_title || '—'}\nالمدعي: ${caseData.plaintiff_name}\nالمدعى عليه: ${caseData.defendant_name}\nالمحكمة: ${caseData.court_name} (قاعة: ${caseData.court_room || 'غير محددة'})\nملاحظات: ${session.notes || session.adjournment_reason || 'حضور الجلسة القضائية'}`,
      location: caseData.court_name,
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

    // If we have Google Provider OAuth Token, call Google Calendar API directly
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

    // Fallback: Return generated direct template link
    const title = encodeURIComponent(eventPayload.summary);
    const details = encodeURIComponent(eventPayload.description);
    const loc = encodeURIComponent(eventPayload.location);
    const dateFormatted = sessionDate.replace(/-/g, '');
    const startTimeFormatted = sessionTime.replace(':', '') + '00';
    const fallbackUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateFormatted}T${startTimeFormatted}/${dateFormatted}T140000&details=${details}&location=${loc}&sf=true&output=xml`;

    return { success: true, isFallback: true, fallbackUrl };
  } catch (err) {
    console.error('Google Calendar Sync Error:', err);
    return { success: false, error: err.message };
  }
}
