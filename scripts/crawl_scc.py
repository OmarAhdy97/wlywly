# -*- coding: utf-8 -*-
"""
Collects the Supreme Constitutional Court rulings that the court itself publishes on its public portal
(https://www.sccourt.gov.eg) through the same search endpoint its own web page uses.

- Polite: one request at a time, a pause between requests, resumable, identifies itself.
- Stores only the listing fields the portal returns (case data, subject, the dispositive part, the law,
  the link to the official full text). It does NOT copy the full judgments; the app links to the official page.

Usage:  python scripts/crawl_scc.py [out_dir]
"""
import datetime as dt
import json
import os
import subprocess
import sys
import time

sys.stdout.reconfigure(encoding='utf-8')

URL = 'https://www.sccourt.gov.eg/DjangoPortal/api/RulesInsert/search-in-rules-based-on-request-es'
CAP = 25            # the portal returns at most 25 rows per query
PAUSE = 0.9         # seconds between requests
BASE = dict(ruleYearFrom=None, ruleMonthFrom=None, ruleYearTo=None, ruleMonthTo=None, courtType=None,
            ruleWardingText=None, ruleText=None, ruleWarding=None, identical=False, slop=None, courtYear=None,
            ruleNumber=None, claimed=None, defendent=None, uploadCaseWay=None, ruleDateTo=None, ruleDateFrom=None,
            ruleSubjectTypeCode=None, ruleStatusCode=None, lawName=None, lawType=None, lawNumber=None, lawYear=None,
            lawCategory=None, lawItem=None, partNo=None, baseNo=None, isRule=True, pageNo=1, pageSize=50)

out_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), 'data')
os.makedirs(out_dir, exist_ok=True)
RAW = os.path.join(out_dir, 'scc_raw.jsonl')
LOG = os.path.join(out_dir, 'scc_crawl.log')

seen = {}
if os.path.exists(RAW):
    for line in open(RAW, encoding='utf-8'):
        try:
            r = json.loads(line)
            seen[r['ruleId']] = r
        except Exception:
            pass
done_windows = set()
if os.path.exists(LOG):
    for line in open(LOG, encoding='utf-8'):
        if line.startswith('DONE '):
            done_windows.add(line[5:].strip())

requests_made = 0
warnings = []


def log(msg):
    with open(LOG, 'a', encoding='utf-8') as f:
        f.write(msg + '\n')


def call(**kw):
    global requests_made
    body = dict(BASE)
    body.update(kw)
    for attempt in range(4):
        time.sleep(PAUSE)
        r = subprocess.run(['curl', '-s', '-m', '90', '-A', 'AgendaLawLibrary/1.0 (research; contact: office)', '-X', 'POST',
                            '-H', 'Content-Type: application/json', '--data-binary', '@-', URL],
                           input=json.dumps(body).encode(), capture_output=True)
        requests_made += 1
        try:
            d = json.loads(r.stdout.decode('utf-8'))
            if d.get('isSucceeded'):
                return d['data']
        except Exception:
            pass
        time.sleep(3 * (attempt + 1))
    raise RuntimeError('request failed: %s' % kw)


def keep(rows):
    new = 0
    with open(RAW, 'a', encoding='utf-8') as f:
        for r in rows:
            if r['ruleId'] in seen:
                log('DUP %s %s' % (r['ruleId'], r['ruleDate'][:4]))
            if r['ruleId'] not in seen:
                r.pop('matchedParagraph', None)
                r.pop('matchedTerms', None)
                seen[r['ruleId']] = r
                f.write(json.dumps(r, ensure_ascii=False) + '\n')
                new += 1
    return new


def window(d1, d2, extra=None, depth=0):
    key = '%s..%s|%s' % (d1, d2, json.dumps(extra or {}, sort_keys=True))
    if key in done_windows:
        return
    rows = call(ruleDateFrom=d1.isoformat(), ruleDateTo=d2.isoformat(), **(extra or {}))
    if len(rows) < CAP:
        n = keep(rows)
        log('DONE ' + key)
        if rows:
            print('%s %s rows=%d new=%d total=%d reqs=%d' % (d1, d2, len(rows), n, len(seen), requests_made), flush=True)
        done_windows.add(key)
        return
    if d1 < d2:
        mid = d1 + (d2 - d1) // 2
        window(d1, mid, extra, depth + 1)
        window(mid + dt.timedelta(days=1), d2, extra, depth + 1)
        done_windows.add(key)
        log('DONE ' + key)
        return
    # a single day that still fills the cap: slice by judicial year
    if not extra:
        # judicial years that can plausibly be decided on this date
        for y in range(1, min(60, max(10, d1.year - 1979 + 3))):
            window(d1, d2, {'courtYear': [y]}, depth + 1)
        done_windows.add(key)
        log('DONE ' + key)
        return
    # still capped for (day, judicial year): walk the case numbers one by one
    keep(rows)
    nums = [int(r['ruleNumber']) for r in rows if str(r.get('ruleNumber', '')).isdigit()]
    top = min(1500, max(nums or [100]) * 2 + 100)
    got = 0
    for n in range(1, top + 1):
        try:
            sub = call(ruleDateFrom=d1.isoformat(), ruleDateTo=d2.isoformat(), courtYear=extra['courtYear'], ruleNumber=n)
        except RuntimeError:
            # one flaky number must not stop a 1500-request walk: wait, try once more, otherwise note it for a later pass
            time.sleep(60)
            try:
                sub = call(ruleDateFrom=d1.isoformat(), ruleDateTo=d2.isoformat(), courtYear=extra['courtYear'], ruleNumber=n)
            except RuntimeError:
                log('SKIPNUM %s|%s|%d' % (key, json.dumps(extra, sort_keys=True), n))
                continue
        got += keep(sub)
    log('FILLED %s by number up to %d (+%d)' % (key, top, got))
    print('filled', key, 'by number up to', top, '+', got, flush=True)


if __name__ == '__main__':
    start = dt.date(1970, 1, 1)
    end = dt.date.today() + dt.timedelta(days=30)
    y = start.year
    while y <= end.year:
        window(dt.date(y, 1, 1), min(dt.date(y, 12, 31), end))
        y += 1
    print('FINISHED rows=%d requests=%d warnings=%d' % (len(seen), requests_made, len(warnings)), flush=True)
    log('FINISHED rows=%d requests=%d warnings=%d' % (len(seen), requests_made, len(warnings)))
