/**
 * Real DOCX Generator
 * 
 * Generates genuine .docx files using the 'docx' library.
 * Consumes the structured DocumentModel for consistent output
 * that matches the browser preview exactly.
 * 
 * Features:
 * - Arabic RTL first-class support
 * - A4 page with professional margins
 * - Headings, paragraphs, tables, lists
 * - Page breaks
 * - Headers and footers
 * - Signature areas
 * - Real Word-compatible formatting
 */

import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  Header,
  Footer,
  PageBreak,
  AlignmentType,
  HeadingLevel,
  Packer,
  BorderStyle,
  WidthType,
  PageNumber,
  NumberFormat,
  convertMillimetersToTwip,
  TableLayoutType,
  Tab,
  TabStopPosition,
  TabStopType
} from 'docx';

const FONT_FAMILY = 'Simplified Arabic';
const FONT_SIZE_PT = 14;
const FONT_SIZE_HALF_PT = FONT_SIZE_PT * 2; // docx uses half-points
const LINE_SPACING = 276; // ~1.8 line spacing in twips-ish (240 = single)
const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const MARGIN_MM = 20;

/**
 * Map alignment string to docx AlignmentType.
 */
function mapAlignment(align) {
  switch (align) {
    case 'center': return AlignmentType.CENTER;
    case 'left': return AlignmentType.LEFT;
    case 'right': return AlignmentType.RIGHT;
    case 'justify': return AlignmentType.BOTH;
    default: return AlignmentType.BOTH;
  }
}

/**
 * Creates a styled text run with Arabic RTL support.
 */
function createTextRun(text, options = {}) {
  return new TextRun({
    text: text || '',
    font: options.font || FONT_FAMILY,
    size: options.size || FONT_SIZE_HALF_PT,
    bold: options.bold || false,
    underline: options.underline ? {} : undefined,
    rightToLeft: true,
    color: options.color || '000000',
    ...options
  });
}

/**
 * Creates a paragraph from a body element.
 */
function createParagraph(text, options = {}) {
  return new Paragraph({
    alignment: mapAlignment(options.align || 'justify'),
    bidirectional: true,
    spacing: {
      after: options.spacingAfter !== undefined ? options.spacingAfter : 120,
      line: options.lineSpacing || LINE_SPACING,
    },
    indent: options.indent ? {
      firstLine: convertMillimetersToTwip(10),
    } : undefined,
    children: [
      createTextRun(text, {
        bold: options.bold || false,
        underline: options.underline || false,
        size: options.size || FONT_SIZE_HALF_PT,
        color: options.color,
      })
    ]
  });
}

/**
 * Creates a heading paragraph.
 */
function createHeading(text, level = 2, align = 'center') {
  const headingMap = {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3,
  };

  return new Paragraph({
    alignment: mapAlignment(align),
    bidirectional: true,
    heading: headingMap[level] || HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 200, line: LINE_SPACING },
    children: [
      createTextRun(text, {
        bold: true,
        size: level === 1 ? 32 : level === 2 ? 28 : 26,
      })
    ]
  });
}

/**
 * Creates a real Word table from structured data.
 */
function createTable(tableData) {
  const { headers = [], rows = [] } = tableData;

  const columnCount = Math.max(headers.length, rows.length > 0 ? rows[0].length : 0);
  if (columnCount === 0) return null;

  // Header row
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(h =>
      new TableCell({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            spacing: { before: 40, after: 40 },
            children: [createTextRun(h, { bold: true, size: 22 })]
          })
        ],
        shading: { fill: 'E8E8E8' },
        verticalAlign: 'center',
      })
    )
  });

  // Data rows
  const dataRows = rows.map(row => {
    const cells = [];
    for (let i = 0; i < columnCount; i++) {
      cells.push(
        new TableCell({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              bidirectional: true,
              spacing: { before: 20, after: 20 },
              children: [createTextRun(row[i] || '', { size: 22 })]
            })
          ],
          verticalAlign: 'center',
        })
      );
    }
    return new TableRow({ children: cells });
  });

  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    visuallyRightToLeft: true,
  });
}

/**
 * Two-cell table: opening paragraphs (right in RTL) beside the framed
 * «الموضوع» box (left), as on the office's court papers.
 */
