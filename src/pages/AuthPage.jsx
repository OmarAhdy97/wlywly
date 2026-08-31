import React, { useState } from 'react';
import { Gavel, Mail, Lock, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const { signIn, signUp, signInWithGoogle } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password);
        setSuccessMsg('تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول.');
        setIsLogin(true);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'حدث خطأ أثناء المصادقة، يرجى التحقق من البيانات.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg('');
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
        maxWidth: '440px',
        background: 'rgba(255, 255, 255, 0.98)',
        borderRadius: 'var(--radius-lg)',
        padding: '2.5rem 2rem',
        boxShadow: '0 20px 45px rgba(26, 2, 5, 0.35)',
        border: '1px solid rgba(197, 152, 40, 0.3)',
        position: 'relative',
        zIndex: 10
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #e6be55, #c59828)',
            color: '#1a0205',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
            boxShadow: '0 6px 16px rgba(197, 152, 40, 0.3)'
          }}>
            <Gavel size={30} />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#1a0205', marginBottom: '0.3rem' }}>
            أجندة دمياط القضائية
          </h1>
          <p style={{ color: '#6b4c51', fontSize: '0.88rem' }}>
            بوابة الإدارة الرقمية لمكاتب السادة المحامين
          </p>
        </div>

        {/* Error / Success Alerts */}
        {errorMsg && (
          <div style={{
            background: 'var(--status-dismissed-bg)',
            color: 'var(--status-dismissed)',
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.2rem',
            fontSize: '0.85rem',
            border: '1px solid #fca5a5'
          }}>
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div style={{
            background: 'var(--status-active-bg)',
            color: 'var(--status-active)',
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.2rem',
            fontSize: '0.85rem',
            border: '1px solid #86efac'
          }}>
            {successMsg}
          </div>
        )}

        {/* Google One-Click OAuth Button */}
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
            borderRadius: 'var(--radius-md)',
            border: '1px solid #ebdcde',
            background: '#ffffff',
            color: '#24070b',
            fontWeight: '600',
            fontSize: '0.92rem',
            cursor: googleLoading ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
            transition: 'all 0.15s ease',
            marginBottom: '1.5rem'
          }}
        >
          {/* Google SVG Logo */}
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
          </svg>
          <span>{googleLoading ? 'جاري الاتصال بـ Google...' : 'تسجيل الدخول باستخدام Google'}</span>
        </button>

        {/* Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.8rem',
          margin: '1.2rem 0',
          color: '#987a80',
          fontSize: '0.8rem'
        }}>
          <div style={{ flex: 1, height: '1px', background: '#ebdcde' }}></div>
          <span>أو بالبريد وكلمة المرور</span>
          <div style={{ flex: 1, height: '1px', background: '#ebdcde' }}></div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" style={{ color: '#24070b' }}>البريد الإلكتروني</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="lawyer@example.com"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
              />
              <Mail size={18} color="#987a80" style={{ position: 'absolute', left: '10px', top: '12px' }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ color: '#24070b' }}>كلمة المرور</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
              />
              <Lock size={18} color="#987a80" style={{ position: 'absolute', left: '10px', top: '12px' }} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.8rem', fontSize: '1rem', marginTop: '0.5rem' }}
          >
            {loading ? 'جاري التحقق...' : (isLogin ? 'دخول لوحة التحكم' : 'إنشاء حساب جديد')}
            <ArrowLeft size={18} />
          </button>
        </form>

        {/* Toggle between Login and Register */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.88rem', color: '#6b4c51' }}>
          {isLogin ? 'ليس لديك حساب بعد؟ ' : 'لديك حساب بالفعل؟ '}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            style={{
              color: '#37040a',
              fontWeight: '700',
              textDecoration: 'underline',
              cursor: 'pointer'
            }}
          >
            {isLogin ? 'إنشاء حساب محامي جديد' : 'تسجيل الدخول'}
          </button>
        </div>
      </div>
    </div>
  );
}
