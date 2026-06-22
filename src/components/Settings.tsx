import React, { useState } from 'react';
import { Store, Users, Save, Plus, Trash2, Upload, X, Ruler } from 'lucide-react';
import type { ShopInfo } from '../types';

interface SettingsProps {
  shopInfo: ShopInfo;
  operators: string[];
  units: string[];
  onSave: (info: ShopInfo, operators: string[]) => void;
  onUnitsChange: (units: string[]) => void;
}

function compressImage(file: File, maxSize = 240): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

const Settings: React.FC<SettingsProps> = ({ shopInfo, operators: initOperators, units, onSave, onUnitsChange }) => {
  const [form, setForm] = useState<ShopInfo>(shopInfo);
  const [operators, setOperators] = useState<string[]>(initOperators);
  const [newOp, setNewOp] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [saved, setSaved] = useState(false);

  function set(field: keyof ShopInfo) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    setForm(f => ({ ...f, logo: compressed }));
    e.target.value = '';
  }

  function addOperator() {
    const name = newOp.trim();
    if (!name || operators.includes(name)) return;
    setOperators(prev => [...prev, name]);
    setNewOp('');
  }

  function removeOperator(name: string) {
    setOperators(prev => prev.filter(o => o !== name));
    if (form.operatorName === name) setForm(f => ({ ...f, operatorName: '' }));
  }

  function addUnit() {
    const unit = newUnit.trim();
    if (!unit || units.includes(unit)) return;
    onUnitsChange([...units, unit]);
    setNewUnit('');
  }

  function removeUnit(unit: string) {
    onUnitsChange(units.filter(u => u !== unit));
  }

  function handleSave() {
    const info: ShopInfo = {
      name: form.name.trim() || 'My Shop',
      address: form.address.trim(),
      gstin: form.gstin.trim().toUpperCase(),
      phone: form.phone.trim(),
      operatorName: form.operatorName,
      logo: form.logo,
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

        <div className="logo-upload-row">
          <div className="logo-upload-preview">
            {form.logo
              ? <img src={form.logo} alt="Shop logo" />
              : <span>{form.name ? form.name[0].toUpperCase() : 'S'}</span>
            }
          </div>
          <div className="logo-upload-actions">
            <label className="btn btn-ghost logo-upload-btn">
              <Upload size={14} />
              {form.logo ? 'Change Logo' : 'Upload Logo'}
              <input type="file" accept="image/*" onChange={handleLogoUpload} hidden />
            </label>
            {form.logo && (
              <button className="btn btn-ghost logo-remove-btn" onClick={() => setForm(f => ({ ...f, logo: '' }))}>
                <X size={14} /> Remove
              </button>
            )}
            <p className="settings-hint">Optional · PNG or JPG · shown on invoices</p>
          </div>
        </div>

        <div className="form-grid">
          <div className="form-field">
            <label>Shop Name *</label>
            <input type="text" value={form.name} onChange={set('name')} placeholder="e.g. Anandha Stores" />
          </div>
          <div className="form-field">
            <label>Address</label>
            <input type="text" value={form.address} onChange={set('address')} placeholder="e.g. Main Road, Thrissur, Kerala" />
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>GSTIN</label>
              <input type="text" value={form.gstin} onChange={set('gstin')} placeholder="e.g. 32ABCDE1234F1Z5" maxLength={15} />
            </div>
            <div className="form-field">
              <label>Phone</label>
              <input type="tel" value={form.phone} onChange={set('phone')} placeholder="e.g. 9876543210" />
            </div>
          </div>
        </div>
      </div>

      {/* Units of Measure */}
      <div className="settings-section">
        <div className="settings-section-title">
          <Ruler size={15} />
          Units of Measure
        </div>

        <div className="settings-hint" style={{ marginBottom: 12 }}>
          These units appear across Products, Purchase Requests, and billing. Changes apply immediately.
        </div>

        <div className="unit-chips">
          {units.map(u => (
            <div key={u} className="unit-chip">
              <span>{u}</span>
              <button
                className="unit-chip-del"
                onClick={() => removeUnit(u)}
                title={`Remove "${u}"`}
              >
                <X size={11} />
              </button>
            </div>
          ))}
          {units.length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No units yet — add one below.</div>
          )}
        </div>

        <div className="op-add-row" style={{ marginTop: 14 }}>
          <input
            type="text"
            className="op-add-input"
            placeholder="Add unit (e.g. dozen, sachet, mala)…"
            value={newUnit}
            onChange={e => setNewUnit(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addUnit()}
          />
          <button
            className="btn btn-ghost op-add-btn"
            onClick={addUnit}
            disabled={!newUnit.trim() || units.includes(newUnit.trim())}
          >
            <Plus size={15} /> Add
          </button>
        </div>
      </div>

      {/* Operators */}
      <div className="settings-section">
        <div className="settings-section-title">
          <Users size={15} />
          Employees / Operators
        </div>

        <div className="form-field" style={{ marginBottom: 16 }}>
          <label>Currently on Counter</label>
          <select value={form.operatorName} onChange={set('operatorName')} disabled={operators.length === 0}>
            <option value="">— Select operator —</option>
            {operators.map(op => <option key={op} value={op}>{op}</option>)}
          </select>
          {operators.length === 0 && <p className="settings-hint">Add employees below to enable this dropdown.</p>}
        </div>

        <div className="op-list">
          {operators.map(op => (
            <div key={op} className="op-item">
              <span className="op-name">{op}</span>
              <button className="icon-btn del" onClick={() => removeOperator(op)} title="Remove"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>

        <div className="op-add-row">
          <input
            type="text"
            className="op-add-input"
            placeholder="Add employee name…"
            value={newOp}
            onChange={e => setNewOp(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addOperator()}
          />
          <button className="btn btn-ghost op-add-btn" onClick={addOperator} disabled={!newOp.trim()}>
            <Plus size={15} /> Add
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
