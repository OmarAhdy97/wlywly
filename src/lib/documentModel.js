/**
 * Structured Document Model
 * 
 * Intermediate representation consumed by BOTH the browser preview
 * and the DOCX generator. Single source of truth for document rendering.
 * 
 * Flow:
 *   Formula + Data → DocumentModel → Preview HTML / DOCX / Print
 */

/**
 * Creates a structured document model from resolved template text.
 * 
 * @param {Object} params
 * @param {string} params.title - Document title
 * @param {string} params.content - Resolved template text (all placeholders replaced)
 * @param {Object} params.metadata - Document metadata
 * @param {Object} params.header - Office/lawyer header information
 * @param {Object} params.footer - Footer information  
 * @param {Object} params.settings - Formatting settings
 * @param {Array}  params.tables - Table data from document_list fields
 * @returns {Object} Structured document model
 */
export function createDocumentModel({
  title = '',
  content = '',
  metadata = {},
  header = null,
  footer = null,
  settings = {},
  tables = []
} = {}) {
  const body = parseContentToElements(content, tables);

  return {
    metadata: {
      title: title,
      formulaId: metadata.formulaId || null,
      formulaVersion: metadata.formulaVersion || '1.0',
      formulaCategory: metadata.formulaCategory || '',
      generatedAt: metadata.generatedAt || new Date().toISOString(),
      generatedBy: metadata.generatedBy || null,
      jurisdiction: metadata.jurisdiction || 'مصر',
      legal_area: metadata.legal_area || '',
      status: metadata.status || 'generated',
      ...metadata
    },
    settings: {
      pageSize: 'A4',
      orientation: 'portrait',
      direction: 'rtl',
      fontFamily: settings.fontFamily || "'Simplified Arabic', 'Traditional Arabic', Arial, sans-serif",
      fontSize: settings.fontSize || 14,
      lineHeight: settings.lineHeight || 1.8,
      textAlign: settings.textAlign || 'justify',
      isBold: settings.isBold || false,
      isUnderline: settings.isUnderline || false,
      margins: settings.margins || { top: 20, right: 20, bottom: 20, left: 20 }, // mm
      ...settings
    },
    header: header ? {
      officeName: header.officeName || header.office_name || '',
      lawyerName: header.lawyerName || header.lawyer_name || '',
      lawyerTitle: header.lawyerTitle || header.lawyer_title || 'محامٍ ومستشار قانوني',
      address: header.address || '',
      phone: header.phone || '',
      email: header.email || '',
      showHeader: true
    } : null,
    body,
    footer: footer ? {
      date: footer.date || new Date().toISOString().substring(0, 10),
      disclaimer: footer.disclaimer || null,
      showPageNumbers: footer.showPageNumbers !== false,
      signatureLabel: footer.signatureLabel || 'توقيع المحامي الوكيل: ............................................',
      ...footer
    } : null
  };
}

/**
 * Parses resolved template content into structured body elements.
 * 
 * @param {string} content - The resolved template text
 * @param {Array} tables - Table data from document_list fields
 * @returns {Array} Body elements
 */
function parseContentToElements(content, tables = []) {
  if (!content) return [];

  const elements = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line → spacer
    if (!trimmed) {
      // Collapse multiple empty lines
      if (elements.length > 0 && elements[elements.length - 1].type !== 'spacer') {
        elements.push({ type: 'spacer', lines: 1 });
      }
      continue;
    }

    // Page break marker
    if (trimmed === '---PAGE_BREAK---' || trimmed === '<!-- pagebreak -->') {
      elements.push({ type: 'pageBreak' });
      continue;
    }

    // بسم الله الرحمن الرحيم → centered heading
    if (trimmed === 'بسم الله الرحمن الرحيم') {
      elements.push({ type: 'heading', level: 1, text: trimmed, align: 'center', bold: true });
      continue;
    }

    // Table placeholder → insert real table
    if (trimmed.includes('TABLE_PLACEHOLDER_') || trimmed.match(/^-{20,}$/)) {
      // Skip ASCII table separator lines
      continue;
    }

    // Detect ASCII table rows (from formatDocumentListTable)
    if (trimmed.match(/^\s*\d+\s*\|/) || trimmed.match(/^\s*م\s+\|/)) {
      // Collect consecutive table-like lines
      const tableLines = [trimmed];
      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j].trim();
        if (nextLine.match(/^\s*\d+\s*\|/) || nextLine.match(/^-{10,}$/) || nextLine.match(/^\s*م\s+\|/)) {
          tableLines.push(nextLine);
          j++;
        } else {
          break;
        }
      }
      
      // Try to parse the ASCII table into a structured table
      const parsedTable = parseAsciiTable(tableLines);
      if (parsedTable) {
        elements.push(parsedTable);
        i = j - 1; // Skip the processed lines
        continue;
      }
    }

    // Detect signature-like lines
    if ((trimmed.includes('التوقيع') || trimmed.includes('توقيع')) && trimmed.includes('...')) {
      elements.push({ type: 'signature', label: trimmed });
      continue;
    }

    // Detect short "heading-like" lines (document titles, section headers)
    if (isLikelyHeading(trimmed, i, lines)) {
      elements.push({
        type: 'heading',
        level: i <= 3 ? 2 : 3,
        text: trimmed,
        align: 'center',
        bold: true
      });
      continue;
    }

    // Default: paragraph
    elements.push({
      type: 'paragraph',
      text: trimmed,
      align: 'justify',
      bold: false,
      indent: false
    });
  }

  // Insert external tables if not already embedded
  if (tables.length > 0) {
    for (const tableData of tables) {
      if (tableData && tableData.headers && tableData.rows) {
        elements.push({ type: 'table', ...tableData });
      }
    }
  }

  return elements;
}

