import React from 'react';
import { Receipt, Package, ClipboardList, Pencil } from 'lucide-react';
import type { Screen } from '../types';

interface SidebarProps {
  screen: Screen;
  onNav: (s: Screen) => void;
  shopName: string;
  onEditShopName: () => void;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(date: Date): string {
  return `${DAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

const NAV_ITEMS: { screen: Screen; Icon: React.FC<{ size: number }>; label: string }[] = [
  { screen: 'pos',      Icon: Receipt,       label: 'POS' },
  { screen: 'products', Icon: Package,        label: 'Products' },
  { screen: 'history',  Icon: ClipboardList,  label: 'History' },
];

const Sidebar: React.FC<SidebarProps> = ({ screen, onNav, shopName, onEditShopName }) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand" onClick={onEditShopName} style={{ cursor: 'pointer' }} title="Click to edit shop name">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2>{shopName}</h2>
          <Pencil size={13} color="rgba(212,168,32,0.6)" />
        </div>
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
        <span className="date-str">{formatDate(new Date())}</span>
      </div>
    </aside>
  );
};

export default Sidebar;
