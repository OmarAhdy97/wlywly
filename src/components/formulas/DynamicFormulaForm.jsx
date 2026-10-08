import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, FileText, User, Users, Building, AlertCircle, ChevronDown } from 'lucide-react';
import { useData } from '../../context/DataContext';
import DocumentListField from './DocumentListField';
import { buildInitialFormValues } from '../../lib/formulaEngine';
import { validateFormulaForm, isFieldVisible, isFieldRequired } from '../../lib/fieldValidation';
import { numberToArabicWords, formatCurrencyToArabic } from '../../lib/numberToArabicWords';
import { searchCourts, getChambersForCourt } from '../../lib/courtsData';
import Select from '../common/Select';
import CourtInput from '../common/CourtInput';
import { formatEgyptPhone } from '../../lib/phone';

const WEEKDAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
// date field -> the «يوم» field that should follow it automatically
const DAY_PAIRS = { announce_date: 'announce_day', session_date: 'session_day' };
const GROUP_ICONS = { 'بيانات الإعلان': Calendar, 'الطرف الأول': User, 'المحضر': FileText, 'الطرف الثاني': Users, 'الجلسة': Building };

function weekdayOf(isoDate) {
  const d = new Date(`${isoDate}T12:00:00`);
  return Number.isNaN(d.getTime()) ? '' : WEEKDAYS_AR[d.getDay()];
}

