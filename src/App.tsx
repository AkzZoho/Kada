import { useState, useEffect, createContext, useContext } from 'react';
import { Receipt, Package, ShoppingBag, BarChart2, Settings2, WifiOff } from 'lucide-react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth } from './lib/firebase';
import * as db from './lib/db';
import type { Bill, Product, Purchase, Screen, ShopInfo, Tenant } from './types';
import Sidebar from './components/Sidebar';
import POS from './components/POS';
import Products from './components/Products';
import ReportsScreen from './components/ReportsScreen';
import PurchaseScreen from './components/PurchaseScreen';
import Settings from './components/Settings';
import AuthScreen from './components/AuthScreen';
import TenantScreen from './components/TenantScreen';
import './index.css';

// ── Shop context ──────────────────────────────────────────────
export const ShopContext = createContext<ShopInfo>({
  name: 'My Shop', address: '', gstin: '', phone: '', operatorName: '', logo: '',
});
export const useShop = () => useContext(ShopContext);

const BOTTOM_NAV: { id: Screen; Icon: React.FC<{ size: number }>; label: string }[] = [
  { id: 'pos',      Icon: Receipt,     label: 'POS' },
  { id: 'products', Icon: Package,     label: 'Products' },
  { id: 'purchase', Icon: ShoppingBag, label: 'Purchase' },
  { id: 'reports',  Icon: BarChart2,   label: 'Reports' },
  { id: 'settings', Icon: Settings2,   label: 'Settings' },
];

const DEFAULT_SHOP: ShopInfo = { name: 'My Shop', address: '', gstin: '', phone: '', operatorName: '', logo: '' };

