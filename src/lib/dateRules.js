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
