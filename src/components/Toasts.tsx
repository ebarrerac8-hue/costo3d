import { useApp } from '../context/AppContext';
import { Icon } from './Icon';

export function Toasts() {
  const { toasts, dismissToast } = useApp();
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`}>
          <Icon name={t.kind === 'error' ? 'alert' : t.kind === 'ok' ? 'check' : 'info'} />
          <span>{t.message}</span>
          <button type="button" className="icon-btn" onClick={() => dismissToast(t.id)} aria-label="Cerrar aviso">
            <Icon name="x" size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
