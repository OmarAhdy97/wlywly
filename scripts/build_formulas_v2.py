# -*- coding: utf-8 -*-
"""
Rebuilds src/data/legal_formulas.json into the v2 court-paper format.

Inputs
  - legal_formulas.json (current catalog; read from git HEAD copy if --from-git)
  - book_recs.json: formulas parsed from «الكتاب الأول في الصيغ القانونية»
    (عدنان عبد المجيد / البسيوني محمود عبده, نقابة المحامين - egyls.com)
  - formula_204.json: hand-written reference formula from the office's original PDF

Three outcomes per formula
  sourced  - wording converted from the book (blanks become fields)
  draft    - structure of the court paper (opening / facts / basis / requests),
             lawyer fills facts and requests; NO legal citation is invented
  legacy   - contracts, guides, document folders: untouched

Usage: python scripts/build_formulas_v2.py <book_recs.json> <formula_204.json>
"""
import json, re, sys, copy

sys.stdout.reconfigure(encoding='utf-8')
CATALOG = 'src/data/legal_formulas.json'
BOOK, F204 = sys.argv[1], sys.argv[2]

# demo formula id -> index in the book list (records that contain «فى يوم»)
BOOK_MAP = {
    'formula_009': 42, 'formula_223': 42, 'formula_017': 67, 'formula_047': 67,
    'formula_018': 93, 'formula_027': 238, 'formula_031': 252, 'formula_032': 69,
    'formula_039': 270, 'formula_097': 333, 'formula_134': 332, 'formula_105': 133,
    'formula_117': 366, 'formula_120': 365, 'formula_099': 365, 'formula_148': 316,
    'formula_187': 280, 'formula_220': 181, 'formula_214': 362, 'formula_228': 235,
    'formula_044': 74, 'formula_172': 359, 'formula_111': 98, 'formula_123': 98,
    'formula_128': 328, 'formula_210': 111, 'formula_122': 357, 'formula_013': 259,
}
GUIDE_IDS = {'formula_001', 'formula_002', 'formula_003', 'formula_016',
             'formula_168', 'formula_194', 'formula_231'}
BOOK_SOURCE = 'الكتاب الأول في الصيغ القانونية — إعداد عدنان عبد المجيد والبسيوني محمود عبده (نقابة المحامين المصرية)'

# ───────────────────────── text clean-up (book orthography) ─────────────────────────
WORDS = {'فى': 'في', 'الى': 'إلى', 'التى': 'التي', 'الذى': 'الذي', 'اللذان': 'اللذان',
         'انه': 'إنه', 'أنه': 'إنه', 'اذ': 'إذ', 'اذا': 'إذا', 'انا': 'أنا', 'اعلنته': 'أعلنته',
         'واعلنته': 'وأعلنته', 'واعلنت': 'وأعلنت', 'اعلنت': 'أعلنت', 'اعلنتهما': 'أعلنتهما',
         'والى': 'وإلى', 'اى': 'أي', 'أى': 'أي', 'او': 'أو', 'ان': 'أن', 'اما': 'أما',
         'الاستاذ': 'الأستاذ', 'المحامى': 'المحامي', 'لاجل': 'لأجل', 'ولاجل': 'ولأجل',
         'اعلان': 'إعلان', 'الاعلان': 'الإعلان', 'اتعاب': 'أتعاب', 'اتعاب': 'أتعاب',
         'المصاريف': 'المصروفات', 'علنا': 'علنًا', 'محضر': 'محضر', 'اليه': 'إليه',
         'المعلن اليه': 'المعلن إليه', 'اليهما': 'إليهما', 'الاحوال': 'الأحوال',
         'الايجار': 'الإيجار', 'ايجار': 'إيجار', 'اخلاء': 'إخلاء', 'الاخلاء': 'الإخلاء',
         'اقامة': 'إقامة', 'اقامه': 'إقامة', 'الاجرة': 'الأجرة', 'اجرة': 'أجرة',
         'الاصلى': 'الأصلي', 'الاول': 'الأول', 'الثانى': 'الثاني', 'الثالث': 'الثالث',
         'جنيها': 'جنيهًا', 'طبقا': 'طبقًا', 'وفقا': 'وفقًا', 'نهائيا': 'نهائيًا', 'قانونا': 'قانونًا',
         'ومهنته': 'ومهنته', 'مهنته': 'مهنته', 'المحاماه': 'المحاماة', 'محكمه': 'محكمة',
         'اقام': 'أقام', 'اضطر': 'اضطر', 'ابطال': 'إبطال', 'اثبات': 'إثبات', 'الاثبات': 'الإثبات',
         'الاستئناف': 'الاستئناف', 'القانونى': 'القانوني'}
