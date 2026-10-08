# -*- coding: utf-8 -*-
"""
The court's portal returns the tail of the `law` field as question marks for some old rulings
(the corruption is in its own database, it also appears in the details endpoint).
The details endpoint carries the clean text in `briefLawItems`, so for the affected rulings we fetch it once
and store it in scripts/data/scc_law_fix.json (ruleId -> clean text). build_scc_dataset.py then uses it.
Polite: one request at a time with a pause; resumable.
"""
import json
import os
import re
import subprocess
import sys
import time

sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(__file__)
RAW = os.path.join(HERE, 'data', 'scc_raw.jsonl')
FIX = os.path.join(HERE, 'data', 'scc_law_fix.json')
URL = 'https://www.sccourt.gov.eg/DjangoPortal/api/RulesInsert/get-rule-details-by-case-id?CaseiD=%s'

fix = json.load(open(FIX, encoding='utf-8')) if os.path.exists(FIX) else {}
rows = [json.loads(l) for l in open(RAW, encoding='utf-8')]
todo = [r for r in rows if re.search(r'\?{2,}', r.get('law') or '') and str(r['ruleId']) not in fix]
print('records with corrupted law text:', len(todo), 'already fixed:', len(fix), flush=True)

for i, r in enumerate(todo, 1):
    time.sleep(0.9)
    out = subprocess.run(['curl', '-s', '-m', '60', URL % r['caseId']], capture_output=True)
    try:
        d = json.loads(out.stdout.decode('utf-8'))['data'][0]
    except Exception:
        print('skip', r['ruleId'], flush=True)
        continue
    text = (d.get('briefLawItems') or '').strip()
    if text and '??' not in text:
        fix[str(r['ruleId'])] = re.sub(r'\s+', ' ', text)
    else:
        fix[str(r['ruleId'])] = None   # nothing better available; the build strips the question marks
    if i % 20 == 0:
        json.dump(fix, open(FIX, 'w', encoding='utf-8'), ensure_ascii=False)
        print(i, '/', len(todo), flush=True)
json.dump(fix, open(FIX, 'w', encoding='utf-8'), ensure_ascii=False)
print('done', sum(1 for v in fix.values() if v), 'fixed,', sum(1 for v in fix.values() if not v), 'cleaned only', flush=True)
