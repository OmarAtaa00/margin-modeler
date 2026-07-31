import { useEffect, useState } from 'react';
import { clampAllocation } from '../../utils/resourceCalculations';
import { formatEditableNumber } from '../../utils/formatting';

type ResourceInputColors = {
  border: string;
  inputBg: string;
  text: string;
};

type ResourceAllocationInputProps = {
  value: number;
  onCommit: (allocation: number) => void;
  colors: ResourceInputColors;
  disabled?: boolean;
};

export default function ResourceAllocationInput({
  value,
  onCommit,
  colors,
  disabled = false
}: ResourceAllocationInputProps) {
  const formattedValue = formatEditableNumber(value);
  const [draft, setDraft] = useState(formattedValue);

  useEffect(() => {
    setDraft(formattedValue);
  }, [formattedValue]);

  const commit = () => {
    const parsed = Number(draft);

    if (Number.isFinite(parsed)) {
      onCommit(clampAllocation(parsed));
      return;
    }

    setDraft(formattedValue);
  };

  return (
    <input
      type="number"
      min="0"
      max="100"
      step="0.01"
      inputMode="decimal"
      value={draft}
      disabled={disabled}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.currentTarget.blur();
        }

        if (event.key === 'Escape') {
          setDraft(formattedValue);
          event.currentTarget.blur();
        }
      }}
      className="compact-number-input"
      style={{
        width: '64px',
        height: '38px',
        padding: '0 7px',
        margin: 0,
        textAlign: 'center',
        fontSize: '12px',
        fontWeight: 700,
        lineHeight: 1,
        borderRadius: '9px',
        border: `1px solid ${colors.border}`,
        backgroundColor: colors.inputBg,
        color: colors.text,
        cursor: disabled ? 'not-allowed' : 'text',
        opacity: disabled ? 0.68 : 1,
        outline: 'none',
        boxShadow: 'none'
      }}
      aria-label="Allocation percentage input"
    />
  );
}
``