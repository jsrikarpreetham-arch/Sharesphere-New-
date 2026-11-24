import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';

type Kind = 'success' | 'error' | 'info';
interface T { id: number; kind: Kind; text: string }
const Ctx = createContext<(kind: Kind, text: string) => void>(() => {});
let n = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<T[]>([]);
  const dismiss = (id: number) => setItems((a) => a.filter((t) => t.id !== id));
  const push = useCallback((kind: Kind, text: string) => {
    const id = ++n;
    setItems((a) => [...a, { id, kind, text }]);
    setTimeout(() => dismiss(id), kind === 'error' ? 6000 : 3800);
  }, []);
  const Icon = { success: CheckCircle2, error: XCircle, info: Info };
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => {
          const I = Icon[t.kind];
          return (
            <div key={t.id} className={`toast toast-${t.kind}`}>
              <I size={18} /> <span>{t.text}</span>
              <button aria-label="Dismiss" onClick={() => dismiss(t.id)}><X size={15} /></button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}
export const useToast = () => {
  const push = useContext(Ctx);
  return { success: (t: string) => push('success', t), error: (t: string) => push('error', t), info: (t: string) => push('info', t) };
};
