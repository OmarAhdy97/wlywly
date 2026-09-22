/**
 * Document Storage Abstraction
 * Handles persistence of generated legal documents, drafts, and user favorites.
 * Seamless Hybrid: Syncs directly with Supabase with multi-tenant RLS + offline localStorage caching.
 */

import { supabase } from './supabase';

function getStorageKey(prefix, userId, tenantId = 'default') {
  const safeUser = userId || 'anonymous';
  const safeTenant = tenantId || 'default';
  return `${prefix}_${safeTenant}_${safeUser}`;
}

/**
 * Retrieves all saved generated documents for the user.
 * Tries Supabase first; falls back to localStorage if offline or table not yet created.
 *
 * @param {string} userId
 * @param {string} tenantId
 * @returns {Promise<Array>} List of document snapshots
 */
export async function getSavedDocuments(userId, tenantId = 'default') {
  const localKey = getStorageKey('saved_legal_docs', userId, tenantId);

  // 1. Try Supabase cloud database
  if (userId) {
    try {
      const { data, error } = await supabase
        .from('generated_documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        // Map Supabase rows to consistent format
        const mapped = data.map(row => ({
          id: row.id,
          formulaId: row.formula_id,
          caseId: row.case_id,
          clientId: row.client_id,
          title: row.title,
          category: row.category,
          content: row.content,
          formValues: row.field_values || {},
          status: row.status || 'draft',
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }));

        // Update local cache
        try {
          localStorage.setItem(localKey, JSON.stringify(mapped));
        } catch (e) {}

        return mapped;
      }
    } catch (err) {
      console.warn('Supabase generated_documents fetch failed, falling back to local storage:', err.message);
    }
  }

  // 2. LocalStorage Fallback
  try {
    const cached = localStorage.getItem(localKey);
    return cached ? JSON.parse(cached) : [];
  } catch (err) {
    console.error('Error reading saved legal documents from localStorage:', err);
    return [];
  }
}

/**
 * Saves or updates a generated legal document snapshot.
 * Persists to Supabase and mirrors to localStorage.
 *
 * @param {Object} documentData - { id, formulaId, title, category, content, formValues, caseId, clientId, status }
 * @param {string} userId
 * @param {string} tenantId
 * @returns {Promise<Object>} The saved document snapshot
 */
export async function saveDocument(documentData, userId, tenantId = 'default') {
  const now = new Date().toISOString();
  const docId = documentData.id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const localKey = getStorageKey('saved_legal_docs', userId, tenantId);

  const snapshot = {
    ...documentData,
    id: docId,
    userId,
    tenantId,
    status: documentData.status || 'draft',
    updatedAt: now,
    createdAt: documentData.createdAt || now
  };

  // 1. Update local storage cache immediately for instant UI responsiveness
  try {
    const cached = localStorage.getItem(localKey);
    const existing = cached ? JSON.parse(cached) : [];
    const index = existing.findIndex(d => d.id === docId);
    let updatedList;
    if (index >= 0) {
      updatedList = [...existing];
      updatedList[index] = snapshot;
    } else {
      updatedList = [snapshot, ...existing];
    }
    localStorage.setItem(localKey, JSON.stringify(updatedList));
  } catch (e) {}

  // 2. Persist to Supabase if authenticated
  if (userId) {
    try {
      const payload = {
        id: docId,
        user_id: userId,
        tenant_id: tenantId || userId,
        formula_id: documentData.formulaId || 'custom',
        case_id: documentData.caseId || null,
        client_id: documentData.clientId || null,
        title: documentData.title || 'مستند قانوني',
        category: documentData.category || 'عرائض',
        content: documentData.content || '',
        field_values: documentData.formValues || {},
        status: documentData.status || 'draft',
        created_by: userId,
        updated_at: now
      };

      const { data, error } = await supabase
        .from('generated_documents')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.warn('Supabase upsert warning for generated_documents:', error.message);
      } else if (data) {
        // Optionally save revision version
        try {
          await supabase.from('generated_document_versions').insert({
            user_id: userId,
            document_id: docId,
            content: documentData.content,
            created_by: userId
          });
        } catch (vErr) {
          // Version history is optional
        }
      }
    } catch (err) {
      console.warn('Could not sync document to Supabase cloud, kept in local storage:', err.message);
    }
  }

  return snapshot;
}

/**
 * Deletes a saved document by ID.
 * @param {string} docId
 * @param {string} userId
 * @param {string} tenantId
 * @returns {Promise<boolean>}
 */
export async function deleteDocument(docId, userId, tenantId = 'default') {
  const localKey = getStorageKey('saved_legal_docs', userId, tenantId);

  // 1. Delete from local cache
  try {
    const cached = localStorage.getItem(localKey);
    if (cached) {
      const existing = JSON.parse(cached);
      const filtered = existing.filter(d => d.id !== docId);
      localStorage.setItem(localKey, JSON.stringify(filtered));
    }
  } catch (e) {}

  // 2. Delete from Supabase
  if (userId) {
    try {
      const { error } = await supabase
        .from('generated_documents')
        .delete()
        .eq('id', docId)
        .eq('user_id', userId);

      if (error) {
        console.warn('Supabase delete warning for generated_documents:', error.message);
      }
    } catch (err) {
      console.warn('Supabase delete error:', err.message);
    }
  }

  return true;
}

/**
 * User favorites management for formulas.
 */
export function getUserFavorites(userId) {
  try {
    const key = `formula_favs_${userId || 'default'}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

export function toggleUserFavorite(formulaId, userId) {
  try {
    const key = `formula_favs_${userId || 'default'}`;
    const favs = getUserFavorites(userId);
    let updated;
    if (favs.includes(formulaId)) {
      updated = favs.filter(id => id !== formulaId);
    } else {
      updated = [...favs, formulaId];
    }
    localStorage.setItem(key, JSON.stringify(updated));
    return updated;
  } catch (e) {
    return [];
  }
}
