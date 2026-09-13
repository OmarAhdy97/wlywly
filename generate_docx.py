# -*- coding: utf-8 -*-
import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def create_full_business_doc():
    doc = Document()

    # Configure Margins (0.8 inches all sides)
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)

    # Helper XML functions for RTL and styling
    def set_p_rtl(p):
        pPr = p._p.get_or_add_pPr()
        bidi = OxmlElement('w:bidi')
        bidi.set(qn('w:val'), '1')
        pPr.append(bidi)

    def set_table_rtl(tbl):
        tblPr = tbl._tbl.tblPr
        bidiVisual = OxmlElement('w:bidiVisual')
        bidiVisual.set(qn('w:val'), '1')
        tblPr.append(bidiVisual)

    def set_cell_shading(cell, color_hex):
        tcPr = cell._tc.get_or_add_tcPr()
        shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>')
        tcPr.append(shd)

    def set_cell_margins(cell, top=140, bottom=140, left=180, right=180):
        tcPr = cell._tc.get_or_add_tcPr()
        tcMar = OxmlElement('w:tcMar')
        for m_name, m_val in [('w:top', top), ('w:bottom', bottom), ('w:left', left), ('w:right', right)]:
            m = OxmlElement(m_name)
            m.set(qn('w:w'), str(m_val))
            m.set(qn('w:type'), 'dxa')
            tcMar.append(m)
        tcPr.append(tcMar)

    def set_table_borders(table, color="CCCCCC", sz="4", val="single"):
        tblPr = table._tbl.tblPr
        borders = parse_xml(
            f'<w:tblBorders {nsdecls("w")}>'
            f'<w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
            f'<w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
            f'<w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
            f'<w:insideV w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
            f'<w:left w:val="none"/>'
            f'<w:right w:val="none"/>'
            f'</w:tblBorders>'
        )
        tblPr.append(borders)

    # Typography Helpers
    def add_title(text, subtitle=None):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        set_p_rtl(p)
        run = p.add_run(text)
        run.font.name = 'Traditional Arabic'
        run.font.size = Pt(26)
        run.font.bold = True
        run.font.color.rgb = RGBColor(112, 26, 36) # Burgundy / Maroon

        if subtitle:
            p2 = doc.add_paragraph()
            p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
            set_p_rtl(p2)
            run2 = p2.add_run(subtitle)
            run2.font.name = 'Segoe UI'
            run2.font.size = Pt(13)
            run2.font.color.rgb = RGBColor(100, 116, 139)

    def add_heading_1(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(16)
        p.paragraph_format.space_after = Pt(6)
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        set_p_rtl(p)
        run = p.add_run(text)
        run.font.name = 'Traditional Arabic'
        run.font.size = Pt(18)
        run.font.bold = True
        run.font.color.rgb = RGBColor(112, 26, 36) # Burgundy
        return p

    def add_heading_2(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(4)
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        set_p_rtl(p)
        run = p.add_run(text)
        run.font.name = 'Segoe UI'
        run.font.size = Pt(13.5)
        run.font.bold = True
        run.font.color.rgb = RGBColor(180, 83, 9) # Amber Gold
        return p

    def add_body_p(text, bold=False, color_rgb=None):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.line_spacing = 1.18
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        set_p_rtl(p)
        run = p.add_run(text)
        run.font.name = 'Segoe UI'
        run.font.size = Pt(11)
        run.font.bold = bold
        if color_rgb:
            run.font.color.rgb = color_rgb
        else:
            run.font.color.rgb = RGBColor(30, 41, 59)
        return p

    def add_bullet(text, bold_prefix="", level=0):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.line_spacing = 1.15
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        set_p_rtl(p)
        
        # Bullet symbol in Arabic RTL
        bullet_sym = p.add_run("  • ")
        bullet_sym.font.name = 'Segoe UI'
        bullet_sym.font.size = Pt(11)
        bullet_sym.font.bold = True
        bullet_sym.font.color.rgb = RGBColor(180, 83, 9) # Gold

        if bold_prefix:
            run_b = p.add_run(bold_prefix + " ")
            run_b.font.name = 'Segoe UI'
            run_b.font.size = Pt(11)
            run_b.font.bold = True
            run_b.font.color.rgb = RGBColor(15, 23, 42)

        run_t = p.add_run(text)
        run_t.font.name = 'Segoe UI'
        run_t.font.size = Pt(10.5)
        run_t.font.color.rgb = RGBColor(51, 65, 85)
        return p

    def add_callout(title, text):
        tbl = doc.add_table(rows=1, cols=1)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        set_table_rtl(tbl)
        cell = tbl.rows[0].cells[0]
        cell.width = Inches(6.8)
        set_cell_shading(cell, "FEF3C7") # Warm light amber
        set_cell_margins(cell, top=140, bottom=140, left=200, right=200)

        # Callout border
        tcPr = cell._tc.get_or_add_tcPr()
        borders = parse_xml(
            f'<w:tcBorders {nsdecls("w")}>'
            f'<w:right w:val="single" w:sz="24" w:space="0" w:color="D97706"/>'
            f'<w:top w:val="none"/>'
            f'<w:bottom w:val="none"/>'
            f'<w:left w:val="none"/>'
            f'</w:tcBorders>'
        )
        tcPr.append(borders)

        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        set_p_rtl(p)
        r_title = p.add_run("📌 " + title + "\n")
        r_title.font.name = 'Segoe UI'
        r_title.font.size = Pt(11.5)
        r_title.font.bold = True
        r_title.font.color.rgb = RGBColor(180, 83, 9)

        r_text = p.add_run(text)
        r_text.font.name = 'Segoe UI'
        r_text.font.size = Pt(10.5)
        r_text.font.color.rgb = RGBColor(69, 26, 3)

        doc.add_paragraph().paragraph_format.space_after = Pt(4)

    # -------------------------------------------------------------
    # 2. COVER / HEADER
    # -------------------------------------------------------------
    # Add Logo if exists
    if os.path.exists("public/logo.png"):
        p_logo = doc.add_paragraph()
        p_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run_logo = p_logo.add_run()
        run_logo.add_picture("public/logo.png", width=Inches(1.5))
        p_logo.paragraph_format.space_after = Pt(10)

    add_title(
        "أجندة دمياط القضائية",
        "المنصة الرقمية المتكاملة لإدارة مكاتب المحاماة والعمل القانوني\nوثيقة المواصفات والمزايا الوظيفية الشاملة (Business Features Document)"
    )

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # Metadata Card Table
    meta_tbl = doc.add_table(rows=4, cols=2)
    meta_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_rtl(meta_tbl)
    set_table_borders(meta_tbl, color="E2E8F0")

    meta_data = [
        ("اسم المنظومة:", "أجندة دمياط القضائية (Damietta Legal Agenda Web System)"),
        ("طبيعة المستند:", "دليل الخصائص والمزايا التشغيلية والإدارية (Business Features Specification)"),
        ("الفئات المستهدفة:", "المحامون، أصحاب مكاتب المحاماة، المساعدون القانونيون، الإداريون، والموكلون"),
        ("التكاملات والربط:", "تليجرام بوت (Telegram Bot) + تقويم جوجل (Google Calendar) + سحابة Supabase")
    ]

    for idx, (lbl, val) in enumerate(meta_data):
        c1, c2 = meta_tbl.rows[idx].cells
        c1.width = Inches(2.2)
        c2.width = Inches(4.6)
        set_cell_margins(c1)
        set_cell_margins(c2)
        set_cell_shading(c1, "F8FAFC")
        set_cell_shading(c2, "FFFFFF")

        p1 = c1.paragraphs[0]
        p1.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        set_p_rtl(p1)
        r1 = p1.add_run(lbl)
        r1.font.name = 'Segoe UI'
        r1.font.bold = True
        r1.font.size = Pt(10)
        r1.font.color.rgb = RGBColor(71, 85, 105)

        p2 = c2.paragraphs[0]
        p2.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        set_p_rtl(p2)
        r2 = p2.add_run(val)
        r2.font.name = 'Segoe UI'
        r2.font.size = Pt(10)
        r2.font.color.rgb = RGBColor(15, 23, 42)

    doc.add_page_break()

    # -------------------------------------------------------------
    # 3. EXECUTIVE SUMMARY & VALUE PROPOSITION
    # -------------------------------------------------------------
    add_heading_1("1. الملخص التنفيذي والقيمة التشغيلية (Executive Summary)")
    add_body_p(
        "تُعد منصة «أجندة دمياط القضائية» منظومة سحابية متخصصة ومصممة خصيصاً لتلبية احتياجات مكاتب السادة المحامين في جمهورية مصر العربية "
        "(مع تركيز وتخصيص نوعي لمحاكم ودوائر ومحضرين محافظة دمياط والمحافظات المجاورة). "
        "تهدف المنصة إلى تحويل العمل الإداري والمكتبي اليومي من النظام الورقي المعرض للضياع والنسيان إلى منظومة رقمية فائقة الدقة "
        "تربط بين المحامي ومساعديه وإداريي المكتب، وتتكامل آلياً مع هواتف الموكلين عبر التليجرام ومع تقويم جوجل لتنظيم الجلسات والمواعيد الإجرائية."
    )

    add_callout(
        "القيمة المضافة للمكتب (Core Business Value)",
        "القضاء التام على مخاطر فوات مواعيد الطعن أو سقوط الدعاوي، وتوفير أكثر من 70% من الوقت المستغرق في الاتصالات اليدوية بالموكلين لمتابعة الجلسات والمطالبات المالية، بالإضافة إلى الضبط المحاسبي الصارم للمصروفات القضائية وأتعاب القضايا."
    )

    if os.path.exists("doc_assets/workflow.png"):
        p_img = doc.add_paragraph()
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img.add_run().add_picture("doc_assets/workflow.png", width=Inches(6.4))
        p_img.paragraph_format.space_after = Pt(10)

    # -------------------------------------------------------------
    # 4. SYSTEM ARCHITECTURE & INTEGRATIONS
    # -------------------------------------------------------------
    add_heading_1("2. المعمارية الفنية والتكاملات السحابية (Architecture & Integrations)")
    add_body_p(
        "تم بناء النظام بالاعتماد على أحدث التقنيات السحابية المتجاوبة (Single Page Application - React 18) مع قاعدة بيانات سحابية لحظية (Supabase Cloud PostgreSQL) "
        "تضمن أمان البيانات وسريتها، مع دعم العمل في بيئة غير مستقرة للإنترنت بفضل التخزين المحلي التلقائي (Local State & Offline Resilience)."
    )

    if os.path.exists("doc_assets/architecture.png"):
        p_img2 = doc.add_paragraph()
        p_img2.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img2.add_run().add_picture("doc_assets/architecture.png", width=Inches(6.4))
        p_img2.paragraph_format.space_after = Pt(12)

    # -------------------------------------------------------------
    # 5. DETAILED BUSINESS MODULES BREAKDOWN
    # -------------------------------------------------------------
    add_heading_1("3. المزايا والخصائص الوظيفية التفصيلية (Business Features by Module)")

    # --- MODULE 1 ---
    add_heading_2("الوحدة الأولى: لوحة التحكم والمؤشرات اللحظية (Executive Dashboard)")
    add_body_p("توفر لوحة التحكم نظرة بانورامية شاملة على سير العمل اليومي والأسبوعي للمكتب بمجرد تسجيل الدخول:")
    add_bullet("عرض إجمالي القضايا النشطة والمرفوعة وتصنيفها اللحظي.", "إحصائيات القضايا:")
    add_bullet("رصد فوري لعدد جلسات اليوم وجلسات الأسبوع مع تمييز الدوائر والمحاكم.", "مؤشر الجلسات:")
    add_bullet("إبراز عدد الإعلانات المسلمة لقلم المحضرين والمنتظر استلامها قبل مواعيد الجلسات.", "دفتر المحضرين:")
    add_bullet("متابعة الأعمال الإدارية واستخراج الشهادات والصيغ التنفيذية قيد التنفيذ.", "المهام الإدارية:")
    add_bullet("إجمالي المبالغ المستحقة على الموكلين وإجمالي المتحصلات النقدية ورصيد المكتب.", "المؤشر المالي العام:")
    add_bullet("أزرار سريعة منبثقة لإضافة قضية جديدة، قيد جلسة، إضافة موكل، تسجيل حركة مالية، أو إنشاء مهمة فورية.", "الإجراءات السريعة (Quick Actions):")

    # --- MODULE 2 ---
    add_heading_2("الوحدة الثانية: إدارة ملفات القضايا والدعاوي (Cases Management)")
    add_body_p("إدارة دورة حياة القضية من لحظة قبول الوكالة وتحرير التوكيل وحتى صدور الحكم النهائي وتنفيذه:")
    add_bullet("مدني، جنائي، جنح، أسرة، مجلس دولة (قضاء إداري)، عمالي، تجاري، واقتصادي.", "تصنيف القضايا القانوني:")
    add_bullet("محاكم جزئية، محاكم ابتدائية، محاكم استئناف عالي، ومحكمة النقض.", "درجات التقاضي المتعددة:")
    add_bullet("رقم الدعوى، السنة القضائية، المحكمة المختصة، رقم الدائرة، واسم القاضي/رئيس الدائرة إن وجد.", "بيانات القيد والجدول:")
    add_bullet("تحديد صفة الموكل (مدعي / مدعى عليه / مجني عليه / متهم / مستأنف)، مع بيانات الخصوم ومحامي الخصم.", "أطراف النزاع والخصوم:")
    add_bullet("تحديد إجمالي الأتعاب المتفق عليها، المبالغ المسددة، والمتبقي بدقة، مع ربطها بحساب الموكل العام.", "الإدارة المالية للقضية:")
    add_bullet("تحديث تلقائي لحالة القضية (متداولة، محجوزة للحكم، مؤجلة للخبراء، منتهية بحكم، مشطوبة).", "التتبع التلقائي للحالة:")

    # --- MODULE 3 ---
    add_heading_2("الوحدة الثالثة: أجندة الجلسات والرول اليومي (Sessions & Court Roll Sheet)")
    add_body_p("العمود الفقري ليوميات المحامي، حيث تتيح إدارة حضور الجلسات وتوثيق القرارات الرسمية:")
    add_bullet("جدول زمني تفاعلي يعرض جلسات اليوم، جلسات الغد، وجلسات الأسبوع مع إمكانية التصفية بالمحكمة أو الدائرة.", "استعراض الأجندة:")
    add_bullet("توثيق دقيق لما دار في الجلسة ومنطوق القرار (تأجيل للمذكرات، للتحقيق، لإعلان الخصم، لورود تقرير الخبير، لحجز الدعوى للحكم).", "تسجيل قرارات الجلسات:")
    add_bullet("عند تسجيل قرار تأجيل مع تاريخ الجلسة القادمة، يدرج النظام الجلسة الجديدة آلياً في الأجندة ويحدث بيانات القضية.", "التأجيل الذكي التلقائي:")
    add_bullet("زر مخصص لتوليد رول المحكمة اليومي بتنسيق جاهز للطباعة والمراجعة السريعة داخل قاعات المحاكم.", "طباعة رول الجلسات (Print Court Roll):")

    # --- MODULE 4 ---
    add_heading_2("الوحدة الرابعة: إدارة الموكلين والربط الذكي مع التليجرام (Clients & Telegram Bot)")
    add_body_p("منظومة حديثة لإدارة بيانات الموكلين والتواصل الفوري والآلي معهم عبر البوت القضائي الذكي:")
    add_bullet("الاسم، الهاتف، الرقم القومي، رقم التوكيل ونوعه (عام قضايا، خاص، توكيل إدارة)، ومكتب التوثيق الصادر منه.", "سجل بيانات الموكل:")
    add_bullet("توليد رابط فريد وخاص بكل موكل لربط حسابه مع بوت التليجرام الخاص بالمكتب بنقرة زر واحدة.", "الربط عبر Telegram Deep Link:")
    add_bullet("فحص آلي وتأكيد ربط الـ Chat ID مع إمكانية إرسال رسالة ترحيبية وتجريبية فورية لهاتف الموكل.", "التحقق والرسائل التجريبية:")
    add_bullet("إرسال قرارات الجلسات ومواعيد الجلسات القادمة لهواتف الموكلين بصورة تلقائية فور تحديثها بالمكتب.", "الإشعارات القضائية الآلية:")

    # --- MODULE 5 ---
    add_heading_2("الوحدة الخامسة: سجل المعاملات المالية والحركات التفصيلية (Financial Ledger & Billing)")
    add_body_p("نظام محاسبي متخصص للمصروفات القضائية والمطالبات المالية:")
    add_bullet("تسجيل كل مصروف قضائي بدقة (أمانة خبير، رسم إيداع، مصاريف إعلان، رسم معاينة، انتقال، تصوير).", "تسجيل المصروفات القضائية (Expenses):")
    add_bullet("تسجيل الدفعات النقدية المسددة من الموكل وتاريخها وطريقة الدفع.", "تسجيل دفعات السداد (Payments):")
    add_bullet("تحديث فوري لرصيد الموكل العام (مدين / دائن) وتعديل الرصيد التراكمي تلقائياً عند أي إضافة أو حذف.", "الرصيد التراكمي الآلي:")
    add_bullet("توليد كشف حساب مالي تفصيلي ومصنف ببيان كل حركة وتاريخها وقيمتها والقضية التابعة لها وجاهز للطباعة الورقية.", "إصدار كشف الحساب المالي (Statement):")
    add_bullet("إرسال فاتورة وكشف الحساب التفصيلي إلى تليجرام الموكل مباشرة بنقرة زر واحدة تشمل إجمالي المطالبة ورصيده المتبقي.", "المطالبة المالية عبر Telegram:")

    # --- MODULE 6 ---
    add_heading_2("الوحدة السادسة: دفتر متابعة المحضرين والإعلانات (Bailiffs & Legal Notifications)")
    add_body_p("أداة متخصصة لإدارة العمل مع أقلام المحضرين بمختلف محاكم دمياط والمراكز التابعة لها:")
    add_bullet("محضرين بندر دمياط، مركز دمياط، كفر سعد، فارسكور، الزرقا، رأس البر، كفر البطيخ، ومحضرين الاستئناف.", "تغطية كافة أقلام المحضرين:")
    add_bullet("تسجيل تاريخ تسليم الإعلان، رقم الإعلان بالمحضرين، اسم المحضر المختص، ورقم المحمول للتواصل المباشر.", "بيانات التسليم والمحضر:")
    add_bullet("تسجيل تاريخ الجلسة المحددة وتاريخ استلام أصل الإعلان من قلم المحضرين.", "المواعيد الإجرائية:")
    add_bullet("تصنيف موقف الإعلان (تم الإعلان، لعدم الاستدلال، إعادة إعلان، لم ينفذ، جارٍ الإعلان).", "موقف الإعلان القضائي:")
    add_bullet("تنبيهات فورية للإعلانات التي اقتربت جلساتها ولم يتم استلام أصلها لسرعة تداركها قبل الجلسة.", "رادار التنبيه المبكر:")

    # --- MODULE 7 ---
    add_heading_2("الوحدة السابعة: إدارة المهام الإدارية وأعمال السكرتارية (Administrative Tasks)")
    add_body_p("متابعة الأعمال التنفيذية والإدارية خارج قاعات المحاكم لضمان عدم تعطل الدعاوي:")
    add_bullet("استخراج صور رسمية من الأحكام، الصيغ التنفيذية، شهادات من واقع الجدول، إيداع مذكرات، شهادات بعدم حصول استئناف، تصوير أوراق دعوى، إنذارات عرض.", "أنشطة القلم والجهات:")
    add_bullet("إسناد كل مهمة لمحامٍ أو إداري محدد مع تحديد الأولوية (عادي، متوسط، عاجل جداً).", "توزيع المهام وفريق العمل:")
    add_bullet("تحديد تاريخ الاستحقاق وتتبع حالة الإنجاز (قيد الانتظار، جاري التنفيذ، مكتملة، ملغاة).", "متابعة المواعيد والإنجاز:")

    # --- MODULE 8 ---
    add_heading_2("الوحدة الثامنة: الحاسبة القانونية للرسوم القضائية المصرية (Judicial Fees Calculator)")
    add_body_p("حاسبة قانونية فائقة الدقة مبنية وفقاً لقانون الرسوم القضائية رقم 90 لسنة 1944 وتعديلاته بالقانون 126 لسنة 2009:")
    add_bullet("حساب الرسم النسبي (1.5% حتى 4000 جنيه، و2.5% لما زاد عن ذلك)، مع رسم الخدمات 50% من النسبي، ورسم الميكنة، وصندوق التعويضات 20%.", "الدعاوي المدنية والتجارية معلومة القيمة:")
    add_bullet("حساب الرسوم الثابتة المقررة لدعاوي صحة التوقيع بناءً على نوع العقد وقيمته.", "دعاوي صحة التوقيع:")
    add_bullet("حساب الرسوم وفقاً لنوع المحكمة (جزئي: 5 ج، كلي: 15 ج، مستعجل: 10 ج، إفلاس: 50 ج، استئناف عالي: 30 ج).", "الدعاوي غير مقدرة القيمة:")
    add_bullet("تطبيق الإعفاء الكامل من الرسوم القضائية بنص المادة 6 من قانون العمل رقم 12 لسنة 2003.", "الدعاوي العمالية:")
    add_bullet("حساب مصاريف إعلان الخصوم بناءً على عدد المدعى عليهم في صحيفة الدعوى، والطلبات المستعجلة المرتبطة.", "تعدد الخصوم والطلبات المستعجلة:")
    add_bullet("توليد تقرير تفصيلي لبنود الرسوم المقدرة مع إمكانية النسخ والطباعة السريعة لتقديمها للموكل.", "تصدير ونسخ بيان الرسوم:")

    # --- MODULE 9 ---
    add_heading_2("الوحدة التاسعة: حاسبة مواعيد الطعن القانونية ومحرك البحث (Deadlines & Search)")
    add_body_p("نظام حساب ومراقبة المواعيد الإجرائية الحتمية للطعن على الأحكام:")
    add_bullet("40 يوماً من تاريخ صدور الحكم وفقاً للمادة 227 من قانون المرافعات.", "ميعاد الاستئناف المدني والتجاري:")
    add_bullet("10 أيام من تاريخ الحكم الحضوري أو إعلان الحكم الغيابي وفقاً للمادة 406 إجراءات جنائية.", "ميعاد استئناف الجنح:")
    add_bullet("60 يوماً من تاريخ صدور الحكم وفقاً للقانون رقم 57 لسنة 1959.", "ميعاد الطعن بالنقض (مدني وجنائي):")
    add_bullet("60 يوماً من تاريخ صدور الحكم وفقاً لقانون مجلس الدولة رقم 47 لسنة 1972.", "ميعاد الطعن أمام الإدارية العليا:")
    add_bullet("10 أيام من تاريخ إعلان الحكم الغيابي الصادر في الجنحة وفقاً للمادة 398 إجراءات جنائية.", "ميعاد المعارضة في الجنح:")
    add_bullet("محرك بحث شامل فوري في كافة دفاتر القضايا، الموكلين، الخصوم، والمهام عبر الاسم، الرقم القومي، أو رقم الدعوى.", "محرك البحث الذكي (Global Search):")

    # --- MODULE 10 ---
    add_heading_2("الوحدة العاشرة: التقويم القضائي التفاعلي والتزامن مع Google Calendar")
    add_body_p("تنظيم وتنسيق المواعيد والارتباطات القضائية باحترافية:")
    add_bullet("عرض شهري وأسبوعي ويومي لجلسات المحاكم، مواعيد تسليم واستلام المحضرين، ومواعيد الطعن المتبقية.", "التقويم التفاعلي (Interactive Calendar):")
    add_bullet("ربط ومزامنة الجلسات مع تقويم Google الشخصي للمحامي لتلقي التنبيهات المسبقة على الهاتف الذكي وساعات اليد الذكية.", "التزامن مع Google Calendar:")

    # --- MODULE 11 ---
    add_heading_2("الوحدة الحادية عشرة: إدارة فريق العمل والمساعدين (Team & Role Management)")
    add_body_p("تنظيم العمل الجماعي داخل مكاتب المحاماة متعددي المحامين والشركاء:")
    add_bullet("إضافة المحامين المساعدين، المستشارين، الإداريين، ومديري الحسابات.", "سجل فريق العمل:")
    add_bullet("تحديد المسمى الوظيفي، أرقام التواصل، والمهام المسندة لكل محامٍ في قضايا وجلسات اليوم.", "توزيع المهام:")

    # --- MODULE 12 & 13 ---
    add_heading_2("الوحدة الثانية عشرة والثالثة عشرة: الأرشيف الرقمي ومنظومة الأمان والمصادقة")
    add_body_p("الحفظ الآمن للبيانات وسرية ملفات الموكلين:")
    add_bullet("أرشفة القضايا الصادر فيها أحكام نهائية وفصلها عن القضايا المتداولة مع سهولة الرجوع إليها في أي وقت.", "الأرشيف الرقمي (Digital Archive):")
    add_bullet("تسجيل دخول آمن عبر Google OAuth أو البريد وكلمة المرور المشفرة.", "المصادقة والأمان (Auth & Security):")
    add_bullet("تطبيق سياسات حماية البيانات على مستوى الصفوف (Row Level Security - RLS) لضمان خصوصية بيانات كل مكتب بشكل مستقل تماماً.", "حماية وسرية البيانات (RLS):")

    # -------------------------------------------------------------
    # 6. BUSINESS VALUE MATRIX TABLE
    # -------------------------------------------------------------
    add_heading_1("4. مصفوفة المقارنة والمزايا التنافسية (Business Feature Matrix)")
    add_body_p("مقارنة توضح الفارق الجوهري بين إدارة المكتب بالطريقة التقليدية واستخدام منصة أجندة دمياط القضائية:")

    matrix_tbl = doc.add_table(rows=7, cols=3)
    matrix_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_rtl(matrix_tbl)
    set_table_borders(matrix_tbl, color="CBD5E1")

    headers = ["المجال / الخاصية", "الإدارة التقليدية (الورقية / اليدوية)", "منظومة أجندة دمياط القضائية"]
    for i, h in enumerate(headers):
        cell = matrix_tbl.rows[0].cells[i]
        set_cell_shading(cell, "701A24") # Deep Burgundy
        set_cell_margins(cell, top=160, bottom=160, left=160, right=160)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        set_p_rtl(p)
        r = p.add_run(h)
        r.font.name = 'Segoe UI'
        r.font.bold = True
        r.font.size = Pt(10.5)
        r.font.color.rgb = RGBColor(255, 255, 255)

    matrix_rows = [
        ("إدارة الجلسات والأجندة", "كتابة يدوية في دفاتر معرضة للتمزق، صعوبة البحث والنسيان", "أجندة سحابية لحظية، تنبيهات آلية، ترحيل ذكي للمواعيد، وطباعة رول الجلسات"),
        ("التواصل مع الموكلين", "اتصالات هاتفية ورسائل يدوية مستهلكة للوقت ومكلفة", "بوت تليجرام قضائي يرسل القرارات ومطالبات الأتعاب آلياً وفورياً"),
        ("الحسابات والمصروفات", "حسابات تقديرية غير موثقة وضياع المصاريف النثرية", "سجل مالي تفصيلي لكل موكل، رصيد تراكمي آلي، وكشوف حساب جاهزة للطباعة"),
        ("دفتر المحضرين", "متابعة ورقية قد تؤدي لسقوط الجلسة لعدم الإعلان", "تتبع دقيق لمواقف الإعلانات وأسماء المحضرين وتنبيهات مبكرة قبل الجلسات"),
        ("حساب الرسوم ومواعيد الطعن", "حسابات يدوية معقدة معرضة للخطأ الحسابي والقانوني", "حاسبة رسمية لقانون الرسوم 126/2009 وحاسبة ذكية لمواعيد الاستئناف والنقض"),
        ("أمان وحفظ البيانات", "خطر فقدان الملفات بالحرائق أو التلف أو ضياع الأوراق", "تخزين سحابي مشفر (PostgreSQL) مع نسخ احتياطي وتخزين محلي مؤقت")
    ]

    for row_idx, (col1, col2, col3) in enumerate(matrix_rows, start=1):
        c1 = matrix_tbl.rows[row_idx].cells[0]
        c2 = matrix_tbl.rows[row_idx].cells[1]
        c3 = matrix_tbl.rows[row_idx].cells[2]

        c1.width = Inches(1.8)
        c2.width = Inches(2.5)
        c3.width = Inches(2.7)

        bg = "F8FAFC" if row_idx % 2 == 1 else "FFFFFF"
        for c in (c1, c2, c3):
            set_cell_shading(c, bg)
            set_cell_margins(c, top=120, bottom=120, left=140, right=140)

        # Col 1
        p1 = c1.paragraphs[0]
        p1.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        set_p_rtl(p1)
        r1 = p1.add_run(col1)
        r1.font.name = 'Segoe UI'
        r1.font.bold = True
        r1.font.size = Pt(10)
        r1.font.color.rgb = RGBColor(15, 23, 42)

        # Col 2
        p2 = c2.paragraphs[0]
        p2.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        set_p_rtl(p2)
        r2 = p2.add_run(col2)
        r2.font.name = 'Segoe UI'
        r2.font.size = Pt(9.5)
        r2.font.color.rgb = RGBColor(185, 28, 28) # Reddish tint for manual pain points

        # Col 3
        p3 = c3.paragraphs[0]
        p3.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        set_p_rtl(p3)
        r3 = p3.add_run(col3)
        r3.font.name = 'Segoe UI'
        r3.font.size = Pt(9.5)
        r3.font.bold = True
        r3.font.color.rgb = RGBColor(4, 120, 87) # Green tint for benefits

    # -------------------------------------------------------------
    # 7. ROADMAP & FUTURE EXTENSIONS
    # -------------------------------------------------------------
    doc.add_paragraph().paragraph_format.space_after = Pt(12)
    add_heading_1("5. خارطة التطوير المستقبلية (Future Roadmap)")
    add_bullet("تكامل مع بوابات الدفع الإلكتروني (فوري، ميزة، فودافون كاش) لسداد الأتعاب والمصروفات مباشرة عبر البوت.", "المدفوعات الإلكترونية:")
    add_bullet("تطبيق الذكاء الاصطناعي لتلخيص عرائض الدعاوي والمذكرات واستخراج الدفوع القانونية المناسبة.", "المساعد الذكي للمحامي (AI Legal Assistant):")
    add_bullet("الربط المباشر مع بوابة مصر الرقمية وبوابة النيابة العامة ووزارة العدل للاستعلام التلقائي عن رول الجلسات.", "الربط مع البوابات القضائية الرسمية:")
    add_bullet("تطبيق الهاتف المحمول الأصلي (Native iOS & Android Mobile Apps) بإشعارات فورية مباشرة.", "تطبيقات الهاتف المحمول:")

    # -------------------------------------------------------------
    # SAVE FILE
    # -------------------------------------------------------------
    output_filename = "دليل_المزايا_والخصائص_الوظيفية_أجندة_دمياط_القضائية.docx"
    doc.save(output_filename)
    print(f"Document successfully created and saved as: {output_filename}")

if __name__ == '__main__':
    create_full_business_doc()
