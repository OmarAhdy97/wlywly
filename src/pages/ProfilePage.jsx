import React, { useState, useRef, useEffect } from 'react';
import {
  Building2,
  Phone,
  Sparkles,
  Upload,
  Trash2,
  CheckCircle2,
  Eye,
  Scale,
  FileCheck
} from 'lucide-react';
import { useData } from '../context/DataContext';
import LawFirmPrintHeader, { LawFirmDefaultLogo } from '../components/common/LawFirmPrintHeader';

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
  const [logoSizeKb, setLogoSizeKb] = useState(() => {
    if (officeProfile.logo_url) {
      return Math.round((officeProfile.logo_url.length * (3 / 4)) / 1024);
    }
    return null;
  });

  // Keep formData in sync whenever officeProfile is loaded from database or initialized
  useEffect(() => {
    if (officeProfile) {
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
    setFormData(prev => ({ ...prev, [field]: value }));
    setSaveSuccess(false);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار ملف صورة صالح (PNG, JPG, SVG)');
      return;
    }

    try {
      // Compress to max 160x160 px, keeping storage under 15-20 KB!
      const compressedBase64 = await compressImage(file, 160, 160, 0.82);
      const sizeKb = Math.round((compressedBase64.length * (3 / 4)) / 1024);
      setLogoSizeKb(sizeKb);
      handleInputChange('logo_url', compressedBase64);
    } catch (err) {
      alert('حدث خطأ أثناء معالجة الصورة: ' + err.message);
    }
  };

  const handleRemoveLogo = () => {
    handleInputChange('logo_url', null);
    setLogoSizeKb(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await updateOfficeProfile(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      alert('خطأ أثناء حفظ هوية المكتب: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-wrapper" style={{ maxWidth: '1200px' }}>
      {/* Top Page Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '1rem',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <Building2 size={18} style={{ color: 'var(--primary-700)' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--primary-700)', textTransform: 'uppercase' }}>
              الهوية الرسمية والمطبوعات
            </span>
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
            هوية مكتب المحاماة والملف التعريفي
          </h1>
          <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.86rem', color: 'var(--text-muted)' }}>
            تظهر هذه البيانات كترويسة معتمدة في كشف الحساب، فواتير الأتعاب، ورول الجلسات القضائية.
          </p>
        </div>
      </div>

      {/* Success Notification */}
      {saveSuccess && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          background: '#f0fdf4',
          border: '1px solid #86efac',
          color: '#15803d',
          padding: '0.85rem 1.1rem',
          borderRadius: '10px',
          marginBottom: '1.25rem',
          fontSize: '0.9rem',
          fontWeight: '700',
        }}>
          <CheckCircle2 size={20} />
          <span>تم حفظ هوية المكتب والملف التعريفي بنجاح! سيتم تطبيقها فوراً على كافة المطبوعات.</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 290px), 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>

          {/* Card 1: Office & Lawyer Identity */}
          <div className="card" style={{ padding: '1.4rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem' }}>
              <Building2 size={18} color="var(--primary-700)" />
              <h3 style={{ fontSize: '1rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
                البيانات الأساسية للمكتب
              </h3>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                اسم المكتب
              </label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="مثال: مكتب المحاماة والاستشارات القانونية"
                value={formData.office_name}
                onChange={(e) => handleInputChange('office_name', e.target.value)}
              />
            </div>

            <div className="form-grid-2" style={{ gap: '0.8rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                  اسم المحامي المسؤول
                </label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="مثال: أ/ اسم المحامي المسؤول"
                  value={formData.lawyer_name}
                  onChange={(e) => handleInputChange('lawyer_name', e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                  الصفة القانونية / الدرجة
                </label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="مثال: محامون ومستشارون قانونيون"
                  value={formData.lawyer_title}
                  onChange={(e) => handleInputChange('lawyer_title', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                شعار أو عبارة المكتب
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="مثال: الالتزام .. خبرة .. نتائج"
                value={formData.slogan}
                onChange={(e) => handleInputChange('slogan', e.target.value)}
              />
            </div>
          </div>

          {/* Card 2: Contact Details & Location */}
          <div className="card" style={{ padding: '1.4rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem' }}>
              <Phone size={18} color="var(--primary-700)" />
              <h3 style={{ fontSize: '1rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
                بيانات التواصل والعنوان
              </h3>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                العنوان والمحافظة
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="مثال: العنوان أو المدينة - مصر"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                رقم الهاتف / الواتساب الرسمي
              </label>
              <input
                type="text"
                dir="ltr"
                className="form-input"
                style={{ textAlign: 'right' }}
                placeholder="+20 01000000000"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                البريد الإلكتروني الرسمي
              </label>
              <input
                type="email"
                dir="ltr"
                className="form-input"
                style={{ textAlign: 'right' }}
                placeholder="info@lawfirm.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Logo Management with Smart Compression */}
        <div className="card" style={{ padding: '1.4rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={18} color="var(--accent-gold)" />
              <h3 style={{ fontSize: '1rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
                شعار المكتب
              </h3>
            </div>
            {logoSizeKb && (
              <span className="badge" style={{ background: 'var(--primary-100)', color: 'var(--primary-800)', fontWeight: '700' }}>
                حجم الشعار: {logoSizeKb} كيلوبايت فقط (خفيف جداً)
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            {/* Logo Preview Box */}
            <div style={{
              width: '90px',
              height: '90px',
              borderRadius: '50%',
              border: '2px solid #37040a',
              boxShadow: '0 4px 12px rgba(55, 4, 10, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#ffffff',
              overflow: 'hidden',
              flexShrink: 0,
            }}>
              {formData.logo_url ? (
                <img
                  src={formData.logo_url}
                  alt="لوجو المكتب"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '0.2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <LawFirmDefaultLogo size={52} color="#37040a" />
                  <div style={{ fontSize: '0.62rem', fontWeight: '700', color: '#37040a', marginTop: '0.1rem' }}>الافتراضي</div>
                </div>
              )}
            </div>

            {/* Upload Controls */}
            <div style={{ flex: 1, minWidth: '220px' }}>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleLogoUpload}
                />

                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem' }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={16} />
                  <span>{formData.logo_url ? 'تغيير الشعار' : 'رفع شعار من الجهاز'}</span>
                </button>

                {formData.logo_url && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem', color: '#dc2626' }}
                    onClick={handleRemoveLogo}
                  >
                    <Trash2 size={16} />
                    <span>العودة لشعار ميزان العدل الافتراضي</span>
                  </button>
                )}
              </div>

              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.5rem 0 0 0', lineHeight: 1.5 }}>
                • يتم ضغط أي صورة ترفعها تلقائياً بتقنية Canvas WebP لأقل من 20 كيلوبايت لتوفير مساحة قاعدة البيانات وحفظها بسرعة فائقة.
                <br />
                • إذا لم ترفع صورة مخصصة، سيتم اعتماد أيقونة ميزان العدالة الملكي المحاطة بالغار كشعار رسمي أنيق.
              </p>
            </div>
          </div>
        </div>

        {/* Live Preview Card */}
        <div className="card" style={{ padding: '1.4rem', marginBottom: '1.5rem', background: '#ffffff', color: '#24070b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Eye size={18} color="#37040a" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', margin: 0, color: '#37040a' }}>
              معاينة حية لترويسة المطبوعات الرسمية
            </h3>
          </div>

          <div style={{
            border: '1.5px dashed #e5c4c8',
            borderRadius: '10px',
            padding: '1.25rem',
            background: '#ffffff',
            overflowX: 'auto',
          }}>
            <LawFirmPrintHeader customProfile={formData} />
            <div style={{ textAlign: 'center', padding: '1rem 0', color: '#6b4c51', fontSize: '0.82rem' }}>
              [ هنا ستظهر محتويات المستند: كشف الحساب / رول الجلسات / الفواتير ]
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '1rem' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSaving}
            style={{
              padding: '0.75rem 2rem',
              fontSize: '0.95rem',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <FileCheck size={18} />
            <span>{isSaving ? 'جارٍ الحفظ...' : 'حفظ هوية المكتب'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
