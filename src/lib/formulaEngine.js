/**
 * Metadata-driven Legal Formula Template Engine
 * 
 * Predictably resolves placeholders from:
 * 1. User entered values (Overrides have top priority)
 * 2. Case data (only for explicitly mapped sources)
 * 3. Client data (only for explicitly mapped sources)
 * 4. Office Profile data
 * 5. System/Runtime defaults
 * 
 * CRITICAL RULE: Unresolved placeholders are ERRORS, not silent replacements.
 * In a legal system, missing data must be flagged, never hidden.
 */

import { createDocumentModel, documentListToTable } from './documentModel.js';
import { evaluateCondition } from './fieldValidation.js';
import { createFormulaSnapshot, DEFAULT_DISCLAIMER } from './formulaSchema.js';
import { formatEgyptPhone } from './phone';

/**
 * Renders an array of document items into a formal Arabic court table.
 * (Preserved for backward compatibility with existing text-based rendering)
 * 
 * @param {Array<{number: number|string, title: string, date?: string, notes?: string}>} items
 * @returns {string} Plain text table formatted for legal documents
 */
export function formatDocumentListTable(items) {
  if (!items || !items.length) {
    return 'لا توجد مستندات مسجلة بالحافظة.';
  }

  let table = '--------------------------------------------------------------------------------\n';
  table += ' م  | تاريخ المستند | بيان ومضمون المستند المودع بالحافظة           | وجه الدلالة والملاحظات \n';
  table += '--------------------------------------------------------------------------------\n';

  items.forEach((item, index) => {
    const num = String(item.number || index + 1).padEnd(3, ' ');
    const date = (item.date || '—').padEnd(13, ' ');
    const title = (item.title || '').padEnd(45, ' ');
    const notes = item.notes || '—';
    table += ` ${num}| ${date}| ${title}| ${notes}\n`;
  });

  table += '--------------------------------------------------------------------------------';
  return table;
}

/**
 * Resolves a field's initial value based on its explicit source mapping.
 * @param {Object} field - The field definition
 * @param {Object} context - { selectedCase, selectedClient, officeProfile }
 * @returns {any}
 */
