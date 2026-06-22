import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, orderBy, runTransaction, writeBatch, where,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Bill, Product, Purchase, ShopInfo } from '../types';

// ── Shop ─────────────────────────────────────────────────────

export async function getShop(userId: string): Promise<{ id: string; info: ShopInfo } | null> {
  const snap = await getDocs(query(collection(db, 'shops'), where('userId', '==', userId)));
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

export async function createShop(userId: string): Promise<{ id: string; info: ShopInfo }> {
  const ref = doc(collection(db, 'shops'));
  const info: ShopInfo = { name: 'My Shop', address: '', gstin: '', phone: '', operatorName: '', logo: '' };
  await setDoc(ref, { userId, ...info, billCounter: 0 });
  return { id: ref.id, info };
}

export async function updateShop(shopId: string, info: ShopInfo) {
  await updateDoc(doc(db, 'shops', shopId), {
    name: info.name,
    address: info.address,
    gstin: info.gstin,
    phone: info.phone,
    logo: info.logo,
  });
}

export async function nextBillNumber(shopId: string): Promise<string> {
  const shopRef = doc(db, 'shops', shopId);
  const counter = await runTransaction(db, async (txn) => {
    const snap = await txn.get(shopRef);
    const next = (snap.data()?.billCounter ?? 0) + 1;
    txn.update(shopRef, { billCounter: next });
    return next;
  });
  return `BILL-${String(counter).padStart(4, '0')}`;
}

// ── Products ─────────────────────────────────────────────────

export async function getProducts(shopId: string): Promise<Product[]> {
  const snap = await getDocs(collection(db, 'shops', shopId, 'products'));
  return snap.docs.map(d => ({ sku: '', ...d.data(), id: d.id } as Product));
}

export async function saveProducts(shopId: string, products: Product[]) {
  const batch = writeBatch(db);
  const existing = await getDocs(collection(db, 'shops', shopId, 'products'));
  const incomingIds = new Set(products.map(p => p.id));
  // Only delete products that were removed
  existing.docs.forEach(d => { if (!incomingIds.has(d.id)) batch.delete(d.ref); });
  // Upsert each product — explicitly exclude undefined fields so Firestore accepts the write
  products.forEach((product) => {
    const { id, stock, ...rest } = product;
    const data: Record<string, unknown> = { ...rest };
    if (stock !== undefined) data.stock = stock;
    batch.set(doc(db, 'shops', shopId, 'products', id), data);
  });
  await batch.commit();
}

// ── Operators ────────────────────────────────────────────────

export async function getOperators(shopId: string): Promise<string[]> {
  const snap = await getDoc(doc(db, 'shops', shopId, 'meta', 'operators'));
  return snap.exists() ? (snap.data().names as string[]) : [];
}

export async function saveOperators(shopId: string, names: string[]) {
  await setDoc(doc(db, 'shops', shopId, 'meta', 'operators'), { names });
}

// ── Bills ────────────────────────────────────────────────────

export async function getBills(shopId: string): Promise<Bill[]> {
  const snap = await getDocs(
    query(collection(db, 'shops', shopId, 'bills'), orderBy('date', 'desc'))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Bill));
}

export async function saveBill(shopId: string, bill: Bill) {
  const { id, ...data } = bill;
  await setDoc(doc(db, 'shops', shopId, 'bills', id), data);
}

export async function deleteBill(shopId: string, billId: string) {
  await deleteDoc(doc(db, 'shops', shopId, 'bills', billId));
}

// ── Purchases ────────────────────────────────────────────────

export async function nextPurchaseNumber(shopId: string): Promise<string> {
  const shopRef = doc(db, 'shops', shopId);
  const counter = await runTransaction(db, async (txn) => {
    const snap = await txn.get(shopRef);
    const next = (snap.data()?.purchaseCounter ?? 0) + 1;
    txn.update(shopRef, { purchaseCounter: next });
    return next;
  });
  return `PR-${String(counter).padStart(4, '0')}`;
}

export async function getPurchases(shopId: string): Promise<Purchase[]> {
  const snap = await getDocs(
    query(collection(db, 'shops', shopId, 'purchases'), orderBy('date', 'desc'))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Purchase));
}

export async function savePurchase(shopId: string, purchase: Purchase) {
  const { id, ...data } = purchase;
  await setDoc(doc(db, 'shops', shopId, 'purchases', id), data);
}

export async function deletePurchase(shopId: string, purchaseId: string) {
  await deleteDoc(doc(db, 'shops', shopId, 'purchases', purchaseId));
}

export async function updatePurchaseStatus(shopId: string, purchaseId: string, status: 'pending' | 'received') {
  await updateDoc(doc(db, 'shops', shopId, 'purchases', purchaseId), { status });
}
