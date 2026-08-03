type HeaderColors = {
  card: string;
  border: string;
  primary: string;
  text: string;
  textMuted: string;
};

type AppHeaderProps = {
  isDark: boolean;
  isMobile: boolean;
  colors: HeaderColors;
  onToggleTheme: () => void;
};

export default function AppHeader({
  isDark,
  isMobile,
  colors,
  onToggleTheme
}: AppHeaderProps) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: isMobile ? 'flex-start' : 'center',
        justifyContent: 'space-between',
        gap: '20px',
        marginBottom: '28px',
        flexDirection: isMobile ? 'column' : 'row'
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: '42px',
              height: '42px',
              flexShrink: 0,
              borderRadius: '8px',
              backgroundColor: colors.primary,
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}
          >
            <svg
              style={{
                width: '24px',
                height: '24px'
              }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </span>

          <h1
            style={{
              margin: 0,
              fontSize: isMobile ? '21px' : '24px',
              fontWeight: 800,
              letterSpacing: '-0.025em'
            }}
          >
            Margin Modeler
          </h1>
        </div>

        <p
          style={{
            color: colors.textMuted,
            fontSize: '13px',
            lineHeight: 1.5,
            margin: '6px 0 0'
          }}
        >
          Plan resource allocations, schedules, pricing, and project margins
          in a cloud-backed workspace.
        </p>
      </div>

      <div
        style={{
          width: isMobile ? '100%' : 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          justifyContent: isMobile ? 'flex-start' : 'flex-end'
        }}
      >
        <div
          title="Workspace persistence is active"
          style={{
            minHeight: '34px',
            padding: '6px 14px',
            borderRadius: '20px',
            backgroundColor: isDark
              ? 'rgba(255, 255, 255, 0.04)'
              : '#f1f5f9',
            border: `1px solid ${colors.border}`,
            fontSize: '11px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#10b981',
            boxSizing: 'border-box'
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#10b981'
            }}
          />

          Database Synced
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={
            isDark
              ? 'Switch to light theme'
              : 'Switch to dark theme'
          }
          aria-pressed={isDark}
          style={{
            minHeight: '34px',
            padding: '8px 12px',
            borderRadius: '10px',
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.card,
            color: colors.text,
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600,
            transition: 'all 0.15s ease',
            margin: 0
          }}
        >
          {isDark ? '☀️ Light' : '🌙 Dark'}
        </button>
      </div>
    </header>
  );
}