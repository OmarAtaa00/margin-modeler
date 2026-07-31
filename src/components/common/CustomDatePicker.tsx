import { useEffect, useRef, useState } from 'react';
import { parseDateOnlyUtc } from '../../utils/dates';

type DatePickerColors = {
  card: string;
  border: string;
  inputBg: string;
  primary: string;
  text: string;
  textMuted: string;
};

type CustomDatePickerProps = {
  value: string;
  onChange: (date: string) => void;
  isDark: boolean;
  colors: DatePickerColors;
  align?: 'left' | 'right';
  disabled?: boolean;
};

export default function CustomDatePicker({
  value,
  onChange,
  isDark,
  colors,
  align = 'left',
  disabled = false
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [popoverLayout, setPopoverLayout] = useState({
    left: 0,
    width: 280
  });

  const containerRef = useRef<HTMLDivElement>(null);

  const parsedValue = parseDateOnlyUtc(value);
  const validDate = parsedValue ?? new Date();

  const [viewYear, setViewYear] = useState(validDate.getUTCFullYear());
  const [viewMonth, setViewMonth] = useState(validDate.getUTCMonth());

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    const date = parseDateOnlyUtc(value);

    if (date) {
      setViewYear(date.getUTCFullYear());
      setViewMonth(date.getUTCMonth());
    }
  }, [value]);

  const togglePicker = () => {
    if (disabled) return;

    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportPadding = 12;
      const availableWidth = Math.max(
        0,
        window.innerWidth - viewportPadding * 2
      );
      const width = Math.min(280, availableWidth);

      let left = align === 'right' ? rect.width - width : 0;
      const absoluteLeft = rect.left + left;

      if (absoluteLeft < viewportPadding) {
        left += viewportPadding - absoluteLeft;
      }

      const absoluteRight = rect.left + left + width;
      const maximumRight = window.innerWidth - viewportPadding;

      if (absoluteRight > maximumRight) {
        left -= absoluteRight - maximumRight;
      }

      setPopoverLayout({ left, width });
    }

    setIsOpen((open) => !open);
  };

  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ];

  const currentYear = new Date().getFullYear();
  const years: number[] = [];

  for (let year = currentYear - 5; year <= currentYear + 10; year += 1) {
    years.push(year);
  }

  const daysInMonth = new Date(
    Date.UTC(viewYear, viewMonth + 1, 0)
  ).getUTCDate();

  const firstDayOffset = new Date(
    Date.UTC(viewYear, viewMonth, 1)
  ).getUTCDay();

  const daysGrid: Array<number | null> = [];

  for (let index = 0; index < firstDayOffset; index += 1) {
    daysGrid.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    daysGrid.push(day);
  }

  const handleDaySelect = (day: number) => {
    const formattedMonth = String(viewMonth + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');

    onChange(`${viewYear}-${formattedMonth}-${formattedDay}`);
    setIsOpen(false);
  };

  const handlePreviousMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((year) => year - 1);
      return;
    }

    setViewMonth((month) => month - 1);
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((year) => year + 1);
      return;
    }

    setViewMonth((month) => month + 1);
  };

  const displayLabel = validDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  });

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%'
      }}
    >
      <button
        type="button"
        onClick={togglePicker}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={`Choose date. Current date: ${displayLabel}`}
        disabled={disabled}
        style={{
          width: '100%',
          minHeight: '38px',
          margin: 0,
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: '8px',
          border: `1px solid ${colors.border}`,
          backgroundColor: colors.inputBg,
          color: colors.text,
          fontSize: '13px',
          fontWeight: 500,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.68 : 1,
          outline: 'none',
          boxSizing: 'border-box',
          boxShadow: 'none',
          WebkitAppearance: 'none',
          appearance: 'none'
        }}
      >
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {displayLabel}
        </span>

        <svg
          aria-hidden="true"
          style={{
            width: '16px',
            height: '16px',
            marginLeft: '6px',
            color: colors.textMuted,
            flexShrink: 0
          }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Choose a date"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: `${popoverLayout.left}px`,
            zIndex: 10000,
            width: `${popoverLayout.width}px`,
            maxWidth: 'calc(100vw - 24px)',
            padding: '12px',
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: '12px',
            boxShadow:
              '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.15)',
            boxSizing: 'border-box'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '4px',
              marginBottom: '12px'
            }}
          >
            <button
              type="button"
              onClick={handlePreviousMonth}
              aria-label="Previous month"
              style={{
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                borderRadius: '6px',
                background: 'transparent',
                color: colors.text,
                cursor: 'pointer'
              }}
            >
              <svg
                aria-hidden="true"
                style={{ width: '16px', height: '16px' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <div style={{ display: 'flex', gap: '4px' }}>
              <select
                value={viewMonth}
                onChange={(event) =>
                  setViewMonth(Number(event.target.value))
                }
                aria-label="Month"
                style={{
                  padding: '2px 4px',
                  borderRadius: '4px',
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                  fontSize: '12px',
                  fontWeight: 700,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {months.map((month, index) => (
                  <option key={month} value={index}>
                    {month}
                  </option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(event) =>
                  setViewYear(Number(event.target.value))
                }
                aria-label="Year"
                style={{
                  padding: '2px 4px',
                  borderRadius: '4px',
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                  fontSize: '12px',
                  fontWeight: 700,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Next month"
              style={{
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                borderRadius: '6px',
                background: 'transparent',
                color: colors.text,
                cursor: 'pointer'
              }}
            >
              <svg
                aria-hidden="true"
                style={{ width: '16px', height: '16px' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '2px',
              marginBottom: '6px',
              textAlign: 'center'
            }}
          >
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(
              (weekday) => (
                <span
                  key={weekday}
                  style={{
                    color: colors.textMuted,
                    fontSize: '11px',
                    fontWeight: 600
                  }}
                >
                  {weekday}
                </span>
              )
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '4px'
            }}
          >
            {daysGrid.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} />;
              }

              const formattedMonth = String(viewMonth + 1).padStart(2, '0');
              const formattedDay = String(day).padStart(2, '0');
              const date = `${viewYear}-${formattedMonth}-${formattedDay}`;
              const isSelected = date === value;

              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => handleDaySelect(day)}
                  aria-label={date}
                  aria-pressed={isSelected}
                  style={{
                    padding: '6px 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: isSelected
                      ? colors.primary
                      : 'transparent',
                    color: isSelected ? '#ffffff' : colors.text,
                    fontSize: '11px',
                    fontWeight: isSelected ? 700 : 400,
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                  onMouseEnter={(event) => {
                    if (!isSelected) {
                      event.currentTarget.style.backgroundColor = isDark
                        ? 'rgba(255, 255, 255, 0.1)'
                        : '#f1f5f9';
                    }
                  }}
                  onMouseLeave={(event) => {
                    if (!isSelected) {
                      event.currentTarget.style.backgroundColor =
                        'transparent';
                    }
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}