function createOpeningWithSubjectBox(openingElements, subject, settings = {}) {
  const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const line = { style: BorderStyle.SINGLE, size: 8, color: '000000' };
  const noBorders = { top: none, bottom: none, left: none, right: none };
  const openingChildren = openingElements.flatMap(el => elementToDocx(
    { ...el, type: 'paragraph', align: 'right' }, settings));
  const boxPara = (text, opts = {}) => new Paragraph({
    alignment: AlignmentType.CENTER,
    bidirectional: true,
    spacing: { before: 60, after: 60 },
    children: [createTextRun(text, { bold: opts.bold, size: opts.size || 26 })],
  });
  const boxRow = (children, borders, fill) => new TableRow({
    children: [new TableCell({ children, borders, shading: fill ? { fill } : undefined, verticalAlign: 'center' })],
  });
  const box = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    visuallyRightToLeft: true,
    borders: { top: line, bottom: line, left: line, right: line, insideHorizontal: line, insideVertical: none },
    rows: [
      boxRow([boxPara('الموضوع', { bold: true })], undefined, 'F3F4F6'),
      boxRow([boxPara(subject, { bold: true })]),
      boxRow([boxPara('المحامي', { size: 22 })]),
    ],
  });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    visuallyRightToLeft: true,
    borders: { ...noBorders, insideHorizontal: none, insideVertical: none },
    columnWidths: [7000, 2400],
    rows: [new TableRow({
      children: [
        new TableCell({ children: openingChildren, borders: noBorders, width: { size: 74, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [box], borders: noBorders, width: { size: 26, type: WidthType.PERCENTAGE } }),
      ],
    })],
  });
}

/**
 * Creates a signature section.
 */
function createSignatureSection(label) {
  return new Paragraph({
    alignment: AlignmentType.RIGHT,
    bidirectional: true,
    spacing: { before: 400, after: 200, line: LINE_SPACING },
    children: [
      createTextRun(label || 'توقيع المحامي الوكيل: ............................................', {
        size: 24,
      })
    ]
  });
}

/**
 * Builds the header for the DOCX document.
 */
function buildDocxHeader(headerData) {
  if (!headerData || !headerData.showHeader) return undefined;

  const children = [];

  if (headerData.officeName) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { after: 40 },
      children: [createTextRun(headerData.officeName, { bold: true, size: 32, color: '37040a' })]
    }));
  }

  if (headerData.lawyerName) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { after: 40 },
      children: [createTextRun(`الأستاذ/ ${headerData.lawyerName} - ${headerData.lawyerTitle || 'محامٍ ومستشار قانوني'}`, {
        size: 22, color: '555555'
      })]
    }));
  }

  const contactParts = [headerData.address, headerData.phone, headerData.email].filter(Boolean);
  if (contactParts.length > 0) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { after: 60 },
      children: [createTextRun(contactParts.join(' | '), { size: 18, color: '777777' })]
    }));
  }

  // Separator line
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '37040a' } },
    children: [createTextRun(' ', { size: 4 })]
  }));

  return new Header({ children });
}

function emptyHeader() {
  return new Header({ children: [new Paragraph({ children: [] })] });
}

function emptyFooter() {
  return new Footer({ children: [new Paragraph({ children: [] })] });
}

/**
 * Letterhead for court papers: contact details on the right, office name and
 * title on the left, rule underneath — the same arrangement as the on-screen paper.
 */
function buildCourtLetterhead(headerData) {
  const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const noBorders = { top: none, bottom: none, left: none, right: none };
  const line = (text, opts = {}) => new Paragraph({
    alignment: opts.align || AlignmentType.RIGHT,
    bidirectional: true,
    spacing: { after: 20 },
    children: [createTextRun(text, { size: opts.size || 20, bold: opts.bold, color: opts.color || '37040a' })],
  });
  const contact = [headerData.address, headerData.phone, headerData.email].filter(Boolean).map(t => line(t, { size: 18 }));
  const identity = [
    line(headerData.officeName || 'مكتب المحاماة', { size: 30, bold: true, align: AlignmentType.CENTER }),
    line(headerData.lawyerTitle || 'محامون ومستشارون قانونيون', { size: 20, align: AlignmentType.CENTER, color: '6d0f1b' }),
  ];
  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    visuallyRightToLeft: true,
    borders: { ...noBorders, insideHorizontal: none, insideVertical: none },
    rows: [new TableRow({
      children: [
        new TableCell({ children: contact.length ? contact : [line(' ')], borders: noBorders, verticalAlign: 'center', width: { size: 45, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: identity, borders: noBorders, verticalAlign: 'center', width: { size: 55, type: WidthType.PERCENTAGE } }),
      ],
    })],
  });
  const rule = new Paragraph({
    spacing: { before: 60, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: '37040a' } },
    children: [createTextRun(' ', { size: 4 })],
  });
  return new Header({ children: [table, rule] });
}

