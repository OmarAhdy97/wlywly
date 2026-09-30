/**
 * Field-Level Validation Engine
 * 
 * Provides type-specific validation for legal document fields.
 * Returns Arabic error messages appropriate for a lawyer-facing UI.
 */

/**
 * Built-in validation rules mapped by validation type.
 */
const VALIDATION_RULES = {
  required: {
    validate: (val) => {
      if (val === undefined || val === null) return false;
      if (typeof val === 'string') return val.trim().length > 0;
      if (Array.isArray(val)) return val.length > 0;
      return true;
    },
    message: (label) => `${label} مطلوب`
  },

  national_id: {
    validate: (val) => {
      if (!val || !val.trim()) return true; // Only validate if provided
      return /^[0-9]{14}$/.test(val.trim());
    },
    message: () => 'الرقم القومي يجب أن يتكون من 14 رقمًا'
  },

  phone: {
    validate: (val) => {
      if (!val || !val.trim()) return true;
      const cleaned = val.trim().replace(/[\s\-()]/g, '');
      return /^01[0-9]{9}$/.test(cleaned) || /^0[0-9]{9,10}$/.test(cleaned);
    },
    message: () => 'رقم الهاتف غير صحيح (مثال: 01012345678)'
  },

  email: {
    validate: (val) => {
      if (!val || !val.trim()) return true;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
    },
    message: () => 'صيغة البريد الإلكتروني غير صحيحة'
  },

  date: {
    validate: (val) => {
      if (!val || !val.trim()) return true;
      const d = new Date(val);
      return !isNaN(d.getTime());
    },
    message: () => 'تاريخ غير صحيح'
  },

  number: {
    validate: (val) => {
      if (val === '' || val === undefined || val === null) return true;
      return !isNaN(Number(val));
    },
    message: () => 'يجب إدخال رقم صحيح'
  },

  min_length: {
    validate: (val, rule) => {
      if (!val || !val.trim()) return true;
      return val.trim().length >= (rule.value || 0);
    },
    message: (label, rule) => `${label} يجب أن يكون ${rule.value} أحرف على الأقل`
  },

  max_length: {
    validate: (val, rule) => {
      if (!val) return true;
      return val.length <= (rule.value || Infinity);
    },
    message: (label, rule) => `${label} يجب ألا يتجاوز ${rule.value} حرف`
  },

  pattern: {
    validate: (val, rule) => {
      if (!val || !val.trim()) return true;
      try {
        return new RegExp(rule.value).test(val);
      } catch (e) {
        return true;
      }
    },
    message: (label, rule) => rule.message || `${label} غير مطابق للتنسيق المطلوب`
  },

  range: {
    validate: (val, rule) => {
      if (val === '' || val === undefined || val === null) return true;
      const num = Number(val);
      if (isNaN(num)) return false;
      if (rule.min !== undefined && num < rule.min) return false;
      if (rule.max !== undefined && num > rule.max) return false;
      return true;
    },
    message: (label, rule) => {
      if (rule.min !== undefined && rule.max !== undefined) {
        return `${label} يجب أن يكون بين ${rule.min} و ${rule.max}`;
      }
      if (rule.min !== undefined) return `${label} يجب أن يكون أكبر من ${rule.min}`;
      if (rule.max !== undefined) return `${label} يجب أن يكون أقل من ${rule.max}`;
      return `${label} خارج النطاق المسموح`;
    }
  }
};

/**
 * Validates a single field value against its field definition.
 * 
 * @param {Object} field - Field definition { key, label, type, required, validation }
 * @param {any} value - The current value
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateField(field, value) {
  const errors = [];
  const label = field.label || field.key;

  // 1. Required check
  if (field.required) {
    const reqRule = VALIDATION_RULES.required;
    if (!reqRule.validate(value)) {
      errors.push(reqRule.message(label));
      return { valid: false, errors }; // No point checking further
    }
  }

  // 2. Type-based implicit validation
  const typeValidators = {
    national_id: 'national_id',
    phone: 'phone',
    email: 'email',
    date: 'date',
    number: 'number',
    amount: 'number'
  };

  if (typeValidators[field.type]) {
    const ruleName = typeValidators[field.type];
    const rule = VALIDATION_RULES[ruleName];
    if (rule && !rule.validate(value, {})) {
      errors.push(rule.message(label, {}));
    }
  }

  // 3. Explicit validation rules
  if (field.validation) {
    const validationRules = Array.isArray(field.validation) ? field.validation : [field.validation];
    for (const rule of validationRules) {
      const handler = VALIDATION_RULES[rule.type];
      if (handler && !handler.validate(value, rule)) {
        errors.push(rule.message || handler.message(label, rule));
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates all fields in a formula.
 * Respects conditional field visibility (showWhen).
 * 
 * @param {Array} fields - Field definitions
 * @param {Object} formValues - Current form values
 * @returns {{ valid: boolean, fieldErrors: Object, summary: string[] }}
 */
