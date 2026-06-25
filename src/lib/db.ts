import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, orderBy, runTransaction, writeBatch, where,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Bill, Product, Purchase, ShopInfo, Tenant, TenantMember, TenantRole } from '../types';

// ── Tenants ──────────────────────────────────────────────────

export async function getTenantsForUser(uid: string): Promise<Tenant[]> {
  const snap = await getDocs(query(collection(db, 'tenantMembers'), where('uid', '==', uid)));
  if (snap.empty) return [];
  const tenantIds = snap.docs.map(d => d.data().tenantId as string);
  const tenants = await Promise.all(
    tenantIds.map(async id => {
      const d = await getDoc(doc(db, 'tenants', id));
      if (!d.exists()) return null;
      return { id: d.id, ...d.data() } as Tenant;
    })
  );
  return tenants.filter(Boolean) as Tenant[];
}

export async function createTenant(uid: string, email: string, name: string): Promise<Tenant> {
  const tenantRef = doc(collection(db, 'tenants'));
  const tenant: Omit<Tenant, 'id'> = {
    name: name.trim(),
    createdAt: new Date().toISOString(),
    ownerId: uid,
  };
  const member: TenantMember & { tenantId: string } = {
    uid, email, role: 'owner', joinedAt: new Date().toISOString(), tenantId: tenantRef.id,
  };
  const batch = writeBatch(db);
  batch.set(tenantRef, tenant);
  // flat collection for querying by uid
  batch.set(doc(db, 'tenantMembers', `${tenantRef.id}_${uid}`), member);
  // subcollection for per-tenant member listing
  batch.set(doc(db, 'tenants', tenantRef.id, 'members', uid), { uid, email, role: 'owner', joinedAt: member.joinedAt });
  await batch.commit();
  return { id: tenantRef.id, ...tenant };
}

export async function getTenantMembers(tenantId: string): Promise<TenantMember[]> {
  const snap = await getDocs(collection(db, 'tenants', tenantId, 'members'));
  return snap.docs.map(d => d.data() as TenantMember);
}

export async function inviteMember(tenantId: string, uid: string, email: string, role: TenantRole) {
  const member: TenantMember = { uid, email, role, joinedAt: new Date().toISOString() };
  const batch = writeBatch(db);
  batch.set(doc(db, 'tenants', tenantId, 'members', uid), member);
  batch.set(doc(db, 'tenantMembers', `${tenantId}_${uid}`), { ...member, tenantId });
  await batch.commit();
}

export async function removeMember(tenantId: string, uid: string) {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'tenants', tenantId, 'members', uid));
  batch.delete(doc(db, 'tenantMembers', `${tenantId}_${uid}`));
  await batch.commit();
}

export async function updateMemberRole(tenantId: string, uid: string, role: TenantRole) {
  await updateDoc(doc(db, 'tenants', tenantId, 'members', uid), { role });
  await updateDoc(doc(db, 'tenantMembers', `${tenantId}_${uid}`), { role });
}

export async function getMyRole(tenantId: string, uid: string): Promise<TenantRole | null> {
  const snap = await getDoc(doc(db, 'tenants', tenantId, 'members', uid));
  if (!snap.exists()) return null;
  return snap.data().role as TenantRole;
}

// ── Shop ─────────────────────────────────────────────────────

export async function getShop(tenantId: string): Promise<{ id: string; info: ShopInfo } | null> {
  const snap = await getDocs(collection(db, 'tenants', tenantId, 'shops'));
  if (snap.empty) return null;
  const d = snap.docs[0];
  const r = d.data();
  return {
    id: d.id,
    info: {
      name: r.name ?? 'My Shop',
      address: r.address ?? '',
      gstin: r.gstin ?? '',
      phone: r.phone ?? '',
      operatorName: r.operatorName ?? '',
      logo: r.logo ?? '',
    },
  };
}

export async function createShop(tenantId: string): Promise<{ id: string; info: ShopInfo }> {
  const ref = doc(collection(db, 'tenants', tenantId, 'shops'));
  const info: ShopInfo = { name: 'My Shop', address: '', gstin: '', phone: '', operatorName: '', logo: '' };
  await setDoc(ref, { ...info, billCounter: 0 });
  return { id: ref.id, info };
}

export async function updateShop(tenantId: string, shopId: string, info: ShopInfo) {
  await updateDoc(doc(db, 'tenants', tenantId, 'shops', shopId), {
    name: info.name,
    address: info.address,
    gstin: info.gstin,
    phone: info.phone,
    logo: info.logo,
  });
}

export async function nextBillNumber(tenantId: string, shopId: string): Promise<string> {
  const shopRef = doc(db, 'tenants', tenantId, 'shops', shopId);
  const counter = await runTransaction(db, async (txn) => {
    const snap = await txn.get(shopRef);
    const next = (snap.data()?.billCounter ?? 0) + 1;
    txn.update(shopRef, { billCounter: next });
    return next;
  });
  return `BILL-${String(counter).padStart(4, '0')}`;
}

