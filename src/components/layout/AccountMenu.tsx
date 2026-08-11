import {
    useEffect,
    useRef,
    useState
} from 'react';

type AccountMenuColors = {
    card: string;
    border: string;
    primary: string;
    text: string;
    textMuted: string;
};

type AccountMenuProps = {
    email: string;
    isDark: boolean;
    isMobile: boolean;
    isSigningOut: boolean;
    errorMessage: string | null;
    colors: AccountMenuColors;
    onToggleTheme: () => void;
    onSignOut: () => void;
};

export default function AccountMenu({
    email,
    isDark,
    isMobile,
    isSigningOut,
    errorMessage,
    colors,
    onToggleTheme,
    onSignOut
}: AccountMenuProps) {
    const [isOpen, setIsOpen] =
        useState(false);

    const containerRef =
        useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;

        const handlePointerDown = (
            event: PointerEvent
        ) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(
                    event.target as Node
                )
            ) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (
            event: KeyboardEvent
        ) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        window.addEventListener(
            'pointerdown',
            handlePointerDown
        );

        window.addEventListener(
            'keydown',
            handleKeyDown
        );

        return () => {
            window.removeEventListener(
                'pointerdown',
                handlePointerDown
            );

            window.removeEventListener(
                'keydown',
                handleKeyDown
            );
        };
    }, [isOpen]);

    const accountInitial =
        email.trim().charAt(0).toUpperCase() || 'A';

    return (
        <div
            ref={containerRef}
            style={{
                position: 'relative',
                width: isMobile ? '100%' : 'auto'
            }}
        >
            <button
                type="button"
                onClick={() =>
                    setIsOpen((current) => !current)
                }
                aria-haspopup="menu"
                aria-expanded={isOpen}
                style={{
                    width: isMobile ? '100%' : 'auto',
                    minHeight: '38px',
                    padding: '5px 9px 5px 6px',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isMobile
                        ? 'space-between'
                        : 'flex-start',
                    gap: '8px',
                    borderRadius: '11px',
                    border: `1px solid ${colors.border}`,
                    backgroundColor: colors.card,
                    color: colors.text,
                    cursor: 'pointer',
                    boxShadow: 'none'
                }}
            >
                <span
                    aria-hidden="true"
                    style={{
                        width: '27px',
                        height: '27px',
                        flexShrink: 0,
                        borderRadius: '9px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isDark
                            ? 'rgba(59, 130, 246, 0.18)'
                            : '#dbeafe',
                        color: colors.primary,
                        fontSize: '11px',
                        fontWeight: 900
                    }}
                >
                    {accountInitial}
                </span>

                <span
                    style={{
                        maxWidth: isMobile
                            ? 'none'
                            : '190px',
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: '11px',
                        fontWeight: 700
                    }}
                >
                    {email}
                </span>

                <svg
                    aria-hidden="true"
                    style={{
                        width: '14px',
                        height: '14px',
                        flexShrink: 0,
                        color: colors.textMuted,
                        transform: isOpen
                            ? 'rotate(180deg)'
                            : 'none',
                        transition:
                            'transform 0.15s ease'
                    }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                    />
                </svg>
            </button>

            {isOpen && (
                <div
                    role="menu"
                    aria-label="Account menu"
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        right: isMobile ? 'auto' : 0,
                        left: isMobile ? 0 : 'auto',
                        zIndex: 1000,
                        width: isMobile
                            ? '100%'
                            : '280px',
                        padding: '8px',
                        borderRadius: '13px',
                        border: `1px solid ${colors.border}`,
                        backgroundColor: colors.card,
                        boxShadow:
                            '0 18px 46px rgba(15, 23, 42, 0.18)'
                    }}
                >
                    <div
                        style={{
                            padding: '10px 11px 12px',
                            borderBottom: `1px solid ${colors.border}`
                        }}
                    >
                        <span
                            style={{
                                display: 'block',
                                color: colors.textMuted,
                                fontSize: '9px',
                                fontWeight: 850,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase'
                            }}
                        >
                            Signed in as
                        </span>

                        <span
                            style={{
                                display: 'block',
                                marginTop: '5px',
                                overflowWrap: 'anywhere',
                                color: colors.text,
                                fontSize: '12px',
                                fontWeight: 750
                            }}
                        >
                            {email}
                        </span>
                    </div>

                    <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                            onToggleTheme();
                            setIsOpen(false);
                        }}
                        style={{
                            width: '100%',
                            minHeight: '38px',
                            margin: '7px 0 0',
                            padding: '8px 10px',
                            border: 'none',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '9px',
                            backgroundColor: 'transparent',
                            color: colors.text,
                            fontSize: '11px',
                            fontWeight: 700,
                            textAlign: 'left',
                            cursor: 'pointer'
                        }}
                    >
                        <span aria-hidden="true">
                            {isDark ? '☀️' : '🌙'}
                        </span>

                        {isDark
                            ? 'Switch to light theme'
                            : 'Switch to dark theme'}
                    </button>

                    <button
                        type="button"
                        role="menuitem"
                        disabled={isSigningOut}
                        onClick={onSignOut}
                        style={{
                            width: '100%',
                            minHeight: '38px',
                            margin: '2px 0 0',
                            padding: '8px 10px',
                            border: 'none',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '9px',
                            backgroundColor: 'transparent',
                            color: '#ef4444',
                            fontSize: '11px',
                            fontWeight: 800,
                            textAlign: 'left',
                            cursor: isSigningOut
                                ? 'not-allowed'
                                : 'pointer',
                            opacity: isSigningOut
                                ? 0.6
                                : 1
                        }}
                    >
                        <svg
                            aria-hidden="true"
                            style={{
                                width: '16px',
                                height: '16px'
                            }}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1"
                            />
                        </svg>

                        {isSigningOut
                            ? 'Signing out...'
                            : 'Sign out'}
                    </button>

                    {errorMessage && (
                        <div
                            role="alert"
                            style={{
                                margin: '7px 2px 2px',
                                padding: '8px 9px',
                                borderRadius: '8px',
                                border:
                                    '1px solid rgba(248, 113, 113, 0.3)',
                                backgroundColor:
                                    'rgba(239, 68, 68, 0.09)',
                                color: isDark
                                    ? '#fca5a5'
                                    : '#b91c1c',
                                fontSize: '10px',
                                fontWeight: 650,
                                lineHeight: 1.5
                            }}
                        >
                            {errorMessage}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
