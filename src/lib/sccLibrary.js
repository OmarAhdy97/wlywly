/**
 * Supreme Constitutional Court rulings library.
 * The dataset is a static JSON file (public/legal/scc_rulings.json) built from what the court
 * publishes on its own portal; it is loaded once, indexed in memory and searched locally.
 */

const DATA_URL = '/legal/scc_rulings.json';

let cache = null;
let loading = null;

// Arabic normalisation used for BOTH the index and the query
export function normalizeArabic(input) {
  return String(input || '')
    .replace(/[ً-ٰٟـ]/g, '')   // tashkeel + tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0))
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export const OUTCOMES = {
  unconstitutional: { label: 'عدم دستورية', tone: 'dismissed' },
  rejected: { label: 'رفض الدعوى', tone: 'active' },
  inadmissible: { label: 'عدم قبول', tone: 'adjourned' },
  procedural: { label: 'إجرائي (انقطاع / شطب / ترك)', tone: 'settled' },
  other: { label: 'أخرى', tone: 'settled' },
};

export async function loadSccDataset() {
  if (cache) return cache;
  if (!loading) {
    loading = fetch(DATA_URL)
      .then(r => {
        if (!r.ok) throw new Error('تعذر تحميل مكتبة الأحكام');
        return r.json();
      })
      .then(json => {
        const items = json.items.map(it => ({
          ...it,
          _hay: normalizeArabic([it.s, it.rq, it.w, it.law, it.kw, it.ci].filter(Boolean).join(' ')),
          _head: normalizeArabic([it.s, it.law, it.kw].filter(Boolean).join(' ')),
        }));
        cache = { meta: json.meta, items };
        return cache;
      })
      .catch(err => {
        loading = null;
        throw err;
      });
  }
  return loading;
}

/**
 * @param {Array} items
 * @param {{query?:string, outcome?:string, type?:string, court?:string, yearFrom?:number, yearTo?:number, onlyIds?:Set}} f
 */
export function searchRulings(items, f = {}) {
  const tokens = normalizeArabic(f.query).split(' ').filter(Boolean);
  const out = [];
  for (const it of items) {
    if (f.onlyIds && !f.onlyIds.has(it.id)) continue;
    if (f.outcome && f.outcome !== 'all' && it.oc !== f.outcome) continue;
    if (f.type && f.type !== 'all' && it.t !== f.type) continue;
    if (f.court && f.court !== 'all' && it.c !== f.court) continue;
    const year = it.d ? Number(it.d.slice(0, 4)) : 0;
    if (f.yearFrom && year < f.yearFrom) continue;
    if (f.yearTo && year > f.yearTo) continue;

    let score = 0;
    let ok = true;
    for (const tk of tokens) {
      if (!it._hay.includes(tk)) { ok = false; break; }
      score += it._head.includes(tk) ? 3 : 1;
    }
    if (!ok) continue;
    out.push({ it, score });
  }
  out.sort((a, b) => (b.score - a.score) || String(b.it.d).localeCompare(String(a.it.d)));
  return out.map(x => x.it);
}

/** Splits text into [{text, hit}] so the UI can mark the searched words without innerHTML. */
export function highlightParts(text, query) {
  const raw = String(text || '');
  const tokens = normalizeArabic(query).split(' ').filter(t => t.length > 1);
  if (!tokens.length || !raw) return [{ text: raw, hit: false }];
  // find hits on a char-aligned normalised copy (normalisation keeps length 1:1 except removed marks)
  const norm = [];
  const map = [];
  for (let i = 0; i < raw.length; i++) {
    if (/\s/.test(raw[i])) { norm.push(' '); map.push(i); continue; }
    const n = normalizeArabic(raw[i]);
    if (n === '') continue;
    for (const ch of n) { norm.push(ch); map.push(i); }
  }
  const flat = norm.join('');
  const marks = new Array(raw.length).fill(false);
  for (const tk of tokens) {
    let from = 0;
    while (true) {
      const pos = flat.indexOf(tk, from);
      if (pos === -1) break;
      for (let k = pos; k < pos + tk.length; k++) marks[map[k]] = true;
      from = pos + tk.length;
    }
  }
  const parts = [];
  let cur = '';
  let curHit = marks[0];
  for (let i = 0; i < raw.length; i++) {
    if (marks[i] !== curHit) {
      parts.push({ text: cur, hit: curHit });
      cur = '';
      curHit = marks[i];
    }
    cur += raw[i];
  }
  parts.push({ text: cur, hit: curHit });
  return parts;
}

const arDate = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${Number(d)}/${Number(m)}/${y}`;
};

/** The way a lawyer cites the ruling in a memo. */
export function buildCitation(it) {
  const court = it.c === 'high' ? 'المحكمة العليا' : 'المحكمة الدستورية العليا';
  const kind = it.t === 'تنازع' ? 'تنازع' : it.t === 'تفسير' ? 'تفسير تشريعي' : 'دستورية';
  const date = it.d ? `، جلسة ${arDate(it.d)}` : '';
  const dest = it.n && it.y ? `الدعوى رقم ${it.n} لسنة ${it.y} قضائية «${kind}»` : (it.ci || '');
  return `حكم ${court} في ${dest}${date}.`;
}
