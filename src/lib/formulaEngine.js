/**
 * Metadata-driven Legal Formula Template Engine
 * Predictably resolves placeholders from:
 * 1. User entered values (Overrides have top priority)
 * 2. Case data (only for explicitly mapped sources)
 * 3. Client data (only for explicitly mapped sources)
 * 4. Office Profile data
 * 5. System/Runtime defaults
 */

/**
 * Renders an array of document items into a formal Arabic court table.
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
  if (field.defaultValue !== undefined) {
    return field.defaultValue;
  }

  // 3. Fallback per field type
  if (field.type === 'document_list') {
    return [];
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
 * Handles unresolved placeholders cleanly.
 *
 * @param {Object} formula
 * @param {Object} formValues
 * @param {Object} context
 * @returns {{ content: string, errors: string[], missingFields: string[] }}
 */
export function generateDocumentContent(formula, formValues = {}, context = {}) {
  const missingFields = [];
  const errors = [];

  if (!formula) {
    return { content: '', errors: ['لم يتم تحديد الصيغة القانونية.'], missingFields: [] };
  }

  const fields = formula.fields || [];

  // Check required fields validation
  fields.forEach(field => {
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
      errors: [`يرجى إكمال الحقول الإلزامية المطلوبة: ${missingFields.join('، ')}`],
      missingFields
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

    template = template.replaceAll(placeholder, String(val).trim());
  });

  // 3. Replace entity dot-notations if present in template
  const { selectedCase, selectedClient, officeProfile } = context;

  const dotReplacements = {
    '{{client.name}}': selectedClient?.name || formValues.client_name || '',
    '{{client.national_id}}': selectedClient?.national_id || formValues.client_id || '',
    '{{client.address}}': selectedClient?.address || formValues.client_address || '',
    '{{client.phone}}': selectedClient?.phone || '',
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
    '{{office.phone}}': officeProfile?.phone || '',
    '{{document.date}}': formValues.session_date || formValues.action_date || formValues.notice_date || formValues.contract_date || new Date().toISOString().substring(0, 10),
    '{{system.today}}': new Date().toISOString().substring(0, 10)
  };

  Object.entries(dotReplacements).forEach(([placeholder, val]) => {
    if (template.includes(placeholder)) {
      template = template.replaceAll(placeholder, String(val).trim());
    }
  });

  // 4. Handle unresolved placeholders:
  // Cleanly replace any remaining {{key}} with an empty string or standard line
  template = template.replace(/\{\{[a-zA-Z0-9_.-]+\}\}/g, '...........');

  return {
    content: template.trim(),
    errors: [],
    missingFields: []
  };
}
