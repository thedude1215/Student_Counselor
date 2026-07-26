import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';
import './Auth.css';

export default function Auth() {
  const [mode, setMode] = useState(() => (
    window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery')
      ? 'reset'
      : 'login'
  ));
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);

  const { signIn, signUp, signInWithGoogle, resendVerification } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (mode === 'reset') {
      setNotice('Enter a new password for your ScholarPath account.');
    }
  }, [mode]);

  function friendlyAuthError(err) {
    const message = (err?.message || '').toLowerCase();
    if (message.includes('email not confirmed')) {
      setMode('verify');
      return 'Enter the verification code we sent to your email.';
    }
    if (mode === 'login' && (message.includes('invalid login credentials') || message.includes('invalid credentials'))) {
      return 'Account does not exist. Sign up to create one.';
    }
    if (message.includes('user already registered') || message.includes('already registered')) {
      return 'An account already exists for this email. Log in instead, or reset your password.';
    }
    return err?.message || 'Something went wrong. Try again.';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setNotice(''); setBusy(true);
    try {
      const cleanEmail = email.trim();
      const cleanCode = otp.trim();

      if (mode === 'verify') {
        if (!cleanEmail || !cleanCode) {
          throw new Error('Enter your email and the code from your inbox.');
        }
        const { error } = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanCode,
          type: 'email',
        });
        if (error) throw error;
        setOtp('');
        navigate('/onboarding');
      } else if (mode === 'recover') {
        if (!cleanEmail || !cleanCode || !password) {
          throw new Error('Enter your email, reset code, and a new password.');
        }
        const { error: verifyError } = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanCode,
          type: 'recovery',
        });
        if (verifyError) throw verifyError;
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
        setOtp('');
        setPassword('');
        setMode('login');
        setNotice('Password updated. You can log in with your new password.');
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setPassword('');
        setMode('login');
        setNotice('Password updated. You can log in with your new password.');
      } else if (mode === 'signup') {
        const { data, error } = await signUp(cleanEmail, password, fullName);
        if (error) throw error;
        if (data.session) navigate('/onboarding');
        else {
          setOtp('');
          setMode('verify');
          setNotice(`We sent a verification code to ${cleanEmail}.`);
        }
      } else {
        const { error } = await signIn(cleanEmail, password);
        if (error) throw error;
        navigate('/onboarding');
      }
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally { setBusy(false); }
  }

  async function handleGoogle() {
    setError('');
    const { error } = await signInWithGoogle();
    if (error) setError(error.message);
  }

  async function handleForgotPassword() {
    setError('');
    setNotice('');
    setOtp('');
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Enter your email first, then we can send a password reset code.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (error) {
      setError(error.message || 'Could not send password reset code.');
      setBusy(false);
      return;
    }
    setPassword('');
    setMode('recover');
    setNotice('If an account exists for that email, a reset code is on the way.');
    setBusy(false);
  }

  async function handleResendVerification() {
    setError('');
    setNotice('');
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Enter your email first so we know where to send the code.');
      return;
    }
    setBusy(true);
    const response = mode === 'recover'
      ? await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/auth`,
      })
      : await resendVerification(cleanEmail);
    if (response.error) setError(response.error.message || 'Could not resend the code.');
    else setNotice(mode === 'recover' ? 'Reset code sent again.' : 'Verification code sent again.');
    setBusy(false);
  }

  function switchMode() {
    setMode(m => m === 'login' ? 'signup' : 'login');
    setError(''); setNotice(''); setOtp('');
  }

  function authTitle() {
    if (mode === 'signup') return 'Create your account';
    if (mode === 'verify') return 'Enter your verification code';
    if (mode === 'recover') return 'Reset with your code';
    if (mode === 'reset') return 'Set a new password';
    return 'Continue to ScholarPath';
  }

  function submitText() {
    if (busy) return 'Please wait...';
    if (mode === 'signup') return 'Create account';
    if (mode === 'verify') return 'Verify email';
    if (mode === 'recover' || mode === 'reset') return 'Update password';
    return 'Log in';
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* Logo — click to go home */}
        <Link to="/" className="auth-logo-link">
          <img src="/scholarpath-logo-dark.svg" alt="ScholarPath" className="auth-logo" />
        </Link>

        <h1 className="auth-title">
          {authTitle()}
        </h1>

        {/* Google */}
        {(mode === 'login' || mode === 'signup') && (
          <button className="auth-google" onClick={handleGoogle} type="button">
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        )}

        {(mode === 'login' || mode === 'signup') && <div className="auth-divider"><span>OR</span></div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'signup' && (
            <div className="auth-field-wrap">
              <label className="auth-label" htmlFor="auth-name">Full name</label>
              <input
                id="auth-name"
                className="auth-input"
                type="text"
                placeholder="Jane Smith"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
              />
            </div>
          )}

          {mode !== 'reset' && (
          <div className="auth-field-wrap">
            <label className="auth-label" htmlFor="auth-email">Email address</label>
            <input
              id="auth-email"
              className="auth-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          )}

          {(mode === 'verify' || mode === 'recover') && (
            <div className="auth-field-wrap">
              <label className="auth-label" htmlFor="auth-code">Email code</label>
              <input
                id="auth-code"
                className="auth-input auth-code-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="00000000"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                minLength={6}
                maxLength={8}
                required
              />
            </div>
          )}

          {mode !== 'verify' && (
          <div className="auth-field-wrap">
            <label className="auth-label" htmlFor="auth-pw">{mode === 'reset' || mode === 'recover' ? 'New password' : 'Password'}</label>
            <div className="auth-pw-wrap">
              <input
                id="auth-pw"
                className="auth-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                minLength={6}
                required
              />
              <button
                type="button"
                className="auth-pw-toggle"
                onClick={() => setShowPassword(v => !v)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {mode === 'login' && (
              <button type="button" className="auth-forgot" onClick={handleForgotPassword} disabled={busy}>
                Forgot password?
              </button>
            )}
          </div>
          )}

          {error  && <div className="auth-error">{error}</div>}
          {notice && <div className="auth-notice">{notice}</div>}
          {(mode === 'verify' || mode === 'recover') && (
            <div className="auth-inline-actions">
              <button type="button" onClick={handleResendVerification} disabled={busy}>
                Resend code
              </button>
              <button type="button" onClick={() => { setMode('login'); setOtp(''); setError(''); setNotice(''); }} disabled={busy}>
                Back to login
              </button>
            </div>
          )}

          <button type="submit" className="auth-submit" disabled={busy}>
            {submitText()}
          </button>
        </form>

        {(mode === 'login' || mode === 'signup') ? <p className="auth-switch">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button type="button" onClick={switchMode}>
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </p> : (
          <p className="auth-switch">
            Remembered it? <button type="button" onClick={() => setMode('login')}>Log in</button>
          </p>
        )}

      </div>
    </div>
  );
}
