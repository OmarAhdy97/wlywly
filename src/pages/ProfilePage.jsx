import React, { useState, useRef, useEffect } from 'react';
import { Upload, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useData } from '../context/DataContext';
import LawFirmPrintHeader, { LawFirmDefaultLogo } from '../components/common/LawFirmPrintHeader';
import { notify } from '../lib/dialog';

// Helper function to compress images client-side before storing
function compressImage(file, maxWidth = 160, maxHeight = 160, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // WebP or fallback to JPEG
        let dataUrl = canvas.toDataURL('image/webp', quality);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

export default function ProfilePage() {
  const { officeProfile, updateOfficeProfile } = useData();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    office_name: officeProfile.office_name || '',
    lawyer_name: officeProfile.lawyer_name || '',
    lawyer_title: officeProfile.lawyer_title || '',
    slogan: officeProfile.slogan || '',
    phone: officeProfile.phone || '',
    email: officeProfile.email || '',
    address: officeProfile.address || '',
    logo_url: officeProfile.logo_url || null,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [logoSizeKb, setLogoSizeKb] = useState(() => {
    if (officeProfile.logo_url) {
      return Math.round((officeProfile.logo_url.length * (3 / 4)) / 1024);
    }
    return null;
  });

  const isDirtyRef = useRef(false);

  // Keep formData in sync with officeProfile ONLY if the user has not made unsaved edits
  useEffect(() => {
    if (officeProfile && !isDirtyRef.current) {
      setFormData({
        office_name: officeProfile.office_name || '',
        lawyer_name: officeProfile.lawyer_name || '',
        lawyer_title: officeProfile.lawyer_title || '',
        slogan: officeProfile.slogan || '',
        phone: officeProfile.phone || '',
        email: officeProfile.email || '',
        address: officeProfile.address || '',
        logo_url: officeProfile.logo_url || null,
      });
      if (officeProfile.logo_url) {
        setLogoSizeKb(Math.round((officeProfile.logo_url.length * (3 / 4)) / 1024));
      }
    }
  }, [officeProfile]);

  const handleInputChange = (field, value) => {
    isDirtyRef.current = true;
    setFormData(prev => ({ ...prev, [field]: value }));
    setSaveSuccess(false);
    setSaveError(null);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      notify('يرجى اختيار ملف صورة صالح (PNG, JPG, SVG)', 'warn');
      return;
    }

    try {
      // Compress to max 160x160 px, keeping storage under 15-20 KB!
      const compressedBase64 = await compressImage(file, 160, 160, 0.82);
      const sizeKb = Math.round((compressedBase64.length * (3 / 4)) / 1024);
      setLogoSizeKb(sizeKb);
      isDirtyRef.current = true;
      handleInputChange('logo_url', compressedBase64);
    } catch (err) {
      notify('حدث خطأ أثناء معالجة الصورة: ' + err.message);
    }
  };

  const handleRemoveLogo = () => {
    isDirtyRef.current = true;
    handleInputChange('logo_url', null);
    setLogoSizeKb(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      await updateOfficeProfile(formData);
      isDirtyRef.current = false;
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 5000);
    } catch (err) {
      console.error('Error saving office profile:', err);
      setSaveError(err.message || 'حدث خطأ أثناء حفظ البيانات في قاعدة البيانات');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-wrapper profile-page">
      <div className="page-head">
        <div>
          <h1>هوية المكتب</h1>
          <p className="page-sub">تظهر هذه البيانات في ترويسة كشف الحساب وفواتير الأتعاب ورول الجلسات.</p>
        </div>
      </div>

      {saveSuccess && (
        <div className="inline-notice" role="status">
          <CheckCircle2 size={18} />
          <span>تم حفظ هوية المكتب، وستظهر في كل المطبوعات.</span>
        </div>
      )}

      {saveError && (
        <div className="inline-notice is-error" role="alert">
          <AlertCircle size={18} />
          <span>تعذر الحفظ: {saveError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="profile-grid">
          <div className="card profile-card">
            <h3 className="card-heading">بيانات المكتب</h3>

            <div className="form-group">
              <label className="form-label">اسم المكتب</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="مكتب المحاماة والاستشارات القانونية"
                value={formData.office_name}
                onChange={(e) => handleInputChange('office_name', e.target.value)}
              />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">اسم المحامي المسؤول</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="أ/ الاسم"
                  value={formData.lawyer_name}
                  onChange={(e) => handleInputChange('lawyer_name', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">الصفة أو الدرجة</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="محامون ومستشارون قانونيون"
                  value={formData.lawyer_title}
                  onChange={(e) => handleInputChange('lawyer_title', e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">عبارة المكتب (اختياري)</label>
              <input
                type="text"
                className="form-input"
                value={formData.slogan}
                onChange={(e) => handleInputChange('slogan', e.target.value)}
              />
            </div>
          </div>

          <div className="card profile-card">
            <h3 className="card-heading">التواصل والعنوان</h3>

            <div className="form-group">
              <label className="form-label">العنوان</label>
              <input
                type="text"
                className="form-input"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">الهاتف / واتساب</label>
              <input
                type="text"
                dir="ltr"
                className="form-input input-rtl-align"
                placeholder="+20 01000000000"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">البريد الإلكتروني</label>
              <input
                type="email"
                dir="ltr"
                className="form-input input-rtl-align"
                placeholder="info@lawfirm.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="card profile-card">
          <div className="card-title-row">
            <h3 className="card-heading">الشعار</h3>
            {logoSizeKb && <span className="cell-sub">{logoSizeKb} ك.ب بعد الضغط</span>}
          </div>

          <div className="logo-row">
            <div className="logo-preview">
              {formData.logo_url ? (
                <img src={formData.logo_url} alt="شعار المكتب" />
              ) : (
                <div className="logo-default">
                  <LawFirmDefaultLogo size={52} color="#111827" />
                  <span>الافتراضي</span>
                </div>
              )}
            </div>

            <div className="logo-controls">
              <input type="file" ref={fileInputRef} accept="image/*" hidden onChange={handleLogoUpload} />
              <div className="logo-buttons">
                <button type="button" className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={16} />
                  <span>{formData.logo_url ? 'تغيير الشعار' : 'رفع شعار'}</span>
                </button>
                {formData.logo_url && (
                  <button type="button" className="btn btn-secondary btn-danger-text" onClick={handleRemoveLogo}>
                    <Trash2 size={16} />
                    <span>استخدام الشعار الافتراضي</span>
                  </button>
                )}
              </div>
              <p className="hint">تُضغط الصورة تلقائياً قبل الحفظ. إن لم ترفع شعاراً يُستخدم شعار الميزان الافتراضي.</p>
            </div>
          </div>
        </div>

        <div className="card profile-card profile-preview">
          <h3 className="card-heading">معاينة الترويسة</h3>
          <div className="profile-preview-frame">
            <LawFirmPrintHeader customProfile={formData} />
            <div className="profile-preview-body">محتوى المستند: كشف حساب أو رول جلسات أو فاتورة</div>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={isSaving}>
            {isSaving ? 'جارٍ الحفظ…' : 'حفظ هوية المكتب'}
          </button>
        </div>
      </form>
    </div>
  );
}
