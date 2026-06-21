import React, { useState } from 'react';
import { Store, User, Save } from 'lucide-react';
import type { ShopInfo } from '../types';
import { storage } from '../storage';

interface SettingsProps {
  shopInfo: ShopInfo;
  onSave: (info: ShopInfo) => void;
}

const Settings: React.FC<SettingsProps> = ({ shopInfo, onSave }) => {
  const [form, setForm] = useState<ShopInfo>(shopInfo);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    const info: ShopInfo = {
      name: form.name.trim() || 'My Shop',
      address: form.address.trim(),
      gstin: form.gstin.trim().toUpperCase(),
      phone: form.phone.trim(),
      operatorName: form.operatorName.trim(),
    };
    storage.setShopInfo(info);
    onSave(info);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function set(field: keyof ShopInfo) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));
  }

  return (
    <div className="settings-screen">
      <div className="screen-header">
        <div className="screen-header-text">
          <h2>Settings</h2>
        </div>
      </div>

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

      <div className="settings-section">
        <div className="settings-section-title">
          <User size={15} />
          Operator
        </div>
        <div className="form-grid">
          <div className="form-field">
            <label>Your Name</label>
            <input
              type="text"
              value={form.operatorName}
              onChange={set('operatorName')}
              placeholder="e.g. Rajan"
            />
          </div>
        </div>
        <p className="settings-hint">Shown in the sidebar. Set once, change anytime.</p>
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
