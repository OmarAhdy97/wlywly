# -*- coding: utf-8 -*-
"""
Turns scripts/data/scc_raw.jsonl (what the court's portal returned) into the compact file the app loads:
public/legal/scc_rulings.json

Also writes scripts/data/scc_verification.txt: per-year counts compared with the court's own yearly table.
"""
import collections
import datetime as dt
import json
import os
import re
import subprocess
import sys

sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(__file__)
RAW = os.path.join(HERE, 'data', 'scc_raw.jsonl')
OUT = os.path.join(HERE, '..', 'public', 'legal', 'scc_rulings.json')
REPORT = os.path.join(HERE, 'data', 'scc_verification.txt')


def norm(s):
    s = re.sub(r'[ً-ٰٟـ]', '', s or '')
    s = re.sub('[أإآٱ]', 'ا', s).replace('ى', 'ي').replace('ة', 'ه')
    return re.sub(r'\s+', ' ', s).strip()


def clean(s):
    s = (s or '').replace('\r', '')
    s = re.sub(r'[ \t]+', ' ', s)
    s = re.sub(r'\n\s*\n+', '\n', s)
    return s.strip()


PROCEDURAL = ['انقطاع سير الخصومه', 'ترك الخصومه', 'انتهاء الخصومه', 'اثبات ترك', 'اثبات التنازل', 'اثبات تنازل', 'التنازل عن الدعوي',
              'شطب', 'زوال', 'سقوط الخصومه', 'اعتبار الدعوي كان لم تكن', 'عدم جواز نظر', 'وقف الدعوي', 'ايقاف']
MARKERS = [
    ('unconstitutional', ['عدم دستوريه', 'ببطلان', 'بسقوط']),
    ('rejected', ['رفض الدعوي', 'برفض الدعوي', 'رفض الطلب', 'برفض الطلب', 'رفض الدفع', 'برفض الدفع', 'برفض']),
    ('inadmissible', ['عدم قبول', 'بعدم قبول', 'عدم اختصاص', 'بعدم اختصاص']),
]


def classify(warding):
    w = norm(warding)
    if not w:
        return 'other'
    best = None
    for oc, keys in MARKERS:
        for k in keys:
            pos = w.find(k)
            if pos != -1 and (best is None or pos < best[0]):
                best = (pos, oc)
    # a procedural ending only wins when nothing on the merits is stated
    if best is None:
        return 'procedural' if any(p in w for p in PROCEDURAL) else 'other'
    if any(p in w for p in PROCEDURAL[:6]) and best[1] in ('inadmissible',):
        return 'procedural'
    return best[1]


LAW_FIX = {}
_fix = os.path.join(HERE, 'data', 'scc_law_fix.json')
if os.path.exists(_fix):
    LAW_FIX = json.load(open(_fix, encoding='utf-8'))


def clean_law(rule_id, law):
    law = clean(law)
    if '??' not in law:
        return law
    fixed = LAW_FIX.get(str(rule_id))
    if fixed:
        return fixed
    # the portal's own text is corrupted here: drop the unreadable tail instead of showing question marks
    law = law[:law.index('??')]
    return re.sub(r'\s+', ' ', law).strip(' -،')


def parse_case(ci):
    ci = clean(ci)
    m = re.match(r'\s*(?:الدعوى|الطلب|القضيه|القضية)?\s*(\d+)\s*لسنة\s*(\d+)', ci)
    parts = [p.strip() for p in ci.split(' - ')]
    kind = parts[1] if len(parts) > 1 else ''
    k = norm(kind)
    if 'دستوريه' in k:
        t = 'دستورية'
    elif 'تنازع' in k:
        t = 'تنازع'
    elif 'تفسير' in k:
        t = 'تفسير'
    elif 'تحكيم' in k:
        t = 'تحكيم'
    elif 'تنفيذ' in k:
        t = 'منازعة تنفيذ'
    else:
        t = kind or 'أخرى'
    court = 'high' if (len(parts) > 2 and 'العليا' in parts[2] and 'الدستوريه' not in norm(parts[2])) else 'scc'
    return (int(m.group(1)) if m else None, int(m.group(2)) if m else None, t, court)


def main():
    rows = [json.loads(l) for l in open(RAW, encoding='utf-8')]
    items = []
    for r in rows:
        n, y, t, court = parse_case(r.get('caseInfo'))
        d = (r.get('ruleDate') or '')[:10]
        subject = clean(r.get('subject'))
        req = clean(r.get('requests'))
        item = {
            'id': r['ruleId'],
            'n': n or r.get('ruleNumber'),
            'y': y,
            't': t,
            'c': court,
            'd': d,
            'ci': clean(r.get('caseInfo')),
            's': subject,
            'rq': '' if req == subject else req,
            'w': clean(r.get('ruleWarding')),
            'law': clean_law(r['ruleId'], r.get('law')),
            'kw': clean(r.get('subjectKeywords')),
            'oc': classify(r.get('ruleWarding')),
            'u': r.get('filePath') if (r.get('filePath') or '').endswith('.html') else None,
        }
        items.append({k: v for k, v in item.items() if v not in (None, '')})
    items.sort(key=lambda x: (x.get('d', ''), x['id']), reverse=True)

    years = [int(i['d'][:4]) for i in items if i.get('d')]
    by_year = collections.Counter(years)
    meta = {
        'source': 'الموقع الرسمي للمحكمة الدستورية العليا (sccourt.gov.eg)',
        'fetchedAt': dt.date.today().isoformat(),
        'count': len(items),
        'minYear': min(years),
        'maxYear': max(years),
        'classification': 'تصنيف النتيجة آلي بحسب نص المنطوق ويُراجَع في النص الرسمي',
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump({'meta': meta, 'items': items}, f, ensure_ascii=False, separators=(',', ':'))

    # ---- verification against the court's own yearly table ----
    chart = json.loads(subprocess.run(['curl', '-s', '-m', '60', 'https://www.sccourt.gov.eg/DjangoPortal/api/Cases/get-the-chart-from-database'],
                                      capture_output=True).stdout.decode('utf-8'))['data']
    dup = collections.Counter()
    log = os.path.join(HERE, 'data', 'scc_crawl.log')
    if os.path.exists(log):
        for line in open(log, encoding='utf-8'):
            if line.startswith('DUP '):
                dup[int(line.split()[2])] += 1
    lines = ['year | official | ours (unique) | duplicate rows the portal itself returns | status']
    bad = 0
    for row in chart:
        yr = int(row['years'])
        official = row['highCourt'] + row['highDestoriaCourt']
        ours = by_year.get(yr, 0)
        d = dup.get(yr, 0)
        status = 'OK' if ours + d == official else ('OK (within dup)' if ours == official else 'MISMATCH')
        if status == 'MISMATCH':
            bad += 1
        lines.append('%d | %d | %d | %d | %s' % (yr, official, ours, d, status))
    lines.append('total ours=%d, year mismatches=%d' % (len(items), bad))
    open(REPORT, 'w', encoding='utf-8').write('\n'.join(lines))
    print('\n'.join(lines[-12:]))
    print('written', os.path.abspath(OUT), os.path.getsize(OUT) // 1024, 'KB')


if __name__ == '__main__':
    main()
