import { CASE_TYPES, CASE_STATUSES, SESSION_DECISIONS } from './supabase';

export const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '8980994154:AAGJzUkUAuXHysaHn_fNl28eqHxs-uYHbdM';
export const TELEGRAM_BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'Agenda_LegalBot';

const TELEGRAM_API_BASE = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

/**
 * Escapes HTML characters for Telegram HTML mode
 */
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Generates the direct t.me link for a client to start the bot
 */
export function generateClientInviteLink(clientId) {
  if (!clientId) {
    return `https://t.me/${TELEGRAM_BOT_USERNAME}`;
  }
  // Telegram start payload allows alphanumeric + underscores up to 64 chars
  const cleanId = String(clientId).replace(/[^a-zA-Z0-9_]/g, '');
  return `https://t.me/${TELEGRAM_BOT_USERNAME}?start=c_${cleanId}`;
}

/**
 * Sends an HTML formatted message to a Telegram chat
 */
export async function sendTelegramMessage(chatId, htmlText) {
  if (!chatId) {
    throw new Error('رقم معرّف التليجرام (Chat ID) غير متوفر');
  }

  const response = await fetch(`${TELEGRAM_API_BASE}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: htmlText,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });

  const result = await response.json();
  if (!result.ok) {
    throw new Error(result.description || 'فشل إرسال رسالة التليجرام');
  }
  return result;
}

/**
 * Sends a welcome/test message to confirm Telegram integration
 */
export async function sendTestMessage(chatId, clientName, lawyerUser) {
  const lawyerName = lawyerUser?.user_metadata?.full_name || 'مكتب المحاماة';
  const lawyerPhone = lawyerUser?.user_metadata?.phone || '';

  const message = `
⚖️ <b>الأجندة القضائية — رسالة تأكيد</b>

مرحباً بك أستاذ/ة <b>${escapeHtml(clientName || 'الموكل العزيز')}</b>،

تم بنجاح ربط حسابكم بمنظومة الإشعارات القضائية الخاصة بـ:
<b>أ / ${escapeHtml(lawyerName)}</b> ${lawyerPhone ? `(📞 ${escapeHtml(lawyerPhone)})` : ''}

📌 <b>ماذا يعني هذا؟</b>
ستصلك عبر هذه المحادثة إشعارات فورية بكل جديد يخص دعاواكم القضائية (تأجيل الجلسات، أسباب التأجيل، القرارات الصادرة، والأحكام النهائية) بمجرد قيدها في الأجندة.

<i>نسعد دائماً بخدمتكم وتسهيل متابعة قضاياكم.</i>
  `.trim();

  return sendTelegramMessage(chatId, message);
}

/**
 * Formats an Arabic notification for session decisions / case updates
 */
export function buildCaseUpdateMessage({ client, caseItem, updateType, lawyerUser, sessionData }) {
  const clientName = client?.name || 'الموكل العزيز';
  const lawyerName = lawyerUser?.user_metadata?.full_name || 'مكتب المحاماة';
  const lawyerPhone = lawyerUser?.user_metadata?.phone || '';

  const caseTitle = caseItem?.case_title || 'دعوى قضائية';
  const caseNumber = caseItem?.case_number || 'غير محدد';
  const caseYear = caseItem?.case_year || '';
  const courtName = caseItem?.court_name || 'غير محددة';
  const caseTypeArabic = (caseItem?.case_type && CASE_TYPES[caseItem.case_type]) || caseItem?.case_type || 'قضية';
  const opponentName = caseItem?.opponent_name || '';

  let decisionDetails = '';

  if (updateType === 'adjourned' || sessionData?.status === 'adjourned') {
    const nextDate = sessionData?.next_session_date || caseItem?.next_session_date;
    const formattedNext = nextDate ? new Date(nextDate).toLocaleDateString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : 'سيتم تحديدها لاحقاً';

    const reason = sessionData?.adjournment_reason || sessionData?.notes || caseItem?.notes || 'للمرافعة وتقديم المستندات';

    decisionDetails = `
📌 <b>قرار الجلسة:</b> تأجيل
❓ <b>السبب والمطلوب:</b> ${escapeHtml(reason)}
📅 <b>تاريخ الجلسة القادمة:</b> ${escapeHtml(formattedNext)}
    `.trim();
  } else if (updateType === 'finalJudgment' || sessionData?.status === 'finalJudgment') {
    const ruling = sessionData?.ruling_text || caseItem?.ruling_text || sessionData?.notes || 'صدر الحكم (يرجى مراجعة المكتب للتفاصيل)';
    decisionDetails = `
⚖️ <b>قرار الجلسة:</b> صدور حكم نهائي
📜 <b>منطوق الحكم:</b> ${escapeHtml(ruling)}
    `.trim();
  } else if (updateType === 'preliminaryJudgment' || sessionData?.status === 'preliminaryJudgment') {
    const ruling = sessionData?.ruling_text || caseItem?.ruling_text || 'صدر حكم تمهيدي بندب خبير أو تحقيق';
    const nextDate = sessionData?.next_session_date || caseItem?.next_session_date;
    const formattedNext = nextDate ? new Date(nextDate).toLocaleDateString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : null;

    decisionDetails = `
⚖️ <b>قرار الجلسة:</b> صدور حكم تمهيدي
📜 <b>القرار:</b> ${escapeHtml(ruling)}
${formattedNext ? `📅 <b>الجلسة القادمة:</b> ${escapeHtml(formattedNext)}` : ''}
    `.trim();
  } else {
    // Generic status or update
    const statusObj = caseItem?.status ? CASE_STATUSES[caseItem.status] : null;
    const statusText = statusObj ? statusObj.label : (caseItem?.status || 'تحديث');
    decisionDetails = `
🔄 <b>حالة القضية الحالية:</b> ${escapeHtml(statusText)}
${caseItem?.notes ? `📝 <b>ملاحظات:</b> ${escapeHtml(caseItem.notes)}` : ''}
    `.trim();
  }

  const todayArabic = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
🏛️ <b>الأجندة القضائية — إشعار بمجريات الدعوى</b>

مرحباً بك أستاذ/ة <b>${escapeHtml(clientName)}</b>،
إخطار صادر من مكتب: <b>أ / ${escapeHtml(lawyerName)}</b> ${lawyerPhone ? `(📞 ${escapeHtml(lawyerPhone)})` : ''}

━━━━━━━━━━━━━━━━━━━
📑 <b>موضوع الدعوى:</b> ${escapeHtml(caseTitle)}
🔢 <b>رقم الدعوى:</b> ${escapeHtml(caseNumber)} لسنة ${escapeHtml(caseYear)} (${escapeHtml(caseTypeArabic)})
🏛️ <b>المحكمة:</b> ${escapeHtml(courtName)}
${opponentName ? `👤 <b>الخصم:</b> ${escapeHtml(opponentName)}` : ''}
━━━━━━━━━━━━━━━━━━━

${decisionDetails}

━━━━━━━━━━━━━━━━━━━
🗓️ <i>تاريخ التحديث: ${escapeHtml(todayArabic)}</i>
⚖️ <i>نظام المتابعة الآلي — الأجندة القضائية</i>
  `.trim();
}

/**
 * High-level function to notify a client about a case update
 */
export async function notifyClientOfCaseUpdate({ client, caseItem, updateType, lawyerUser, sessionData }) {
  if (!client || !client.telegram_chat_id) {
    return { sent: false, reason: 'الموكل غير مسجل لديه معرف تليجرام' };
  }

  const messageText = buildCaseUpdateMessage({ client, caseItem, updateType, lawyerUser, sessionData });
  const result = await sendTelegramMessage(client.telegram_chat_id, messageText);
  return { sent: true, result };
}

/**
 * Calls Telegram getUpdates to check if the client has sent /start
 * Returns matching chat_id if found, or null
 */
export async function verifyAndFetchClientChatId(clientId) {
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/getUpdates?limit=50`);
    const data = await response.json();
    if (!data.ok || !data.result) return null;

    const cleanId = String(clientId).replace(/[^a-zA-Z0-9_]/g, '');
    const targetTag = `c_${cleanId}`;

    // Scan messages from newest to oldest
    const updates = [...data.result].reverse();
    for (const update of updates) {
      const msg = update.message || update.edited_message;
      if (!msg || !msg.text) continue;

      // Check if text matches /start c_ID or contains the clientId or is a 6-digit code
      const text = msg.text.trim();
      if (text.includes(targetTag) || (cleanId.length >= 6 && text.includes(cleanId))) {
        return {
          chatId: msg.chat.id,
          username: msg.from?.username || '',
          firstName: msg.from?.first_name || '',
          lastName: msg.from?.last_name || '',
          date: msg.date,
        };
      }
    }
    return null;
  } catch (err) {
    console.error('Error in verifyAndFetchClientChatId:', err);
    return null;
  }
}