// Label row, control, hint and error message shared by every field type.
function Field({ label, required, autoText, error, description, children }) {
  return (
    <div className="form-group ff-field">
      <div className="ff-label-row">
        <label className="ff-label">
          <span>{label}</span>
          {required && <span className="ff-required">*</span>}
        </label>
        {autoText && <span className="ff-auto">{autoText}</span>}
      </div>
      {children}
      {description && <span className="hint">{description}</span>}
      {error && (
        <span className="ff-error" role="alert">
          <AlertCircle size={14} />
          {error}
        </span>
      )}
    </div>
  );
}

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
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

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

    // The case carries the client's name: pull the rest of the client's data from the directory
    const caseClient = clients.find(cl => cl.name && cl.name === chosenCase.plaintiff_name);
    if (caseClient) {
      (formula.fields || []).forEach(field => {
        const map = { 'client.address': caseClient.address, 'client.national_id': caseClient.national_id, 'client.phone': caseClient.phone ? formatEgyptPhone(caseClient.phone) : caseClient.phone };
        const v = map[field.source];
        if (v) {
          updated[field.key] = v;
          filledLabels.push(field.label);
          newAutoFilled.add(field.key);
        }
      });
      setSelectedClientId(caseClient.id);
    }

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
        val = formatEgyptPhone(chosenClient.phone);
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
    setFormValues(prev => {
      const next = { ...prev, [key]: rawVal };
      const dayKey = DAY_PAIRS[key];
      if (dayKey && rawVal && (formula?.fields || []).some(f => f.key === dayKey)) {
        next[dayKey] = weekdayOf(rawVal);
      }
      return next;
    });

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
  const scrollToField = (key) => {
    const wrapper = document.querySelector(`[data-field="${key}"]`);
    if (!wrapper) return;
    // open the group if the user had collapsed it
    const group = wrapper.getAttribute('data-group');
    if (group) setCollapsedGroups(prev => ({ ...prev, [group]: false }));
    setTimeout(() => {
      wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const input = wrapper.querySelector('input, textarea, select');
      if (input) input.focus({ preventScroll: true });
    }, 60);
  };

  const validateCurrentForm = () => {
    const { isValid, errors } = validateFormulaForm(formula, formValues);
    setFieldErrors(errors);
    setSubmitAttempted(true);
    if (!isValid) {
      const firstKey = visibleFields.map(f => f.key).find(k => errors[k]) || Object.keys(errors)[0];
      if (firstKey) scrollToField(firstKey);
    }
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

  // Fields grouped into titled sections; the case/client pickers above replace the raw «case» field
  const groups = useMemo(() => {
    const order = [];
    const map = {};
    visibleFields.forEach(f => {
      if (f.type === 'case') return;
      const title = f.group || 'بيانات الصحيفة';
      if (!map[title]) { map[title] = { title, fields: [] }; order.push(title); }
      map[title].fields.push(f);
    });
    return order.map(t => map[t]);
  }, [visibleFields]);

  const progress = useMemo(() => {
    const all = groups.flatMap(g => g.fields).filter(f => f.type !== 'document_list');
    const isFilled = f => {
      const v = formValues[f.key];
      return !(v === undefined || v === null || String(v).trim() === '');
    };
    const required = all.filter(f => isFieldRequired(f, formValues));
    return {
      filled: all.filter(isFilled).length,
      total: all.length,
      reqFilled: required.filter(isFilled).length,
      reqTotal: required.length
    };
  }, [groups, formValues]);

  const wrapField = (field, groupTitle, node) => (
    <div
      key={field.key}
      data-field={field.key}
      data-group={groupTitle}
      className={`ff-item${fieldErrors[field.key] ? ' ff-item-error' : ''}${['textarea', 'document_list'].includes(field.type) ? ' ff-item-wide' : ''}`}
    >
      {node}
      {field.hint && !fieldErrors[field.key] && <span className="hint">{field.hint}</span>}
    </div>
  );

  const renderField = (field) => {
    const errorMsg = fieldErrors[field.key];
    const isRequired = isFieldRequired(field, formValues);
    const val = formValues[field.key] !== undefined ? formValues[field.key] : '';
    const isAutoFilled = autoFilledFields.has(field.key);
    const autoText = isAutoFilled ? 'معبأ تلقائياً' : '';
    const invalid = errorMsg ? ' is-invalid' : '';
    const set = (v) => handleInputChange(field.key, v);
    const common = { label: field.label, required: isRequired, error: errorMsg };

    if (field.type === 'document_list') {
      return (
        <div>
          <DocumentListField value={formValues[field.key]} onChange={set} label={field.label} />
          {errorMsg && (
            <span className="ff-error" role="alert"><AlertCircle size={14} />{errorMsg}</span>
          )}
        </div>
      );
    }

    if (field.type === 'textarea') {
      return (
        <Field {...common} autoText={autoText} description={field.description}>
          <textarea
            rows={3}
            className={`form-textarea${invalid}`}
            placeholder={field.placeholder || `أدخل ${field.label}`}
            value={val}
            onChange={(e) => set(e.target.value)}
          />
        </Field>
      );
    }

    if (field.type === 'select') {
      return (
        <Field {...common}>
          <Select className={`form-select${invalid}`} value={val} onChange={(e) => set(e.target.value)}>
            <option value="">اختر {field.label}</option>
            {(field.options || []).map((opt, idx) => {
              const optValue = typeof opt === 'object' ? opt.value : opt;
              const optLabel = typeof opt === 'object' ? opt.label : opt;
              return <option key={idx} value={optValue}>{optLabel}</option>;
            })}
          </Select>
        </Field>
      );
    }

    if (field.type === 'radio') {
      return (
        <Field {...common}>
          <div className="ff-radios">
            {(field.options || []).map((opt, idx) => {
              const optValue = typeof opt === 'object' ? opt.value : opt;
              const optLabel = typeof opt === 'object' ? opt.label : opt;
              return (
                <label key={idx} className="ff-choice">
                  <input
                    type="radio"
                    name={field.key}
                    value={optValue}
                    checked={String(val) === String(optValue)}
                    onChange={() => set(optValue)}
                  />
                  <span>{optLabel}</span>
                </label>
              );
            })}
          </div>
        </Field>
      );
    }

    if (field.type === 'checkbox') {
      return (
        <div className="form-group ff-field">
          <label className="ff-choice ff-choice-strong">
            <input type="checkbox" checked={Boolean(val)} onChange={(e) => set(e.target.checked)} />
            <span>{field.label}</span>
            {isRequired && <span className="ff-required">*</span>}
          </label>
          {field.description && <span className="hint">{field.description}</span>}
          {errorMsg && <span className="ff-error" role="alert"><AlertCircle size={14} />{errorMsg}</span>}
        </div>
      );
    }

    if (field.type === 'court' || field.key.includes('court') || field.label.includes('محكمة')) {
      return (
        <Field {...common} autoText={isAutoFilled ? 'معبأ من القضية' : ''}>
          <CourtInput
            className={`form-input${invalid}`}
            placeholder={field.placeholder || 'ابحث في دليل المحاكم أو اكتب اسم المحكمة'}
            value={val}
            onChange={set}
          />
        </Field>
      );
    }

    if (field.type === 'client') {
      return (
        <Field {...common} autoText={autoText}>
          <input
            type="text"
            list={`client_list_${field.key}`}
            className={`form-input${invalid}`}
            placeholder={field.placeholder || 'اكتب اسم الموكل أو اختر من الدليل'}
            value={val}
            onChange={(e) => set(e.target.value)}
          />
          {clientNames.length > 0 && (
            <datalist id={`client_list_${field.key}`}>
              {clientNames.map((cn, i) => <option key={i} value={cn} />)}
            </datalist>
          )}
        </Field>
      );
    }

    if (field.type === 'opponent') {
      return (
        <Field {...common} autoText={isAutoFilled ? 'معبأ من القضية' : ''}>
          <input
            type="text"
            list={`list_${field.key}`}
            className={`form-input${invalid}`}
            placeholder={field.placeholder || 'اكتب اسم الخصم أو اختر من القضايا السابقة'}
            value={val}
            onChange={(e) => set(e.target.value)}
          />
          {existingOpponents.length > 0 && (
            <datalist id={`list_${field.key}`}>
              {existingOpponents.map((op, i) => <option key={i} value={op} />)}
            </datalist>
          )}
        </Field>
      );
    }

    // text / date / number, with a live Arabic spelling of amounts
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
      } catch (e) { /* the amount is shown without its spelling */ }
    }

    return (
      <Field {...common} autoText={autoText} description={field.description}>
        <input
          type={field.type === 'date' ? 'date' : (field.type === 'number' ? 'number' : 'text')}
          className={`form-input${invalid}`}
          placeholder={field.placeholder || `أدخل ${field.label}`}
          value={val}
          onChange={(e) => set(e.target.value)}
        />
        {tafqeetText && (
          <div className="ff-tafqeet"><strong>التفقيط:</strong> {tafqeetText}</div>
        )}
      </Field>
    );
  };

  const allRequiredDone = progress.reqFilled === progress.reqTotal;

  return (
    <div className="ff-page">
      <div className="page-head">
        <div>
          <button type="button" onClick={onCancel} className="formula-back">← العودة للصيغ</button>
          <h1>{formula?.title}</h1>
          <p className="page-sub">
            {[formula?.category, formula?.legal_area && `فرع ${formula.legal_area}`, formula?.jurisdiction && `الاختصاص: ${formula.jurisdiction}`,
              formula?.type === 'checklist' ? 'قائمة تجهيز وإرشادات' : null].filter(Boolean).join(' · ')}
          </p>
          {formula?.description && <p className="ff-desc">{formula.description}</p>}
        </div>
      </div>

      {autofillNotice && <div className="inline-notice" role="status">{autofillNotice}</div>}

      <form onSubmit={handleSubmit}>
        <div className="card ff-card">
          {(hasCaseField || hasClientField) && (
            <div className={`ff-pickers ${hasCaseField && hasClientField ? 'is-two' : ''}`}>
              {hasCaseField && (
                <div className="form-group">
                  <label className="form-label">ربط بقضية مسجلة (اختياري، لملء المحكمة والخصوم ورقم القضية)</label>
                  <Select className="form-select" value={selectedCaseId} onChange={(e) => handleCaseChange(e.target.value)}>
                    <option value="">اختر من قضايا المكتب</option>
                    {cases.map((c) => (
                      <option key={c.id} value={c.id}>
                        قضية {c.case_number || 'بدون رقم'} لسنة {c.case_year || ''} - {c.court_name || ''} ({c.plaintiff_name || 'بدون موكل'})
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              {hasClientField && (
                <div className="form-group">
                  <label className="form-label">اختيار الموكل من الدليل (اختياري، لملء الاسم والرقم القومي والعنوان)</label>
                  <Select className="form-select" value={selectedClientId} onChange={(e) => handleClientChange(e.target.value)}>
                    <option value="">اختر من موكلي المكتب</option>
                    {clients.map((cl) => (
                      <option key={cl.id} value={cl.id}>{cl.name} {cl.phone ? `(${formatEgyptPhone(cl.phone)})` : ''}</option>
                    ))}
                  </Select>
                </div>
              )}
            </div>
          )}

          <div className="ff-progress">
            <div className="ff-progress-text">
              <span>تمت تعبئة {progress.filled} من {progress.total} بيانًا</span>
              <b className={allRequiredDone ? 'is-done' : 'is-todo'}>
                {allRequiredDone ? 'اكتملت البيانات الأساسية' : `البيانات الأساسية: ${progress.reqFilled} من ${progress.reqTotal}`}
              </b>
            </div>
            <div className="ff-progress-bar">
              <div style={{ width: `${progress.total ? Math.round((progress.filled / progress.total) * 100) : 0}%` }} />
            </div>
            <p className="hint">البيانات التي لا تعرفها الآن يمكن تركها فارغة، وستظهر في المستند نقاطًا (……) لتعبئتها بخط اليد أو في المحرر.</p>
          </div>

          <div className="ff-groups">
            {groups.map((g) => {
              const Icon = GROUP_ICONS[g.title] || FileText;
              const collapsed = !!collapsedGroups[g.title];
              const errCount = g.fields.filter((f) => fieldErrors[f.key]).length;
              return (
                <section key={g.title} className="ff-group">
                  <button
                    type="button"
                    className="ff-group-head"
                    onClick={() => setCollapsedGroups((prev) => ({ ...prev, [g.title]: !prev[g.title] }))}
                    aria-expanded={!collapsed}
                  >
                    <Icon size={16} />
                    <span className="ff-group-title">{g.title}</span>
                    {errCount > 0 && <span className="ff-badge-error">{errCount} ناقص</span>}
                    <ChevronDown size={16} className={`ff-chevron ${collapsed ? 'is-collapsed' : ''}`} />
                  </button>
                  {!collapsed && (
                    <div className="ff-grid">
                      {g.fields.map((field) => wrapField(field, g.title, renderField(field)))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>

        {Object.keys(fieldErrors).length > 0 && (
          <div role="alert" className="auth-alert is-error ff-summary">
            <strong><AlertCircle size={16} /> أكمل البيانات التالية للمتابعة (اضغط على أي بيان للانتقال إليه):</strong>
            <div className="ff-chips">
              {Object.keys(fieldErrors).map((k) => {
                const f = (formula?.fields || []).find((x) => x.key === k);
                return (
                  <button key={k} type="button" className="ff-error-chip" onClick={() => scrollToField(k)}>
                    {f?.label || k}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="ff-actions">
          <button type="button" onClick={onCancel} className="btn btn-secondary">إلغاء</button>
          <div className="ff-actions-main">
            <button type="button" onClick={handleTriggerPreview} className="btn btn-secondary">معاينة المستند</button>
            <button type="submit" className="btn btn-primary">إنشاء المستند وفتح المحرر</button>
          </div>
        </div>
      </form>
    </div>
  );
}