KEEP_Y = set('على إلى حتى متى لدى سوى مستشفى مصطفى موسى عيسى يحيى أولى أخرى الأخرى الأولى كبرى '
             'صغرى الكبرى الصغرى الوسطى الدعوى دعوى بالدعوى للدعوى شكوى فتوى مأوى معنى المعنى '
             'مبنى المبنى مقتضى مؤدى مدى المدى ذكرى نجوى تقوى قضى أدى ادى انتهى مضى اقتضى بنى '
             'رضى أبى تلقى ألقى استوفى وفى بقى رأى أنثى الأنثى الأقصى الأدنى الأعلى أعلى الدنيا '
             'العليا الحسنى الأولى ليلى سلمى هدى الهدى مولى موالى حبلى فى'.split())

def fix_orthography(s):
    s = re.sub(r'[ـ]', '', s)
    out = []
    for tok in re.split(r'(\s+)', s):
        t = tok
        core = re.sub(r'^[\(\)\[\]،,.:;«»"\-]+|[\(\)\[\]،,.:;«»"\-]+$', '', tok)
        if core in WORDS:
            t = tok.replace(core, WORDS[core])
        elif (core.startswith('ال') and core.endswith('ى') and core not in KEEP_Y and len(core) > 4
              and not core.endswith('وى') or core in ('المدنى', 'التجارى', 'الجنائى', 'الشرعى', 'العقارى')):
            t = tok.replace(core, core[:-1] + 'ي')
        out.append(t)
    s = ''.join(out)
    s = s.replace('انتقلت الى', 'انتقلت إلى').replace(' , ', '، ').replace(' ,', '،')
    s = re.sub(r'\s+\.', '.', s)
    s = re.sub(r'\.{2,}\s*$', '.', s)
    return re.sub(r'[ \t]{2,}', ' ', s).strip()

# ───────────────────────── book body -> template + fields ─────────────────────────
BLANK = r'(?:\.{4,}|…{2,})'
DATE_BLANK = r'\.\.-\.\.-\.\.\.\.'

