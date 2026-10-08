// Egyptian phone numbers: one stored shape (01XXXXXXXXX) and one way to show them.

const LRI = '⁦';
const PDI = '⁩';

// Digits only, with the country code folded back into the local leading zero.
export function normalizeEgyptPhone(raw) {
  let d = String(raw || '').replace(/[٠-٩]/g, (c) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/\D/g, '');
  if (d.startsWith('0020')) d = d.slice(4);
  else if (d.startsWith('20') && d.length === 12) d = d.slice(2);
  if (d.length === 10 && d.startsWith('1')) d = `0${d}`;
  return d;
}

export function isEgyptMobile(raw) {
  return /^01[0125]\d{8}$/.test(normalizeEgyptPhone(raw));
}

/*
 * "010 2421 6824" (or "+20 10 2421 6824" with intl), wrapped in a left-to-right
 * isolate so the groups never flip order inside Arabic text.
 */
export function formatEgyptPhone(raw, { intl = false, isolate = true } = {}) {
  if (!raw) return '';
  const n = normalizeEgyptPhone(raw);
  let out = String(raw).trim();
  if (/^01\d{9}$/.test(n)) {
    out = intl ? `+20 ${n.slice(1, 3)} ${n.slice(3, 7)} ${n.slice(7)}` : `${n.slice(0, 3)} ${n.slice(3, 7)} ${n.slice(7)}`;
  } else if (/^0[23]\d{8}$/.test(n)) {
    // Cairo and Alexandria landlines: two-digit area code
    out = `${n.slice(0, 2)} ${n.slice(2, 6)} ${n.slice(6)}`;
  } else if (/^0\d{9}$/.test(n)) {
    // other governorates: three-digit area code
    out = `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`;
  }
  return isolate ? `${LRI}${out}${PDI}` : out;
}
