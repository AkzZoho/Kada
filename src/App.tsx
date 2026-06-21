import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { Receipt, Package, ClipboardList, Settings2, X, WifiOff } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import * as db from './lib/db';
import * as oq from './lib/offlineQueue';
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

export default function App() {
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [shopId, setShopId] = useState<string | null>(null);
  const [shopInfo, setShopInfo] = useState<ShopInfo>({ name: 'My Shop', address: '', gstin: '', phone: '', operatorName: '' });
  const [products, setProducts] = useState<Product[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [operators, setOperators] = useState<string[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasPendingSync, setHasPendingSync] = useState(false);

  const [screen, setScreen] = useState<Screen>(() => {
    const s = localStorage.getItem('pos_screen');
    return (['products', 'history', 'settings'].includes(s ?? '')) ? s as Screen : 'pos';
  });
  const [operatorPrompt, setOperatorPrompt] = useState(false);
  const [selectedOp, setSelectedOp] = useState('');

  // ── Sync offline queue ───────────────────────────────────────
  const flushOfflineQueue = useCallback(async (sid: string) => {
    const queue = oq.getOfflineQueue(sid);
    if (queue.length === 0) { setHasPendingSync(false); return; }
    let allSynced = true;
    for (const op of queue) {
      try {
        if (op.type === 'save' && op.bill) await db.saveBill(sid, op.bill);
        else if (op.type === 'delete' && op.billId) await db.deleteBill(op.billId);
      } catch {
        allSynced = false;
      }
    }
    if (allSynced) {
      oq.clearOfflineQueue(sid);
      setHasPendingSync(false);
      // Refresh bills from cloud after sync
      const fresh = await db.getBills(sid);
      setBills(fresh);
      oq.cacheBills(sid, fresh);
    }
  }, []);

  // ── Online/offline events ────────────────────────────────────
  useEffect(() => {
    const goOnline = async () => {
      setIsOnline(true);
      if (shopId) await flushOfflineQueue(shopId);
    };
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, [shopId, flushOfflineQueue]);

  // ── Auth ────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) loadShopData(session.user.id);
      else setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadShopData(session.user.id);
      else { setAuthLoading(false); setShopId(null); }
    });
    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadShopData(userId: string) {
    // Show cached data instantly while fetching from cloud
    const cachedSid = oq.getCachedShopId(userId);
    if (cachedSid) {
      setShopId(cachedSid);
      setProducts(oq.getCachedProducts(cachedSid));
      setBills(oq.getCachedBills(cachedSid));
      setHasPendingSync(oq.getOfflineQueue(cachedSid).length > 0);
    }

    if (!navigator.onLine) {
      setAuthLoading(false);
      return;
    }

    try {
      let shop = await db.getShop(userId);
      if (!shop) shop = await db.createShop(userId);

      oq.cacheShopId(userId, shop.id);
      const activeOp = localStorage.getItem(`pos_operator_${shop.id}`) ?? '';
      setShopId(shop.id);
      setShopInfo({ name: shop.name, address: shop.address, gstin: shop.gstin, phone: shop.phone, operatorName: activeOp });

      const [prods, bls, ops] = await Promise.all([
        db.getProducts(shop.id),
        db.getBills(shop.id),
        db.getOperators(shop.id),
      ]);

      // Merge offline bills into the list (they'll be synced separately)
      const offlineBills = oq.getOfflineQueue(shop.id)
        .filter(op => op.type === 'save' && op.bill)
        .map(op => op.bill!);
      const mergedBills = [...offlineBills, ...bls.filter(b => !offlineBills.find(o => o.id === b.id))];

      setProducts(prods);
      setBills(mergedBills);
      setOperators(ops);
      oq.cacheProducts(shop.id, prods);
      oq.cacheBills(shop.id, bls);

      const pending = oq.getOfflineQueue(shop.id);
      setHasPendingSync(pending.length > 0);
      if (pending.length > 0) await flushOfflineQueue(shop.id);

      if (ops.length > 0 && !activeOp) setOperatorPrompt(true);
    } catch (e) {
      console.error('Failed to load from cloud:', e);
    } finally {
      setAuthLoading(false);
    }
  }

  // ── Mutations ────────────────────────────────────────────────

  async function handleProductsUpdate(updated: Product[]) {
    setProducts(updated);
    if (shopId) oq.cacheProducts(shopId, updated);
    if (isOnline && shopId) await db.saveProducts(shopId, updated);
  }

  async function handleNextBillNumber(): Promise<string> {
    if (isOnline && shopId) return db.nextBillNumber(shopId);
    // Offline: generate from local bills count + a timestamp suffix
    const count = bills.length + (oq.getOfflineQueue(shopId!).filter(o => o.type === 'save').length) + 1;
    return `BILL-${String(count).padStart(4, '0')}`;
  }

  async function handleBillSaved(bill: Bill) {
    const updated = [bill, ...bills];
    setBills(updated);
    oq.cacheBills(shopId!, updated);

    if (isOnline && shopId) {
      try {
        await db.saveBill(shopId, bill);
      } catch {
        oq.enqueueSaveBill(shopId, bill);
        setHasPendingSync(true);
      }
    } else if (shopId) {
      oq.enqueueSaveBill(shopId, bill);
      setHasPendingSync(true);
    }
  }

  async function handleBillDelete(id: string) {
    const updated = bills.filter(b => b.id !== id);
    setBills(updated);
    oq.cacheBills(shopId!, updated);

    if (isOnline && shopId) {
      try { await db.deleteBill(id); }
      catch { oq.enqueueDeleteBill(shopId, id); setHasPendingSync(true); }
    } else if (shopId) {
      oq.enqueueDeleteBill(shopId, id);
      setHasPendingSync(true);
    }
  }

  async function handleSettingsSave(info: ShopInfo, ops: string[]) {
    setShopInfo(info);
    setOperators(ops);
    if (isOnline && shopId) {
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

  // ── Loading / Auth screens ───────────────────────────────────

  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
        <div className="auth-spinner" />
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  return (
    <ShopContext.Provider value={shopInfo}>
      {/* Offline / sync banner */}
      {(!isOnline || hasPendingSync) && (
        <div className={`sync-banner ${hasPendingSync && isOnline ? 'syncing' : 'offline'}`}>
          <WifiOff size={14} />
          {!isOnline
            ? 'You\'re offline — bills saved locally and will sync when reconnected'
            : 'Syncing offline bills to cloud…'
          }
        </div>
      )}

      <Sidebar
        screen={screen}
        onNav={navigate}
        shopInfo={shopInfo}
        onEditSettings={() => navigate('settings')}
        onSignOut={() => supabase.auth.signOut()}
      />
      <div className={`main${!isOnline || hasPendingSync ? ' has-banner' : ''}`}>
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