def convert_book(body, title):
    t = body
    fields, used = [], set()

    def add(key, label, ftype='text', source=None, required=False):
        if key in used:
            return
        used.add(key)
        f = {'key': key, 'label': label, 'type': ftype, 'required': required}
        if source:
            f['source'] = source
        fields.append(f)

    def sub_once(pattern, repl, text, count=1):
        return re.sub(pattern, repl, text, count=count)

    # opening
    t = sub_once(r'(?:أنه|انه|إنه)\s*فى يوم\s*' + BLANK + r'\s*الموافق\s*' + DATE_BLANK + r'\s*الساعة\s*' + BLANK,
                 'إنه في يوم {{announce_day}} الموافق {{announce_date}} الساعة {{announce_time}}', t)
    add('announce_day', 'يوم الإعلان'); add('announce_date', 'تاريخ الإعلان', 'date'); add('announce_time', 'الساعة')
    # requester
    t = sub_once(r'بناء على طلب السيد[ةه]?\s*/\s*' + BLANK, 'بناءً على طلب السيد/ {{client_name}}', t)
    t = sub_once(r'(و?مهنته)\s*' + BLANK, r'\1 {{client_profession}}', t)
    t = sub_once(r'المقيم برقم\s*' + BLANK + r'\s*شارع\s*' + BLANK + r'\s*قسم\s*' + BLANK + r'\s*محافظة\s*' + BLANK,
                 'المقيم في {{client_address}}', t)
    t = sub_once(r'مكتب الاستاذ\s*' + BLANK, 'مكتب الأستاذ/ {{lawyer_name}}', t)
    t = sub_once(r'المحامى\s*الكائن\s*' + BLANK, 'المحامي الكائن في {{lawyer_address}}', t)
    t = sub_once(r'أنا\s*' + BLANK + r'\s*محضر\s*محكم[ةه]\s*' + BLANK, 'أنا {{bailiff_name}} محضر محكمة {{bailiff_court}}', t)
    # opponent
    t = sub_once(r'محل اقامة\s*:?\s*(?:1-\s*)?السيد\s*/\s*' + BLANK, 'محل إقامة: السيد/ {{opponent_name}}', t)
    t = sub_once(r'(و?مهنته)\s*' + BLANK + r'(\s*المقيم برقم\s*' + BLANK + r'\s*شارع\s*' + BLANK + r'\s*قسم\s*' + BLANK + r'\s*محافظة\s*' + BLANK + ')',
                 r'\1 {{opponent_profession}} المقيم في {{opponent_address}}', t)
    t = sub_once(r'مخاطبا\s*' + BLANK, 'مخاطبًا مع/ {{served_with}}', t)
    # closing
    t = sub_once(r'بالحضور أمام محكمة\s*' + BLANK + r'\s*الدائرة\s*' + BLANK + r'\s*بمقرها الكائن بشارع\s*' + BLANK,
                 'بالحضور أمام محكمة {{court_name}} الدائرة {{circuit}} بمقرها الكائن بشارع {{court_address}}', t)
    t = sub_once(r'فى يوم\s*' + BLANK + r'\s*الموافق\s*' + DATE_BLANK + r'\s*الساعة\s*' + BLANK,
                 'في يوم {{session_day}} الموافق {{session_date}} الساعة {{session_time}}', t)
    # remaining blanks become generic fields labelled by the words before them
    counter = [0]
    def generic(m):
        counter[0] += 1
        k = 'extra_%d' % counter[0]
        before = re.sub(r'\{\{[^}]+\}\}', '', t[max(0, m.start() - 40):m.start()])
        words = [w for w in re.findall(r'[؀-ۿ]+', before)][-3:]
        label = ' '.join(words) or 'بيان'
        add(k, 'بيان: ' + label, 'date' if m.group(0).startswith('..-') else 'text')
        return '{{%s}}' % k
    t = re.sub('(?:' + DATE_BLANK + ')|(?:' + BLANK + ')', generic, t)

    # standard field definitions (only those that actually occur)
    std = {
        'client_name': ('اسم الطالب / موكلي', 'client', 'client.name', True),
        'client_profession': ('مهنة الطالب', 'text', None, False),
        'client_address': ('محل إقامة الطالب', 'text', 'client.address', False),
        'lawyer_name': ('اسم المحامي', 'text', 'office.lawyer_name', False),
        'lawyer_address': ('عنوان مكتب المحامي', 'text', 'office.address', False),
        'bailiff_name': ('اسم المحضر', 'text', None, False),
        'bailiff_court': ('المحكمة التابع لها المحضر', 'text', None, False),
        'opponent_name': ('اسم المعلن إليه', 'opponent', 'case.opponent', True),
        'opponent_profession': ('مهنة المعلن إليه', 'text', None, False),
        'opponent_address': ('محل إقامة المعلن إليه', 'text', None, False),
        'served_with': ('مخاطبًا مع', 'text', None, False),
        'court_name': ('المحكمة', 'court', 'case.court', True),
        'circuit': ('الدائرة', 'text', 'case.chamber', False),
        'court_address': ('مقر المحكمة (الشارع)', 'text', None, False),
        'session_day': ('يوم الجلسة', 'text', None, False),
        'session_date': ('تاريخ الجلسة', 'date', None, False),
        'session_time': ('ساعة الجلسة', 'text', None, False),
    }
    pre = [{'key': 'case_id', 'label': 'القضية المرتبطة (اختياري)', 'type': 'case', 'required': False}]
    for k in re.findall(r'\{\{([a-z_0-9]+)\}\}', t):
        if k in std and k not in used:
            lab, ty, src, req = std[k]
            add(k, lab, ty, src, req)
    # order: standard first, then extras
    order = {k: i for i, k in enumerate(['announce_day', 'announce_date', 'announce_time', 'client_name', 'client_profession',
             'client_address', 'lawyer_name', 'lawyer_address', 'bailiff_name', 'bailiff_court', 'opponent_name',
             'opponent_profession', 'opponent_address', 'served_with', 'court_name', 'circuit', 'court_address',
             'session_day', 'session_date', 'session_time'])}
    fields.sort(key=lambda f: order.get(f['key'], 100 + int(f['key'].split('_')[-1]) if f['key'].startswith('extra_') else 99))
    fields = pre + [f for f in fields if re.search(r'\{\{%s\}\}' % f['key'], t)]
    for f in fields[1:]:
        if f['key'].startswith('extra_'):
            f['group'] = 'بيانات الواقعة'

    # paragraphs
    t = re.sub(r'\s+', ' ', t)
    t = re.sub(r'\s*(بناءً على طلب السيد)', r'\n\1', t, count=1)
    t = re.sub(r'\s*(أنا \{\{bailiff_name\}\})', r'\n\1', t, count=1)
    t = re.sub(r'قد انتقلت إلى محل إقامة:?\s*', 'قد انتقلت إلى محل إقامة:\n', t, count=1)
    t = re.sub(r'\s*(مخاطبًا مع/ \{\{served_with\}\})', r'\n\1', t, count=1)
    t = re.sub(r'(و ?أعلنته بالآتى|و ?اعلنته بالاتى|و ?أعلنتهما بالآتى|وأعلنته بالآتى|واعلنته بالاتى)', r'\n\1\n', t)
    t = re.sub(r'\s*(بناء عليه|بناء علية|بناءا عليه|لذلك)\s*', r'\n\1\n', t, count=1)
    t = re.sub(r'(\.|،)\s*(مع حفظ كافة)', r'.\n\2', t)
    t = re.sub(r'\s*(ولاجل العلم|و لاجل العلم|ولأجل العلم)', r'\n\1', t)
    t = re.sub(r'([\.،])\s*(و ?لما كان|و ?اذ |و ?إذ |و ?لما |و ?حيث )', r'\1\n\2', t)
    t = fix_orthography_block(t)
    t = t.replace('بناء عليه\n', 'بناءً عليه\n').replace('\nبناء عليه', '\nبناءً عليه').replace('بناء علية', 'بناءً عليه')
    t = re.sub(r'\n{2,}', '\n', t).strip()
    return t, fields

