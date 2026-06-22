import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown, Check, Plus } from 'lucide-react';

interface UnitSelectProps {
  value: string;
  onChange: (unit: string) => void;
  units: string[];
  onAddUnit?: (unit: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

const UnitSelect: React.FC<UnitSelectProps> = ({
  value, onChange, units, onAddUnit,
  placeholder = 'Select unit', className, style,
}) => {
  const [open, setOpen] = useState(false);
  const [newUnit, setNewUnit] = useState('');
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function openMenu() {
    if (wrapRef.current) {
      const rect = wrapRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const menuHeight = Math.min(280, window.innerHeight * 0.4);
      const openUpward = spaceBelow < menuHeight + 8 && rect.top > menuHeight;
      setMenuStyle({
        position: 'fixed',
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
        ...(openUpward
          ? { bottom: window.innerHeight - rect.top + 4 }
          : { top: rect.bottom + 4 }),
      });
    }
    setOpen(o => !o);
  }

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else setNewUnit('');
  }, [open]);

  const filtered = React.useMemo(() => {
    const q = newUnit.trim().toLowerCase();
    if (!q) return units;
    return units.filter(u => u.toLowerCase().includes(q));
  }, [units, newUnit]);

  function handleAdd() {
    const unit = newUnit.trim();
    if (!unit) return;
    if (!units.includes(unit) && onAddUnit) onAddUnit(unit);
    onChange(unit);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
    if (e.key === 'Escape') setOpen(false);
  }

  const isDuplicate = newUnit.trim() !== '' && units.includes(newUnit.trim());

  const menu = open ? ReactDOM.createPortal(
    <div className="us-menu" style={menuStyle}>
      <div className="us-search-row">
        <input
          ref={inputRef}
          type="text"
          className="us-search-input"
          value={newUnit}
          onChange={e => setNewUnit(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search or type new unit…"
        />
        {newUnit.trim() && !isDuplicate && onAddUnit && (
          <button type="button" className="us-add-btn" onClick={handleAdd} title="Add new unit">
            <Plus size={13} /> Add
          </button>
        )}
      </div>
      <div className="us-list">
        {filtered.length === 0 && (
          <div className="us-empty">
            {newUnit.trim()
              ? isDuplicate ? `"${newUnit.trim()}" already exists` : `Press Enter to add "${newUnit.trim()}"`
              : 'No units configured — type one above'}
          </div>
        )}
        {filtered.map(u => (
          <button
            key={u}
            type="button"
            className={`us-option${value === u ? ' selected' : ''}`}
            onMouseDown={e => e.preventDefault()}
            onClick={() => { onChange(u); setOpen(false); }}
          >
            <span>{u}</span>
            {value === u && <Check size={13} />}
          </button>
        ))}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className={`us-wrap${className ? ' ' + className : ''}`} style={style} ref={wrapRef}>
      <button
        type="button"
        className={`us-trigger${open ? ' open' : ''}${!value ? ' placeholder' : ''}`}
        onClick={openMenu}
      >
        <span>{value || placeholder}</span>
        <ChevronDown size={14} className={`us-chevron${open ? ' flipped' : ''}`} />
      </button>
      {menu}
    </div>
  );
};

export default UnitSelect;
