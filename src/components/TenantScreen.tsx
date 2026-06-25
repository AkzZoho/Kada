import React, { useState } from 'react';
import { Plus, Store, LogOut } from 'lucide-react';
import type { Tenant } from '../types';

interface TenantScreenProps {
  tenants: Tenant[];
  onSelect: (tenant: Tenant) => void;
  onCreate: (name: string) => Promise<void>;
  onSignOut: () => void;
}

const TenantScreen: React.FC<TenantScreenProps> = ({ tenants, onSelect, onCreate, onSignOut }) => {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      await onCreate(name.trim());
      setName('');
      setCreating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create shop');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card" style={{ maxWidth: 420 }}>
        <div className="auth-brand">
          <div className="auth-logo">K</div>
          <h1>Kada</h1>
          <p>Select a shop to continue</p>
        </div>

        {tenants.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {tenants.map(t => (
              <button
                key={t.id}
                className="btn btn-ghost"
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', justifyContent: 'flex-start', fontSize: 15 }}
                onClick={() => onSelect(t)}
              >
                <Store size={18} />
                {t.name}
              </button>
            ))}
          </div>
        )}

        {creating ? (
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-field">
              <label>Shop / Business Name</label>
              <input
                type="text"
                autoFocus
                required
                placeholder="e.g. Anandha Stores"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            {error && <div className="auth-error">{error}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setCreating(false)} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading || !name.trim()}>
                {loading ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        ) : (
          <button
            className="btn btn-primary"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            onClick={() => setCreating(true)}
          >
            <Plus size={16} /> New Shop
          </button>
        )}

        <button
          className="btn btn-ghost"
          style={{ width: '100%', marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-muted)' }}
          onClick={onSignOut}
        >
          <LogOut size={15} /> Sign Out
        </button>
      </div>
    </div>
  );
};

export default TenantScreen;
