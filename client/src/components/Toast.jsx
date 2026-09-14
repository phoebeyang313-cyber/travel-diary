import './Toast.css';

export default function Toast({ toast, onClose }) {
  if (!toast) return null;
  return (
    <div className={`toast toast-${toast.type || 'info'}`} role="status">
      <span className="toast-msg">{toast.message}</span>
      {toast.action && (
        <button className="toast-action" onClick={toast.action.onClick}>
          {toast.action.label}
        </button>
      )}
      <button className="toast-close" onClick={onClose} aria-label="关闭">
        ×
      </button>
    </div>
  );
}
