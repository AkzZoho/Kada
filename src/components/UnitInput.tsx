import React, { useState, useRef } from 'react';

const COMMON_UNITS = [
  'piece', 'nos', 'pair', 'dozen', 'set', 'bundle',
  'kg', 'g', 'mg',
  'litre', 'ml',
  'metre', 'cm',
  'box', 'packet', 'crate', 'bag', 'sachet',
];

interface UnitInputProps {
  value: string;
  onChange: (value: string) => void;
  usedUnits?: string[];
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

const UnitInput: React.FC<UnitInputProps> = ({
  value, onChange, usedUnits = [], placeholder = 'e.g. piece', className, style,
}) => {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = React.useMemo(() => {
    const all = [...new Set([...usedUnits.filter(Boolean), ...COMMON_UNITS])];
    const q = value.trim().toLowerCase();
    if (!q) return all;
    const starts = all.filter(u => u.toLowerCase().startsWith(q));
    const contains = all.filter(u => !u.toLowerCase().startsWith(q) && u.toLowerCase().includes(q));
    return [...starts, ...contains];
  }, [value, usedUnits]);

  return (
    <div className="unit-input-wrap" style={style}>
      <input
        ref={inputRef}
        className={className}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && suggestions.length > 0 && (
        <div className="unit-suggestions">
          {suggestions.map(u => (
            <button
              key={u}
              type="button"
              className={`unit-suggestion${value === u ? ' active' : ''}`}
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onChange(u); setOpen(false); }}
            >
              {u}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default UnitInput;
