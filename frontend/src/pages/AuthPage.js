import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { LogoMark } from '../components/Logo';

const STEPS = { CREDENTIALS:'credentials', OTP_SENT:'otp_sent', OTP_VERIFIED:'otp_verified' };

const AuthPage = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');

  const [loginForm, setLoginForm] = useState({ login: '', password: '' });

  const [regForm, setRegForm]     = useState({ username:'', email:'', password:'' });
  const [step, setStep]           = useState(STEPS.CREDENTIALS);
  const [otp, setOtp]             = useState('');
  const [devCode, setDevCode]     = useState('');
  const [countdown, setCountdown] = useState(0);
  const [error, setError]         = useState('');
  const [info, setInfo]           = useState('');
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const switchMode = m => {
    setMode(m); setError(''); setInfo('');
    setStep(STEPS.CREDENTIALS); setOtp(''); setDevCode(''); setCountdown(0);
  };

  const submitLogin = async e => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await login(loginForm.login, loginForm.password); }
    catch (err) { setError(err.response?.data?.error || 'Invalid credentials'); }
    finally { setLoading(false); }
  };

  const sendOtp = async () => {
    if (!regForm.username.trim()) return setError('Username is required');
    if (!regForm.email.trim())    return setError('Email is required');
    setError(''); setInfo(''); setDevCode(''); setLoading(true);
    try {
      const res = await axios.post('/api/auth/send-otp', { email: regForm.email });
      setStep(STEPS.OTP_SENT);
      setCountdown(60);
      if (res.data.devCode) {
        setDevCode(res.data.devCode);
      } else {
        setInfo(`Code sent to ${regForm.email}. Check your inbox.`);
      }
    } catch (err) { setError(err.response?.data?.error || 'Could not send OTP'); }
    finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) return setError('Enter the 6-digit code');
    setError(''); setLoading(true);
    try {
      await axios.post('/api/auth/verify-otp', { email: regForm.email, code: otp });
      setStep(STEPS.OTP_VERIFIED);
      setInfo('Email verified. Set a password to complete sign-up.');
    } catch (err) { setError(err.response?.data?.error || 'Incorrect code'); }
    finally { setLoading(false); }
  };

  const submitRegister = async e => {
    e.preventDefault();
    if (!regForm.password || regForm.password.length < 6)
      return setError('Password must be at least 6 characters');
    setError(''); setLoading(true);
    try { await register(regForm.username, regForm.email, regForm.password); }
    catch (err) { setError(err.response?.data?.error || 'Registration failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-orb orb1"/><div className="auth-orb orb2"/><div className="auth-orb orb3"/>
      </div>
      <div className="auth-container">
        <div className="auth-brand">
          <LogoMark size={48}/>
          <h1 className="auth-title">StreakSquad</h1>
          <p className="auth-tagline">Accountability through community. Break your streak and your squad notices.</p>
          <div className="auth-features">
            {['Daily check-ins with mood tracking','Yes/No and amount-based goals','Real-time squad leaderboards','Granular privacy controls'].map(f => (
              <div key={f} className="auth-feature"><CheckIcon/> {f}</div>
            ))}
          </div>
        </div>
        {/* Mobile-only logo — shown when auth-brand is hidden */}
        <div className="auth-mobile-logo">
          <LogoMark size={36} />
          <span className="auth-mobile-logo-text">StreakSquad</span>
        </div>

        <div className="auth-card">
          <div className="auth-tabs">
            <button className={mode==='login'?'tab active':'tab'} onClick={()=>switchMode('login')}>Sign In</button>
            <button className={mode==='register'?'tab active':'tab'} onClick={()=>switchMode('register')}>Join Free</button>
          </div>

          {mode === 'login' ? (
            <form onSubmit={submitLogin} className="auth-form">
              <div className="field-group">
                <label>Username or Email</label>
                <input value={loginForm.identifier} onChange={e=>setLoginForm(f=>({...f,login:e.target.value}))}
                  placeholder="username or email" autoComplete="username" />
              </div>
              <div className="field-group">
                <label>Password</label>
                <input type="password" value={loginForm.password} onChange={e=>setLoginForm(f=>({...f,password:e.target.value}))}
                  placeholder="password" autoComplete="current-password"/>
              </div>
              {error && <div className="auth-error">{error}</div>}
              <button type="submit" className="auth-submit" disabled={loading}>{loading?'Signing in...':'Sign In'}</button>
            </form>
          ) : (
            <div className="auth-form">
              <div className="otp-steps">
                <div className={`otp-step ${step===STEPS.CREDENTIALS?'active':step!==STEPS.CREDENTIALS?'done':''}`}>
                  <span className="otp-step-n">1</span><span className="otp-step-l">Details</span>
                </div>
                <div className="otp-step-line"/>
                <div className={`otp-step ${step===STEPS.OTP_SENT?'active':step===STEPS.OTP_VERIFIED?'done':''}`}>
                  <span className="otp-step-n">2</span><span className="otp-step-l">Verify</span>
                </div>
                <div className="otp-step-line"/>
                <div className={`otp-step ${step===STEPS.OTP_VERIFIED?'active':''}`}>
                  <span className="otp-step-n">3</span><span className="otp-step-l">Password</span>
                </div>
              </div>

              {step === STEPS.CREDENTIALS && (
                <>
                  <div className="field-group">
                    <label>Username</label>
                    <input value={regForm.username} onChange={e=>setRegForm(f=>({...f,username:e.target.value}))} placeholder="pick a username"/>
                  </div>
                  <div className="field-group">
                    <label>Email</label>
                    <input type="email" value={regForm.email} onChange={e=>setRegForm(f=>({...f,email:e.target.value}))} placeholder="your@email.com"/>
                  </div>
                  {error && <div className="auth-error">{error}</div>}
                  <button className="auth-submit" onClick={sendOtp} disabled={loading}>{loading?'Sending...':'Send Verification Code'}</button>
                </>
              )}

              {step === STEPS.OTP_SENT && (
                <>
                  {devCode ? (
                    <div className="otp-dev-banner">Mail not configured — dev code: <strong>{devCode}</strong></div>
                  ) : (
                    <div className="auth-info">{info || `Code sent to ${regForm.email}`}</div>
                  )}
                  <div className="field-group">
                    <label>6-digit code</label>
                    <input className="code-input" value={otp}
                      onChange={e=>setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
                      placeholder="000000" inputMode="numeric" maxLength={6}/>
                  </div>
                  {error && <div className="auth-error">{error}</div>}
                  <button className="auth-submit" onClick={verifyOtp} disabled={loading||otp.length!==6}>{loading?'Verifying...':'Verify Code'}</button>
                  <div className="otp-resend">
                    {countdown > 0
                      ? <span className="otp-countdown">Resend in {countdown}s</span>
                      : <button className="otp-resend-btn" onClick={sendOtp} disabled={loading}>Resend code</button>}
                  </div>
                </>
              )}

              {step === STEPS.OTP_VERIFIED && (
                <form onSubmit={submitRegister}>
                  {info && <div className="auth-info" style={{marginBottom:16}}>{info}</div>}
                  <div className="field-group" style={{marginBottom:16}}>
                    <label>Password</label>
                    <input type="password" value={regForm.password}
                      onChange={e=>setRegForm(f=>({...f,password:e.target.value}))}
                      placeholder="at least 6 characters" autoComplete="new-password"/>
                  </div>
                  {error && <div className="auth-error">{error}</div>}
                  <button type="submit" className="auth-submit" disabled={loading}>{loading?'Creating account...':'Create Account'}</button>
                </form>
              )}
            </div>
          )}

          <div className="auth-stats">
            <div className="astat"><span className="astat-n">2,400+</span><span className="astat-l">Squads</span></div>
            <div className="astat"><span className="astat-n">18K+</span><span className="astat-l">Days Logged</span></div>
            <div className="astat"><span className="astat-n">94%</span><span className="astat-l">Retention</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

export default AuthPage;