/**
 * Heuristic to detect heading-like lines.
 */
function isLikelyHeading(trimmed, lineIndex, allLines) {
  // Very first substantial line could be a document title
  if (lineIndex <= 2 && trimmed.length < 80 && trimmed.length > 3) {
    // Check if it's followed by an empty line
    if (lineIndex + 1 < allLines.length && !allLines[lineIndex + 1].trim()) {
      // Short standalone line near start → likely heading
      if (!trimmed.includes('{{') && !trimmed.includes('السيد') && !trimmed.includes('أنا')) {
        return true;
      }
    }
  }
  
  // Lines that look like section headers
  if (trimmed.length < 40 && (
    trimmed.startsWith('أولاً:') || trimmed.startsWith('ثانياً:') || trimmed.startsWith('ثالثاً:') ||
    trimmed.startsWith('رابعاً:') || trimmed.startsWith('خامساً:') ||
    trimmed === 'الموضوع:' || trimmed === 'الموضوع' ||
    trimmed === 'الطلبات:' || trimmed === 'الطلبات' ||
    trimmed === 'الأسباب:' || trimmed === 'الأسباب' ||
    trimmed === 'بناءً عليه' ||
    trimmed === 'المستندات:'
  )) {
    return true;
  }

  return false;
}

/**
 * Attempts to parse ASCII table lines into structured table data.
 */
function parseAsciiTable(lines) {
  const dataLines = lines.filter(l => !l.trim().match(/^-+$/));
  if (dataLines.length < 2) return null;

  // First data line is header
  const headerLine = dataLines[0];
  const headers = headerLine.split('|').map(h => h.trim()).filter(Boolean);
  
  const rows = [];
  for (let i = 1; i < dataLines.length; i++) {
    const cells = dataLines[i].split('|').map(c => c.trim()).filter(Boolean);
    if (cells.length > 0) {
      rows.push(cells);
    }
  }

  if (headers.length === 0) return null;

  return {
    type: 'table',
    headers,
    rows,
    rtl: true
  };
}

/**
 * Serializes a document model back to plain text.
 * Useful for the text editor view.
 * 
 * @param {Object} docModel
 * @returns {string}
 */
export function documentModelToText(docModel) {
  if (!docModel || !docModel.body) return '';
  
  const parts = [];
  
  for (const el of docModel.body) {
    switch (el.type) {
      case 'heading':
        parts.push(el.text);
        parts.push('');
        break;
      case 'paragraph':
        parts.push(el.text);
        break;
      case 'spacer':
        parts.push('');
        break;
      case 'pageBreak':
        parts.push('');
        parts.push('---');
        parts.push('');
        break;
      case 'signature':
        parts.push('');
        parts.push(el.label);
        break;
      case 'table':
        parts.push('');
        if (el.headers) {
          parts.push(el.headers.join(' | '));
          parts.push('-'.repeat(60));
        }
        if (el.rows) {
          el.rows.forEach(row => parts.push(row.join(' | ')));
        }
        parts.push('');
        break;
      default:
        if (el.text) parts.push(el.text);
    }
  }
  
  return parts.join('\n');
}

/**
 * Converts a document_list array into table data for the document model.
 * 
 * @param {Array} items - Document list items
 * @returns {Object} Table element { type, headers, rows }
 */
export function documentListToTable(items) {
  if (!items || !items.length) return null;

  return {
    type: 'table',
    headers: ['م', 'تاريخ المستند', 'بيان ومضمون المستند المودع بالحافظة', 'وجه الدلالة والملاحظات'],
    rows: items.map((item, idx) => [
      String(item.number || idx + 1),
      item.date || '—',
      item.title || '',
      item.notes || '—'
    ]),
    rtl: true
  };
}
