import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Boxes, ClipboardCheck, Gift, HandHeart, LayoutDashboard, LockKeyhole, MapPinned, PackageCheck, Truck, UsersRound } from 'lucide-react';
import { Brand } from '../components/Logo';
import { useAuth } from '../lib/auth';
import { StatusBadge } from '../components/ui';

function HeroArt() {
  // Decorative orbit illustration: donors, recipients and volunteers around a shared sphere.
  const nodes = [
    { x: 60, y: 96, c: '#10b981', i: 'D' }, { x: 300, y: 70, c: '#1c4373', i: 'R' }, { x: 330, y: 250, c: '#10b981', i: 'V' },
    { x: 90, y: 300, c: '#1c4373', i: 'R' }, { x: 200, y: 20, c: '#34d399', i: 'D' }, { x: 205, y: 372, c: '#34d399', i: 'V' },
  ];
  return (
    <svg className="hero-art" viewBox="0 0 400 392" role="img" aria-label="Donors, recipients and volunteers connected around a shared sphere" style={{ width: '100%' }}>
      <defs>
        <radialGradient id="orb" cx=".35" cy=".3" r=".9"><stop offset="0" stopColor="#6ee7b7" /><stop offset=".55" stopColor="#059669" /><stop offset="1" stopColor="#0b1f3a" /></radialGradient>
        <filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="14" stdDeviation="14" floodColor="#0b1f3a" floodOpacity=".25" /></filter>
      </defs>
      <circle cx="200" cy="196" r="170" fill="none" stroke="#e5e8ee" strokeDasharray="3 7" />
      <circle cx="200" cy="196" r="118" fill="none" stroke="#d1fae5" />
      {nodes.map((n, k) => <line key={k} x1="200" y1="196" x2={n.x} y2={n.y} stroke="#b7e4d2" strokeWidth="1.5" />)}
      <circle cx="200" cy="196" r="74" fill="url(#orb)" filter="url(#sh)" />
      <ellipse cx="200" cy="196" rx="104" ry="34" fill="none" stroke="#fff" strokeWidth="3" transform="rotate(-24 200 196)" opacity=".9" />
      <circle cx="200" cy="196" r="26" fill="#fff" />
      {nodes.map((n, k) => (
        <g key={k}><circle cx={n.x} cy={n.y} r="22" fill="#fff" stroke={n.c} strokeWidth="2" filter="url(#sh)" /><text x={n.x} y={n.y + 5} textAnchor="middle" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="800" fontSize="15" fill={n.c}>{n.i}</text></g>
      ))}
    </svg>
  );
}

const STEPS = [
  { i: <Gift size={20} />, t: 'Donors list resources', d: 'Add an item, quantity, unit and optional expiry date. Every listing shows exactly how much is still available.' },
  { i: <HandHeart size={20} />, t: 'Recipients make requests', d: 'Describe what you need and how urgently. Progress bars show how much has been fulfilled so far.' },
  { i: <ClipboardCheck size={20} />, t: 'Admins allocate', d: 'Coordinators match a donation with a request and assign a volunteer — quantities stay in sync automatically.' },
  { i: <Truck size={20} />, t: 'Volunteers deliver', d: 'Pickup and delivery are tracked step by step, with notes if something goes wrong.' },
];
const FEATURES = [
  { i: <LayoutDashboard size={20} />, t: 'Role-based workspace', d: 'Donors, recipients, volunteers and admins each see the tools that matter to them — nothing more.' },
  { i: <Boxes size={20} />, t: 'Live quantity tracking', d: 'Available, allocated and fulfilled quantities are always visible, so nothing is double-booked.' },
  { i: <PackageCheck size={20} />, t: 'Pickup & delivery tracking', d: 'Follow each allocation from reserved to picked up to delivered, with timestamps and outcome notes.' },
  { i: <MapPinned size={20} />, t: 'Local by design', d: 'Members list their area so resources move between neighbours quickly.' },
  { i: <LockKeyhole size={20} />, t: 'Secure access', d: 'Sign-in uses token-based authentication, and every action is checked against your role on the server.' },
  { i: <BadgeCheck size={20} />, t: 'Transparent history', d: 'Every donation, request and allocation keeps a clear status trail anyone involved can follow.' },
];

