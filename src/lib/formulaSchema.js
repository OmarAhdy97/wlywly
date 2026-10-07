/**
 * Formula Schema — Normalization & Adapter Layer
 * 
 * Provides runtime normalization for the 236 legacy formulas AND
 * full schema support for new formulas. Zero changes to legal_formulas.json.
 * 
 * Every formula passes through normalizeFormula() at load time,
 * ensuring all components receive a consistent data shape.
 */

import { inferLegalArea } from './legalCategories.js';

/** Default legal disclaimer for generated documents */
export const DEFAULT_DISCLAIMER = 'هذه الصيغة نموذج استرشادي ويجب مراجعتها وتعديلها بما يتناسب مع ظروف الحالة والوقائع والقواعد القانونية السارية.';

/**
 * Normalizes a raw formula from legal_formulas.json (or new schema)
 * into the unified schema. Safe for all 236 existing formulas.
 * 
 * @param {Object} raw - The raw formula object
 * @returns {Object} Normalized formula with all required fields
 */
export function normalizeFormula(raw) {
  if (!raw) return null;

  return {
    // ─── Preserved existing fields ───
    id: raw.id,
    title: raw.title || '',
    category: raw.category || '',
    type: raw.type || 'formula',
    description: raw.description || '',
    keywords: raw.keywords || [],
    source_content: raw.source_content || '',
    template_content: raw.template_content || '',
    link: raw.link || null,
    published: raw.published || null,

    // ─── New metadata fields (safe defaults) ───
    version: raw.version || '1.0',
    jurisdiction: raw.jurisdiction || 'مصر',
    legal_area: raw.legal_area || inferLegalArea(raw.category),
    legal_sources: raw.legal_sources || [],
    last_reviewed_at: raw.last_reviewed_at || null,
    reviewed_by: raw.reviewed_by || null,
    created_at: raw.created_at || raw.published || null,
    status: raw.status || 'active',
    disclaimer: raw.disclaimer || DEFAULT_DISCLAIMER,

    // ─── Court-paper layout (v2 formulas) ───
    layout: raw.layout || 'plain',          // 'announcement' | 'petition' | 'contract' | 'plain'
    subject: raw.subject || null,           // text of the «الموضوع» side box
    legal_basis: raw.legal_basis || [],     // [{ law, article, text }]
    sources: raw.sources || [],             // provenance of the wording

    // ─── Normalized fields ───
    fields: (raw.fields || []).map(normalizeField),
  };
}

/**
 * Normalizes a single field definition.
 * Adds new optional properties with safe defaults.
 * 
 * @param {Object} raw - Raw field object
 * @returns {Object} Normalized field
 */
export function normalizeField(raw) {
  if (!raw) return raw;

  return {
    // ─── Preserved existing properties ───
    key: raw.key,
    label: raw.label || raw.key,
    type: raw.type || 'text',
    required: raw.required || false,
    source: raw.source || null,
    placeholder: raw.placeholder || null,
    defaultValue: raw.defaultValue !== undefined ? raw.defaultValue : null,

    // ─── New properties (safe defaults) ───
    options: raw.options || null,       // For select/radio/checkbox: [{ label, value }]
    showWhen: raw.showWhen || null,     // Conditional visibility rule
    validation: raw.validation || null, // Explicit validation rules
    group: raw.group || null,           // Field group name
    hint: raw.hint || null,             // Helper text
  };
}

/**
 * Normalizes an entire formulas catalog at load time.
 * 
 * @param {Array} rawFormulas - The raw JSON array
 * @returns {Array} Normalized formulas
 */
export function normalizeFormulaCatalog(rawFormulas) {
  if (!Array.isArray(rawFormulas)) return [];
  return rawFormulas.map(normalizeFormula).filter(Boolean);
}

/**
 * Extracts all unique placeholder keys from a template string.
 * 
 * @param {string} template
 * @returns {string[]} Array of placeholder keys (without {{ }})
 */
export function extractPlaceholders(template) {
  if (!template) return [];
  const matches = template.match(/\{\{([a-zA-Z0-9_.-]+)\}\}/g) || [];
  return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))];
}

/**
 * Checks if a formula's template placeholders are all covered by its fields
 * or known built-in keys.
 * 
 * @param {Object} formula - Normalized formula
 * @returns {{ valid: boolean, unmapped: string[], builtIn: string[] }}
 */
export function auditPlaceholders(formula) {
  const builtInKeys = new Set([
    'documents_table', 'lawyer_name', 'lawyer_office',
    'office.name', 'office.lawyer_name', 'office.address', 'office.phone',
    'client.name', 'client.national_id', 'client.address', 'client.phone',
    'opponent.name', 'opponent.address',
    'case.number', 'case.year', 'case.court', 'case.chamber', 'case.type',
    'system.today', 'document.date'
  ]);

  const template = formula.template_content || formula.source_content || '';
  const placeholders = extractPlaceholders(template);
  const fieldKeys = new Set((formula.fields || []).map(f => f.key));

  const unmapped = [];
  const builtIn = [];

  for (const p of placeholders) {
    if (fieldKeys.has(p)) continue;
    if (builtInKeys.has(p)) {
      builtIn.push(p);
    } else {
      unmapped.push(p);
    }
  }

  return {
    valid: unmapped.length === 0,
    unmapped,
    builtIn
  };
}

/**
 * Creates a snapshot of formula metadata to store with generated documents.
 * This ensures documents track which formula version was used.
 * 
 * @param {Object} formula - Normalized formula
 * @returns {Object} Minimal snapshot
 */
export function createFormulaSnapshot(formula) {
  return {
    formulaId: formula.id,
    formulaTitle: formula.title,
    formulaVersion: formula.version || '1.0',
    formulaCategory: formula.category,
    jurisdiction: formula.jurisdiction,
    legal_area: formula.legal_area,
    snapshotAt: new Date().toISOString()
  };
}

/**
 * Document status constants.
 */
export const DOCUMENT_STATUS = {
  DRAFT: 'draft',
  GENERATED: 'generated',
  EDITED: 'edited',
  FINAL: 'final',
  ARCHIVED: 'archived'
};

/**
 * Checks if a formula is a legacy un-versioned formula.
 * @param {Object} formula
 * @returns {boolean}
 */
export function isLegacyFormula(formula) {
  return !formula?.version || formula.version === '1.0';
}
