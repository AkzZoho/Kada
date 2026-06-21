import React from 'react';
import { Receipt, Package, ClipboardList, Settings2, User } from 'lucide-react';
import type { Screen, ShopInfo } from '../types';

interface SidebarProps {
  screen: Screen;
  onNav: (s: Screen) => void;
  shopInfo: ShopInfo;
  onEditSettings: () => void;
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

const Sidebar: React.FC<SidebarProps> = ({ screen, onNav, shopInfo, onEditSettings }) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h2>{shopInfo.name}</h2>
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
      </div>
    </aside>
  );
};

export default Sidebar;