export default function Landing() {
  const { user } = useAuth();
  return (
    <div>
      <header className="l-nav"><div className="l-nav-in">
        <Link to="/" className="brand"><Brand /></Link>
        <nav className="l-links" aria-label="Sections"><a href="#how">How it works</a><a href="#categories">What you can share</a><a href="#transparency">Transparency</a><a href="#features">Features</a></nav>
        <div className="row">
          {user ? <Link to="/app" className="btn btn-primary btn-md">Open dashboard</Link> : <>
            <Link to="/login" className="btn btn-ghost btn-md">Sign in</Link>
            <Link to="/register" className="btn btn-primary btn-md">Get started</Link></>}
        </div>
      </div></header>

      <section className="hero"><div className="hero-in">
        <div>
          <span className="eyebrow">Community resource sharing</span>
          <h1>One Community. <em>Countless Ways</em> to Share.</h1>
          <p className="lead">Connect resources with people who need them. Donate, request, and make a meaningful difference in your community.</p>
          <div className="hero-actions">
            <Link to={user ? '/app' : '/register'} className="btn btn-primary btn-lg">Get Started <ArrowRight size={18} /></Link>
            <Link to="/app/donations" className="btn btn-secondary btn-lg">Explore Donations</Link>
          </div>
          <p className="tagline">Share More. Waste Less. Help Everyone.</p>
        </div>
        <img
  className="hero-photo"
  src="/images/hero.community.jpg"
  alt="Community volunteers sharing resources"
/>
      </div></section>

      <section className="l-sec" id="how">
        <div className="sec-head"><h2>How ShareSphere works</h2><p>From a spare item to a delivered need in four clear steps.</p></div>
        <div className="steps">
          {STEPS.map((s, k) => (
            <div className="card step card-hover" key={k}>
              <div className="num"><span className={`stat-icon tone-green`} style={{ width: 40, height: 40 }}>{s.i}</span>0{k + 1}</div>
              <h3>{s.t}</h3><p>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="l-sec tight" id="categories">
        <div className="sec-head"><h2>Share almost anything</h2><p>Resources are organised into categories so the right items find the right people. Examples of what communities share:</p></div>
        <div className="cats">
          {['Food & groceries', 'Clothing', 'Household items', 'Medical supplies', 'Books & stationery', 'Hygiene essentials'].map((c) => <span key={c}><Gift size={16} color="#059669" />{c}</span>)}
        </div>
        <p className="muted small" style={{ marginTop: 14 }}>Examples only — the live category list is managed by your community’s administrators.</p>
      </section>

      <section className="dark" id="transparency"><div className="l-sec">
        <div className="sec-head"><h2>Transparent from first gift to final delivery</h2><p>Every record moves through clear statuses, so donors, recipients and coordinators always know where things stand.</p></div>
        <div className="flow">
          <div><small>Donation</small><b>Listed</b><StatusBadge status="AVAILABLE" /><StatusBadge status="PARTIAL" /><StatusBadge status="CANCELLED" /></div>
          <div><small>Request</small><b>Raised</b><StatusBadge status="OPEN" /><StatusBadge status="PARTIAL" /><StatusBadge status="FULFILLED" /></div>
          <div><small>Allocation</small><b>Matched</b><StatusBadge status="RESERVED" /><StatusBadge status="PICKED_UP" /></div>
          <div><small>Pickup</small><b>Completed</b><StatusBadge status="DELIVERED" /><StatusBadge status="FAILED" /></div>
        </div>
      </div></section>

      <section className="l-sec" id="features">
        <div className="sec-head"><h2>Built for coordinated, trustworthy giving</h2><p>Everything a community needs to run resource sharing without spreadsheets and group chats.</p></div>
        <div className="feat">
          {FEATURES.map((f) => <div className="card card-hover" key={f.t}><div className="ic">{f.i}</div><h3>{f.t}</h3><p>{f.d}</p></div>)}
        </div>
      </section>

      <section className="l-sec tight">
        <div className="cta">
          <UsersRound size={30} color="#059669" />
          <h2 style={{ margin: '12px 0 8px', fontSize: '1.9rem' }}>Ready to make a difference?</h2>
          <p className="muted" style={{ marginBottom: 24 }}>Join as a donor, recipient or volunteer — it takes under a minute.</p>
          <Link to="/register" className="btn btn-primary btn-lg">Create your account <ArrowRight size={18} /></Link>
        </div>
      </section>

      <footer className="l-foot">
        <div className="l-foot-in">
          <div><div className="brand"><Brand /></div><p style={{ maxWidth: 300, fontSize: '.9rem' }}>Share More. Waste Less. Help Everyone.</p></div>
          <div><h4>Platform</h4><Link to="/app/donations">Explore donations</Link><Link to="/app/categories">Categories</Link><a href="#how">How it works</a></div>
          <div><h4>Account</h4><Link to="/login">Sign in</Link><Link to="/register">Register</Link><Link to="/forgot-password">Forgot password</Link></div>
          <div><h4>Roles</h4><a href="#how">Donors</a><a href="#how">Recipients</a><a href="#how">Volunteers</a></div>
        </div>
        <div className="copy">© {new Date().getFullYear()} ShareSphere. All rights reserved.</div>
      </footer>
    </div>
  );
}
