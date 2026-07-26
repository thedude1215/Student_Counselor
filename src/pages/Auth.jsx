import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import './Auth.css';

export default function Auth() {
  const [mode, setMode] = useState('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const { signIn, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setNotice(''); setBusy(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await signUp(email, password, fullName);
        if (error) throw error;
        if (data.session) navigate('/onboarding');
        else { setNotice('Check your email to confirm your account, then log in.'); setMode('login'); }
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
        navigate('/onboarding');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.');
    } finally { setBusy(false); }
  }

  async function handleGoogle() {
    setError('');
    const { error } = await signInWithGoogle();
    if (error) setError(error.message);
  }

  function switchMode() {
    setMode(m => m === 'login' ? 'signup' : 'login');
    setError(''); setNotice('');
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* Logo — click to go home */}
        <Link to="/" className="auth-logo-link">
          <img src="/scholarpath-logo-dark.svg" alt="ScholarPath" className="auth-logo" />
        </Link>

        <h1 className="auth-title">
          {mode === 'login' ? 'Continue to ScholarPath' : 'Create your account'}
        </h1>

        {/* Google */}
        <button className="auth-google" onClick={handleGoogle} type="button">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div className="auth-divider"><span>OR</span></div>

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

          <div className="auth-field-wrap">
            <label className="auth-label" htmlFor="auth-pw">Password</label>
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
              <button type="button" className="auth-forgot">Forgot password?</button>
            )}
          </div>

          {error  && <div className="auth-error">{error}</div>}
          {notice && <div className="auth-notice">{notice}</div>}

          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button type="button" onClick={switchMode}>
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </p>

      </div>
    </div>
  );
}
