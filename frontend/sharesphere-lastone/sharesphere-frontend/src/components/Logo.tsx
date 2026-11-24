export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg className="brand-mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#34d399" /><stop offset="1" stopColor="#047857" /></linearGradient></defs>
      <circle cx="16" cy="16" r="15" fill="url(#lg)" />
      <ellipse cx="16" cy="16" rx="11" ry="4.6" fill="none" stroke="#fff" strokeWidth="1.7" transform="rotate(-24 16 16)" opacity=".95" />
      <circle cx="16" cy="16" r="4.2" fill="#fff" />
    </svg>
  );
}
export const Brand = () => <><LogoMark /><span>ShareSphere</span></>;