/**
 * Builds the footer for the DOCX document.
 */
function buildDocxFooter(footerData) {
  const children = [];

  // Separator
  children.push(new Paragraph({
    border: { top: { style: BorderStyle.SINGLE, size: 3, color: 'CCCCCC' } },
    spacing: { before: 100, after: 40 },
    children: [createTextRun(' ', { size: 4 })]
  }));

  if (footerData && footerData.disclaimer) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { after: 40 },
      children: [createTextRun(footerData.disclaimer, { size: 14, color: '999999' })]
    }));
  }

  // Page number
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      createTextRun('صفحة ', { size: 16, color: '999999' }),
      new TextRun({
        children: [PageNumber.CURRENT],
        font: FONT_FAMILY,
        size: 16,
        color: '999999',
      }),
      createTextRun(' من ', { size: 16, color: '999999' }),
      new TextRun({
        children: [PageNumber.TOTAL_PAGES],
        font: FONT_FAMILY,
        size: 16,
        color: '999999',
      }),
    ]
  }));

  return new Footer({ children });
}

/**
 * Converts a DocumentModel body element to docx element(s).
 */
function elementToDocx(element, globalSettings = {}) {
  switch (element.type) {
    case 'heading':
      return [createHeading(element.text, element.level || 2, element.align || 'center')];

    case 'paragraph':
      return [createParagraph(element.text, {
        align: element.align || globalSettings.textAlign || 'justify',
        bold: element.bold || globalSettings.isBold || false,
        underline: element.underline || globalSettings.isUnderline || false,
        indent: element.indent,
        size: globalSettings.fontSize ? globalSettings.fontSize * 2 : FONT_SIZE_HALF_PT,
      })];

    case 'spacer':
      return [new Paragraph({ spacing: { before: 0, after: 0 }, children: [] })];

    case 'table': {
      const table = createTable(element);
      return table ? [table, new Paragraph({ spacing: { after: 120 }, children: [] })] : [];
    }

    case 'pageBreak':
      return [new Paragraph({ children: [new PageBreak()] })];

    case 'signature':
      return [createSignatureSection(element.label)];

    case 'list':
      return (element.items || []).map((item, i) =>
        createParagraph(`${element.ordered ? `${i + 1}. ` : '• '}${item}`, {
          align: 'right',
          indent: true,
        })
      );

    default:
      if (element.text) {
        return [createParagraph(element.text)];
      }
      return [];
  }
}

/**
 * Generates a real .docx blob from a DocumentModel.
 * 
 * @param {Object} docModel - The structured document model
 * @returns {Promise<Blob>} The .docx file as a Blob
 */
