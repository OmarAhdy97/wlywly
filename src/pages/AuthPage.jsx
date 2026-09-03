import React, { useState, useEffect } from 'react';
import {
  Gavel,
  Mail,
  Lock,
  ArrowLeft,
  User,
  Phone,
  Award,
  CheckCircle2,
  KeyRound,
  RotateCcw,
  ShieldCheck,
  HelpCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { USER_ROLES } from '../lib/supabase';

export default function AuthPage() {
  // Modes: 'login' | 'signup' | 'forgot' | 'reset'
  const [mode, setMode] = useState('login');

  // Form Fields
  const [fullName, setFullName] = useState('');
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

        await signUp(email, password, {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            role: role
          }
        });

        setSuccessMsg('تم إنشاء الحساب القضائي بنجاح! يمكنك الآن تسجيل الدخول.');
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

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at top right, #37040a, #1a0205)',
      padding: '1.5rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative luxury legal ambient glow */}
      <div style={{
        position: 'absolute',
        top: '-15%',
        right: '-10%',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(197, 152, 40, 0.18) 0%, rgba(55, 4, 10, 0) 70%)',
        pointerEvents: 'none'
      }}></div>

      <div style={{
        position: 'absolute',
        bottom: '-20%',
        left: '-10%',
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(24, 37, 42, 0.3) 0%, rgba(26, 2, 5, 0) 70%)',
        pointerEvents: 'none'
      }}></div>

      <div style={{
        width: '100%',
        maxWidth: mode === 'signup' ? '500px' : '440px',
        background: 'rgba(255, 255, 255, 0.98)',
        borderRadius: '20px',
        padding: mode === 'signup' ? '2.2rem 2rem' : '2.5rem 2rem',
        boxShadow: '0 20px 45px rgba(26, 2, 5, 0.35)',
        border: '1px solid rgba(197, 152, 40, 0.3)',
        position: 'relative',
        zIndex: 10,
        transition: 'max-width 0.25s ease'
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #e6be55, #c59828)',
            color: '#1a0205',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 0.85rem',
            boxShadow: '0 6px 16px rgba(197, 152, 40, 0.3)'
          }}>
            <Gavel size={28} />
          </div>

          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1a0205', marginBottom: '0.2rem' }}>
            الأجندة القضائية
          </h1>

          <p style={{ color: '#6b4c51', fontSize: '0.86rem', margin: 0 }}>
            {mode === 'login' && 'بوابة الإدارة الرقمية لمكاتب السادة المحامين'}
            {mode === 'signup' && 'إنشاء حساب محاماة جديد للانضمام للمنظومة'}
            {mode === 'forgot' && 'استعادة والوصول إلى حسابك المسجل'}
            {mode === 'reset' && 'تعيين كلمة مرور جديدة وآمنة'}
          </p>
        </div>

        {/* Error / Success Alerts */}
        {errorMsg && (
          <div style={{
            background: 'var(--status-dismissed-bg)',
            color: 'var(--status-dismissed)',
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            marginBottom: '1.2rem',
            fontSize: '0.85rem',
            border: '1px solid #fca5a5',
            lineHeight: '1.4'
          }}>
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div style={{
            background: 'var(--status-active-bg)',
            color: 'var(--status-active)',
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            marginBottom: '1.2rem',
            fontSize: '0.85rem',
            border: '1px solid #86efac',
            lineHeight: '1.4'
          }}>
            {successMsg}
          </div>
        )}

        {/* Google One-Click OAuth Button (shown in Login and Signup modes) */}
        {(mode === 'login' || mode === 'signup') && (
          <>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                border: '1px solid #ebdcde',
                background: '#ffffff',
                color: '#24070b',
                fontWeight: '700',
                fontSize: '0.9rem',
                cursor: googleLoading ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                transition: 'all 0.15s ease',
                marginBottom: '1.2rem'
              }}
            >
              {/* Google SVG Logo */}
              <svg width="19" height="19" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
              </svg>
              <span>{googleLoading ? 'جاري الاتصال بـ Google...' : (mode === 'login' ? 'تسجيل الدخول باستخدام Google' : 'التسجيل السريع عبر Google')}</span>
            </button>

            {/* Divider */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.8rem',
              margin: '1.2rem 0',
              color: '#987a80',
              fontSize: '0.78rem'
            }}>
              <div style={{ flex: 1, height: '1px', background: '#ebdcde' }}></div>
              <span>أو عبر البيانات المباشرة</span>
              <div style={{ flex: 1, height: '1px', background: '#ebdcde' }}></div>
            </div>
          </>
        )}

        {/* Dynamic Form based on mode */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}>

          {/* SIGNUP SPECIFIC FIELDS */}
          {mode === 'signup' && (
            <>
              {/* Full Name / Law Firm Name */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ color: '#24070b', fontWeight: '700', fontSize: '0.84rem' }}>
                  اسم الأستاذ المحامي / المكتب *
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="مثال: أ / أحمد محمود إبراهيم"
                    className="form-input"
                    style={{
                      width: '100%',
                      paddingRight: '2.6rem',
                      paddingLeft: '0.9rem',
                      fontSize: '0.88rem',
                      borderRadius: '10px'
                    }}
                  />
                  <User size={17} color="#987a80" style={{ position: 'absolute', right: '12px', pointerEvents: 'none' }} />
                </div>
              </div>

              {/* Phone & Role Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {/* Phone */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ color: '#24070b', fontWeight: '700', fontSize: '0.84rem' }}>
                    رقم الهاتف
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="tel"
                      dir="ltr"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="010XXXXXXXX"
                      className="form-input"
                      style={{
                        width: '100%',
                        paddingLeft: '2.5rem',
                        textAlign: 'left',
                        fontSize: '0.88rem',
                        borderRadius: '10px'
                      }}
                    />
                    <Phone size={16} color="#987a80" style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }} />
                  </div>
                </div>

                {/* Role */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ color: '#24070b', fontWeight: '700', fontSize: '0.84rem' }}>
                    الدرجة المهنية
                  </label>
                  <select
                    className="form-select"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    style={{ borderRadius: '10px', fontSize: '0.85rem', padding: '0.55rem 0.6rem' }}
                  >
                    {Object.entries(USER_ROLES).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {/* EMAIL FIELD (Login, Signup, Forgot) */}
          {mode !== 'reset' && (
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ color: '#24070b', fontWeight: '700', fontSize: '0.84rem' }}>
                البريد الإلكتروني *
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="email"
                  required
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="lawyer@example.com"
                  className="form-input"
                  style={{
                    width: '100%',
                    paddingLeft: '2.8rem',
                    paddingRight: '1rem',
                    textAlign: 'left',
                    direction: 'ltr',
                    borderRadius: '10px',
                    fontSize: '0.9rem'
                  }}
                />
                <Mail size={17} color="#987a80" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>
          )}

          {/* PASSWORD FIELD (Login, Signup, Reset) */}
          {mode !== 'forgot' && (
            <div className="form-group" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <label className="form-label" style={{ color: '#24070b', fontWeight: '700', fontSize: '0.84rem', margin: 0 }}>
                  {mode === 'reset' ? 'كلمة المرور الجديدة *' : 'كلمة المرور *'}
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      handleResetMessages();
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary-800)',
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    نسيت كلمة المرور؟
                  </button>
                )}
              </div>

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="form-input"
                  style={{
                    width: '100%',
                    paddingLeft: '2.8rem',
                    paddingRight: '2.6rem',
                    textAlign: 'left',
                    direction: 'ltr',
                    borderRadius: '10px',
                    fontSize: '0.9rem'
                  }}
                />
                <Lock size={17} color="#987a80" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#987a80',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title={showPassword ? 'إخفاء' : 'إظهار'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {/* CONFIRM PASSWORD (Signup and Reset modes) */}
          {(mode === 'signup' || mode === 'reset') && (
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ color: '#24070b', fontWeight: '700', fontSize: '0.84rem' }}>
                تأكيد كلمة المرور *
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  dir="ltr"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="form-input"
                  style={{
                    width: '100%',
                    paddingLeft: '2.8rem',
                    paddingRight: '1rem',
                    textAlign: 'left',
                    direction: 'ltr',
                    borderRadius: '10px',
                    fontSize: '0.9rem'
                  }}
                />
                <KeyRound size={17} color="#987a80" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '0.85rem',
              fontSize: '0.98rem',
              fontWeight: '700',
              borderRadius: '12px',
              marginTop: '0.4rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 14px rgba(55, 4, 10, 0.25)',
              border: '1px solid var(--accent-gold)'
            }}
          >
            {loading ? (
              <span>جاري المعالجة...</span>
            ) : (
              <>
                {mode === 'login' && <span>تسجيل الدخول</span>}
                {mode === 'signup' && <span>تأكيد وإنشاء الحساب القضائي</span>}
                {mode === 'forgot' && <span>إرسال رابط الاستعادة</span>}
                {mode === 'reset' && <span>حفظ كلمة المرور الجديدة</span>}
                <ArrowLeft size={17} />
              </>
            )}
          </button>
        </form>

        {/* Footer Navigation / Toggles */}
        <div style={{ textAlign: 'center', marginTop: '1.4rem', fontSize: '0.86rem', color: '#6b4c51' }}>
          {mode === 'login' && (
            <div>
              <span>ليس لديك حساب بعد؟ </span>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  handleResetMessages();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary-800)',
                  fontWeight: '800',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                إنشاء حساب محامي جديد
              </button>
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <span>لديك حساب بالفعل؟ </span>
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  handleResetMessages();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary-800)',
                  fontWeight: '800',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                تسجيل الدخول
              </button>
            </div>
          )}

          {mode === 'forgot' && (
            <div>
              <span>تذكرت كلمة المرور؟ </span>
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  handleResetMessages();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary-800)',
                  fontWeight: '800',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                العودة لتسجيل الدخول
              </button>
            </div>
          )}

          {mode === 'reset' && (
            <div>
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  handleResetMessages();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary-800)',
                  fontWeight: '800',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                العودة لصفحة تسجيل الدخول
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
