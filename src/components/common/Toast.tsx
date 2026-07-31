export type ToastMessage = {
  message: string;
  type: 'success' | 'error';
};

type ToastProps = {
  toast: ToastMessage;
  isMobile: boolean;
  successColor: string;
  errorColor: string;
};

export default function Toast({
  toast,
  isMobile,
  successColor,
  errorColor
}: ToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: isMobile ? '12px' : '24px',
        right: isMobile ? '12px' : '24px',
        left: isMobile ? '12px' : 'auto',
        zIndex: 9999,
        padding: '12px 24px',
        borderRadius: '12px',
        backgroundColor:
          toast.type === 'success' ? successColor : errorColor,
        color: '#ffffff',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
        fontWeight: 600,
        fontSize: '13px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        animation: 'slideIn 0.25s ease-out'
      }}
    >
      <span aria-hidden="true">
        {toast.type === 'success' ? '✓' : '✕'}
      </span>

      <span>{toast.message}</span>
    </div>
  );
}