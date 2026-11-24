import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Gift, HandHeart, Truck } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Role } from '../lib/types';
import { Button, Field, Notice } from '../components/ui';
import { useToast } from '../components/Toast';
import { Brand } from '../components/Logo';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../demo/mockApi';

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="auth">
      <div className="auth-art">
        <Link to="/" className="brand"><Brand /></Link>
        <div>
          <h2>One community. Countless ways to share.</h2>
          <p>Donate what you can spare, request what you need, and track every pickup from reservation to delivery.</p>
        </div>
        <small style={{ color: '#6f84a6' }}>Share More. Waste Less. Help Everyone.</small>
      </div>
      <div className="auth-form"><div className="auth-box">{children}</div></div>
    </div>
  );
}

function PasswordInput({ id, describedBy, value, onChange, invalid, autoComplete }: { id: string; describedBy?: string; value: string; onChange: (v: string) => void; invalid?: boolean; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="pw">
      <input id={id} aria-describedby={describedBy} aria-invalid={invalid} type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} />
      <button type="button" className="icon-btn" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
    </div>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string; registered?: boolean } };
  const toast = useToast();
  const [email, setEmail] = useState(''); const [pw, setPw] = useState('');
  const [errs, setErrs] = useState<Record<string, string>>({}); const [formErr, setFormErr] = useState(''); const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!EMAIL_RE.test(email.trim())) er.email = 'Enter a valid email address';
    if (!pw) er.pw = 'Enter your password';
    setErrs(er); setFormErr('');
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const m = await login(email.trim(), pw);
      toast.success(`Welcome back, ${m.full_name.split(' ')[0]}`);
      nav(loc.state?.from || '/app', { replace: true });
    } catch (err) {
      setFormErr(err instanceof ApiError ? err.message : 'Sign in failed');
    } finally { setBusy(false); }
  }

  return (
    <Shell>
      <div><h1>Welcome back</h1><p className="muted">Sign in to manage donations, requests and pickups.</p></div>
      {loc.state?.registered && <Notice title="Account created">Sign in with your new credentials.</Notice>}
      <form className="stack" style={{ gap: 16 }} onSubmit={submit} noValidate>
        {formErr && <div className="form-error" role="alert">{formErr}</div>}
        <Field label="Email" error={errs.email}>{(id, d) => <input id={id} aria-describedby={d} aria-invalid={!!errs.email} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
        <Field label="Password" error={errs.pw}>{(id, d) => <PasswordInput id={id} describedBy={d} invalid={!!errs.pw} value={pw} onChange={setPw} autoComplete="current-password" />}</Field>
        <div className="right small"><Link to="/forgot-password">Forgot password?</Link></div>
        <Button size="lg" loading={busy} type="submit">Sign in</Button>
      </form>
      <p className="muted small">New to ShareSphere? <Link to="/register">Create an account</Link></p>
      {import.meta.env.VITE_DEMO && (
        <div className="demo-box">
          <strong>Demo accounts</strong>
          <p className="small muted">Preview data only. Password for all: <code>{DEMO_PASSWORD}</code></p>
          {DEMO_ACCOUNTS.map((a) => (
            <button type="button" key={a.email} onClick={() => { setEmail(a.email); setPw(DEMO_PASSWORD); setErrs({}); setFormErr(''); }}>
              <span><b>{a.name}</b> · {a.role.toLowerCase()}<small>{a.email}</small></span><em>Use</em>
            </button>
          ))}
        </div>
      )}
    </Shell>
  );
}

const ROLES: { v: Exclude<Role, 'ADMIN'>; t: string; d: string; icon: ReactNode }[] = [
  { v: 'DONOR', t: 'Donor', d: 'Give resources', icon: <Gift size={20} /> },
  { v: 'RECIPIENT', t: 'Recipient', d: 'Request resources', icon: <HandHeart size={20} /> },
  { v: 'VOLUNTEER', t: 'Volunteer', d: 'Pick up & deliver', icon: <Truck size={20} /> },
];

