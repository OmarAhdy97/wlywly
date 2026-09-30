import React, { useState, useEffect, useMemo } from 'react';
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
  Edit3,
  HelpCircle,
  DollarSign
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import DocumentListField from './DocumentListField';
import { buildInitialFormValues } from '../../lib/formulaEngine';
import { validateFormulaForm, isFieldVisible, isFieldRequired } from '../../lib/fieldValidation';
import { numberToArabicWords, formatCurrencyToArabic } from '../../lib/numberToArabicWords';
import { EGYPTIAN_COURTS, searchCourts, getChambersForCourt } from '../../lib/courtsData';

export default function DynamicFormulaForm({
  formula,
  onGenerate,
  onPreview,
  onCancel,
  initialValues = null
}) {
  const { cases = [], clients = [], officeProfile = {} } = useData();

  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [formValues, setFormValues] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [autofillNotice, setAutofillNotice] = useState('');
  const [autoFilledFields, setAutoFilledFields] = useState(new Set());

  // Check if formula interacts with case or client entities
  const hasCaseField = useMemo(() => {
    return formula?.fields?.some(f => f.type === 'case' || f.type === 'court' || (f.source && f.source.startsWith('case.')));
  }, [formula]);

  const hasClientField = useMemo(() => {
    return formula?.fields?.some(f => f.type === 'client' || (f.source && f.source.startsWith('client.')));
  }, [formula]);

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

    const updated = { ...formValues };
    const filledLabels = [];
    const newAutoFilled = new Set(autoFilledFields);

    (formula.fields || []).forEach(field => {
      let val = null;
      if (field.source === 'case.court' && chosenCase.court_name) val = chosenCase.court_name;
      else if (field.source === 'case.chamber' && chosenCase.court_room) val = chosenCase.court_room;
      else if (field.source === 'case.number' && chosenCase.case_number) val = chosenCase.case_number;
      else if (field.source === 'case.year' && chosenCase.case_year) val = String(chosenCase.case_year);
      else if (field.source === 'case.opponent' && chosenCase.defendant_name) val = chosenCase.defendant_name;
      else if (field.source === 'client.name' && chosenCase.plaintiff_name) val = chosenCase.plaintiff_name;

      if (val !== null && val !== undefined) {
        updated[field.key] = val;
        filledLabels.push(field.label);
        newAutoFilled.add(field.key);
      }
    });

    setFormValues(updated);
    setAutoFilledFields(newAutoFilled);

    // Clear validation errors for filled fields
    setFieldErrors(prev => {
      const next = { ...prev };
      filledLabels.forEach(l => {
        const f = formula.fields.find(x => x.label === l);
        if (f) delete next[f.key];
      });
      return next;
    });

    if (filledLabels.length > 0) {
      setAutofillNotice(`تم تعبئة بيانات القضية تلقائياً (${filledLabels.join('، ')}) ويمكنك تعديل أي بيان بحرية.`);
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
    const filledLabels = [];
    const newAutoFilled = new Set(autoFilledFields);

    (formula.fields || []).forEach(field => {
      let val = null;
      if ((field.type === 'client' || field.source === 'client.name') && chosenClient.name) {
        val = chosenClient.name;
      } else if (field.source === 'client.national_id' && chosenClient.national_id) {
        val = chosenClient.national_id;
      } else if (field.source === 'client.address' && chosenClient.address) {
        val = chosenClient.address;
      } else if (field.source === 'client.phone' && chosenClient.phone) {
        val = chosenClient.phone;
      }

      if (val !== null && val !== undefined) {
        updated[field.key] = val;
        filledLabels.push(field.label);
        newAutoFilled.add(field.key);
      }
    });

    setFormValues(updated);
    setAutoFilledFields(newAutoFilled);

    if (filledLabels.length > 0) {
      setAutofillNotice(`تم تعبئة بيانات الموكل تلقائياً (${filledLabels.join('، ')}) ويمكنك تعديلها.`);
      setTimeout(() => setAutofillNotice(''), 5000);
    }
  };

  // Input change handler
  const handleInputChange = (key, rawVal) => {
    setFormValues(prev => ({
      ...prev,
      [key]: rawVal
    }));

    // Remove field error when user edits
    if (fieldErrors[key]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  // Validate entire form using fieldValidation.js
  const validateCurrentForm = () => {
    const { isValid, errors } = validateFormulaForm(formula, formValues);
    setFieldErrors(errors);
    return isValid;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateCurrentForm()) return;
    onGenerate(formValues, {
      selectedCaseId,
      selectedClientId
    });
  };

  const handleTriggerPreview = () => {
    if (!validateCurrentForm()) return;
    onPreview(formValues, {
      selectedCaseId,
      selectedClientId
    });
  };

  // Opponents from existing cases for smart auto-completion
  const existingOpponents = useMemo(() => {
    return Array.from(new Set(cases.map(c => c.defendant_name).filter(Boolean)));
  }, [cases]);

  // Clients list for autocomplete
  const clientNames = useMemo(() => {
    return clients.map(c => c.name).filter(Boolean);
  }, [clients]);

  // Active visible fields according to conditional logic
  const visibleFields = useMemo(() => {
    return (formula?.fields || []).filter(f => isFieldVisible(f, formValues));
  }, [formula, formValues]);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Header Card */}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
              <span className="badge" style={{ background: 'var(--primary-100)', color: 'var(--primary-800)', fontWeight: '700' }}>
                {formula?.category}
              </span>
              {formula?.legal_area && (
                <span className="badge" style={{ background: 'rgba(13, 148, 136, 0.1)', color: '#0d9488' }}>
                  فرع: {formula.legal_area}
                </span>
              )}
              <span className="badge" style={{ background: 'var(--bg-card-subtle)', color: 'var(--text-muted)' }}>
                {formula?.type === 'checklist' ? 'قائمة تجهيز وإرشادات' : 'صيغة قانونية'}
              </span>
              {formula?.jurisdiction && (
                <span className="badge" style={{ background: 'rgba(37, 99, 235, 0.08)', color: '#2563eb' }}>
                  الاختصاص: {formula.jurisdiction}
                </span>
              )}
            </div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
              إعداد: {formula?.title}
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

        {formula?.description && (
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
          background: 'rgba(197, 160, 89, 0.15)',
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
                    <span>ربط بقضية مسجلة (اختياري - لملء المحكمة والخصوم ورقم القضية):</span>
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
                    <span>اختيار الموكل من الدليل (اختياري - لملء الاسم والرقم القومي والعنوان):</span>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {visibleFields.map(field => {
              const errorMsg = fieldErrors[field.key];
              const isRequired = isFieldRequired(field, formValues);
              const val = formValues[field.key] !== undefined ? formValues[field.key] : '';
              const isAutoFilled = autoFilledFields.has(field.key);

              // 1. Document list special repeating field
              if (field.type === 'document_list') {
                return (
                  <div key={field.key}>
                    <DocumentListField
                      value={formValues[field.key]}
                      onChange={(newVal) => handleInputChange(field.key, newVal)}
                      label={field.label}
                    />
                    {errorMsg && (
                      <span style={{ color: 'var(--danger)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.3rem' }}>
                        <AlertCircle size={14} />
                        {errorMsg}
                      </span>
                    )}
                  </div>
                );
              }

              // 2. Textarea
              if (field.type === 'textarea') {
                return (
                  <div key={field.key} className="form-group" style={{ margin: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: '600', margin: 0, fontSize: '0.88rem' }}>
                        <span>{field.label}</span>
                        {isRequired && <span style={{ color: 'var(--danger)' }}>*</span>}
                      </label>
                      {isAutoFilled && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <Sparkles size={12} /> معبأ تلقائياً
                        </span>
                      )}
                    </div>
                    <textarea
                      rows={3}
                      className={`form-control ${errorMsg ? 'is-invalid' : ''}`}
                      placeholder={field.placeholder || `أدخل ${field.label}...`}
                      value={val}
                      onChange={(e) => handleInputChange(field.key, e.target.value)}
                      style={{ fontSize: '0.9rem', lineHeight: '1.6' }}
                    />
                    {field.description && (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.2rem' }}>
                        {field.description}
                      </span>
                    )}
                    {errorMsg && (
                      <span style={{ color: 'var(--danger)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.25rem' }}>
                        <AlertCircle size={14} />
                        {errorMsg}
                      </span>
                    )}
                  </div>
                );
              }

              // 3. Dropdown / Select Field
              if (field.type === 'select') {
                const options = field.options || [];
                return (
                  <div key={field.key} className="form-group" style={{ margin: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: '600', marginBottom: '0.35rem', fontSize: '0.88rem' }}>
                      <span>{field.label}</span>
                      {isRequired && <span style={{ color: 'var(--danger)' }}>*</span>}
                    </label>
                    <select
                      className={`form-control ${errorMsg ? 'is-invalid' : ''}`}
                      value={val}
                      onChange={(e) => handleInputChange(field.key, e.target.value)}
                      style={{ fontSize: '0.9rem' }}
                    >
                      <option value="">-- اختر {field.label} --</option>
                      {options.map((opt, idx) => {
                        const optValue = typeof opt === 'object' ? opt.value : opt;
                        const optLabel = typeof opt === 'object' ? opt.label : opt;
                        return (
                          <option key={idx} value={optValue}>
                            {optLabel}
                          </option>
                        );
                      })}
                    </select>
                    {errorMsg && (
                      <span style={{ color: 'var(--danger)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.25rem' }}>
                        <AlertCircle size={14} />
                        {errorMsg}
                      </span>
                    )}
                  </div>
                );
              }

              // 4. Radio Group
              if (field.type === 'radio') {
                const options = field.options || [];
                return (
                  <div key={field.key} className="form-group" style={{ margin: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: '600', marginBottom: '0.45rem', fontSize: '0.88rem' }}>
                      <span>{field.label}</span>
                      {isRequired && <span style={{ color: 'var(--danger)' }}>*</span>}
                    </label>
                    <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                      {options.map((opt, idx) => {
                        const optValue = typeof opt === 'object' ? opt.value : opt;
                        const optLabel = typeof opt === 'object' ? opt.label : opt;
                        const isChecked = String(val) === String(optValue);
                        return (
                          <label key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                            <input
                              type="radio"
                              name={field.key}
                              value={optValue}
                              checked={isChecked}
                              onChange={() => handleInputChange(field.key, optValue)}
                            />
                            <span>{optLabel}</span>
                          </label>
                        );
                      })}
                    </div>
                    {errorMsg && (
                      <span style={{ color: 'var(--danger)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.25rem' }}>
                        <AlertCircle size={14} />
                        {errorMsg}
                      </span>
                    )}
                  </div>
                );
              }

              // 5. Checkbox Field
              if (field.type === 'checkbox') {
                return (
                  <div key={field.key} className="form-group" style={{ margin: 0 }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(val)}
                        onChange={(e) => handleInputChange(field.key, e.target.checked)}
                      />
                      <span>{field.label}</span>
                      {isRequired && <span style={{ color: 'var(--danger)' }}>*</span>}
                    </label>
                    {field.description && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginRight: '1.5rem' }}>
                        {field.description}
                      </div>
                    )}
                    {errorMsg && (
                      <span style={{ color: 'var(--danger)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.25rem' }}>
                        <AlertCircle size={14} />
                        {errorMsg}
                      </span>
                    )}
                  </div>
                );
              }

              // 6. Court Field (Egyptian Court Autocomplete & Hierarchy)
              if (field.type === 'court' || field.key.includes('court') || field.label.includes('محكمة')) {
                return (
                  <div key={field.key} className="form-group" style={{ margin: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: '600', margin: 0, fontSize: '0.88rem' }}>
                        <Building size={15} style={{ color: 'var(--primary-700)' }} />
                        <span>{field.label}</span>
                        {isRequired && <span style={{ color: 'var(--danger)' }}>*</span>}
                      </label>
                      {isAutoFilled && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <Sparkles size={12} /> معبأ من القضية
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      list={`court_list_${field.key}`}
                      className={`form-control ${errorMsg ? 'is-invalid' : ''}`}
                      placeholder={field.placeholder || 'اختر من دليل المحاكم المصرية أو اكتب اسم المحكمة...'}
                      value={val}
                      onChange={(e) => handleInputChange(field.key, e.target.value)}
                    />
                    <datalist id={`court_list_${field.key}`}>
                      {EGYPTIAN_COURTS.map(c => (
                        <option key={c.id} value={c.name}>
                          {c.governorate ? `[${c.governorate}] ` : ''}{c.city ? `(${c.city})` : ''}
                        </option>
                      ))}
                    </datalist>
                    {errorMsg && (
                      <span style={{ color: 'var(--danger)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.25rem' }}>
                        <AlertCircle size={14} />
                        {errorMsg}
                      </span>
                    )}
                  </div>
                );
              }

              // 7. Client Field: allows selection from registered clients OR manual text
              if (field.type === 'client') {
                return (
                  <div key={field.key} className="form-group" style={{ margin: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: '600', margin: 0, fontSize: '0.88rem' }}>
                        <User size={15} style={{ color: 'var(--primary-700)' }} />
                        <span>{field.label}</span>
                        {isRequired && <span style={{ color: 'var(--danger)' }}>*</span>}
                      </label>
                      {isAutoFilled && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <Sparkles size={12} /> معبأ تلقائياً
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      list={`client_list_${field.key}`}
                      className={`form-control ${errorMsg ? 'is-invalid' : ''}`}
                      placeholder={field.placeholder || 'اكتب اسم الموكل أو اختر من دليل الموكلين...'}
                      value={val}
                      onChange={(e) => handleInputChange(field.key, e.target.value)}
                    />
                    {clientNames.length > 0 && (
                      <datalist id={`client_list_${field.key}`}>
                        {clientNames.map((cn, i) => (
                          <option key={i} value={cn} />
                        ))}
                      </datalist>
                    )}
                    {errorMsg && (
                      <span style={{ color: 'var(--danger)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.25rem' }}>
                        <AlertCircle size={14} />
                        {errorMsg}
                      </span>
                    )}
                  </div>
                );
              }

              // 8. Opponent Field: allows selection from existing opponents OR manual text
              if (field.type === 'opponent') {
                return (
                  <div key={field.key} className="form-group" style={{ margin: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: '600', margin: 0, fontSize: '0.88rem' }}>
                        <Users size={15} style={{ color: 'var(--primary-700)' }} />
                        <span>{field.label}</span>
                        {isRequired && <span style={{ color: 'var(--danger)' }}>*</span>}
                      </label>
                      {isAutoFilled && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <Sparkles size={12} /> معبأ من القضية
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      list={`list_${field.key}`}
                      className={`form-control ${errorMsg ? 'is-invalid' : ''}`}
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
                    {errorMsg && (
                      <span style={{ color: 'var(--danger)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.25rem' }}>
                        <AlertCircle size={14} />
                        {errorMsg}
                      </span>
                    )}
                  </div>
                );
              }

              // 9. Numeric Field with live Arabic تفقيط preview
              const isAmountField = field.type === 'number' ||
                field.key.includes('amount') ||
                field.key.includes('price') ||
                field.key.includes('fee') ||
                field.key.includes('rent') ||
                field.label.includes('مبلغ') ||
                field.label.includes('قيمة') ||
                field.label.includes('أجرة');

              let tafqeetText = '';
              if (isAmountField && val && !isNaN(Number(val)) && Number(val) > 0) {
                try {
                  tafqeetText = formatCurrencyToArabic(Number(val), 'جنيه مصري');
                } catch (e) {}
              }

              // Standard inputs (text, date, number, phone, email, etc.)
              return (
                <div key={field.key} className="form-group" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: '600', margin: 0, fontSize: '0.88rem' }}>
                      {field.type === 'date' && <Calendar size={15} style={{ color: 'var(--primary-700)' }} />}
                      <span>{field.label}</span>
                      {isRequired && <span style={{ color: 'var(--danger)' }}>*</span>}
                    </label>
                    {isAutoFilled && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Sparkles size={12} /> معبأ تلقائياً
                      </span>
                    )}
                  </div>
                  <input
                    type={field.type === 'date' ? 'date' : (field.type === 'number' ? 'number' : 'text')}
                    className={`form-control ${errorMsg ? 'is-invalid' : ''}`}
                    placeholder={field.placeholder || `أدخل ${field.label}...`}
                    value={val}
                    onChange={(e) => handleInputChange(field.key, e.target.value)}
                    style={{ fontSize: '0.9rem' }}
                  />

                  {/* Live Tafqeet for amounts */}
                  {tafqeetText && (
                    <div style={{
                      marginTop: '0.35rem',
                      padding: '0.35rem 0.65rem',
                      borderRadius: '6px',
                      background: 'rgba(197, 160, 89, 0.12)',
                      border: '1px solid rgba(197, 160, 89, 0.3)',
                      fontSize: '0.82rem',
                      color: 'var(--primary-800)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}>
                      <DollarSign size={14} style={{ color: 'var(--accent-gold)' }} />
                      <span><strong>التفقيط المعتمد:</strong> {tafqeetText}</span>
                    </div>
                  )}

                  {field.description && (
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.2rem' }}>
                      {field.description}
                    </span>
                  )}
                  {errorMsg && (
                    <span style={{ color: 'var(--danger)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.25rem' }}>
                      <AlertCircle size={14} />
                      {errorMsg}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Validation Alert */}
        {Object.keys(fieldErrors).length > 0 && (
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
            <span>يرجى إكمال وتصحيح الحقول المشار إليها باللون الأحمر أعلاه قبل المتابعة.</span>
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
