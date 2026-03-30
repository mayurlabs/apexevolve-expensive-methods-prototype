import { useApp } from '../context/AppContext';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

const ICONS = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  error: AlertTriangle,
};

const COLORS = {
  success: 'bg-sf-success',
  info: 'bg-sf-blue',
  warning: 'bg-sf-warning',
  error: 'bg-sf-error',
};

export default function ToastContainer() {
  const { state, dispatch } = useApp();

  if (state.toasts.length === 0) return null;

  return (
    <div className="fixed top-16 right-6 z-[100] space-y-2">
      {state.toasts.map((toast) => {
        const Icon = ICONS[toast.type] || ICONS.info;
        const color = COLORS[toast.type] || COLORS.info;
        return (
          <div
            key={toast.id}
            className={`flex items-start gap-2 px-4 py-3 ${color} text-white rounded-lg shadow-lg max-w-[400px] animate-fade-in-up`}
          >
            <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span className="text-[13px] leading-snug flex-1">{toast.message}</span>
            <button
              onClick={() => dispatch({ type: 'REMOVE_TOAST', payload: toast.id })}
              className="p-0.5 hover:bg-white/20 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