export function validateAllFields(fields, formValues = {}) {
  const fieldErrors = {};
  const summary = [];

  for (const field of fields) {
    // Skip hidden conditional fields
    if (field.showWhen && !evaluateCondition(field.showWhen, formValues)) {
      continue;
    }

    const value = formValues[field.key];
    const result = validateField(field, value);

    if (!result.valid) {
      fieldErrors[field.key] = result.errors;
      summary.push(...result.errors);
    }
  }

  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
    summary
  };
}

/**
 * Evaluates a showWhen condition against current form values.
 * 
 * @param {Object} condition - { field, operator, value }
 * @param {Object} formValues
 * @returns {boolean}
 */
export function evaluateCondition(condition, formValues = {}) {
  if (!condition || !condition.field) return true;

  const fieldValue = formValues[condition.field];
  const targetValue = condition.value;

  switch (condition.operator) {
    case 'equals':
      return String(fieldValue) === String(targetValue);
    case 'not_equals':
      return String(fieldValue) !== String(targetValue);
    case 'not_empty':
      return fieldValue !== undefined && fieldValue !== null && String(fieldValue).trim() !== '';
    case 'empty':
      return fieldValue === undefined || fieldValue === null || String(fieldValue).trim() === '';
    case 'contains':
      return String(fieldValue || '').includes(String(targetValue));
    case 'in':
      return Array.isArray(targetValue) && targetValue.includes(fieldValue);
    default:
      return true;
  }
}

/**
 * Checks whether a field should currently be displayed based on conditions.
 * 
 * @param {Object} field
 * @param {Object} formValues
 * @returns {boolean}
 */
export function isFieldVisible(field, formValues = {}) {
  if (!field) return false;
  if (field.showWhen) {
    return evaluateCondition(field.showWhen, formValues);
  }
  if (field.depends_on && field.depends_on.field) {
    const parentVal = formValues[field.depends_on.field];
    if (field.depends_on.value !== undefined) {
      return String(parentVal) === String(field.depends_on.value);
    }
    return Boolean(parentVal);
  }
  return true;
}

/**
 * Checks whether a field is currently required.
 * 
 * @param {Object} field
 * @param {Object} formValues
 * @returns {boolean}
 */
export function isFieldRequired(field, formValues = {}) {
  if (!field) return false;
  if (!isFieldVisible(field, formValues)) return false;
  if (field.requiredWhen) {
    return evaluateCondition(field.requiredWhen, formValues);
  }
  return Boolean(field.required);
}

/**
 * Validates the entire formula form and returns an error map.
 * 
 * @param {Object} formula
 * @param {Object} formValues
 * @returns {{ isValid: boolean, errors: Object }}
 */
export function validateFormulaForm(formula, formValues = {}) {
  const fields = formula?.fields || [];
  const errors = {};
  let isValid = true;

  for (const field of fields) {
    if (!isFieldVisible(field, formValues)) continue;

    const val = formValues[field.key];
    const isRequired = isFieldRequired(field, formValues);

    if (isRequired) {
      const isEmpty = val === undefined || val === null || String(val).trim() === '' || (Array.isArray(val) && val.length === 0);
      if (isEmpty) {
        errors[field.key] = `${field.label || 'هذا الحقل'} مطلوب`;
        isValid = false;
        continue;
      }
    }

    const fieldRes = validateField(field, val);
    if (!fieldRes.valid && fieldRes.errors && fieldRes.errors.length > 0) {
      errors[field.key] = fieldRes.errors[0];
      isValid = false;
    }
  }

  return { isValid, errors };
}
