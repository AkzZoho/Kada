import type { Bill, Product } from '../types';

const key = (k: string, shopId: string) => `pos_${k}_${shopId}`;

// ── Products cache (shown instantly on load) ──────────────────

export function cacheProducts(shopId: string, products: Product[]) {
  localStorage.setItem(key('cache_products', shopId), JSON.stringify(products));
}

export function getCachedProducts(shopId: string): Product[] {
  try { return JSON.parse(localStorage.getItem(key('cache_products', shopId)) ?? '[]'); }
  catch { return []; }
}

// ── Bills cache ───────────────────────────────────────────────

export function cacheBills(shopId: string, bills: Bill[]) {
  localStorage.setItem(key('cache_bills', shopId), JSON.stringify(bills));
}

export function getCachedBills(shopId: string): Bill[] {
  try { return JSON.parse(localStorage.getItem(key('cache_bills', shopId)) ?? '[]'); }
  catch { return []; }
}

// ── Shop ↔ user mapping (so we can show cache before auth resolves) ──

export function cacheShopId(userId: string, shopId: string) {
  localStorage.setItem(`pos_shop_for_${userId}`, shopId);
}

export function getCachedShopId(userId: string): string | null {
  return localStorage.getItem(`pos_shop_for_${userId}`);
}

// ── Offline bill queue ────────────────────────────────────────

export interface OfflineBillOp {
  type: 'save' | 'delete';
  bill?: Bill;
  billId?: string;
  timestamp: number;
}

function queueKey(shopId: string) { return key('offline_queue', shopId); }

export function getOfflineQueue(shopId: string): OfflineBillOp[] {
  try { return JSON.parse(localStorage.getItem(queueKey(shopId)) ?? '[]'); }
  catch { return []; }
}

export function enqueueSaveBill(shopId: string, bill: Bill) {
  const q = getOfflineQueue(shopId);
  q.push({ type: 'save', bill, timestamp: Date.now() });
  localStorage.setItem(queueKey(shopId), JSON.stringify(q));
}

export function enqueueDeleteBill(shopId: string, billId: string) {
  const q = getOfflineQueue(shopId).filter(op => op.bill?.id !== billId);
  q.push({ type: 'delete', billId, timestamp: Date.now() });
  localStorage.setItem(queueKey(shopId), JSON.stringify(q));
}

export function clearOfflineQueue(shopId: string) {
  localStorage.removeItem(queueKey(shopId));
}
