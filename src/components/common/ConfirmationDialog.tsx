export type ConfirmationRequest = {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
};

type ConfirmationColors = {
  card: string;
  border: string;
  error: string;
  text: string;
  textMuted: string;
};

type ConfirmationDialogProps = {
  confirmation: ConfirmationRequest;
  colors: ConfirmationColors;
  isDark: boolean;
  isMobile: boolean;
  onCancel: () => void;
};

export default function ConfirmationDialog({
  confirmation,
  colors,
  isDark,
  isMobile,
  onCancel
}: ConfirmationDialogProps) {
  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(2, 6, 23, 0.66)',
        backdropFilter: 'blur(4px)'
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-confirmation-title"
        aria-describedby="delete-confirmation-description"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: isMobile ? '22px' : '28px',
          border: `1px solid ${colors.border}`,
          borderRadius: '18px',
          backgroundColor: colors.card,
          color: colors.text,
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.34)'
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: '44px',
            height: '44px',
            marginBottom: '16px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDark
              ? 'rgba(239, 68, 68, 0.16)'
              : '#fee2e2',
            color: colors.error
          }}
        >
          <svg
            style={{
              width: '22px',
              height: '22px'
            }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v3.75m0 3.75h.008v.008H12v-.008zM10.29 3.86l-7.82 13.55A2 2 0 004.2 20.4h15.6a2 2 0 001.73-2.99L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
        </div>

        <h2
          id="delete-confirmation-title"
          style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: 800
          }}
        >
          {confirmation.title}
        </h2>

        <p
          id="delete-confirmation-description"
          style={{
            margin: '10px 0 0',
            color: colors.textMuted,
            fontSize: '13px',
            lineHeight: 1.65
          }}
        >
          {confirmation.message}
        </p>

        <div
          style={{
            marginTop: '24px',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            flexWrap: 'wrap'
          }}
        >
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            style={{
              padding: '10px 16px',
              borderRadius: '9px',
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.card,
              color: colors.text,
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={confirmation.onConfirm}
            style={{
              padding: '10px 16px',
              borderRadius: '9px',
              border: 'none',
              backgroundColor: colors.error,
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)'
            }}
          >
            {confirmation.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}