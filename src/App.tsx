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
  { id: 'pos',      Icon: Receipt,       label: 'POS' },
  { id: 'products', Icon: Package,       label: 'Products' },
  { id: 'history',  Icon: ClipboardList, label: 'History' },
  { id: 'settings', Icon: Settings2,     label: 'Settings' },
];

export default function App() {
  const [screen, setScreen] = useState<Screen>(() => {
    const saved = localStorage.getItem('pos_screen');
    return (['products', 'history', 'settings'].includes(saved ?? ''))
      ? saved as Screen : 'pos';
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [shopInfo, setShopInfo] = useState<ShopInfo>(() => storage.getShopInfo());
  const [operators, setOperators] = useState<string[]>([]);
  const [operatorPrompt, setOperatorPrompt] = useState(false);
  const [selectedOp, setSelectedOp] = useState('');

  useEffect(() => {
    storage.seedIfEmpty();
    setProducts(storage.getProducts());
    const info = storage.getShopInfo();
    const ops = storage.getOperators();
    setShopInfo(info);
    setOperators(ops);
    // Show prompt when operators are defined but none is selected for this session
    if (ops.length > 0 && !info.operatorName) {
      setOperatorPrompt(true);
    }
  }, []);

  function handleProductsUpdate(updated: Product[]) {
    storage.saveProducts(updated);
    setProducts(updated);
  }

  function handleSettingsSave(info: ShopInfo, ops: string[]) {
    setShopInfo(info);
    setOperators(ops);
  }

  function handleOperatorChange(name: string) {
    const info: ShopInfo = { ...shopInfo, operatorName: name };
    storage.setShopInfo(info);
    setShopInfo(info);
  }

  function confirmOperator() {
    if (!selectedOp) return;
    handleOperatorChange(selectedOp);
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
          {screen === 'pos' && (
            <POS
              products={products}
              onBillSaved={() => {}}
              operators={operators}
              operatorName={shopInfo.operatorName}
              onOperatorChange={handleOperatorChange}
            />
          )}
          {screen === 'products' && <Products products={products} onUpdate={handleProductsUpdate} />}
          {screen === 'history' && (
            <BillHistory bills={storage.getBills()} onDelete={(id) => { storage.deleteBill(id); }} />
          )}
          {screen === 'settings' && (
            <Settings shopInfo={shopInfo} operators={operators} onSave={handleSettingsSave} />
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

      {/* Operator selection prompt (shown when operators exist but none active) */}
      {operatorPrompt && (
        <div className="modal-overlay" onClick={() => {}}>
          <div className="modal" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Who's on the counter?</h3>
              <button className="modal-close" onClick={() => setOperatorPrompt(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-field">
                <label>Select Operator</label>
                <select
                  value={selectedOp}
                  onChange={e => setSelectedOp(e.target.value)}
                  autoFocus
                >
                  <option value="">— Choose —</option>
                  {operators.map(op => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setOperatorPrompt(false)}>Skip</button>
              <button className="btn btn-primary" onClick={confirmOperator} disabled={!selectedOp}>
                Start Shift
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
