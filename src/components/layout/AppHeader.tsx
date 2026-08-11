import AccountMenu from './AccountMenu';

type HeaderColors = {
  card: string;
  border: string;
  primary: string;
  text: string;
  textMuted: string;
};

type AppHeaderProps = {
  userEmail: string;
  isDark: boolean;
  isMobile: boolean;
  isSigningOut: boolean;
  signOutError: string | null;
  colors: HeaderColors;
  onToggleTheme: () => void;
  onSignOut: () => void;
};

export default function AppHeader({
  userEmail,
  isDark,
  isMobile,
  isSigningOut,
  signOutError,
  colors,
  onToggleTheme,
  onSignOut
}: AppHeaderProps) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: isMobile
          ? 'flex-start'
          : 'center',
        justifyContent: 'space-between',
        gap: '20px',
        marginBottom: '28px',
        flexDirection: isMobile
          ? 'column'
          : 'row'
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
              boxShadow:
                '0 4px 12px rgba(59, 130, 246, 0.3)'
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
              fontSize: isMobile
                ? '21px'
                : '24px',
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
          Plan resource allocations, schedules,
          pricing, and project margins in a
          cloud-backed workspace.
        </p>
      </div>

      <div
        style={{
          width: isMobile
            ? '100%'
            : 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'wrap',
          justifyContent: isMobile
            ? 'flex-start'
            : 'flex-end'
        }}
      >
        <div
          title="Workspace persistence is active"
          style={{
            minHeight: '38px',
            padding: '6px 13px',
            borderRadius: '11px',
            backgroundColor: isDark
              ? 'rgba(255, 255, 255, 0.04)'
              : '#f1f5f9',
            border: `1px solid ${colors.border}`,
            fontSize: '10px',
            fontWeight: 750,
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

        <AccountMenu
          email={userEmail}
          isDark={isDark}
          isMobile={isMobile}
          isSigningOut={isSigningOut}
          errorMessage={signOutError}
          colors={colors}
          onToggleTheme={onToggleTheme}
          onSignOut={onSignOut}
        />
      </div>
    </header>
  );
}