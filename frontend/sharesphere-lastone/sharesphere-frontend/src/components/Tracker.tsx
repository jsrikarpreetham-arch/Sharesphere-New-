import { Check, X } from 'lucide-react';
import { fmtDate } from '../lib/format';

interface P { status: string | null; pickedUpAt: string | null; deliveredAt: string | null; allocatedAt?: string | null }

// Reserved → Picked up → Delivered (or Failed). Driven only by allocation status + pickup timestamps.
export function Tracker({ status, pickedUpAt, deliveredAt, allocatedAt }: P) {
  const failed = status === 'FAILED';
  const delivered = status === 'DELIVERED';
  const picked = !!pickedUpAt || ['PICKED_UP', 'DELIVERED', 'FAILED'].includes(status || '');
  const steps = [
    { label: 'Reserved', done: true, when: allocatedAt, bad: false },
    { label: 'Picked up', done: picked, when: pickedUpAt, bad: false },
    { label: failed ? 'Failed' : 'Delivered', done: delivered || failed, when: deliveredAt, bad: failed },
  ];
  return (
    <div className="tracker" role="list" aria-label="Pickup progress">
      {steps.map((s) => (
        <div role="listitem" key={s.label} className={`tstep ${s.bad ? 'fail' : s.done ? 'done' : ''}`}>
          <div className="tdot">{s.bad ? <X size={14} /> : s.done ? <Check size={14} /> : null}</div>
          <b>{s.label}</b><span>{s.when ? fmtDate(s.when, true) : s.done ? '' : 'Pending'}</span>
        </div>
      ))}
    </div>
  );
}
