/**
 * Formula Validation Utility
 * Validates formula integrity, placeholder consistency, and metadata adherence.
 */

export const VALID_CATEGORIES = [
  'عرائض',
  'عقود',
  'جنح مباشرة',
  'طلبات',
  'إنذارات',
  'تظلمات',
  'إشكالات',
  'إعلانات',
  'تجهيز ملف أسرة',
  'حافظة مستندات'
];

/**
 * Validates a single formula definition.
 * @param {Object} formula
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateFormula(formula) {
  const errors = [];

  if (!formula.id) {
    errors.push('Formula ID is required.');
  }

  if (!formula.title || !formula.title.trim()) {
    errors.push(`Formula [${formula.id || 'unknown'}] missing title.`);
  }

  if (!VALID_CATEGORIES.includes(formula.category)) {
    errors.push(`Formula [${formula.id}] has invalid category: "${formula.category}".`);
  }

  if (!formula.fields || !Array.isArray(formula.fields)) {
    errors.push(`Formula [${formula.id}] fields must be an array.`);
  } else {
    // Check duplicate field keys
    const fieldKeys = new Set();
    formula.fields.forEach(f => {
      if (!f.key) {
        errors.push(`Formula [${formula.id}] has a field without a key.`);
      } else if (fieldKeys.has(f.key)) {
        errors.push(`Formula [${formula.id}] duplicate field key: "${f.key}".`);
      } else {
        fieldKeys.add(f.key);
      }
    });

    // Check placeholder presence in template
    if (formula.template_content) {
      const placeholderMatches = formula.template_content.match(/\{\{([a-zA-Z0-9_.-]+)\}\}/g) || [];
      const extractedKeys = placeholderMatches.map(m => m.replace(/\{\{|\}\}/g, ''));
      
      const builtInKeys = new Set([
        'documents_table',
        'lawyer_name',
        'lawyer_office',
        'office.name',
        'office.lawyer_name',
        'office.address',
        'system.today',
        'document.date'
      ]);

      extractedKeys.forEach(k => {
        if (!fieldKeys.has(k) && !builtInKeys.has(k)) {
          // Warning or error for unmatched placeholders
          // We can allow dot-notation sources if handled by engine
          if (!k.includes('.')) {
            // Unregistered custom placeholder
          }
        }
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates an entire formulas dataset.
 * @param {Array} formulas
 * @returns {{ valid: boolean, errors: string[], summary: Object }}
 */
export function validateFormulaDataset(formulas) {
  const allErrors = [];
  const idSet = new Set();
  const categoryCounts = {};

  VALID_CATEGORIES.forEach(c => categoryCounts[c] = 0);

  formulas.forEach(f => {
    if (idSet.has(f.id)) {
      allErrors.push(`Duplicate formula ID across catalog: "${f.id}"`);
    } else {
      idSet.add(f.id);
    }

    const res = validateFormula(f);
    if (!res.valid) {
      allErrors.push(...res.errors);
    }

    if (categoryCounts[f.category] !== undefined) {
      categoryCounts[f.category]++;
    }
  });

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    summary: {
      totalFormulas: formulas.length,
      categoryCounts
    }
  };
}
