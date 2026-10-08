import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, USER_ROLES } from '../lib/supabase';
import Select from '../components/common/Select';

export default function AuthPage() {
  // Modes: 'login' | 'signup' | 'forgot' | 'reset'
  const [mode, setMode] = useState('login');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [officeName, setOfficeName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('authorizedLawyer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // States
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const { signIn, signUp, signInWithGoogle, resetPassword, updatePassword } = useAuth();

  // Detect recovery URL hash
  useEffect(() => {
    if (window.location.hash.includes('type=recovery') || window.location.hash.includes('reset-password')) {
      setMode('reset');
      setSuccessMsg('يرجى كتابة كلمة المرور الجديدة وتأكيدها للمتابعة.');
    }
  }, []);

  const handleResetMessages = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    handleResetMessages();
    setLoading(true);

    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else if (mode === 'signup') {
        if (password.length < 6) {
          throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل.');
        }
        if (password !== confirmPassword) {
          throw new Error('كلمتا المرور غير متطابقتين، يرجى التأكد وإعادة المحاولة.');
        }

        const roleTitle = USER_ROLES[role] || 'محامون ومستشارون قانونيون';
        const derivedOfficeName = officeName.trim() || (fullName.trim().includes('مكتب') ? fullName.trim() : `مكتب الأستاذ / ${fullName.trim()} للمحاماة والاستشارات القانونية`);

        const signUpResult = await signUp(email, password, {
          data: {
            full_name: fullName.trim(),
            office_name: derivedOfficeName,
            phone: phone.trim(),
            role: role,
            lawyer_title: roleTitle
          }
        });

        // If user session is returned immediately, save to office_profile table in database right away
        const createdUser = signUpResult?.user || signUpResult?.data?.user;
        const createdSession = signUpResult?.session || signUpResult?.data?.session;

        if (createdUser && createdSession) {
          try {
            await supabase.from('office_profile').upsert([{
              user_id: createdUser.id,
              office_name: derivedOfficeName,
              lawyer_name: fullName.trim(),
              lawyer_title: roleTitle,
              slogan: 'الالتزام .. خبرة .. نتائج',
              phone: phone.trim(),
              email: email.trim(),
              address: '',
              logo_url: null,
              updated_at: new Date().toISOString()
            }], { onConflict: 'user_id' });
          } catch (e) {
            console.log('Signup initial profile creation notice:', e);
          }
        }

        setSuccessMsg('تم إنشاء الحساب القضائي وحفظ الملف التعريفي بنجاح! يمكنك الآن تسجيل الدخول.');
        setMode('login');
        setPassword('');
        setConfirmPassword('');
      } else if (mode === 'forgot') {
        if (!email.trim()) {
          throw new Error('يرجى إدخال البريد الإلكتروني المسجل.');
        }
        await resetPassword(email.trim());
        setSuccessMsg('تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني بنجاح! يرجى مراجعة صندوق الوارد (أو الرسائل غير المرغوب فيها).');
      } else if (mode === 'reset') {
        if (password.length < 6) {
          throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل.');
        }
        if (password !== confirmPassword) {
          throw new Error('كلمتا المرور غير متطابقتين.');
        }
        await updatePassword(password);
        setSuccessMsg('تم تحديث كلمة المرور بنجاح! جاري تحويلك إلى لوحة التحكم...');
        setTimeout(() => {
          window.location.href = window.location.origin;
        }, 1500);
      }
    } catch (err) {
      console.error('Auth Error:', err);
      let msg = err.message || 'حدث خطأ غير متوقع، يرجى إعادة المحاولة.';
      if (msg.includes('Invalid login credentials')) {
        msg = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
      } else if (msg.includes('User already registered')) {
        msg = 'هذا البريد الإلكتروني مسجل بالفعل، يمكنك تسجيل الدخول مباشرة.';
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    handleResetMessages();
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Google Sign-in Error:', err);
      setErrorMsg('تعذر تسجيل الدخول عبر Google: ' + (err.message || 'تأكد من تفعيل Google Provider في Supabase'));
      setGoogleLoading(false);
    }
  };

  const switchMode = (next) => {
    setMode(next);
    handleResetMessages();
  };

  const SUBTITLE = {
    login: 'تسجيل الدخول إلى مكتبك',
    signup: 'إنشاء حساب جديد',
    forgot: 'استعادة كلمة المرور',
    reset: 'تعيين كلمة مرور جديدة',
  };
  const SUBMIT = {
    login: 'تسجيل الدخول',
    signup: 'إنشاء الحساب',
    forgot: 'إرسال رابط الاستعادة',
    reset: 'حفظ كلمة المرور',
  };

  const passwordField = (id, label, value, setValue, withToggle) => (
    <div className="form-group auth-field">
      <div className="auth-label-row">
        <label className="form-label" htmlFor={id}>{label}</label>
        {id === 'auth-password' && mode === 'login' && (
          <button type="button" className="auth-link" onClick={() => switchMode('forgot')}>نسيت كلمة المرور؟</button>
        )}
      </div>
      <div className="auth-input-wrap">
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          required
          dir="ltr"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="••••••••"
          className="form-input auth-ltr"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />
        {withToggle && (
          <button
            type="button"
            className="auth-eye"
            onClick={() => setShowPassword(!showPassword)}
            title={showPassword ? 'إخفاء' : 'إظهار'}
            aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="auth-page-container">
      <div className={`auth-card ${mode === 'signup' ? 'is-wide' : ''}`}>
        <div className="auth-brand">
          <img src="/logo.png" alt="" className="auth-logo" />
          <h1>الديوان</h1>
          <p>{SUBTITLE[mode]}</p>
        </div>

        {errorMsg && <div className="auth-alert is-error" role="alert">{errorMsg}</div>}
        {successMsg && <div className="auth-alert is-ok" role="status">{successMsg}</div>}

        {(mode === 'login' || mode === 'signup') && (
          <>
            <button type="button" className="auth-google" onClick={handleGoogleLogin} disabled={googleLoading}>
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
              </svg>
              <span>{googleLoading ? 'جارٍ الاتصال…' : 'المتابعة عبر Google'}</span>
            </button>
            <div className="auth-divider"><span>أو</span></div>
          </>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'signup' && (
            <>
              <div className="form-group auth-field">
                <label className="form-label" htmlFor="auth-name">اسم المحامي المسؤول *</label>
                <input id="auth-name" type="text" required className="form-input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="أ / الاسم بالكامل" />
              </div>

              <div className="form-group auth-field">
                <label className="form-label" htmlFor="auth-office">اسم المكتب <span className="auth-optional">(اختياري، يظهر في المطبوعات)</span></label>
                <input id="auth-office" type="text" className="form-input" value={officeName} onChange={(e) => setOfficeName(e.target.value)} />
              </div>

              <div className="form-grid">
                <div className="form-group auth-field">
                  <label className="form-label" htmlFor="auth-phone">رقم الهاتف</label>
                  <input id="auth-phone" type="tel" dir="ltr" className="form-input auth-ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010XXXXXXXX" />
                </div>
                <div className="form-group auth-field">
                  <label className="form-label" htmlFor="auth-role">الدرجة المهنية</label>
                  <Select id="auth-role" className="form-select" value={role} onChange={(e) => setRole(e.target.value)}>
                    {Object.entries(USER_ROLES).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </Select>
                </div>
              </div>
            </>
          )}

          {mode !== 'reset' && (
            <div className="form-group auth-field">
              <label className="form-label" htmlFor="auth-email">البريد الإلكتروني *</label>
              <input
                id="auth-email"
                type="email"
                required
                dir="ltr"
                className="form-input auth-ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="lawyer@example.com"
                autoComplete="email"
              />
            </div>
          )}

          {mode !== 'forgot' &&
            passwordField('auth-password', mode === 'reset' ? 'كلمة المرور الجديدة *' : 'كلمة المرور *', password, setPassword, true)}

          {(mode === 'signup' || mode === 'reset') &&
            passwordField('auth-confirm', 'تأكيد كلمة المرور *', confirmPassword, setConfirmPassword, false)}

          <button type="submit" disabled={loading} className="btn btn-primary auth-submit">
            {loading ? 'جارٍ المعالجة…' : SUBMIT[mode]}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'login' && (
            <>ليس لديك حساب؟ <button type="button" className="auth-link" onClick={() => switchMode('signup')}>إنشاء حساب</button></>
          )}
          {mode === 'signup' && (
            <>لديك حساب؟ <button type="button" className="auth-link" onClick={() => switchMode('login')}>تسجيل الدخول</button></>
          )}
          {(mode === 'forgot' || mode === 'reset') && (
            <button type="button" className="auth-link" onClick={() => switchMode('login')}>العودة لتسجيل الدخول</button>
          )}
        </div>
      </div>
    </div>
  );
}