def fix_orthography_block(t):
    return '\n'.join(fix_orthography(l) if '{{' not in l else fix_with_placeholders(l) for l in t.split('\n'))

def fix_with_placeholders(l):
    parts = re.split(r'(\{\{[^}]+\}\})', l)
    return ''.join(p if p.startswith('{{') else fix_orthography_keep_space(p) for p in parts)

def fix_orthography_keep_space(p):
    lead = ' ' if p[:1].isspace() else ''
    trail = ' ' if p[-1:].isspace() else ''
    return lead + fix_orthography(p) + trail if p.strip() else p

# ───────────────────────── skeletons for formulas with no book source ─────────────────────────
OPEN = ('إنه في يوم {{announce_day}} الموافق {{announce_date}}\n'
        'بناءً على طلب السيد/ {{client_name}}، المقيم في {{client_address}}، ومحله المختار مكتب الأستاذ/ {{lawyer_name}} المحامي، الكائن في {{lawyer_address}}.\n'
        'أنا {{bailiff_name}} محضر محكمة {{bailiff_court}} قد انتقلت في التاريخ المذكور أعلاه وأعلنت:\n'
        'السيد/ {{opponent_name}}، المقيم في {{opponent_address}}.\n'
        'مخاطبًا مع/ {{served_with}}\n')
SK = {
 'lawsuit': OPEN + 'وأعلنته بالآتي\n{{facts}}\n{{legal_basis_text}}\nبناءً عليه\n'
   'أنا المحضر سالف الذكر قد انتقلت في التاريخ المذكور أعلاه إلى محل إقامة المعلن إليه، وسلمته صورة من أصل هذه الصحيفة، وكلفته بالحضور أمام محكمة {{court_name}}، الكائن مقرها في {{court_address}}، أمام الدائرة {{circuit}}، وذلك بجلستها المنعقدة علنًا يوم {{session_day}} الموافق {{session_date}}، من الساعة التاسعة صباحًا وما بعدها، {{requests}}، مع إلزامه بالمصروفات ومقابل أتعاب المحاماة.\n'
   'مع حفظ كافة الحقوق القانونية الأخرى للطالب.\nولأجل العلم/',
 'warning': OPEN + 'وأنذرته بالآتي\n{{facts}}\n{{legal_basis_text}}\nبناءً عليه\n'
   'أنا المحضر سالف الذكر قد انتقلت في التاريخ المذكور أعلاه إلى محل إقامة المعلن إليه، وسلمته صورة من هذا الإنذار، وأنذرته {{requests}}، وإلا اضطر الطالب إلى اتخاذ كافة الإجراءات القانونية قبله، مع تحميله بالمصروفات ومقابل أتعاب المحاماة.\n'
   'مع حفظ كافة الحقوق القانونية الأخرى للطالب.\nولأجل العلم/',
 'criminal': OPEN.replace('أعلنت:\nالسيد/', 'أعلنت المتهم:\nالسيد/') + 'وأعلنته بالآتي\n{{facts}}\n{{legal_basis_text}}\nبناءً عليه\n'
   'أنا المحضر سالف الذكر قد انتقلت في التاريخ المذكور أعلاه إلى محل إقامة المعلن إليه، وسلمته صورة من أصل هذه الصحيفة، وكلفته بالحضور أمام محكمة {{court_name}}، الكائن مقرها في {{court_address}}، وذلك بجلستها المنعقدة علنًا يوم {{session_day}} الموافق {{session_date}}، من الساعة التاسعة صباحًا وما بعدها، {{requests}}، مع إلزامه بالمصروفات ومقابل أتعاب المحاماة.\n'
   'مع حفظ كافة الحقوق القانونية الأخرى للطالب.\nولأجل العلم/',
 'petition': 'السيد الأستاذ/ {{addressee}}\nتحية طيبة وبعد،\nمقدمه لسيادتكم/ {{client_name}}، المقيم في {{client_address}}، ومحله المختار مكتب الأستاذ/ {{lawyer_name}} المحامي.\nضد/ {{opponent_name}}، المقيم في {{opponent_address}}.\nالموضوع\n{{facts}}\n{{legal_basis_text}}\nلذلك\nيلتمس الطالب {{requests}}\nمع حفظ كافة الحقوق القانونية الأخرى للطالب.\nوتفضلوا بقبول فائق الاحترام،،،\nمقدمه/ {{lawyer_name}} المحامي',
}