export default function App() {
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  // ── Tenant state ──────────────────────────────────────────
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);
  const [tenantLoading, setTenantLoading] = useState(false);

  // ── Shop / app state ──────────────────────────────────────
  const [shopId, setShopId] = useState('');
  const [shopInfo, setShopInfo] = useState<ShopInfo>(DEFAULT_SHOP);
  const [products, setProducts] = useState<Product[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [operators, setOperators] = useState<string[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [screen, setScreen] = useState<Screen>(() => {
    const s = localStorage.getItem('pos_screen');
    return (['products', 'purchase', 'history', 'reports', 'settings'].includes(s ?? '')) ? s as Screen : 'pos';
  });

  // ── Auth ─────────────────────────────────────────────────
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        setTenantLoading(true);
        try {
          const userTenants = await db.getTenantsForUser(u.uid);
          setTenants(userTenants);

          // Restore last active tenant from localStorage
          const savedTenantId = localStorage.getItem(`pos_tenant_${u.uid}`);
          const restored = savedTenantId ? userTenants.find(t => t.id === savedTenantId) : null;
          if (restored) {
            setActiveTenant(restored);
            await loadShopData(u, restored);
          }
        } catch (e) {
          console.error('tenant load error:', e);
        } finally {
          setTenantLoading(false);
          setAuthLoading(false);
        }
      } else {
        setAuthLoading(false);
        resetState();
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Online/offline banner ─────────────────────────────────
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

  function resetState() {
    setActiveTenant(null);
    setTenants([]);
    setShopId('');
    setBills([]);
    setProducts([]);
    setPurchases([]);
    setOperators([]);
    setUnits([]);
    setShopInfo(DEFAULT_SHOP);
  }

  async function loadShopData(_u: User, tenant: Tenant) {
    try {
      let shop = await db.getShop(tenant.id);
      if (!shop) shop = await db.createShop(tenant.id);

      localStorage.setItem(`pos_shopid_${tenant.id}`, shop.id);
      setShopId(shop.id);

      const activeOp = localStorage.getItem(`pos_operator_${shop.id}`) ?? '';
      setShopInfo({ ...shop.info, operatorName: activeOp || shop.info.operatorName });

      const [prods, ops, bls, purs, uns] = await Promise.all([
        db.getProducts(tenant.id, shop.id),
        db.getOperators(tenant.id, shop.id),
        db.getBills(tenant.id, shop.id),
        db.getPurchases(tenant.id, shop.id),
        db.getUnits(tenant.id, shop.id),
      ]);

      setProducts(prods);
      setOperators(ops);
      setBills(bls);
      setPurchases(purs);
      setUnits(uns);
    } catch (e) {
      console.error('loadShopData error:', e);
    }
  }

  async function handleSelectTenant(tenant: Tenant) {
    if (!user) return;
    setActiveTenant(tenant);
    localStorage.setItem(`pos_tenant_${user.uid}`, tenant.id);
    setTenantLoading(true);
    try {
      await loadShopData(user, tenant);
    } finally {
      setTenantLoading(false);
    }
  }

  async function handleCreateTenant(name: string) {
    if (!user || !user.email) return;
    const tenant = await db.createTenant(user.uid, user.email, name);
    setTenants(prev => [...prev, tenant]);
    await handleSelectTenant(tenant);
  }

  // ── Mutations ─────────────────────────────────────────────

  async function handleProductsUpdate(updated: Product[]) {
    setProducts(updated);
    if (activeTenant && shopId) await db.saveProducts(activeTenant.id, shopId, updated);
  }

  async function handleUnitsUpdate(updated: string[]) {
    setUnits(updated);
    if (activeTenant && shopId) await db.saveUnits(activeTenant.id, shopId, updated);
  }

  function handleAddUnit(unit: string) {
    const trimmed = unit.trim();
    if (!trimmed || units.includes(trimmed)) return;
    handleUnitsUpdate([...units, trimmed]);
  }

  async function handleNextBillNumber(): Promise<string> {
    try {
      return await db.nextBillNumber(activeTenant!.id, shopId);
    } catch {
      return `BILL-${String(bills.length + 1).padStart(4, '0')}`;
    }
  }

  async function handleBillSaved(bill: Bill) {
    setBills(prev => [bill, ...prev]);
    if (activeTenant && shopId) await db.saveBill(activeTenant.id, shopId, bill);
    const updatedProducts = products.map(p => {
      if (p.stock === undefined) return p;
      const billItem = bill.items.find(i => i.productId === p.id);
      if (!billItem) return p;
      return { ...p, stock: Math.max(0, p.stock - billItem.quantity) };
    });
    setProducts(updatedProducts);
    if (activeTenant && shopId) await db.saveProducts(activeTenant.id, shopId, updatedProducts);
  }

  async function handleBillDelete(id: string) {
    setBills(prev => prev.filter(b => b.id !== id));
    if (activeTenant && shopId) await db.deleteBill(activeTenant.id, shopId, id);
  }

  async function handleNextPurchaseNumber(): Promise<string> {
    try {
      return await db.nextPurchaseNumber(activeTenant!.id, shopId);
    } catch {
      return `PR-${String(purchases.length + 1).padStart(4, '0')}`;
    }
  }

  async function handlePurchaseSave(purchase: Purchase) {
    setPurchases(prev => [purchase, ...prev]);
    if (activeTenant && shopId) await db.savePurchase(activeTenant.id, shopId, purchase);
  }

  async function handlePurchaseDelete(id: string) {
    setPurchases(prev => prev.filter(p => p.id !== id));
    if (activeTenant && shopId) await db.deletePurchase(activeTenant.id, shopId, id);
  }

  async function handlePurchaseStatusUpdate(id: string, status: 'pending' | 'received') {
    setPurchases(prev => prev.map(p => p.id === id ? { ...p, status } : p));
    if (activeTenant && shopId) await db.updatePurchaseStatus(activeTenant.id, shopId, id, status);
    if (status === 'received') {
      const purchase = purchases.find(p => p.id === id);
      if (purchase) {
        const updatedProducts = products.map(p => {
          if (p.stock === undefined) return p;
          const item = purchase.items.find(i => i.productId === p.id);
          if (!item) return p;
          return { ...p, stock: p.stock + item.quantity };
        });
        setProducts(updatedProducts);
        if (activeTenant && shopId) await db.saveProducts(activeTenant.id, shopId, updatedProducts);
      }
    }
  }

  async function handleSettingsSave(info: ShopInfo, ops: string[]) {
    setShopInfo(info);
    setOperators(ops);
    if (activeTenant && shopId) {
      await db.updateShop(activeTenant.id, shopId, info);
      await db.saveOperators(activeTenant.id, shopId, ops);
    }
    // Keep tenant name in sync with shop name
    if (activeTenant && info.name !== activeTenant.name) {
      setActiveTenant(prev => prev ? { ...prev, name: info.name } : prev);
      setTenants(prev => prev.map(t => t.id === activeTenant.id ? { ...t, name: info.name } : t));
    }
  }

  function handleOperatorChange(name: string) {
    if (shopId) localStorage.setItem(`pos_operator_${shopId}`, name);
    setShopInfo(prev => ({ ...prev, operatorName: name }));
  }

  function navigate(to: Screen) {
    setScreen(to);
    localStorage.setItem('pos_screen', to);
    window.scrollTo(0, 0);
  }

  async function handleSignOut() {
    await signOut(auth);
    setUser(null);
    resetState();
  }

  // ── Loading / Auth / Tenant screens ──────────────────────

  if (authLoading || tenantLoading) {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div className="auth-spinner" />
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  if (!activeTenant) {
    return (
      <TenantScreen
        tenants={tenants}
        onSelect={handleSelectTenant}
        onCreate={handleCreateTenant}
        onSignOut={handleSignOut}
      />
    );
  }

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
        tenants={tenants}
        activeTenant={activeTenant}
        onSwitchTenant={handleSelectTenant}
      />

      <div className={`main${!isOnline ? ' has-banner' : ''}`}>
        <div className="screen">
          {screen === 'pos' && (
            <POS
              products={products}
              bills={bills}
              operators={operators}
              operatorName={shopInfo.operatorName}
              onOperatorChange={handleOperatorChange}
              nextBillNumber={handleNextBillNumber}
              onBillSaved={handleBillSaved}
            />
          )}
          {screen === 'products' && (
            <Products
              products={products}
              onUpdate={handleProductsUpdate}
              units={units}
              onAddUnit={handleAddUnit}
            />
          )}
          {screen === 'purchase' && (
            <PurchaseScreen
              purchases={purchases}
              products={products}
              nextPurchaseNumber={handleNextPurchaseNumber}
              onSave={handlePurchaseSave}
              onDelete={handlePurchaseDelete}
              onStatusUpdate={handlePurchaseStatusUpdate}
              units={units}
              onAddUnit={handleAddUnit}
            />
          )}
          {(screen === 'history' || screen === 'reports') && (
            <ReportsScreen bills={bills} products={products} onDelete={handleBillDelete} />
          )}
          {screen === 'settings' && (
            <Settings
              shopInfo={shopInfo}
              shopId={shopId}
              tenantId={activeTenant.id}
              operators={operators}
              units={units}
              onSave={handleSettingsSave}
              onUnitsChange={handleUnitsUpdate}
            />
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

    </ShopContext.Provider>
  );
}
