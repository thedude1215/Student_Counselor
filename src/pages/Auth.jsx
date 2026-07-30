import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Check, Eye, EyeOff, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';
import NovaMascot from '../components/NovaMascot.jsx';
import './Auth.css';

const RECOVERY_CODE_LENGTH = 8;
const RESEND_COOLDOWN_SECONDS = 60;

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
  const [recoveryStep, setRecoveryStep] = useState('email');
  const [codeStatus, setCodeStatus] = useState('idle');
  const [resendCooldown, setResendCooldown] = useState(0);
  const codeInputRef = useRef(null);

  const { signIn, signUp, signInWithGoogle, resendVerification } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (mode === 'reset') {
      setNotice('Enter a new password for your ScholarPath account.');
    }
  }, [mode]);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = window.setInterval(() => {
      setResendCooldown(seconds => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  function cooldownFromMessage(message = '') {
    const match = message.match(/after\s+(\d+)\s+seconds?/i);
    return match ? Number(match[1]) : 0;
  }

  function friendlyAuthError(err) {
    const message = (err?.message || '').toLowerCase();
    if (message.includes('email not confirmed')) {
      setMode('verify');
      setCodeStatus('idle');
      return 'Enter the verification code we sent to your email.';
    }
    /* Supabase throttles outbound auth mail, and the built-in SMTP silently
     * drops anything sent to an address outside the project team. Without this
     * branch the verify/recover cases below answer "that code is wrong" —
     * blaming the user for an email that was never delivered in the first
     * place. Checked before those so it wins. */
    if (message.includes('rate limit') || message.includes('over_email_send_rate_limit')) {
      const cooldown = cooldownFromMessage(err?.message || '');
      return cooldown > 0
        ? `Too many emails just went out. Try again in ${cooldown} seconds.`
        : 'Too many verification emails were sent in the last hour. Wait a few minutes, then use Resend.';
    }
    if (mode === 'login' && (message.includes('invalid login credentials') || message.includes('invalid credentials'))) {
      return 'Account does not exist. Sign up to create one.';
    }
    if (mode === 'recover' && recoveryStep === 'code') {
      const cooldown = cooldownFromMessage(err?.message || '');
      if (cooldown > 0) {
        return `You can request another code in ${cooldown} seconds.`;
      }
      return 'That code is not correct or has expired. Use the newest code from your email.';
    }
    if (mode === 'verify') {
      const cooldown = cooldownFromMessage(err?.message || '');
      if (cooldown > 0) {
        return `You can request another code in ${cooldown} seconds.`;
      }
      return 'That verification code is not correct or has expired. Use the newest code from your email.';
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
        if (!cleanEmail || cleanCode.length < 6) {
          throw new Error('Enter the code from your inbox.');
        }
        setCodeStatus('checking');
        const { error } = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanCode,
          type: 'signup',
        });
        if (error) throw error;
        setCodeStatus('valid');
        window.setTimeout(() => {
          setOtp('');
          navigate('/onboarding');
        }, 650);
      } else if (mode === 'recover') {
        if (recoveryStep === 'email') {
          await sendRecoveryCode(cleanEmail);
          return;
        }
        if (recoveryStep === 'code') {
          if (!cleanEmail || cleanCode.length < 6) {
            throw new Error('Enter the code from your email.');
          }
          setCodeStatus('checking');
          const { error: verifyError } = await supabase.auth.verifyOtp({
            email: cleanEmail,
            token: cleanCode,
            type: 'recovery',
          });
          if (verifyError) throw verifyError;
          setCodeStatus('valid');
          setNotice('Code verified. Choose a new password.');
          window.setTimeout(() => {
            setRecoveryStep('password');
            setError('');
          }, 650);
          return;
        }
        if (recoveryStep === 'password') {
          if (!password || password.length < 6) {
            throw new Error('Use at least 6 characters for your new password.');
          }
          const { error: updateError } = await supabase.auth.updateUser({ password });
          if (updateError) throw updateError;
          setOtp('');
          setPassword('');
          setCodeStatus('idle');
          setRecoveryStep('email');
          setMode('login');
          setNotice('Password updated. You can log in with your new password.');
        }
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
          setCodeStatus('idle');
          setResendCooldown(RESEND_COOLDOWN_SECONDS);
          setNotice('');
        }
      } else {
        const { error } = await signIn(cleanEmail, password);
        if (error) throw error;
        navigate('/onboarding');
      }
    } catch (err) {
      if (mode === 'recover' && recoveryStep === 'code') setCodeStatus('invalid');
      if (mode === 'verify') setCodeStatus('invalid');
      setError(friendlyAuthError(err));
    } finally { setBusy(false); }
  }

  async function handleGoogle() {
    setError('');
    const { error } = await signInWithGoogle();
    if (error) setError(error.message);
  }

  async function sendRecoveryCode(cleanEmail, successMessage = 'If an account exists for that email, a reset code is on the way.') {
    if (!cleanEmail) {
      throw new Error('Enter your email so we know where to send the code.');
    }
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (error) throw error;
    setOtp('');
    setPassword('');
    setCodeStatus('idle');
    setRecoveryStep('code');
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    setNotice(successMessage);
  }

  async function handleForgotPassword() {
    setError('');
    setNotice('');
    setOtp('');
    setResendCooldown(0);
    const cleanEmail = email.trim();
    setMode('recover');
    setRecoveryStep(cleanEmail ? 'code' : 'email');
    setCodeStatus('idle');
    if (!cleanEmail) return;
    setBusy(true);
    try {
      await sendRecoveryCode(cleanEmail);
    } catch (err) {
      const cooldown = cooldownFromMessage(err.message || '');
      if (cooldown > 0) {
        setResendCooldown(cooldown);
      } else {
        setError(err.message || 'Could not send password reset code.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleResendVerification() {
    setError('');
    setNotice('');
    if (resendCooldown > 0) return;
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Enter your email first so we know where to send the code.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'recover') await sendRecoveryCode(cleanEmail, 'Reset code sent again.');
      else {
        const response = await resendVerification(cleanEmail);
        if (response.error) throw response.error;
        setOtp('');
        setCodeStatus('idle');
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
        setNotice('');
      }
    } catch (err) {
      const cooldown = cooldownFromMessage(err.message || '');
      if (cooldown > 0) {
        setResendCooldown(cooldown);
      } else {
        setError(err.message || 'Could not resend the code.');
      }
    } finally {
      setBusy(false);
    }
  }

  function switchMode() {
    setMode(m => m === 'login' ? 'signup' : 'login');
    setError(''); setNotice(''); setOtp(''); setCodeStatus('idle'); setRecoveryStep('email'); setResendCooldown(0);
  }

  function backToLogin() {
    setMode('login');
    setOtp('');
    setPassword('');
    setError('');
    setNotice('');
    setCodeStatus('idle');
    setRecoveryStep('email');
    setResendCooldown(0);
  }

  function authTitle() {
    if (mode === 'signup') return 'Create your account';
    if (mode === 'verify') return 'Check your email';
    if (mode === 'recover' && recoveryStep === 'email') return 'Reset your password';
    if (mode === 'recover' && recoveryStep === 'code') return 'Check your email';
    if (mode === 'recover' && recoveryStep === 'password') return 'Create a new password';
    if (mode === 'reset') return 'Set a new password';
    return 'Continue to ScholarPath';
  }

  function submitText() {
    if (busy) return 'Please wait...';
    if (mode === 'signup') return 'Create account';
    if (mode === 'verify') return 'Verify email';
    if (mode === 'recover' && recoveryStep === 'email') return 'Send reset code';
    if (mode === 'recover' && recoveryStep === 'code') return codeStatus === 'checking' ? 'Checking code...' : 'Verify code';
    if (mode === 'recover' && recoveryStep === 'password') return 'Update password';
    if (mode === 'reset') return 'Update password';
    return 'Log in';
  }

  function onOtpChange(value) {
    setOtp(value.replace(/\D/g, '').slice(0, RECOVERY_CODE_LENGTH));
    if (codeStatus !== 'idle') setCodeStatus('idle');
    if (error) setError('');
  }

  const showStandardEmail = mode !== 'reset' && mode !== 'verify' && !(mode === 'recover' && recoveryStep !== 'email');
  const showPasswordField = mode !== 'verify' && !(mode === 'recover' && recoveryStep !== 'password');
  const showRecoveryCode = mode === 'recover' && recoveryStep === 'code';
  const showVerificationCode = mode === 'verify';
  const showAuthCodePanel = showVerificationCode || showRecoveryCode;

  const pageClassName = [
    'auth-page',
    mode === 'recover' || mode === 'verify' ? 'is-recover' : '',
    mode === 'recover' ? `recover-${recoveryStep}` : '',
    codeStatus === 'valid' ? 'code-is-valid' : '',
  ].filter(Boolean).join(' ');
  const showCodeActions = mode === 'verify' || (mode === 'recover' && recoveryStep === 'code' && codeStatus !== 'valid');

  return (
    <div className={pageClassName}>
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

          {showStandardEmail && (
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

          {showAuthCodePanel && (
            <div className={`auth-recovery-panel status-${codeStatus}`}>
              <span className="auth-panel-mascot" aria-hidden="true">
                <NovaMascot
                  size={56}
                  expression={codeStatus === 'valid' ? 'cheering' : 'focused'}
                  holding={showRecoveryCode ? 'key' : 'check'}
                  idle
                />
              </span>
              <div className="auth-recovery-icon" aria-hidden="true">
                {codeStatus === 'valid' ? <ShieldCheck size={26} /> : <Mail size={25} />}
              </div>
              <p className="auth-recovery-kicker">{showVerificationCode ? 'Verification code sent to' : 'Code sent to'}</p>
              <p className="auth-recovery-email">{email}</p>
              <button
                type="button"
                className="auth-code-grid"
                onClick={() => codeInputRef.current?.focus()}
                aria-label="Enter email code"
              >
                {Array.from({ length: RECOVERY_CODE_LENGTH }).map((_, idx) => (
                  <span
                    key={idx}
                    className={[
                      'auth-code-box',
                      otp[idx] ? 'filled' : '',
                      idx === otp.length && codeStatus !== 'valid' ? 'current' : '',
                    ].filter(Boolean).join(' ')}
                  >
                    {otp[idx] || ''}
                  </span>
                ))}
              </button>
              <input
                ref={codeInputRef}
                id="auth-code"
                className="auth-otp-hidden"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onChange={e => onOtpChange(e.target.value)}
                minLength={6}
                maxLength={RECOVERY_CODE_LENGTH}
                required
              />
              <p className="auth-code-helper">
                {codeStatus === 'valid'
                  ? (showVerificationCode ? 'Email verified. Taking you in.' : 'Code verified. One more step.')
                  : 'Use the newest code from your email.'}
              </p>
            </div>
          )}

          {mode === 'recover' && recoveryStep === 'email' && (
            <div className="auth-recovery-panel auth-email-panel">
              <span className="auth-panel-mascot" aria-hidden="true">
                <NovaMascot size={56} expression="curious" holding="key" idle />
              </span>
              <div className="auth-recovery-icon" aria-hidden="true">
                <Mail size={25} />
              </div>
              <p className="auth-recovery-kicker">Secure reset</p>
              <p className="auth-recovery-email">We will send a one-time code to your inbox.</p>
            </div>
          )}

          {mode === 'recover' && recoveryStep === 'password' && (
            <div className="auth-recovery-panel status-valid">
              <span className="auth-panel-mascot" aria-hidden="true">
                <NovaMascot size={56} expression="cheering" holding="key" idle />
              </span>
              <div className="auth-recovery-icon" aria-hidden="true">
                <Check size={25} />
              </div>
              <p className="auth-recovery-kicker">Verified</p>
              <p className="auth-recovery-email">Now lock in your new password.</p>
            </div>
          )}

          {showPasswordField && (
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
            {(mode === 'recover' && recoveryStep === 'password') && (
              <div className="auth-password-hint">
                <KeyRound size={15} />
                Use at least 6 characters.
              </div>
            )}
            {mode === 'login' && (
              <button type="button" className="auth-forgot" onClick={handleForgotPassword} disabled={busy}>
                Forgot password?
              </button>
            )}
          </div>
          )}

          {error  && <div className="auth-error">{error}</div>}
          {notice && mode !== 'recover' && <div className="auth-notice">{notice}</div>}
          <button type="submit" className="auth-submit" disabled={busy}>
            {submitText()}
          </button>
          {showCodeActions && (
            <div className="auth-inline-actions">
              <button type="button" onClick={handleResendVerification} disabled={busy || resendCooldown > 0}>
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
              </button>
              <button type="button" onClick={backToLogin} disabled={busy}>
                Back to login
              </button>
            </div>
          )}
        </form>

        {(mode === 'login' || mode === 'signup') ? <p className="auth-switch">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button type="button" onClick={switchMode}>
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </p> : (
          <p className="auth-switch">
            Remembered it? <button type="button" onClick={backToLogin}>Log in</button>
          </p>
        )}

      </div>
    </div>
  );
}