def classify(x):
    t, c = x['title'], x['category']
    if c == 'حافظة مستندات' or x['id'] in GUIDE_IDS or t.startswith('حافظة') or t.startswith('دليل'):
        return 'legacy'
    if re.match(r'^(صيغة |نموذج )?(لـ?)?(عق[ـ]*د|عـقـد)', t) or c == 'عقود' and not re.search(r'دعوى|انذار|إنذار|جنحة', t):
        return 'legacy'
    if c == 'جنح مباشرة' or 'جنحة' in t:
        return 'criminal'
    if re.search(r'انذار|إنذار|تكليف', t):
        return 'warning'
    if re.match(r'^(صيغة )?(طلب|تظلم|التماس|طعن|تقرير)', t) or t.startswith('طعن') or t.startswith('تظلم'):
        return 'petition'
    return 'lawsuit'

def subject_of(title):
    s = re.sub(r'^(صيغة|صيغِة|صبغة|صبعة|صيعة|نموذج)\s*(لـ|ل)?\s*', '', title.strip())
    s = re.sub(r'^(صحيفة)\s*', '', s)
    s = re.sub(r'\s+', ' ', s)
    return s[:90]

def hint_from_legacy(x):
    extra = [f['label'] for f in x.get('fields', []) if f['key'] not in
             ('case_id', 'client_name', 'client_address', 'opponent_name', 'opponent_address', 'court_name',
              'case_number', 'case_year', 'lawyer_name', 'session_date')]
    return ('اذكر الوقائع بالتفصيل (التواريخ والمستندات)' + (': ' + '، '.join(extra[:8]) if extra else '')).strip()

def build_skeleton(x, kind):
    tpl = SK[kind]
    keys = re.findall(r'\{\{([a-z_]+)\}\}', tpl)
    std = {
        'announce_day': ('يوم الإعلان', 'text', None, False), 'announce_date': ('تاريخ الإعلان', 'date', None, False),
        'client_name': ('اسم الطالب / موكلي', 'client', 'client.name', True),
        'client_address': ('محل إقامة الطالب', 'text', 'client.address', False),
        'lawyer_name': ('اسم المحامي', 'text', 'office.lawyer_name', False),
        'lawyer_address': ('عنوان مكتب المحامي', 'text', 'office.address', False),
        'bailiff_name': ('اسم المحضر', 'text', None, False), 'bailiff_court': ('المحكمة التابع لها المحضر', 'text', None, False),
        'opponent_name': ('اسم المعلن إليه', 'opponent', 'case.opponent', True),
        'opponent_address': ('محل إقامة المعلن إليه', 'text', None, False), 'served_with': ('مخاطبًا مع', 'text', None, False),
        'court_name': ('المحكمة', 'court', 'case.court', True), 'court_address': ('مقر المحكمة', 'text', None, False),
        'circuit': ('الدائرة', 'text', 'case.chamber', False), 'session_day': ('يوم الجلسة', 'text', None, False),
        'session_date': ('تاريخ الجلسة', 'date', None, False), 'addressee': ('الجهة / السيد المقدم إليه', 'text', None, True),
        'facts': ('الوقائع', 'textarea', None, True), 'legal_basis_text': ('السند القانوني (المواد والأحكام)', 'textarea', None, False),
        'requests': ('الطلبات', 'textarea', None, True),
    }
    fields = [{'key': 'case_id', 'label': 'القضية المرتبطة (اختياري)', 'type': 'case', 'required': False}]
    for k in dict.fromkeys(keys):
        lab, ty, src, req = std[k]
        f = {'key': k, 'label': lab, 'type': ty, 'required': req}
        if src: f['source'] = src
        if k == 'facts': f['hint'] = hint_from_legacy(x)
        if k == 'requests': f['hint'] = 'اكتبها بصيغة: ليسمع الحكم بـ ... (مع المصروفات والأتعاب تُضاف تلقائيًا)'
        if k == 'legal_basis_text': f['hint'] = 'اذكر المواد القانونية المستند إليها بعد مراجعتها'
        fields.append(f)
    return tpl, fields

# ───────────────────────── hand-authored specs → formulas ─────────────────────────
sys.path.insert(0, 'scripts')
from formula_specs import SPECS, PRACTICE  # noqa: E402
import formula_specs2  # noqa: E402,F401  (appends its specs to SPECS)

