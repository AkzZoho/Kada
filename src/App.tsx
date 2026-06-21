import { useState, useEffect } from 'react';
import { Receipt, Package, ClipboardList, Settings2, X } from 'lucide-react';
import { storage } from './storage';
import type { Product, Screen, ShopInfo } from './types';
import Sidebar from './components/Sidebar';
import POS from './components/POS';
import Products from './components/Products';
import BillHistory from './components/BillHistory';
import Settings from './components/Settings';
import './index.css';

const BOTTOM_NAV: { id: Screen; Icon: React.FC<{ size: number }>; label: string }[] = [
  { id: 'pos',      Icon: Receipt,    label: 'POS' },
  { id: 'products', Icon: Package,    label: 'Products' },
  { id: 'history',  Icon: ClipboardList, label: 'History' },
  { id: 'settings', Icon: Settings2,  label: 'Settings' },
];

export default function App() {
  const [screen, setScreen] = useState<Screen>(() => {
    const saved = localStorage.getItem('pos_screen');
    return (['products', 'history', 'settings'].includes(saved ?? ''))
      ? saved as Screen : 'pos';
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [shopInfo, setShopInfo] = useState<ShopInfo>(() => storage.getShopInfo());
  const [operatorPrompt, setOperatorPrompt] = useState(false);
  const [operatorInput, setOperatorInput] = useState('');

  useEffect(() => {
    storage.seedIfEmpty();
    setProducts(storage.getProducts());
    const info = storage.getShopInfo();
    setShopInfo(info);
    // First-time operator name setup
    if (!info.operatorName) {
      setOperatorPrompt(true);
    }
  }, []);

  function handleProductsUpdate(updated: Product[]) {
    storage.saveProducts(updated);
    setProducts(updated);
  }

  function handleShopInfoSave(info: ShopInfo) {
    setShopInfo(info);
  }

  function saveOperator() {
    const name = operatorInput.trim();
    if (!name) return;
    const info: ShopInfo = { ...shopInfo, operatorName: name };
    storage.setShopInfo(info);
    setShopInfo(info);
    setOperatorPrompt(false);
  }

  function navigate(to: Screen) {
    setScreen(to);
    localStorage.setItem('pos_screen', to);
    window.scrollTo(0, 0);
  }

  return (
    <>
      <Sidebar
        screen={screen}
        onNav={navigate}
        shopInfo={shopInfo}
        onEditSettings={() => navigate('settings')}
      />
      <div className="main">
        <div className="screen">
          {screen === 'pos' && <POS products={products} onBillSaved={() => {}} />}
          {screen === 'products' && <Products products={products} onUpdate={handleProductsUpdate} />}
          {screen === 'history' && (
            <BillHistory bills={storage.getBills()} onDelete={(id) => { storage.deleteBill(id); }} />
          )}
          {screen === 'settings' && (
            <Settings shopInfo={shopInfo} onSave={handleShopInfoSave} />
          )}
        </div>
      </div>

      <nav className="bottom-nav">
        {BOTTOM_NAV.map(({ id, Icon, label }) => (
          <button key={id} className={`bottom-nav-btn${screen === id ? ' active' : ''}`} onClick={() => navigate(id)}>
            <span className="bn-icon"><Icon size={22} /></span>
            {label}
          </button>
        ))}
      </nav>

      {/* First-time operator name prompt */}
      {operatorPrompt && (
        <div className="modal-overlay" onClick={() => {}}>
          <div className="modal" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Who's on the counter?</h3>
              <button className="modal-close" onClick={() => setOperatorPrompt(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
                Enter your name. This is saved and you won't be asked again.
              </p>
              <div className="form-field">
                <label>Your Name</label>
                <input
                  autoFocus
                  type="text"
                  value={operatorInput}
                  onChange={e => setOperatorInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveOperator()}
                  placeholder="e.g. Rajan"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setOperatorPrompt(false)}>Skip</button>
              <button className="btn btn-primary" onClick={saveOperator} disabled={!operatorInput.trim()}>
                Save &amp; Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
