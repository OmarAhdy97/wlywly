/**
 * Legal Deadlines & Date Utilities for Egyptian Legal Practice
 */

// Configurable product rule for appeal follow-up reminder
export const APPEAL_FOLLOW_UP_DAYS = 40;

/**
 * Calculates the appeal follow-up date based on judgment date and configured days.
 * 
 * Rule:
 * 1. Base date + configured days (default 40).
 * 2. If the resulting date falls on Friday (official Egyptian court weekend),
 *    it is moved to Saturday.
 * 
 * @param {string|Date} judgmentDate - The starting date of the judgment (YYYY-MM-DD or Date)
 * @param {number} days - Number of days to add (defaults to APPEAL_FOLLOW_UP_DAYS)
 * @returns {string} Formatted date string (YYYY-MM-DD)
 */
export function calculateAppealFollowUpDate(judgmentDate, days = APPEAL_FOLLOW_UP_DAYS) {
  if (!judgmentDate) return '';
  
  let d;
  if (typeof judgmentDate === 'string') {
    // Parse YYYY-MM-DD safely in local time
    const [year, month, day] = judgmentDate.split('T')[0].split('-').map(Number);
    d = new Date(year, month - 1, day);
  } else {
    d = new Date(judgmentDate.getTime());
  }

  // Add the configured number of days
  d.setDate(d.getDate() + Number(days));

  // Check day of week: 0 = Sunday, ..., 5 = Friday, 6 = Saturday
  if (d.getDay() === 5) {
    // Friday -> Roll over to Saturday
    d.setDate(d.getDate() + 1);
  }

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dayStr = String(d.getDate()).padStart(2, '0');

  return `${y}-${m}-${dayStr}`;
}

/**
 * Formats a YYYY-MM-DD date string into Arabic locale display
 * @param {string} dateStr 
 * @param {boolean} includeWeekday 
 * @returns {string}
 */
export function formatArabicDate(dateStr, includeWeekday = true) {
  if (!dateStr) return '—';
  try {
    const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
    const d = new Date(year, month - 1, day);
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    if (includeWeekday) {
      options.weekday = 'long';
    }
    return d.toLocaleDateString('ar-EG', options);
  } catch (e) {
    return dateStr;
  }
}

/**
 * Quick date helpers for adding weeks/months
 */
export function addDaysToDate(baseDateStr, daysToAdd) {
  const [year, month, day] = baseDateStr.split('T')[0].split('-').map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + daysToAdd);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dayStr = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dayStr}`;
}

/**
 * Returns today's date formatted as YYYY-MM-DD in local time
 */
export function getTodayLocalStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns tomorrow's date formatted as YYYY-MM-DD in local time
 */
export function getTomorrowLocalStr() {
  return addDaysToDate(getTodayLocalStr(), 1);
}

/**
 * Checks if a given date string is in the past (strictly before today)
 */
export function isPastDate(dateStr) {
  if (!dateStr) return false;
  const cleanDate = dateStr.split('T')[0];
  return cleanDate < getTodayLocalStr();
}

/**
 * Calculates number of full days a date is overdue relative to today
 */
export function getDaysOverdue(dateStr) {
  if (!dateStr) return 0;
  const [y1, m1, d1] = dateStr.split('T')[0].split('-').map(Number);
  const [y2, m2, d2] = getTodayLocalStr().split('-').map(Number);
  const datePast = new Date(y1, m1 - 1, d1);
  const dateToday = new Date(y2, m2 - 1, d2);
  const diffTime = dateToday - datePast;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Formats an ISO date/time string into a human-friendly Arabic relative time string
 */
export function formatRelativeTime(isoStr) {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours === 1) return 'منذ ساعة';
    if (diffHours === 2) return 'منذ ساعتين';
    if (diffHours < 24) return `منذ ${diffHours} ساعات`;
    if (diffDays === 1) return 'أمس';
    if (diffDays === 2) return 'أول أمس';
    if (diffDays < 7) return `منذ ${diffDays} أيام`;

    return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
  } catch (e) {
    return 'مؤخراً';
  }
}

