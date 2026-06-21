import { useState, useEffect } from 'react';
import { Receipt, Package, ClipboardList, X } from 'lucide-react';
import { storage } from './storage';
import type { Product, Screen, ShopInfo } from './types';
import Sidebar from './components/Sidebar';
import POS from './components/POS';
import Products from './components/Products';
import BillHistory from './components/BillHistory';
import './index.css';

const BOTTOM_NAV: { id: Screen; Icon: React.FC<{ size: number }>; label: string }[] = [
  { id: 'pos',      Icon: Receipt,       label: 'POS' },
  { id: 'products', Icon: Package,       label: 'Products' },
  { id: 'history',  Icon: ClipboardList, label: 'History' },
];

export default function App() {
  const [screen, setScreen] = useState<Screen>(() => {
    const saved = localStorage.getItem('pos_screen');
    return (saved === 'products' || saved === 'history') ? saved : 'pos';
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [shopInfo, setShopInfo] = useState<ShopInfo>(() => storage.getShopInfo());
  const [editingShop, setEditingShop] = useState(false);
  const [shopForm, setShopForm] = useState<ShopInfo>(shopInfo);

  useEffect(() => {
    storage.seedIfEmpty();
    setProducts(storage.getProducts());
    setShopInfo(storage.getShopInfo());
  }, []);

  function handleProductsUpdate(updated: Product[]) {
    storage.saveProducts(updated);
    setProducts(updated);
  }

  function openShopSettings() {
    setShopForm(shopInfo);
    setEditingShop(true);
  }

  function handleShopSave() {
    const info: ShopInfo = {
      name: shopForm.name.trim() || 'My Shop',
      address: shopForm.address.trim(),
      gstin: shopForm.gstin.trim().toUpperCase(),
      phone: shopForm.phone.trim(),
    };
    storage.setShopInfo(info);
    setShopInfo(info);
    setEditingShop(false);
  }

  function navigate(to: Screen) {
    setScreen(to);
    localStorage.setItem('pos_screen', to);
    window.scrollTo(0, 0);
  }

  return (
    <>
      <Sidebar screen={screen} onNav={navigate} shopName={shopInfo.name} onEditShopName={openShopSettings} />
      <div className="main">
        <div className="screen">
          {screen === 'pos' && <POS products={products} onBillSaved={() => {}} />}
          {screen === 'products' && <Products products={products} onUpdate={handleProductsUpdate} />}
          {screen === 'history' && (
            <BillHistory bills={storage.getBills()} onDelete={(id) => { storage.deleteBill(id); }} />
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

      {editingShop && (
        <div className="modal-overlay" onClick={() => setEditingShop(false)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Shop Settings</h3>
              <button className="modal-close" onClick={() => setEditingShop(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-field">
                  <label>Shop Name *</label>
                  <input
                    autoFocus
                    type="text"
                    value={shopForm.name}
                    onChange={e => setShopForm(f => ({ ...f, name: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleShopSave()}
                    placeholder="e.g. Anandha Stores"
                  />
                </div>
                <div className="form-field">
                  <label>Address</label>
                  <input
                    type="text"
                    value={shopForm.address}
                    onChange={e => setShopForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="e.g. Main Road, Thrissur, Kerala"
                  />
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <label>GSTIN</label>
                    <input
                      type="text"
                      value={shopForm.gstin}
                      onChange={e => setShopForm(f => ({ ...f, gstin: e.target.value }))}
                      placeholder="e.g. 32ABCDE1234F1Z5"
                      maxLength={15}
                    />
                  </div>
                  <div className="form-field">
                    <label>Phone</label>
                    <input
                      type="tel"
                      value={shopForm.phone}
                      onChange={e => setShopForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="e.g. 9876543210"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setEditingShop(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleShopSave}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