export function Register() {
  const nav = useNavigate();
  const toast = useToast();
  const [f, setF] = useState({ full_name: '', email: '', phone: '', area: '', password: '', confirm: '', role: 'DONOR' as Exclude<Role, 'ADMIN'> });
  const [errs, setErrs] = useState<Record<string, string>>({}); const [formErr, setFormErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (f.full_name.trim().length < 2) er.full_name = 'Enter your full name';
    if (!EMAIL_RE.test(f.email.trim())) er.email = 'Enter a valid email address';
    if (f.phone.replace(/\D/g, '').length < 7) er.phone = 'Enter a valid phone number';
    if (f.password.length < 8) er.password = 'Use at least 8 characters';   // backend rule
    if (f.confirm !== f.password) er.confirm = 'Passwords do not match';
    setErrs(er); setFormErr('');
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      await api.register({ full_name: f.full_name.trim(), email: f.email.trim(), password: f.password, role: f.role, phone: f.phone.trim(), area: f.area.trim() || undefined });
      toast.success('Account created. Please sign in.');
      nav('/login', { replace: true, state: { registered: true } });
    } catch (err) {
      setFormErr(err instanceof ApiError ? err.message : 'Registration failed');
    } finally { setBusy(false); }
  }

  return (
    <Shell>
      <div><h1>Create your account</h1><p className="muted">Join the community in under a minute.</p></div>
      <form className="stack" style={{ gap: 14 }} onSubmit={submit} noValidate>
        {formErr && <div className="form-error" role="alert">{formErr}</div>}
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 600, fontSize: '.86rem', marginBottom: 6 }}>I want to join as</legend>
          <div className="role-pick">
            {ROLES.map((r) => (
              <label key={r.v}><input type="radio" name="role" value={r.v} checked={f.role === r.v} onChange={() => set('role')(r.v)} />
                <span>{r.icon}{r.t}<small>{r.d}</small></span></label>
            ))}
          </div>
        </fieldset>
        <Field label="Full name" required error={errs.full_name}>{(id, d) => <input id={id} aria-describedby={d} aria-invalid={!!errs.full_name} autoComplete="name" value={f.full_name} onChange={(e) => set('full_name')(e.target.value)} />}</Field>
        <Field label="Email" required error={errs.email}>{(id, d) => <input id={id} aria-describedby={d} aria-invalid={!!errs.email} type="email" autoComplete="email" value={f.email} onChange={(e) => set('email')(e.target.value)} />}</Field>
        <div className="form-grid">
          <Field label="Phone" required error={errs.phone}>{(id, d) => <input id={id} aria-describedby={d} aria-invalid={!!errs.phone} type="tel" autoComplete="tel" value={f.phone} onChange={(e) => set('phone')(e.target.value)} />}</Field>
          <Field label="Area">{(id) => <input id={id} placeholder="Neighbourhood or city" value={f.area} onChange={(e) => set('area')(e.target.value)} />}</Field>
        </div>
        <Field label="Password" required error={errs.password} hint="At least 8 characters">{(id, d) => <PasswordInput id={id} describedBy={d} invalid={!!errs.password} value={f.password} onChange={set('password')} autoComplete="new-password" />}</Field>
        <Field label="Confirm password" required error={errs.confirm}>{(id, d) => <PasswordInput id={id} describedBy={d} invalid={!!errs.confirm} value={f.confirm} onChange={set('confirm')} autoComplete="new-password" />}</Field>
        <Button size="lg" loading={busy} type="submit">Create account</Button>
      </form>
      <p className="muted small">Already have an account? <Link to="/login">Sign in</Link></p>
    </Shell>
  );
}


export function Forgot() {
  const toast = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function sendOTP(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!EMAIL_RE.test(email.trim())) {
      setError('Enter a valid email address');
      return;
    }

    setBusy(true);

    try {
      const result = await api.forgotPassword(email.trim());
      toast.success(result.message);
      setStep(2);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to send OTP');
    } finally {
      setBusy(false);
    }
  }

  async function verifyAndReset(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the six-digit OTP');
      return;
    }

    if (password.length < 8) {
      setError('Password must contain at least 8 characters');
      return;
    }

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setBusy(true);

    try {
      const result = await api.resetPassword(
        email.trim(),
        otp,
        password
      );

      toast.success(result.message);
      setStep(3);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Password reset failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <Link to="/login" className="row small">
        <ArrowLeft size={15} /> Back to sign in
      </Link>

      {step === 1 && (
        <>
          <div>
            <h1>Forgot password?</h1>
            <p className="muted">
              Enter your registered email address. We'll send you a
              six-digit verification code.
            </p>
          </div>

          <form className="stack" style={{ gap: 16 }} onSubmit={sendOTP}>
            {error && <div className="form-error" role="alert">{error}</div>}

            <Field label="Email address" required>
              {(id) => (
                <input
                  id={id}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              )}
            </Field>

            <Button size="lg" loading={busy} type="submit">
              Send verification code
            </Button>
          </form>
        </>
      )}

      {step === 2 && (
        <>
          <div>
            <h1>Verify and reset</h1>
            <p className="muted">
              Enter the OTP sent to {email}, then choose your new password.
              The OTP expires in 5 minutes.
            </p>
          </div>

          <form className="stack" style={{ gap: 16 }} onSubmit={verifyAndReset}>
            {error && <div className="form-error" role="alert">{error}</div>}

            <Field label="Six-digit OTP" required>
              {(id) => (
                <input
                  id={id}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  required
                />
              )}
            </Field>

            <Field label="New password" required hint="At least 8 characters">
              {(id) => (
                <PasswordInput
                  id={id}
                  value={password}
                  onChange={setPassword}
                  autoComplete="new-password"
                />
              )}
            </Field>

            <Field label="Confirm new password" required>
              {(id) => (
                <PasswordInput
                  id={id}
                  value={confirm}
                  onChange={setConfirm}
                  autoComplete="new-password"
                />
              )}
            </Field>

            <Button size="lg" loading={busy} type="submit">
              Reset password
            </Button>

            <button
              type="button"
              className="small"
              disabled={busy}
              onClick={() => {
                setStep(1);
                setOtp('');
                setPassword('');
                setConfirm('');
                setError('');
              }}
            >
              Use a different email address
            </button>
          </form>
        </>
      )}

      {step === 3 && (
        <div className="stack" style={{ gap: 16 }}>
          <div>
            <h1>Password changed!</h1>
            <p className="muted">
              Your ShareSphere password has been updated successfully.
              You can now sign in using your new password.
            </p>
          </div>

          <Notice title="Password reset successful">
            Your account is ready. Please sign in again.
          </Notice>

          <Button size="lg" type="button" onClick={() => window.location.href = '/login'}>
            Back to sign in
          </Button>
        </div>
      )}
    </Shell>
  );
}

