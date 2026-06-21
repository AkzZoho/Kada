import React, { useState } from 'react';
import { Store, Users, Save, Plus, Trash2 } from 'lucide-react';
import type { ShopInfo } from '../types';

interface SettingsProps {
  shopInfo: ShopInfo;
  operators: string[];
  onSave: (info: ShopInfo, operators: string[]) => void;
}

const Settings: React.FC<SettingsProps> = ({ shopInfo, operators: initOperators, onSave }) => {
  const [form, setForm] = useState<ShopInfo>(shopInfo);
  const [operators, setOperators] = useState<string[]>(initOperators);
  const [newOp, setNewOp] = useState('');
  const [saved, setSaved] = useState(false);

  function set(field: keyof ShopInfo) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));
  }

  function addOperator() {
    const name = newOp.trim();
    if (!name || operators.includes(name)) return;
    setOperators(prev => [...prev, name]);
    setNewOp('');
  }

  function removeOperator(name: string) {
    setOperators(prev => prev.filter(o => o !== name));
    // if removing the active operator, clear it
    if (form.operatorName === name) {
      setForm(f => ({ ...f, operatorName: '' }));
    }
  }

  function handleSave() {
    const info: ShopInfo = {
      name: form.name.trim() || 'My Shop',
      address: form.address.trim(),
      gstin: form.gstin.trim().toUpperCase(),
      phone: form.phone.trim(),
      operatorName: form.operatorName,
    };
    onSave(info, operators);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="settings-screen">
      <div className="screen-header">
        <div className="screen-header-text">
          <h2>Settings</h2>
        </div>
      </div>

      {/* Shop Details */}
      <div className="settings-section">
        <div className="settings-section-title">
          <Store size={15} />
          Shop Details
        </div>
        <div className="form-grid">
          <div className="form-field">
            <label>Shop Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={set('name')}
              placeholder="e.g. Anandha Stores"
            />
          </div>
          <div className="form-field">
            <label>Address</label>
            <input
              type="text"
              value={form.address}
              onChange={set('address')}
              placeholder="e.g. Main Road, Thrissur, Kerala"
            />
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>GSTIN</label>
              <input
                type="text"
                value={form.gstin}
                onChange={set('gstin')}
                placeholder="e.g. 32ABCDE1234F1Z5"
                maxLength={15}
              />
            </div>
            <div className="form-field">
              <label>Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={set('phone')}
                placeholder="e.g. 9876543210"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Operators */}
      <div className="settings-section">
        <div className="settings-section-title">
          <Users size={15} />
          Employees / Operators
        </div>

        {/* Active operator dropdown */}
        <div className="form-field" style={{ marginBottom: 16 }}>
          <label>Currently on Counter</label>
          <select
            value={form.operatorName}
            onChange={set('operatorName')}
            disabled={operators.length === 0}
          >
            <option value="">— Select operator —</option>
            {operators.map(op => (
              <option key={op} value={op}>{op}</option>
            ))}
          </select>
          {operators.length === 0 && (
            <p className="settings-hint">Add employees below to enable this dropdown.</p>
          )}
        </div>

        {/* Employee list */}
        <div className="op-list">
          {operators.map(op => (
            <div key={op} className="op-item">
              <span className="op-name">{op}</span>
              <button
                className="icon-btn del"
                onClick={() => removeOperator(op)}
                title="Remove"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        {/* Add new employee */}
        <div className="op-add-row">
          <input
            type="text"
            className="op-add-input"
            placeholder="Add employee name…"
            value={newOp}
            onChange={e => setNewOp(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addOperator()}
          />
          <button
            className="btn btn-ghost op-add-btn"
            onClick={addOperator}
            disabled={!newOp.trim()}
          >
            <Plus size={15} />
            Add
          </button>
        </div>
      </div>

      <div className="settings-save-row">
        <button className="btn btn-primary settings-save-btn" onClick={handleSave}>
          <Save size={15} />
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default Settings;