export async function generateDocx(docModel) {
  const { metadata, settings, header, body, footer } = docModel;

  // Convert all body elements to docx elements
  const docxChildren = [];
  let bodyElements = body;
  if (metadata.layout === 'announcement' && metadata.subject) {
    // Court-paper layout: the «الموضوع» box sits beside the opening block.
    let cut = body.findIndex(el => /^\s*(وأعلنته|وأنذرته|وأعلنتهما)/.test(el.text || ''));
    if (cut < 0) cut = Math.min(5, body.length);
    docxChildren.push(createOpeningWithSubjectBox(body.slice(0, cut), metadata.subject, settings));
    docxChildren.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
    bodyElements = body.slice(cut);
  }
  for (const element of bodyElements) {
    const converted = elementToDocx(element, settings);
    docxChildren.push(...converted);
  }

  const isCourtPaper = metadata.layout === 'announcement';

  // Add signature footer if present and not already in body
  // (court papers end with «ولأجل العلم/», so no extra date or signature line)
  if (!isCourtPaper && footer && footer.signatureLabel) {
    const hasSignatureInBody = body.some(el => el.type === 'signature');
    if (!hasSignatureInBody) {
      docxChildren.push(createSignatureSection(footer.signatureLabel));
    }
  }

  // Add document date
  if (!isCourtPaper && footer && footer.date) {
    docxChildren.push(new Paragraph({
      alignment: AlignmentType.RIGHT,
      bidirectional: true,
      spacing: { before: 300 },
      children: [createTextRun(`تحريراً في: ${footer.date}`, { size: 20, color: '666666' })]
    }));
  }

  const doc = new Document({
    title: metadata.title || 'مستند قانوني',
    description: `${metadata.formulaCategory || ''} - ${metadata.title || ''}`,
    creator: metadata.generatedBy || 'الأجندة القضائية',
    styles: {
      default: {
        document: {
          run: {
            font: FONT_FAMILY,
            size: FONT_SIZE_HALF_PT,
            rightToLeft: true,
            color: '000000',
          },
          paragraph: {
            alignment: AlignmentType.BOTH,
            bidirectional: true,
          },
        },
        heading1: {
          run: { font: FONT_FAMILY, size: 32, bold: true, rightToLeft: true, color: '37040a' },
          paragraph: { alignment: AlignmentType.CENTER, bidirectional: true, spacing: { before: 200, after: 200 } }
        },
        heading2: {
          run: { font: FONT_FAMILY, size: 28, bold: true, rightToLeft: true, color: '1a1a1a' },
          paragraph: { alignment: AlignmentType.CENTER, bidirectional: true, spacing: { before: 160, after: 160 } }
        },
        heading3: {
          run: { font: FONT_FAMILY, size: 26, bold: true, rightToLeft: true, color: '333333' },
          paragraph: { alignment: AlignmentType.RIGHT, bidirectional: true, spacing: { before: 120, after: 120 } }
        },
      },
    },
    sections: [{
      properties: {
        page: {
          size: {
            width: convertMillimetersToTwip(PAGE_WIDTH_MM),
            height: convertMillimetersToTwip(PAGE_HEIGHT_MM),
            orientation: 'portrait',
          },
          margin: {
            top: convertMillimetersToTwip(settings.margins?.top || MARGIN_MM),
            right: convertMillimetersToTwip(settings.margins?.right || MARGIN_MM),
            bottom: convertMillimetersToTwip(settings.margins?.bottom || MARGIN_MM),
            left: convertMillimetersToTwip(settings.margins?.left || MARGIN_MM),
          },
          pageNumbers: {
            formatType: NumberFormat.DECIMAL,
          },
        },
        bidi: true,
        titlePage: isCourtPaper,
      },
      headers: isCourtPaper
        // letterhead on the first page only, as on the office's printed paper
        ? { first: header ? buildCourtLetterhead(header) : emptyHeader(), default: emptyHeader() }
        : (header ? { default: buildDocxHeader(header) } : undefined),
      footers: isCourtPaper
        ? { first: emptyFooter(), default: buildDocxFooter({ ...footer, disclaimer: null }) }
        : { default: buildDocxFooter(footer) },
      children: docxChildren,
    }]
  });

  return Packer.toBlob(doc);
}

/**
 * Downloads a DOCX blob as a file.
 * 
 * @param {Blob} blob - The DOCX blob
 * @param {string} filename - Desired filename (without extension)
 */
export function downloadDocxBlob(blob, filename = 'مستند_قانوني') {
  const safeFilename = (filename || 'مستند_قانوني')
    .replace(/[/\\:*?"<>|]/g, '_')
    .substring(0, 60);

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeFilename}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Full pipeline: DocumentModel → download .docx file
 * 
 * @param {Object} docModel - Structured document model
 * @param {string} filename - Desired filename
 */
export async function exportDocumentModelToDocx(docModel, filename) {
  try {
    const blob = await generateDocx(docModel);
    downloadDocxBlob(blob, filename || docModel.metadata?.title);
    return { success: true };
  } catch (err) {
    console.error('DOCX generation failed:', err);
    return { success: false, error: 'حدث خطأ أثناء إنشاء ملف الوورد. يرجى المحاولة مرة أخرى.' };
  }
}