export function resolveFieldInitialValue(field, context = {}) {
  const { selectedCase, selectedClient, officeProfile } = context;

  // 1. Explicit source mapping
  if (field.source) {
    const [entity, prop] = field.source.split('.');

    if (entity === 'case' && selectedCase) {
      if (prop === 'court') return selectedCase.court_name || '';
      if (prop === 'chamber') return selectedCase.court_room || '';
      if (prop === 'number') return selectedCase.case_number || '';
      if (prop === 'year') return selectedCase.case_year ? String(selectedCase.case_year) : '';
      if (prop === 'opponent') return selectedCase.defendant_name || '';
      if (prop === 'type') return selectedCase.case_type || '';
    }

    if (entity === 'client' && selectedClient) {
      if (prop === 'name') return selectedClient.name || '';
      if (prop === 'national_id') return selectedClient.national_id || '';
      if (prop === 'address') return selectedClient.address || '';
      if (prop === 'phone') return selectedClient.phone || '';
      if (prop === 'poa') return selectedClient.power_of_attorney_number || '';
    }

    if (entity === 'office' && officeProfile) {
      if (prop === 'lawyer_name') return officeProfile.lawyer_name || '';
      if (prop === 'name') return officeProfile.office_name || '';
      if (prop === 'address') return officeProfile.address || '';
      if (prop === 'phone') return officeProfile.phone || '';
    }

    if (entity === 'system') {
      if (prop === 'today') {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
    }
  }

  // 2. Default value in field definition
  if (field.defaultValue !== undefined && field.defaultValue !== null) {
    return field.defaultValue;
  }

  // 3. Fallback per field type
  if (field.type === 'document_list') {
    return [];
  }
  if (field.type === 'checkbox') {
    return false;
  }

  return '';
}

/**
 * Initializes form values for a formula.
 * @param {Object} formula
 * @param {Object} context - { selectedCase, selectedClient, officeProfile }
 * @returns {Object} { [key]: value }
 */
export function buildInitialFormValues(formula, context = {}) {
  const values = {};
  if (!formula || !formula.fields) return values;

  formula.fields.forEach(field => {
    values[field.key] = resolveFieldInitialValue(field, context);
  });

  return values;
}

/**
 * Renders template content with entered values and context.
 * Blocks if required fields are missing.
 * 
 * CRITICAL: Unresolved placeholders are reported as warnings,
 * NOT silently replaced with dots.
 *
 * @param {Object} formula
 * @param {Object} formValues
 * @param {Object} context
 * @returns {{ content: string, errors: string[], missingFields: string[], warnings: string[] }}
 */
export function generateDocumentContent(formula, formValues = {}, context = {}) {
  const missingFields = [];
  const errors = [];
  const warnings = [];

  if (!formula) {
    return { content: '', errors: ['لم يتم تحديد الصيغة القانونية.'], missingFields: [], warnings: [] };
  }

  const fields = formula.fields || [];

  // Check required fields validation (respecting conditional visibility)
  fields.forEach(field => {
    // Skip hidden conditional fields
    if (field.showWhen && !evaluateCondition(field.showWhen, formValues)) {
      return;
    }

    if (field.required) {
      const val = formValues[field.key];
      const isEmpty = val === undefined || val === null || String(val).trim() === '' || (Array.isArray(val) && val.length === 0);
      if (isEmpty) {
        missingFields.push(field.label || field.key);
      }
    }
  });

  if (missingFields.length > 0) {
    return {
      content: '',
      errors: [`لا يمكن إنشاء المستند قبل استكمال:\n${missingFields.map(f => `- ${f}`).join('\n')}`],
      missingFields,
      warnings: []
    };
  }

  // Base template
  let template = formula.template_content || formula.source_content || '';

  // 1. Process custom document_list (for حافظة مستندات)
  if (template.includes('{{documents_table}}')) {
    const docList = formValues.documents || [];
    const formattedTable = formatDocumentListTable(docList);
    template = template.replaceAll('{{documents_table}}', formattedTable);
  }

  // 2. Replace user form values
  fields.forEach(field => {
    const placeholder = `{{${field.key}}}`;
    let val = formValues[field.key];

    if (val === undefined || val === null) {
      val = '';
    }

    if (field.type === 'document_list') {
      val = formatDocumentListTable(val);
    }

    // For checkbox, convert to readable text
    if (field.type === 'checkbox') {
      val = val ? 'نعم' : 'لا';
    }

    let text = String(val).trim();
    // dates are entered as yyyy-mm-dd but court papers write them day/month/year
    const isoDate = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (field.type === 'date' && isoDate) text = `${isoDate[3]}/${isoDate[2]}/${isoDate[1]}`;
    if (text === '' && !field.required) {
      // An optional field left empty: drop a line that holds only that field,
      // otherwise leave a visible dotted blank for the lawyer to fill by hand.
      const lineOnly = new RegExp(`^[ \\t]*\\{\\{${field.key}\\}\\}[ \\t]*\\n?`, 'm');
      if (lineOnly.test(template)) {
        template = template.replace(lineOnly, '');
        return;
      }
      template = template.replaceAll(placeholder, '..........');
      return;
    }

    template = template.replaceAll(placeholder, text);
  });

  // 3. Replace entity dot-notations if present in template
  const { selectedCase, selectedClient, officeProfile } = context;

  const dotReplacements = {
    '{{client.name}}': selectedClient?.name || formValues.client_name || '',
    '{{client.national_id}}': selectedClient?.national_id || formValues.client_id || '',
    '{{client.address}}': selectedClient?.address || formValues.client_address || '',
    '{{client.phone}}': selectedClient?.phone ? formatEgyptPhone(selectedClient.phone) : '',
    '{{opponent.name}}': selectedCase?.defendant_name || formValues.opponent_name || '',
    '{{opponent.address}}': formValues.opponent_address || '',
    '{{case.number}}': selectedCase?.case_number || formValues.case_number || '',
    '{{case.year}}': selectedCase?.case_year || formValues.case_year || '',
    '{{case.court}}': selectedCase?.court_name || formValues.court_name || '',
    '{{case.chamber}}': selectedCase?.court_room || formValues.court_chamber || '',
    '{{case.type}}': selectedCase?.case_type || '',
    '{{office.name}}': officeProfile?.office_name || '',
    '{{office.lawyer_name}}': officeProfile?.lawyer_name || formValues.lawyer_name || '',
    '{{office.address}}': officeProfile?.address || '',
    '{{office.phone}}': officeProfile?.phone ? formatEgyptPhone(officeProfile.phone) : '',
    '{{document.date}}': formValues.session_date || formValues.action_date || formValues.notice_date || formValues.contract_date || new Date().toISOString().substring(0, 10),
    '{{system.today}}': new Date().toISOString().substring(0, 10)
  };

  Object.entries(dotReplacements).forEach(([placeholder, val]) => {
    if (template.includes(placeholder)) {
      template = template.replaceAll(placeholder, String(val).trim());
    }
  });

  // 4. Handle unresolved placeholders — REPORT as warnings, mark visibly
  const unresolvedMatch = template.match(/\{\{([a-zA-Z0-9_.-]+)\}\}/g);
  if (unresolvedMatch) {
    const unresolvedKeys = [...new Set(unresolvedMatch.map(m => m.replace(/\{\{|\}\}/g, '')))];
    unresolvedKeys.forEach(key => {
      warnings.push(`تحذير: الحقل «${key}» غير معرّف أو لم تتم تعبئته`);
      // Mark the placeholder visibly instead of silent dots
      template = template.replaceAll(`{{${key}}}`, `[${key} — غير مُعبّأ]`);
    });
  }

  return {
    content: template.trim(),
    errors: [],
    missingFields: [],
    warnings
  };
}

/**
 * NEW: Generates a full structured document model.
 * This is the primary generation function for Phase 5+.
 * Both preview and DOCX consume this model.
 * 
 * @param {Object} formula - Normalized formula
 * @param {Object} formValues - User-entered values
 * @param {Object} context - { selectedCase, selectedClient, officeProfile }
 * @param {Object} settings - Editor formatting settings
 * @returns {{ model: Object|null, errors: string[], warnings: string[] }}
 */
export function generateDocumentModel(formula, formValues = {}, context = {}, settings = {}) {
  // First generate the text content
  const result = generateDocumentContent(formula, formValues, context);

  if (result.errors.length > 0) {
    return { model: null, errors: result.errors, warnings: result.warnings || [] };
  }

  const { officeProfile } = context;

  // Collect table data from document_list fields
  const tables = [];
  (formula.fields || []).forEach(field => {
    if (field.type === 'document_list') {
      const items = formValues[field.key];
      if (items && items.length > 0) {
        tables.push(documentListToTable(items));
      }
    }
  });

  // Build header data
  const headerData = officeProfile ? {
    officeName: officeProfile.office_name,
    lawyerName: officeProfile.lawyer_name,
    lawyerTitle: officeProfile.lawyer_title,
    address: officeProfile.address,
    phone: officeProfile.phone,
    email: officeProfile.email,
  } : null;

  // Determine document date
  const docDate = formValues.session_date || formValues.action_date || formValues.notice_date || formValues.contract_date || new Date().toISOString().substring(0, 10);

  // Build the structured document model
  const model = createDocumentModel({
    title: formula.title,
    content: result.content,
    metadata: {
      ...createFormulaSnapshot(formula),
      layout: formula.layout || 'plain',
      subject: formula.subject || null,
      status: 'generated',
    },
    header: headerData,
    footer: {
      date: docDate,
      disclaimer: formula.disclaimer || DEFAULT_DISCLAIMER,
      showPageNumbers: true,
      signatureLabel: 'توقيع المحامي الوكيل: ............................................'
    },
    settings,
    tables
  });

  return { model, errors: [], warnings: result.warnings || [] };
}