STD_FIELDS = {
    'announce_day': ('يوم الإعلان', 'text', None, False, 'بيانات الإعلان'),
    'announce_date': ('تاريخ الإعلان', 'date', None, False, 'بيانات الإعلان'),
    'client_name': ('اسم الطالب (موكلي)', 'client', 'client.name', True, 'الطرف الأول'),
    'client_address': ('محل إقامة الطالب', 'text', 'client.address', False, 'الطرف الأول'),
    'lawyer_name': ('اسم المحامي', 'text', 'office.lawyer_name', False, 'الطرف الأول'),
    'lawyer_address': ('عنوان مكتب المحامي', 'text', 'office.address', False, 'الطرف الأول'),
    'bailiff_name': ('اسم المحضر', 'text', None, False, 'المحضر'),
    'bailiff_court': ('المحكمة التابع لها المحضر', 'text', None, False, 'المحضر'),
    'opponent_name': ('اسم المعلن إليه (الخصم)', 'opponent', 'case.opponent', True, 'الطرف الثاني'),
    'opponent_address': ('محل إقامة المعلن إليه', 'text', None, False, 'الطرف الثاني'),
    'served_with': ('مخاطبًا مع', 'text', None, False, 'الطرف الثاني'),
    'second_opp_name': ('اسم المعلن إليه الثاني', 'text', None, False, 'الطرف الثاني'),
    'second_opp_address': ('محل إقامة المعلن إليه الثاني', 'text', None, False, 'الطرف الثاني'),
    'court_name': ('المحكمة', 'court', 'case.court', True, 'الجلسة'),
    'court_address': ('مقر المحكمة', 'text', None, False, 'الجلسة'),
    'circuit': ('الدائرة', 'text', 'case.chamber', False, 'الجلسة'),
    'session_day': ('يوم الجلسة', 'text', None, False, 'الجلسة'),
    'session_date': ('تاريخ الجلسة', 'date', None, False, 'الجلسة'),
    'civil_comp': ('مبلغ التعويض المدني المؤقت (جنيه)', 'text', None, False, 'الجلسة'),
}
FIELD_ORDER = ['announce_day', 'announce_date', 'client_name', 'client_address', 'lawyer_name', 'lawyer_address',
               'bailiff_name', 'bailiff_court', 'opponent_name', 'opponent_address', 'served_with',
               'second_opp_name', 'second_opp_address']
TAIL_ORDER = ['court_name', 'court_address', 'circuit', 'session_day', 'session_date', 'civil_comp']


def std_field(k):
    lab, ty, src, req, grp = STD_FIELDS[k]
    d = dict(key=k, label=lab, type=ty, required=req, group=grp)
    if src:
        d['source'] = src
    return d


def compose(sp):
    kind = sp['kind']
    if kind == 'petition':
        return compose_petition(sp)
    fem = sp.get('female', False)
    ofem = sp.get('opp_female', False)
    reqs = sp['requests']
    n = 'many' if reqs.startswith('ليسمعوا') else 'two' if reqs.startswith('ليسمعا') else 'one'
    second = bool(sp.get('second_opp'))
    warn = kind == 'warning'
    crim = kind == 'criminal'

    def gen(m, f):
        return f if fem else m

    if n == 'many':
        opp = dict(who='المعلن إليهم', hand='وسلمتهم', call='وكلفتهم', force='مع إلزامهم', tell='وأعلنتهم')
    elif n == 'two':
        opp = dict(who='المعلن إليهما', hand='وسلمتهما', call='وكلفتهما', force='مع إلزامهما', tell='وأعلنتهما')
    elif ofem:
        opp = dict(who='المعلن إليها', hand='وسلمتها', call='وكلفتها', force='مع إلزامها', tell='وأعلنتها')
    else:
        opp = dict(who='المعلن إليه', hand='وسلمته', call='وكلفته', force='مع إلزامه', tell='وأعلنته')
    if warn:
        opp['who'] = opp['who'].replace('المعلن', 'المنذر')
        opp['tell'] = opp['tell'].replace('وأعلن', 'وأنذر')
    party = gen('لطالب', 'لطالبة')
    role = ('، ' + gen('المدعي بالحقوق المدنية', 'المدعية بالحقوق المدنية')) if crim else ''
    lines = [
        'إنه في يوم {{announce_day}} الموافق {{announce_date}}',
        'بناءً على طلب %s/ {{client_name}}%s، %s في {{client_address}}، %s المختار مكتب الأستاذ/ {{lawyer_name}} المحامي، الكائن في {{lawyer_address}}.'
        % (gen('السيد', 'السيدة'), role, gen('المقيم', 'المقيمة'), gen('ومحله', 'ومحلها')),
        'أنا {{bailiff_name}} محضر محكمة {{bailiff_court}} قد انتقلت في التاريخ المذكور أعلاه %s:'
        % ('وأنذرت' if warn else 'وأعلنت المتهم' if crim else 'وأعلنت'),
        '%s/ {{opponent_name}}، %s في {{opponent_address}}.' % ('السيدة' if ofem else 'السيد', 'المقيمة' if ofem else 'المقيم'),
    ]
    if second:
        lines.append('والسيد/ {{second_opp_name}}، المقيم في {{second_opp_address}}.')
    lines.append('مخاطبًا مع/ {{served_with}}')
    lines.append('%s بالآتي' % opp['tell'])
    lines.append(sp['facts'].replace('{{second_party}}', '{{second_opp_name}}'))
    lines.extend(sp.get('basis', []))
    lines.append('بناءً عليه')
    if warn:
        lines.append('أنا المحضر سالف الذكر قد انتقلت في التاريخ المذكور أعلاه إلى محل إقامة %s، %s صورة من هذا الإنذار، %s %s، %s.'
                     % (opp['who'], opp['hand'], opp['tell'], reqs, sp.get('warning_tail', 'وإلا اضطر الطالب إلى اتخاذ الإجراءات القانونية')))
    else:
        phrase = sp.get('court_phrase') or (
            'أمام محكمة {{court_name}}، الكائن مقرها في {{court_address}}' if crim else
            'أمام محكمة {{court_name}}، الكائن مقرها في {{court_address}}، أمام الدائرة {{circuit}}')
        tail = ''
        if crim:
            tail = '، وبإلزامه بأن يؤدي %s مبلغ {{civil_comp}} جنيهًا على سبيل التعويض المدني المؤقت' % gen('للمدعي بالحقوق المدنية', 'للمدعية بالحقوق المدنية')
        nafaz = ' وشمول الحكم بالنفاذ المعجل بلا كفالة' if sp.get('nafaz') else ''
        costs = '' if sp.get('no_costs') else '، %s بالمصروفات ومقابل أتعاب المحاماة%s' % (opp['force'], nafaz)
        lines.append('أنا المحضر سالف الذكر قد انتقلت في التاريخ المذكور أعلاه إلى محل إقامة %s، %s صورة من أصل هذه الصحيفة، %s بالحضور %s، '
                     'وذلك بجلستها المنعقدة علنًا يوم {{session_day}} الموافق {{session_date}}، من الساعة التاسعة صباحًا وما بعدها، %s%s%s.'
                     % (opp['who'], opp['hand'], opp['call'], phrase, reqs, tail, costs))
    lines.append('مع حفظ كافة الحقوق القانونية الأخرى %s.' % ('للطالبة' if fem else 'للطالب'))
    lines.append('ولأجل العلم/')
    tpl = '\n'.join(lines)
    used = list(dict.fromkeys(re.findall(r'\{\{([a-z_0-9]+)\}\}', tpl)))
    spec_fields = {k: (k, l, t, h, r) for (k, l, t, h, r) in sp['fields']}
    fields = [{'key': 'case_id', 'label': 'القضية المرتبطة (اختياري)', 'type': 'case', 'required': False}]
    fields += [std_field(k) for k in FIELD_ORDER if k in used]
    for k, (_, l, t, h, r) in spec_fields.items():
        if k in used:
            f = dict(key=k, label=l, type=t, required=r, group='بيانات الواقعة')
            if h:
                f['hint'] = h
            fields.append(f)
    fields += [std_field(k) for k in TAIL_ORDER if k in used]
    defined = {f['key'] for f in fields}
    missing = [k for k in used if k not in defined]
    unused = [k for k in spec_fields if k not in used]
    return tpl, fields, missing, unused


