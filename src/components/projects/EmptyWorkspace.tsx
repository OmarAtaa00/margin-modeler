type EmptyWorkspaceColors = {
    card: string;
    border: string;
    primary: string;
    textMuted: string;
};

type EmptyWorkspaceProps = {
    isDark: boolean;
    isMobile: boolean;
    colors: EmptyWorkspaceColors;
    onCreateProject: () => void;
};

export default function EmptyWorkspace({
    isDark,
    isMobile,
    colors,
    onCreateProject
}: EmptyWorkspaceProps) {
    return (
        <section
            style={{
                minHeight: '420px',
                borderRadius: '18px',
                border: `1px dashed ${colors.border}`,
                backgroundColor: colors.card,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: isMobile ? '28px 20px' : '48px',
                textAlign: 'center'
            }}
        >
            <div style={{ maxWidth: '480px' }}>
                <div
                    aria-hidden="true"
                    style={{
                        width: '56px',
                        height: '56px',
                        margin: '0 auto 18px',
                        borderRadius: '16px',
                        backgroundColor: isDark
                            ? 'rgba(59, 130, 246, 0.14)'
                            : '#dbeafe',
                        color: colors.primary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <svg
                        style={{
                            width: '28px',
                            height: '28px'
                        }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 4v16m8-8H4"
                        />
                    </svg>
                </div>

                <h2
                    style={{
                        margin: 0,
                        fontSize: '22px',
                        fontWeight: 800
                    }}
                >
                    No project tabs yet
                </h2>

                <p
                    style={{
                        margin: '10px 0 22px',
                        color: colors.textMuted,
                        fontSize: '13px',
                        lineHeight: 1.65
                    }}
                >
                    Your workspace is empty. Create a new project to start planning
                    resources, schedules, pricing, and margins.
                </p>

                <button
                    type="button"
                    onClick={onCreateProject}
                    style={{
                        padding: '11px 18px',
                        borderRadius: '10px',
                        border: 'none',
                        backgroundColor: colors.primary,
                        color: '#ffffff',
                        fontSize: '13px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)'
                    }}
                >
                    + Create project
                </button>
            </div>
        </section>
    );
}