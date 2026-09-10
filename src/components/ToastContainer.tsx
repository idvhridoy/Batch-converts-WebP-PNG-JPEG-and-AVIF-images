import { AlertCircle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import React from 'react';
import { ToastMessage } from '../types';

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      id="toast-notifications-container"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((toast) => {
        let bg = 'bg-slate-900 text-white border-slate-800';
        let icon = <Info className="w-5 h-5 text-sky-400 shrink-0" />;

        if (toast.type === 'success') {
          bg = 'bg-slate-900 text-white border-emerald-500/40';
          icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
        } else if (toast.type === 'warning') {
          bg = 'bg-slate-900 text-white border-amber-500/40';
          icon = <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />;
        } else if (toast.type === 'error') {
          bg = 'bg-slate-900 text-white border-rose-500/40';
          icon = <XCircle className="w-5 h-5 text-rose-400 shrink-0" />;
        }

        return (
          <div
            key={toast.id}
            id={`toast-${toast.id}`}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-xl transition-all duration-200 animate-in fade-in slide-in-from-bottom-3 ${bg}`}
          >
            {icon}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-100">{toast.title}</div>
              {toast.message && (
                <div className="text-xs text-slate-300 mt-0.5 leading-relaxed">{toast.message}</div>
              )}
            </div>
            <button
              id={`toast-dismiss-${toast.id}`}
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
