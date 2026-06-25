import React, { useState } from 'react';
import { Receipt, Package, Settings2, User, LogOut, ShoppingBag, BarChart2, ChevronDown, Check, Store } from 'lucide-react';
import type { Screen, ShopInfo, Tenant } from '../types';

interface SidebarProps {
  screen: Screen;
  onNav: (s: Screen) => void;
  shopInfo: ShopInfo;
  onEditSettings: () => void;
  onSignOut: () => void;
  tenants: Tenant[];
  activeTenant: Tenant;
  onSwitchTenant: (tenant: Tenant) => void;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(date: Date): string {
  return `${DAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

const NAV_ITEMS: { screen: Screen; Icon: React.FC<{ size: number }>; label: string }[] = [
  { screen: 'pos',      Icon: Receipt,      label: 'POS' },
  { screen: 'products', Icon: Package,      label: 'Products' },
  { screen: 'purchase', Icon: ShoppingBag,  label: 'Purchase' },
  { screen: 'reports',  Icon: BarChart2,    label: 'Reports' },
];

const Sidebar: React.FC<SidebarProps> = ({ screen, onNav, shopInfo, onEditSettings, onSignOut, tenants, activeTenant, onSwitchTenant }) => {
  const [tenantDropOpen, setTenantDropOpen] = useState(false);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        {tenants.length > 1 ? (
          <div className="custom-select" style={{ width: '100%' }}>
            <button
              type="button"
              className={`custom-select-trigger${tenantDropOpen ? ' open' : ''}`}
              style={{ width: '100%', background: 'transparent', border: 'none', padding: '2px 0' }}
              onClick={() => setTenantDropOpen(o => !o)}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 15 }}>
                <Store size={14} />
                {activeTenant.name}
              </span>
              <ChevronDown size={13} className={`custom-select-chevron${tenantDropOpen ? ' flipped' : ''}`} />
            </button>
            {tenantDropOpen && (
              <div className="custom-select-menu">
                {tenants.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    className={`custom-select-option${activeTenant.id === t.id ? ' selected' : ''}`}
                    onClick={() => { onSwitchTenant(t); setTenantDropOpen(false); }}
                  >
                    {t.name}
                    {activeTenant.id === t.id && <Check size={13} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <h2>{shopInfo.name}</h2>
        )}
        <p>Billing Software</p>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ screen: s, Icon, label }) => (
          <button
            key={s}
            className={`nav-btn${screen === s ? ' active' : ''}`}
            onClick={() => onNav(s)}
          >
            <span className="icon"><Icon size={18} /></span>
            {label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        {shopInfo.operatorName && (
          <div className="sidebar-operator">
            <User size={12} />
            <span>{shopInfo.operatorName}</span>
          </div>
        )}
        <span className="date-str">{formatDate(new Date())}</span>
        <button className="sidebar-settings-btn" onClick={onEditSettings}>
          <Settings2 size={14} />
          Settings
        </button>
        <button className="sidebar-settings-btn" onClick={onSignOut} style={{ color: 'rgba(220,38,38,0.5)' }}>
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