// ── Products ─────────────────────────────────────────────────

export async function getProducts(tenantId: string, shopId: string): Promise<Product[]> {
  const snap = await getDocs(collection(db, 'tenants', tenantId, 'shops', shopId, 'products'));
  return snap.docs.map(d => ({ sku: '', ...d.data(), id: d.id } as Product));
}

export async function saveProducts(tenantId: string, shopId: string, products: Product[]) {
  const batch = writeBatch(db);
  const existing = await getDocs(collection(db, 'tenants', tenantId, 'shops', shopId, 'products'));
  const incomingIds = new Set(products.map(p => p.id));
  existing.docs.forEach(d => { if (!incomingIds.has(d.id)) batch.delete(d.ref); });
  products.forEach((product) => {
    const { id, stock, image, ...rest } = product;
    const data: Record<string, unknown> = { ...rest };
    if (stock !== undefined) data.stock = stock;
    if (image !== undefined) data.image = image;
    batch.set(doc(db, 'tenants', tenantId, 'shops', shopId, 'products', id), data);
  });
  await batch.commit();
}

// ── Operators ────────────────────────────────────────────────

export async function getOperators(tenantId: string, shopId: string): Promise<string[]> {
  const snap = await getDoc(doc(db, 'tenants', tenantId, 'shops', shopId, 'meta', 'operators'));
  return snap.exists() ? (snap.data().names as string[]) : [];
}

export async function saveOperators(tenantId: string, shopId: string, names: string[]) {
  await setDoc(doc(db, 'tenants', tenantId, 'shops', shopId, 'meta', 'operators'), { names });
}

// ── Bills ────────────────────────────────────────────────────

export async function getBills(tenantId: string, shopId: string): Promise<Bill[]> {
  const snap = await getDocs(
    query(collection(db, 'tenants', tenantId, 'shops', shopId, 'bills'), orderBy('date', 'desc'))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Bill));
}

export async function saveBill(tenantId: string, shopId: string, bill: Bill) {
  const { id, ...data } = bill;
  await setDoc(doc(db, 'tenants', tenantId, 'shops', shopId, 'bills', id), data);
}

export async function deleteBill(tenantId: string, shopId: string, billId: string) {
  await deleteDoc(doc(db, 'tenants', tenantId, 'shops', shopId, 'bills', billId));
}

// ── Purchases ────────────────────────────────────────────────

export async function nextPurchaseNumber(tenantId: string, shopId: string): Promise<string> {
  const shopRef = doc(db, 'tenants', tenantId, 'shops', shopId);
  const counter = await runTransaction(db, async (txn) => {
    const snap = await txn.get(shopRef);
    const next = (snap.data()?.purchaseCounter ?? 0) + 1;
    txn.update(shopRef, { purchaseCounter: next });
    return next;
  });
  return `PR-${String(counter).padStart(4, '0')}`;
}

export async function getPurchases(tenantId: string, shopId: string): Promise<Purchase[]> {
  const snap = await getDocs(
    query(collection(db, 'tenants', tenantId, 'shops', shopId, 'purchases'), orderBy('date', 'desc'))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Purchase));
}

export async function savePurchase(tenantId: string, shopId: string, purchase: Purchase) {
  const { id, ...data } = purchase;
  await setDoc(doc(db, 'tenants', tenantId, 'shops', shopId, 'purchases', id), data);
}

export async function deletePurchase(tenantId: string, shopId: string, purchaseId: string) {
  await deleteDoc(doc(db, 'tenants', tenantId, 'shops', shopId, 'purchases', purchaseId));
}

export async function updatePurchaseStatus(tenantId: string, shopId: string, purchaseId: string, status: 'pending' | 'received') {
  await updateDoc(doc(db, 'tenants', tenantId, 'shops', shopId, 'purchases', purchaseId), { status });
}

// ── Units of Measure ─────────────────────────────────────────

const DEFAULT_UNITS = [
  'piece', 'nos', 'pair', 'dozen', 'set', 'bundle',
  'kg', 'g', 'litre', 'ml',
  'metre', 'cm',
  'box', 'packet', 'crate', 'bag', 'sachet',
];

export async function getUnits(tenantId: string, shopId: string): Promise<string[]> {
  const snap = await getDoc(doc(db, 'tenants', tenantId, 'shops', shopId, 'meta', 'units'));
  if (snap.exists()) return snap.data().list as string[];
  await setDoc(doc(db, 'tenants', tenantId, 'shops', shopId, 'meta', 'units'), { list: DEFAULT_UNITS });
  return DEFAULT_UNITS;
}

export async function saveUnits(tenantId: string, shopId: string, units: string[]) {
  await setDoc(doc(db, 'tenants', tenantId, 'shops', shopId, 'meta', 'units'), { list: units });
}
