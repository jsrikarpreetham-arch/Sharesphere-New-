import { useState, type FormEvent } from 'react';
import { LogOut } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { errMsg } from '../lib/hooks';
import { fmtDate, titleCase } from '../lib/format';
import { Avatar, Button, Card, Detail, Field, PageHeader } from '../components/ui';
import { useToast } from '../components/Toast';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Profile() {
  const { user, refresh, logout } = useAuth();
  const toast = useToast();
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ full_name: user?.full_name || '', email: user?.email || '', phone: user?.phone || '', area: user?.area || '' });
  const [errs, setErrs] = useState<Record<string, string>>({}); const [formErr, setFormErr] = useState(''); const [busy, setBusy] = useState(false);
  if (!user) return null;
  const active = user.active === undefined ? true : user.active === true || user.active === 1;
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  async function save(e: FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!f.full_name.trim()) er.full_name = 'Name is required';
    if (!EMAIL_RE.test(f.email.trim())) er.email = 'Enter a valid email';
    if (f.phone.replace(/\D/g, '').length < 7) er.phone = 'Enter a valid phone number';
    setErrs(er); setFormErr('');
    if (Object.keys(er).length) return;
    setBusy(true);
    try { await api.updateMe({ full_name: f.full_name.trim(), email: f.email.trim(), phone: f.phone.trim(), area: f.area.trim() || null }); await refresh(); toast.success('Profile updated'); setEdit(false); }
    catch (err) { setFormErr(errMsg(err)); } finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader title="Profile" subtitle="Your account details." actions={!edit && <Button variant="secondary" onClick={() => { setF({ full_name: user.full_name, email: user.email, phone: user.phone || '', area: user.area || '' }); setEdit(true); }}>Edit profile</Button>} />
      <Card style={{ maxWidth: 720 }}>
        <div className="profile-head"><Avatar name={user.full_name} /><div><h2>{user.full_name}</h2>
          <div className="row" style={{ marginTop: 4 }}><span className="chip">{titleCase(user.role)}</span><span className={`badge badge-${active ? 'green' : 'gray'}`}><i />{active ? 'Active' : 'Inactive'}</span></div></div></div>
        {!edit ? (
          <dl className="detail-list">
            <Detail label="Full name">{user.full_name}</Detail><Detail label="Email">{user.email}</Detail>
            <Detail label="Phone">{user.phone || '—'}</Detail><Detail label="Area">{user.area || '—'}</Detail>
            <Detail label="Role">{titleCase(user.role)}</Detail><Detail label="Member since">{fmtDate(user.created_at)}</Detail>
          </dl>
        ) : (
          <form className="stack" style={{ gap: 14 }} onSubmit={save} noValidate>
            {formErr && <div className="form-error" role="alert">{formErr}</div>}
            <div className="form-grid">
              <Field label="Full name" required error={errs.full_name}>{(id, d) => <input id={id} aria-describedby={d} aria-invalid={!!errs.full_name} value={f.full_name} onChange={(e) => set('full_name')(e.target.value)} />}</Field>
              <Field label="Email" required error={errs.email}>{(id, d) => <input id={id} aria-describedby={d} aria-invalid={!!errs.email} type="email" value={f.email} onChange={(e) => set('email')(e.target.value)} />}</Field>
              <Field label="Phone" required error={errs.phone}>{(id, d) => <input id={id} aria-describedby={d} aria-invalid={!!errs.phone} type="tel" value={f.phone} onChange={(e) => set('phone')(e.target.value)} />}</Field>
              <Field label="Area">{(id) => <input id={id} value={f.area} onChange={(e) => set('area')(e.target.value)} />}</Field>
            </div>
            <p className="muted small">Role and account status can only be changed by an administrator.</p>
            <div className="row"><Button loading={busy} type="submit">Save changes</Button><Button variant="secondary" type="button" onClick={() => setEdit(false)}>Cancel</Button></div>
          </form>
        )}
      </Card>
      <div style={{ marginTop: 16 }}><Button variant="secondary" onClick={logout}><LogOut size={16} />Sign out</Button></div>
    </>
  );
}
