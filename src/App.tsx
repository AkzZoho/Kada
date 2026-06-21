import { useState, useEffect } from 'react';
import { Receipt, Package, ClipboardList, X } from 'lucide-react';
import { storage } from './storage';
import type { Product, Screen } from './types';
import Sidebar from './components/Sidebar';
import POS from './components/POS';
import Products from './components/Products';
import BillHistory from './components/BillHistory';
import './index.css';

const BOTTOM_NAV: { id: Screen; Icon: React.FC<{ size: number }>; label: string }[] = [
  { id: 'pos',      Icon: Receipt,      label: 'POS' },
  { id: 'products', Icon: Package,      label: 'Products' },
  { id: 'history',  Icon: ClipboardList, label: 'History' },
];

export default function App() {
  const [screen, setScreen] = useState<Screen>(() => {
    const saved = localStorage.getItem('pos_screen');
    return (saved === 'products' || saved === 'history') ? saved : 'pos';
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [shopName, setShopName] = useState(storage.getShopName());
  const [editingShop, setEditingShop] = useState(false);
  const [shopInput, setShopInput] = useState('');

  useEffect(() => {
    storage.seedIfEmpty();
    setProducts(storage.getProducts());
    setShopName(storage.getShopName());
  }, []);

  function handleProductsUpdate(updated: Product[]) {
    storage.saveProducts(updated);
    setProducts(updated);
  }

  function handleShopNameSave() {
    const name = shopInput.trim() || 'My Shop';
    storage.setShopName(name);
    setShopName(name);
    setEditingShop(false);
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
        shopName={shopName}
        onEditShopName={() => { setShopInput(shopName); setEditingShop(true); }}
      />
      <div className="main">
        <div className="screen">
          {screen === 'pos' && (
            <POS products={products} onBillSaved={() => {}} />
          )}
          {screen === 'products' && (
            <Products products={products} onUpdate={handleProductsUpdate} />
          )}
          {screen === 'history' && (
            <BillHistory bills={storage.getBills()} onDelete={(id) => {
              storage.deleteBill(id);
            }} />
          )}
        </div>
      </div>

      {/* Bottom nav — mobile only */}
      <nav className="bottom-nav">
        {BOTTOM_NAV.map(({ id, Icon, label }) => (
          <button
            key={id}
            className={`bottom-nav-btn${screen === id ? ' active' : ''}`}
            onClick={() => navigate(id)}
          >
            <span className="bn-icon"><Icon size={22} /></span>
            {label}
          </button>
        ))}
      </nav>

      {editingShop && (
        <div className="modal-overlay" onClick={() => setEditingShop(false)}>
          <div className="modal" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Shop Name</h3>
              <button className="modal-close" onClick={() => setEditingShop(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-field">
                <label>Shop Name</label>
                <input
                  autoFocus
                  value={shopInput}
                  onChange={e => setShopInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleShopNameSave()}
                  placeholder="Enter your shop name"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setEditingShop(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleShopNameSave}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
