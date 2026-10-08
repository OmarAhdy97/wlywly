# -*- coding: utf-8 -*-
"""
Second pass for the (day, judicial year) buckets that crawl_scc.py could not enumerate because the
portal caps every query at 25 rows (the court decides dozens of cases on some days).
It walks the case numbers one by one for each such bucket. Resumable.
"""
import datetime as dt
import json
import re
import sys

import crawl_scc as c

sys.stdout.reconfigure(encoding='utf-8')

warn, filled = [], set()
for line in open(c.LOG, encoding='utf-8'):
    m = re.match(r'WARN capped (\d{4}-\d{2}-\d{2})\.\.\d{4}-\d{2}-\d{2}\|(\{.*\})', line)
    if m:
        warn.append((m.group(1), json.loads(m.group(2))['courtYear'][0]))
    m = re.match(r'FILLED (\d{4}-\d{2}-\d{2})\.\.\d{4}-\d{2}-\d{2}\|(\{.*\}) by number', line)
    if m:
        filled.add((m.group(1), json.loads(m.group(2))['courtYear'][0]))

todo = [w for w in dict.fromkeys(warn) if w not in filled]
print('buckets to fill:', len(todo), flush=True)
for day, year in todo:
    rows = c.call(ruleDateFrom=day, ruleDateTo=day, courtYear=[year])
    c.keep(rows)
    nums = [int(r['ruleNumber']) for r in rows if str(r.get('ruleNumber', '')).isdigit()]
    known = [int(r['ruleNumber']) for r in c.seen.values() if r.get('ruleDate', '')[:10] == day]
    top = min(1500, max(nums + known + [100]) * 2 + 100)
    got = 0
    for n in range(1, top + 1):
        got += c.keep(c.call(ruleDateFrom=day, ruleDateTo=day, courtYear=[year], ruleNumber=n))
    c.log('FILLED %s..%s|%s by number up to %d (+%d)' % (day, day, json.dumps({'courtYear': [year]}, sort_keys=True), top, got))
    print('filled', day, 'year', year, 'by number up to', top, '+', got, flush=True)
print('FILL FINISHED rows=%d' % len(c.seen), flush=True)
