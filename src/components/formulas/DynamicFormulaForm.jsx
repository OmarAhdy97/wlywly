import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  User,
  Users,
  Building,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Eye,
  Edit3
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import DocumentListField from './DocumentListField';
import { buildInitialFormValues } from '../../lib/formulaEngine';

export default function DynamicFormulaForm({
  formula,
  onGenerate,
  onPreview,
  onCancel,
  initialValues = null
}) {
  const { cases, clients, officeProfile } = useData();

  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [formValues, setFormValues] = useState({});
  const [validationErrors, setValidationErrors] = useState([]);
  const [autofillNotice, setAutofillNotice] = useState('');

  // Check if formula has case or client fields
  const hasCaseField = formula?.fields?.some(f => f.type === 'case' || (f.source && f.source.startsWith('case.')));
  const hasClientField = formula?.fields?.some(f => f.type === 'client' || (f.source && f.source.startsWith('client.')));

  // Initialize values
  useEffect(() => {
    if (initialValues && Object.keys(initialValues).length > 0) {
      setFormValues(initialValues);
    } else if (formula) {
      const initVals = buildInitialFormValues(formula, { officeProfile });
      setFormValues(initVals);
    }
  }, [formula, initialValues, officeProfile]);

  // Handle Case Selection and explicit autofill
  const handleCaseChange = (caseId) => {
    setSelectedCaseId(caseId);
    if (!caseId) return;

    const chosenCase = cases.find(c => c.id === caseId);
    if (!chosenCase) return;

    // Autofill ONLY explicitly mapped fields
    const updated = { ...formValues };
    const filledFieldLabels = [];

    formula.fields.forEach(field => {
      if (field.source === 'case.court' && chosenCase.court_name) {
        updated[field.key] = chosenCase.court_name;
        filledFieldLabels.push(field.label);
      }
      if (field.source === 'case.chamber' && chosenCase.court_room) {
        updated[field.key] = chosenCase.court_room;
        filledFieldLabels.push(field.label);
      }
      if (field.source === 'case.number' && chosenCase.case_number) {
        updated[field.key] = chosenCase.case_number;
        filledFieldLabels.push(field.label);
      }
      if (field.source === 'case.year' && chosenCase.case_year) {
        updated[field.key] = String(chosenCase.case_year);
        filledFieldLabels.push(field.label);
      }
      if (field.source === 'case.opponent' && chosenCase.defendant_name) {
        updated[field.key] = chosenCase.defendant_name;
        filledFieldLabels.push(field.label);
      }
      if (field.source === 'client.name' && chosenCase.plaintiff_name) {
        updated[field.key] = chosenCase.plaintiff_name;
        filledFieldLabels.push(field.label);
      }
    });

    setFormValues(updated);

    if (filledFieldLabels.length > 0) {
      setAutofillNotice(`تم تعبئة بيانات القضية تلقائياً (${filledFieldLabels.join('، ')}) ويمكنك تعديل أي بيان بحرية.`);
      setTimeout(() => setAutofillNotice(''), 6000);
    }
  };

  // Handle Client Selection
  const handleClientChange = (clientId) => {
    setSelectedClientId(clientId);
    if (!clientId) return;

    const chosenClient = clients.find(c => c.id === clientId);
    if (!chosenClient) return;

    const updated = { ...formValues };
    const filledFieldLabels = [];

    formula.fields.forEach(field => {
      if ((field.type === 'client' || field.source === 'client.name') && chosenClient.name) {
        updated[field.key] = chosenClient.name;
        filledFieldLabels.push(field.label);
      }
      if (field.source === 'client.national_id' && chosenClient.national_id) {
        updated[field.key] = chosenClient.national_id;
        filledFieldLabels.push(field.label);
      }
      if (field.source === 'client.address' && chosenClient.address) {
        updated[field.key] = chosenClient.address;
        filledFieldLabels.push(field.label);
      }
      if (field.source === 'client.phone' && chosenClient.phone) {
        updated[field.key] = chosenClient.phone;
        filledFieldLabels.push(field.label);
      }
    });

    setFormValues(updated);

    if (filledFieldLabels.length > 0) {
      setAutofillNotice(`تم تعبئة بيانات الموكل تلقائياً (${filledFieldLabels.join('، ')}) ويمكنك تعديلها.`);
      setTimeout(() => setAutofillNotice(''), 5000);
    }
  };

  const handleInputChange = (key, val) => {
    setFormValues(prev => ({
      ...prev,
      [key]: val
    }));
    // Clear validation error for this key
    setValidationErrors(prev => prev.filter(k => k !== key));
  };

  const validateForm = () => {
    const errors = [];
    (formula.fields || []).forEach(f => {
      if (f.required) {
        const val = formValues[f.key];
        const isEmpty = val === undefined || val === null || String(val).trim() === '' || (Array.isArray(val) && val.length === 0);
        if (isEmpty) {
          errors.push(f.key);
        }
      }
    });
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    onGenerate(formValues, {
      selectedCaseId,
      selectedClientId
    });
  };

  const handleTriggerPreview = () => {
    if (!validateForm()) return;
    onPreview(formValues, {
      selectedCaseId,
      selectedClientId
    });
  };

  // Extract unique opponent names from existing cases for smart autocomplete
  const existingOpponents = Array.from(new Set(cases.map(c => c.defendant_name).filter(Boolean)));

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        background: 'var(--bg-card)',
        padding: '1.25rem 1.5rem',
        borderRadius: 'var(--radius-lg, 12px)',
        border: '1px solid var(--border-color)',
        marginBottom: '1.25rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span className="badge" style={{ background: 'var(--primary-100)', color: 'var(--primary-800)' }}>
                {formula.category}
              </span>
              <span className="badge" style={{ background: 'var(--bg-card-subtle)', color: 'var(--text-muted)' }}>
                {formula.type === 'checklist' ? 'قائمة تجهيز وإرشادات' : 'صيغة قانونية'}
              </span>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
              إعداد: {formula.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary btn-sm"
          >
            ← العودة للصيغ
          </button>
        </div>

        {formula.description && (
          <p style={{ margin: '0.75rem 0 0 0', fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
            {formula.description}
          </p>
        )}
      </div>

      {/* Auto-fill Notice Banner */}
      {autofillNotice && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          background: 'rgba(55, 4, 10, 0.08)',
          border: '1px solid var(--accent-gold)',
          color: 'var(--primary-800)',
          marginBottom: '1.25rem',
          fontSize: '0.88rem'
        }}>
          <Sparkles size={18} style={{ color: 'var(--accent-gold)', flexShrink: 0 }} />
          <span>{autofillNotice}</span>
        </div>
      )}

      {/* Main Dynamic Form */}
      <form onSubmit={handleSubmit}>
        <div style={{
          background: 'var(--bg-card)',
          padding: '1.5rem',
          borderRadius: 'var(--radius-lg, 12px)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          marginBottom: '1.25rem'
        }}>
          {/* Quick Selectors for Existing Office Entities */}
          {(hasCaseField || hasClientField) && (
            <div style={{
              background: 'var(--bg-card-subtle, #f9f9fa)',
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              marginBottom: '1.5rem',
              display: 'grid',
              gridTemplateColumns: hasCaseField && hasClientField ? '1fr 1fr' : '1fr',
              gap: '1rem'
            }}>
              {/* Optional Case Selector */}
              {hasCaseField && (
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.4rem' }}>
                    <Briefcase size={16} style={{ color: 'var(--primary-700)' }} />
                    <span>ربط بقضية مسجلة (اختياري - لملء البيانات تلقائياً):</span>
                  </label>
                  <select
                    className="form-control"
                    value={selectedCaseId}
                    onChange={(e) => handleCaseChange(e.target.value)}
                    style={{ fontSize: '0.85rem' }}
                  >
                    <option value="">-- اختر من قضايا المكتب المسجلة --</option>
                    {cases.map(c => (
                      <option key={c.id} value={c.id}>
                        قضية {c.case_number || 'بدون رقم'} لسنة {c.case_year || ''} - {c.court_name || ''} ({c.plaintiff_name || 'بدون موكل'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Optional Client Selector */}
              {hasClientField && (
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.4rem' }}>
                    <User size={16} style={{ color: 'var(--primary-700)' }} />
                    <span>اختيار الموكل من الدليل (اختياري):</span>
                  </label>
                  <select
                    className="form-control"
                    value={selectedClientId}
                    onChange={(e) => handleClientChange(e.target.value)}
                    style={{ fontSize: '0.85rem' }}
                  >
                    <option value="">-- اختر من قائمة موكلي المكتب --</option>
                    {clients.map(cl => (
                      <option key={cl.id} value={cl.id}>
                        {cl.name} {cl.phone ? `(${cl.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Form Fields Rendered from Metadata */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            {(formula.fields || []).map(field => {
              const hasError = validationErrors.includes(field.key);
              const val = formValues[field.key] || '';

              // Document list special repeating field
              if (field.type === 'document_list') {
                return (
                  <div key={field.key}>
                    <DocumentListField
                      value={formValues[field.key]}
                      onChange={(newVal) => handleInputChange(field.key, newVal)}
                      label={field.label}
                    />
                    {hasError && (
                      <span style={{ color: 'var(--danger)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
                        <AlertCircle size={14} />
                        يرجى إضافة مستند واحد على الأقل بالحافظة
                      </span>
                    )}
                  </div>
                );
              }

              // Textarea
              if (field.type === 'textarea') {
                return (
                  <div key={field.key} className="form-group" style={{ margin: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.88rem' }}>
                      <span>{field.label}</span>
                      {field.required && <span style={{ color: 'var(--danger)' }}>*</span>}
                    </label>
                    <textarea
                      rows={3}
                      className={`form-control ${hasError ? 'is-invalid' : ''}`}
                      placeholder={field.placeholder || `أدخل ${field.label}...`}
                      value={val}
                      onChange={(e) => handleInputChange(field.key, e.target.value)}
                      style={{ fontSize: '0.9rem', lineHeight: '1.6' }}
                    />
                    {hasError && (
                      <span style={{ color: 'var(--danger)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
                        <AlertCircle size={14} />
                        هذا الحقل إلزامي
                      </span>
                    )}
                  </div>
                );
              }

              // Opponent Field: allows selection from existing opponents OR manual text
              if (field.type === 'opponent') {
                return (
                  <div key={field.key} className="form-group" style={{ margin: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.88rem' }}>
                      <span>{field.label}</span>
                      {field.required && <span style={{ color: 'var(--danger)' }}>*</span>}
                    </label>
                    <input
                      type="text"
                      list={`list_${field.key}`}
                      className={`form-control ${hasError ? 'is-invalid' : ''}`}
                      placeholder={field.placeholder || 'اكتب اسم الخصم أو اختر من القضايا السابقة...'}
                      value={val}
                      onChange={(e) => handleInputChange(field.key, e.target.value)}
                    />
                    {existingOpponents.length > 0 && (
                      <datalist id={`list_${field.key}`}>
                        {existingOpponents.map((op, i) => (
                          <option key={i} value={op} />
                        ))}
                      </datalist>
                    )}
                    {hasError && (
                      <span style={{ color: 'var(--danger)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
                        <AlertCircle size={14} />
                        يرجى إدخال اسم الخصم
                      </span>
                    )}
                  </div>
                );
              }

              // Standard inputs (text, date, number, court, client)
              return (
                <div key={field.key} className="form-group" style={{ margin: 0 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.88rem' }}>
                    <span>{field.label}</span>
                    {field.required && <span style={{ color: 'var(--danger)' }}>*</span>}
                  </label>
                  <input
                    type={field.type === 'date' ? 'date' : (field.type === 'number' ? 'number' : 'text')}
                    className={`form-control ${hasError ? 'is-invalid' : ''}`}
                    placeholder={field.placeholder || `أدخل ${field.label}...`}
                    value={val}
                    onChange={(e) => handleInputChange(field.key, e.target.value)}
                    style={{ fontSize: '0.9rem' }}
                  />
                  {hasError && (
                    <span style={{ color: 'var(--danger)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
                      <AlertCircle size={14} />
                      هذا الحقل إلزامي
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Validation Alert */}
        {validationErrors.length > 0 && (
          <div style={{
            background: 'var(--status-dismissed-bg, rgba(220, 38, 38, 0.1))',
            color: 'var(--danger, #dc2626)',
            padding: '0.85rem 1rem',
            borderRadius: '8px',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.88rem'
          }}>
            <AlertCircle size={18} />
            <span>يرجى إكمال الحقول الإلزامية المشار إليها باللون الأحمر قبل إنشاء المستند.</span>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          padding: '0.5rem 0'
        }}>
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary"
          >
            إلغاء
          </button>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={handleTriggerPreview}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Eye size={16} />
              <span>معاينة المستند</span>
            </button>

            <button
              type="submit"
              className="btn btn-gold"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 'bold' }}
            >
              <Edit3 size={16} />
              <span>إنشاء المستند وفتح المحرر ←</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
