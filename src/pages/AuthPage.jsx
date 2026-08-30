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
      background: 'radial-gradient(circle at top right, #0a2e5c, #001226)',
      padding: '1.5rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Watermark */}
      <div style={{
        position: 'absolute',
        opacity: 0.04,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Gavel size={600} color="#fed65b" />
      </div>

      <div className="card" style={{
        maxWidth: '440px',
        width: '100%',
        padding: '2.5rem 2rem',
        borderRadius: '20px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
        background: '#ffffff',
        position: 'relative',
        zIndex: 10
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.8rem' }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #001f3f, #0a2e5c)',
            color: '#fed65b',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.8rem',
            border: '2px solid rgba(254, 214, 91, 0.4)',
            boxShadow: '0 8px 20px rgba(0, 31, 63, 0.25)'
          }}>
            <Gavel size={36} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#001f3f', marginBottom: '0.35rem' }}>
            أجندة دمياط القضائية
          </h1>
          <p style={{ color: '#5e6d7d', fontSize: '0.9rem' }}>
            {isLogin ? 'سجل الدخول للوصول إلى سجل القضايا والجلسات' : 'أنشئ حساباً جديداً لإدارة مكتب المحاماة'}
          </p>
        </div>

        {errorMsg && (
          <div style={{
            padding: '0.8rem 1rem',
            background: '#fee2e2',
            color: '#b91c1c',
            borderRadius: '8px',
            marginBottom: '1.2rem',
            fontSize: '0.85rem'
          }}>
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div style={{
            padding: '0.8rem 1rem',
            background: '#dcfce7',
            color: '#15803d',
            borderRadius: '8px',
            marginBottom: '1.2rem',
            fontSize: '0.85rem'
          }}>
            {successMsg}
          </div>
        )}

        {/* Google OAuth Quick Sign-In Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            background: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.95rem',
            color: '#1e293b',
            boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
            marginBottom: '1.4rem',
            transition: 'all 0.2s ease',
          }}
          onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
          onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}
        >
          {/* Official Google SVG Logo */}
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>{googleLoading ? 'جاري التحويل إلى Google...' : 'تسجيل الدخول السريع عبر Google'}</span>
        </button>

        {/* Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.8rem',
          marginBottom: '1.4rem'
        }}>
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
          <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: '500' }}>أو عبر البريد الإلكتروني</span>
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" style={{ color: '#141c24' }}>البريد الإلكتروني</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                required
                className="form-input"
                placeholder="lawyer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingRight: '2.6rem', background: '#f8fafc', borderColor: '#cbd5e1' }}
              />
              <Mail size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.6rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" style={{ color: '#141c24' }}>كلمة المرور</label>
              {isLogin && (
                <span style={{ fontSize: '0.8rem', color: '#205493', cursor: 'pointer' }}>نسيت كلمة المرور؟</span>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                required
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingRight: '2.6rem', background: '#f8fafc', borderColor: '#cbd5e1' }}
              />
              <Lock size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || googleLoading}
            style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', borderRadius: '10px' }}
          >
            {loading ? 'جاري التحقق...' : (isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد')}
            <ArrowLeft size={18} />
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.4rem', paddingTop: '1.2rem', borderTop: '1px solid #e2e8f0' }}>
          <button
            type="button"
            style={{ color: '#0a2e5c', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer' }}
            onClick={() => {
              setIsLogin(!isLogin);
              setErrorMsg('');
              setSuccessMsg('');
            }}
          >
            {isLogin ? 'ليس لديك حساب؟ أنشئ حساباً جديداً' : 'لديك حساب بالفعل؟ سجل الدخول الآن'}
          </button>
        </div>
      </div>
    </div>
  );
}
