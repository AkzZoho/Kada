import { useState, useEffect, createContext, useContext } from 'react';
import { Receipt, Package, ClipboardList, Settings2, X, WifiOff } from 'lucide-react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth } from './lib/firebase';
import * as db from './lib/db';
import type { Bill, Product, Screen, ShopInfo } from './types';
import Sidebar from './components/Sidebar';
import POS from './components/POS';
import Products from './components/Products';
import BillHistory from './components/BillHistory';
import Settings from './components/Settings';
import AuthScreen from './components/AuthScreen';
import './index.css';

// ── Shop context ──────────────────────────────────────────────
export const ShopContext = createContext<ShopInfo>({
  name: 'My Shop', address: '', gstin: '', phone: '', operatorName: '',
});
export const useShop = () => useContext(ShopContext);

const BOTTOM_NAV: { id: Screen; Icon: React.FC<{ size: number }>; label: string }[] = [
  { id: 'pos',      Icon: Receipt,       label: 'POS' },
  { id: 'products', Icon: Package,       label: 'Products' },
  { id: 'history',  Icon: ClipboardList, label: 'History' },
  { id: 'settings', Icon: Settings2,     label: 'Settings' },
];

const DEFAULT_SHOP: ShopInfo = { name: 'My Shop', address: '', gstin: '', phone: '', operatorName: '' };

export default function App() {
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [shopId, setShopId] = useState('');
  const [shopInfo, setShopInfo] = useState<ShopInfo>(DEFAULT_SHOP);
  const [products, setProducts] = useState<Product[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [operators, setOperators] = useState<string[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [screen, setScreen] = useState<Screen>(() => {
    const s = localStorage.getItem('pos_screen');
    return (['products', 'history', 'settings'].includes(s ?? '')) ? s as Screen : 'pos';
  });
  const [operatorPrompt, setOperatorPrompt] = useState(false);
  const [selectedOp, setSelectedOp] = useState('');

  // ── Auth ─────────────────────────────────────────────────────
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        loadShopData(u.uid);
      } else {
        setAuthLoading(false);
        setShopId('');
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Online/offline banner ─────────────────────────────────────
  useEffect(() => {
    const onOnline  = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  async function loadShopData(userId: string) {
    try {
      // Try to load from Firestore (serves from IndexedDB cache when offline)
      let shop = await db.getShop(userId);

      // First-time user: create shop (requires network)
      if (!shop) shop = await db.createShop(userId);

      // Cache shopId locally so we can reference it offline before query cache warms up
      localStorage.setItem(`pos_shopid_${userId}`, shop.id);
      setShopId(shop.id);

      const activeOp = localStorage.getItem(`pos_operator_${shop.id}`) ?? '';
      setShopInfo({ ...shop.info, operatorName: activeOp || shop.info.operatorName });

      const [prods, ops, bls] = await Promise.all([
        db.getProducts(shop.id),
        db.getOperators(shop.id),
        db.getBills(shop.id),
      ]);

      setProducts(prods);
      setOperators(ops);
      setBills(bls);

      if (ops.length > 0 && !activeOp) setOperatorPrompt(true);
    } catch (e) {
      console.error('loadShopData error:', e);
    } finally {
      setAuthLoading(false);
    }
  }

  // ── Mutations (Firestore queues writes when offline automatically) ──

  async function handleProductsUpdate(updated: Product[]) {
    setProducts(updated);
    if (shopId) await db.saveProducts(shopId, updated);
  }

  async function handleNextBillNumber(): Promise<string> {
    try {
      // runTransaction requires network; falls back to local count if offline
      return await db.nextBillNumber(shopId);
    } catch {
      return `BILL-${String(bills.length + 1).padStart(4, '0')}`;
    }
  }

  async function handleBillSaved(bill: Bill) {
    setBills(prev => [bill, ...prev]);
    if (shopId) await db.saveBill(shopId, bill); // queued by Firestore if offline
  }

  async function handleBillDelete(id: string) {
    setBills(prev => prev.filter(b => b.id !== id));
    if (shopId) await db.deleteBill(shopId, id); // queued by Firestore if offline
  }

  async function handleSettingsSave(info: ShopInfo, ops: string[]) {
    setShopInfo(info);
    setOperators(ops);
    if (shopId) {
      await db.updateShop(shopId, info);
      await db.saveOperators(shopId, ops);
    }
  }

  function handleOperatorChange(name: string) {
    if (shopId) localStorage.setItem(`pos_operator_${shopId}`, name);
    setShopInfo(prev => ({ ...prev, operatorName: name }));
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

  async function handleSignOut() {
    await signOut(auth);
    setUser(null);
    setShopId('');
    setBills([]);
    setProducts([]);
    setOperators([]);
    setShopInfo(DEFAULT_SHOP);
  }

  // ── Loading / Auth screens ────────────────────────────────────

  if (authLoading) {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div className="auth-spinner" />
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  return (
    <ShopContext.Provider value={shopInfo}>
      {!isOnline && (
        <div className="sync-banner offline">
          <WifiOff size={14} />
          Offline — bills are saved locally and will sync when reconnected
        </div>
      )}

      <Sidebar
        screen={screen}
        onNav={navigate}
        shopInfo={shopInfo}
        onEditSettings={() => navigate('settings')}
        onSignOut={handleSignOut}
      />

      <div className={`main${!isOnline ? ' has-banner' : ''}`}>
        <div className="screen">
          {screen === 'pos' && (
            <POS
              products={products}
              operators={operators}
              operatorName={shopInfo.operatorName}
              onOperatorChange={handleOperatorChange}
              nextBillNumber={handleNextBillNumber}
              onBillSaved={handleBillSaved}
            />
          )}
          {screen === 'products' && <Products products={products} onUpdate={handleProductsUpdate} />}
          {screen === 'history' && <BillHistory bills={bills} onDelete={handleBillDelete} />}
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

      {operatorPrompt && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Who's on the counter?</h3>
              <button className="modal-close" onClick={() => setOperatorPrompt(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-field">
                <label>Select Operator</label>
                <select value={selectedOp} onChange={e => setSelectedOp(e.target.value)} autoFocus>
                  <option value="">— Choose —</option>
                  {operators.map(op => <option key={op} value={op}>{op}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setOperatorPrompt(false)}>Skip</button>
              <button className="btn btn-primary" onClick={confirmOperator} disabled={!selectedOp}>Start Shift</button>
            </div>
          </div>
        </div>
      )}
    </ShopContext.Provider>
  );
}
