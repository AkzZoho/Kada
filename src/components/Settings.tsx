import React, { useState, useEffect } from 'react';
import { Store, Users, Save, Plus, Trash2, Upload, X, Ruler, FlaskConical, UserPlus, Crown, ShieldCheck, CreditCard } from 'lucide-react';
import type { ShopInfo, TenantMember, TenantRole } from '../types';
import { seedTestData } from '../lib/seedData';
import * as db from '../lib/db';
import { auth } from '../lib/firebase';

interface SettingsProps {
  shopInfo: ShopInfo;
  shopId: string;
  tenantId: string;
  operators: string[];
  units: string[];
  onSave: (info: ShopInfo, operators: string[]) => void;
  onUnitsChange: (units: string[]) => void;
}

const ROLE_ICONS: Record<TenantRole, React.ReactNode> = {
  owner:   <Crown size={13} />,
  manager: <ShieldCheck size={13} />,
  cashier: <CreditCard size={13} />,
};

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

const Settings: React.FC<SettingsProps> = ({ shopInfo, shopId, tenantId, operators: initOperators, units, onSave, onUnitsChange }) => {
  const [form, setForm] = useState<ShopInfo>(shopInfo);
  const [operators, setOperators] = useState<string[]>(initOperators);
  const [newOp, setNewOp] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [saved, setSaved] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedDone, setSeedDone] = useState(false);

  // Members
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [inviteUid, setInviteUid] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TenantRole>('cashier');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const myUid = auth.currentUser?.uid;

  useEffect(() => {
    if (!tenantId) return;
    setMembersLoading(true);
    db.getTenantMembers(tenantId)
      .then(setMembers)
      .finally(() => setMembersLoading(false));
  }, [tenantId]);

  async function handleInvite() {
    if (!inviteUid.trim() || !inviteEmail.trim()) return;
    setInviting(true);
    setInviteError('');
    try {
      await db.inviteMember(tenantId, inviteUid.trim(), inviteEmail.trim(), inviteRole);
      const updated = await db.getTenantMembers(tenantId);
      setMembers(updated);
      setInviteUid('');
      setInviteEmail('');
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : 'Failed to add member');
    } finally {
      setInviting(false);
    }
  }

  async function handleRemoveMember(uid: string) {
    if (!window.confirm('Remove this member from the shop?')) return;
    await db.removeMember(tenantId, uid);
    setMembers(prev => prev.filter(m => m.uid !== uid));
  }

  async function handleRoleChange(uid: string, role: TenantRole) {
    await db.updateMemberRole(tenantId, uid, role);
    setMembers(prev => prev.map(m => m.uid === uid ? { ...m, role } : m));
  }

  async function handleSeedData() {
    if (!shopId || !tenantId || seeding) return;
    setSeeding(true);
    try {
      await seedTestData(tenantId, shopId);
      setSeedDone(true);
      setTimeout(() => setSeedDone(false), 4000);
    } finally {
      setSeeding(false);
    }
  }

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

      {/* Team Members */}
      <div className="settings-section">
        <div className="settings-section-title">
          <UserPlus size={15} />
          Team Members
        </div>
        <div className="settings-hint" style={{ marginBottom: 14 }}>
          Add members by their Firebase UID and email. Roles: Owner (full access), Manager (can edit), Cashier (POS + reports only).
        </div>

        {membersLoading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
        ) : (
          <div className="op-list" style={{ marginBottom: 16 }}>
            {members.map(m => (
              <div key={m.uid} className="op-item">
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                  {ROLE_ICONS[m.role]}
                  <span className="op-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.email}
                  </span>
                </span>
                {m.uid !== myUid && (
                  <>
                    <select
                      value={m.role}
                      onChange={e => handleRoleChange(m.uid, e.target.value as TenantRole)}
                      style={{ fontSize: 12, padding: '3px 6px' }}
                    >
                      <option value="owner">Owner</option>
                      <option value="manager">Manager</option>
                      <option value="cashier">Cashier</option>
                    </select>
                    <button className="icon-btn del" onClick={() => handleRemoveMember(m.uid)} title="Remove">
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
                {m.uid === myUid && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>You</span>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              className="op-add-input"
              placeholder="Firebase UID"
              value={inviteUid}
              onChange={e => setInviteUid(e.target.value)}
              style={{ flex: 1 }}
            />
            <input
              type="email"
              className="op-add-input"
              placeholder="Email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              style={{ flex: 1 }}
            />
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as TenantRole)}
              style={{ fontSize: 13, padding: '6px 8px' }}
            >
              <option value="owner">Owner</option>
              <option value="manager">Manager</option>
              <option value="cashier">Cashier</option>
            </select>
          </div>
          {inviteError && <div className="auth-error">{inviteError}</div>}
          <button
            className="btn btn-ghost op-add-btn"
            onClick={handleInvite}
            disabled={inviting || !inviteUid.trim() || !inviteEmail.trim()}
            style={{ alignSelf: 'flex-start' }}
          >
            <Plus size={15} /> {inviting ? 'Adding…' : 'Add Member'}
          </button>
        </div>
      </div>

      {/* Developer: seed test data */}
      <div className="settings-section" style={{ borderColor: 'var(--border)', opacity: 0.8 }}>
        <div className="settings-section-title">
          <FlaskConical size={15} />
          Developer Tools
        </div>
        <p className="settings-hint" style={{ marginBottom: 14 }}>
          Adds 22 products, 72 bills across 6 months, and 18 purchase requests — so you can explore the app with realistic data. Existing data is not overwritten.
        </p>
        <button
          className="btn btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: 7 }}
          onClick={handleSeedData}
          disabled={seeding || !shopId}
        >
          <FlaskConical size={15} />
          {seeding ? 'Seeding data…' : seedDone ? 'Done! Reload to see data' : 'Seed Test Data'}
        </button>
      </div>
    </div>
  );
};

export default Settings;
