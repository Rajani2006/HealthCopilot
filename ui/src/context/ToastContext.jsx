import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(({ type = 'info', message, title, action, duration = 4000 }) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newToast = { id, type, message, title, action };
    
    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="toast-container" role="region" aria-label="Notifications" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast-item ${toast.type}`}>
            <div className="toast-content">
              {toast.type === 'success' && <CheckCircle2 size={18} color="var(--color-success)" />}
              {toast.type === 'warning' && <AlertCircle size={18} color="var(--color-warning)" />}
              {toast.type === 'error' && <XCircle size={18} color="var(--color-critical)" />}
              {toast.type === 'info' && <Info size={18} color="var(--color-cyan)" />}
              <div>
                {toast.title && <strong style={{ display: 'block', fontSize: '13px' }}>{toast.title}</strong>}
                <span>{toast.message}</span>
              </div>
            </div>
            
            {toast.action && (
              <button
                className="btn btn-outline btn-sm"
                style={{ padding: '3px 8px', fontSize: '12px' }}
                onClick={() => {
                  toast.action.onClick();
                  removeToast(toast.id);
                }}
              >
                {toast.action.label}
              </button>
            )}

            <button
              onClick={() => removeToast(toast.id)}
              className="btn btn-ghost btn-sm"
              style={{ padding: '2px', marginLeft: '4px' }}
              aria-label="Close notification"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