def compose_petition(sp):
    fem = sp.get('female', False)
    lines = [
        'السيد الأستاذ/ {{addressee}}',
        'تحية طيبة وبعد،',
        'مقدمه لسيادتكم/ {{client_name}}، المقيم في {{client_address}}، ومحله المختار مكتب الأستاذ/ {{lawyer_name}} المحامي، الكائن في {{lawyer_address}}.',
        'ضد/ {{opponent_name}}، المقيم في {{opponent_address}}.',
        'الموضوع',
        sp['facts'],
    ]
    lines.extend(sp.get('basis', []))
    lines.append('لذلك')
    lines.append('يلتمس الطالب %s.' % sp['requests'])
    lines.append('مع حفظ كافة الحقوق القانونية الأخرى للطالب.')
    lines.append('وتفضلوا بقبول فائق الاحترام،،،')
    lines.append('مقدمه/ {{lawyer_name}} المحامي')
    tpl = chr(10).join(lines)
    used = list(dict.fromkeys(re.findall(r'\{\{([a-z_0-9]+)\}\}', tpl)))
    spec_fields = {k: (k, l, t, h, r) for (k, l, t, h, r) in sp['fields']}
    fields = [{'key': 'case_id', 'label': 'القضية المرتبطة (اختياري)', 'type': 'case', 'required': False}]
    addr = dict(key='addressee', label='الجهة / السيد المقدم إليه', type='text', required=True, group='بيانات الطلب')
    if sp.get('addressee_hint'):
        addr['defaultValue'] = sp['addressee_hint']
    fields.append(addr)
    for k in ['client_name', 'client_address', 'lawyer_name', 'lawyer_address', 'opponent_name', 'opponent_address']:
        if k in used:
            fields.append(std_field(k))
    for k, (_, l, t, h, r) in spec_fields.items():
        if k in used:
            f = dict(key=k, label=l, type=t, required=r, group='بيانات الواقعة')
            if h:
                f['hint'] = h
            fields.append(f)
    defined = {f['key'] for f in fields}
    missing = [k for k in used if k not in defined]
    unused = [k for k in spec_fields if k not in used]
    return tpl, fields, missing, unused


def apply_specs(catalog):
    by_id = {x['id']: x for x in catalog}
    drop, problems, added = set(), [], 0
    next_new = 301
    for sp in SPECS:
        tpl, fields, missing, unused = compose(sp)
        if missing or unused:
            problems.append((sp['key'], 'missing', missing, 'unused', unused))
        src_name, src_item = sp['source']
        formula = {
            'title': sp['title'], 'type': 'formula',
            'description': 'صحيفة بصيغة المحاكم المصرية: ' + sp['subject'],
            'keywords': [sp['subject']] + sp['title'].replace('صيغة', '').split()[:4],
            'subject': sp['subject'], 'layout': 'petition' if sp['kind'] == 'petition' else 'announcement', 'version': '2.0',
            'status': 'needs_legal_review' if sp.get('review') else 'sourced_needs_review',
            'sources': [{'name': src_name, 'item': src_item}],
            'fields': fields, 'template_content': tpl, 'source_content': '',
        }
        ids = sp.get('replaces') or []
        if ids:
            first = by_id[ids[0]]
            first.update(formula)
            first['category'] = sp['category']
            for other in ids[1:]:
                drop.add(other)
        else:
            formula['id'] = 'formula_%d' % next_new
            formula['category'] = sp['category']
            formula['link'] = None
            formula['published'] = None
            next_new += 1
            catalog.append(formula)
            added += 1
    catalog[:] = [x for x in catalog if x['id'] not in drop]
    return len(SPECS), len(drop), added, problems


# ───────────────────────── main ─────────────────────────
def main():
    catalog = json.load(open(sys.argv[3] if len(sys.argv) > 3 else CATALOG, encoding='utf-8'))
    book = [r for r in json.load(open(BOOK, encoding='utf-8')) if ('فى يوم' in r['body'] or 'في يوم' in r['body'])]
    f204 = json.load(open(F204, encoding='utf-8'))
    stats = {'sourced': 0, 'draft': 0, 'legacy': 0, 'reference': 0}
    for i, x in enumerate(catalog):
        if x['id'] == 'formula_204':
            catalog[i] = {**x, **f204}
            stats['sourced'] += 1
            continue
        if x['id'] in GUIDE_IDS:
            x['layout'] = 'plain'; x['status'] = 'reference'; stats['reference'] += 1
            continue
        kind = classify(x)
        if x['id'] in BOOK_MAP:
            rec = book[BOOK_MAP[x['id']]]
            tpl, fields = convert_book(rec['body'], rec['title'])
            x['template_content'] = tpl
            x['fields'] = fields
            x['layout'] = 'announcement'
            x['subject'] = subject_of(x['title'])
            x['status'] = 'needs_legal_review'
            x['sources'] = [{'name': BOOK_SOURCE, 'item': rec['title']}]
            x['version'] = '2.0'
            stats['sourced'] += 1
        elif kind == 'legacy':
            x['layout'] = 'contract' if (x['category'] == 'عقود' and re.match(r'.*عق', x['title'])) else 'plain'
            x['status'] = 'legacy_unreviewed'
            stats['legacy'] += 1
        else:
            tpl, fields = build_skeleton(x, kind)
            x['template_content'] = tpl
            x['fields'] = fields
            x['layout'] = 'petition' if kind == 'petition' else 'announcement'
            x['subject'] = subject_of(x['title'])
            x['status'] = 'draft_structure_only'
            x['version'] = '2.0'
            stats['draft'] += 1
    n_spec, n_drop, n_new, problems = apply_specs(catalog)
    from formula_custom import CUSTOM, DROP
    by_id = {x['id']: x for x in catalog}
    for fid, patch in CUSTOM.items():
        by_id[fid].update(patch)
        by_id[fid]['version'] = '2.0'
    catalog[:] = [x for x in catalog if x['id'] not in DROP]
    for x in catalog:
        # contracts: the contract title becomes a centred heading under the basmala
        if x.get('layout') == 'contract' and x.get('status') == 'legacy_unreviewed':
            x['subject'] = subject_of(x['title'])
            lines = x['template_content'].split(chr(10))
            if lines and lines[0].startswith('بسم الله') and not (len(lines) > 1 and lines[1].startswith('## ')):
                lines.insert(1, '## ' + x['subject'])
                x['template_content'] = chr(10).join(lines)
    print('specs', n_spec, 'dropped duplicates', n_drop, 'new', n_new, 'problems', problems)
    for x in catalog:
        if not x.get('subject'):
            x['subject'] = re.sub(r'\s*\(.*$', '', subject_of(x['title'].replace('ـ', ''))).strip()
        if x.get('layout') == 'plain' and re.match(r'^(صيغة )?عق', x['title'].replace('ـ', '')) and x['template_content'].startswith('بسم الله'):
            x['layout'] = 'contract'
            lines = x['template_content'].split(chr(10))
            lines.insert(1, '## ' + x['subject'])
            x['template_content'] = chr(10).join(lines)
    json.dump(catalog, open(CATALOG, 'w', encoding='utf-8', newline=''), ensure_ascii=False, indent=2)
    print(stats, sum(stats.values()))

if __name__ == '__main__':
    main()
