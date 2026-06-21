import { supabase } from './supabase';
import type { Bill, BillItem, Product, ShopInfo } from '../types';

// ── Types from DB ─────────────────────────────────────────────

interface DbShop {
  id: string;
  name: string;
  address: string;
  gstin: string;
  phone: string;
  bill_counter: number;
}

// ── Shop ─────────────────────────────────────────────────────

export async function getShop(userId: string): Promise<DbShop | null> {
  const { data, error } = await supabase
    .from('shops')
    .select('id, name, address, gstin, phone, bill_counter')
    .eq('owner_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createShop(userId: string): Promise<DbShop> {
  const { data, error } = await supabase
    .from('shops')
    .insert({ owner_id: userId })
    .select('id, name, address, gstin, phone, bill_counter')
    .single();
  if (error) throw error;
  return data;
}

export async function updateShop(shopId: string, info: Omit<ShopInfo, 'operatorName'>): Promise<void> {
  const { error } = await supabase
    .from('shops')
    .update({ name: info.name, address: info.address, gstin: info.gstin, phone: info.phone })
    .eq('id', shopId);
  if (error) throw error;
}

// ── Bill number ──────────────────────────────────────────────

export async function nextBillNumber(shopId: string): Promise<string> {
  const { data, error } = await supabase.rpc('next_bill_number', { p_shop_id: shopId });
  if (error) throw error;
  return `BILL-${String(data).padStart(4, '0')}`;
}

// ── Products ─────────────────────────────────────────────────

export async function getProducts(shopId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, price, unit, gst_rate, category')
    .eq('shop_id', shopId)
    .order('created_at');
  if (error) throw error;
  return (data ?? []).map(r => ({
    id: r.id,
    name: r.name,
    price: Number(r.price),
    unit: r.unit,
    gstRate: r.gst_rate as Product['gstRate'],
    category: r.category,
  }));
}

export async function saveProducts(shopId: string, products: Product[]): Promise<void> {
  // Get current IDs to detect deletions
  const { data: existing } = await supabase.from('products').select('id').eq('shop_id', shopId);
  const existingIds = new Set((existing ?? []).map(r => r.id));
  const newIds = new Set(products.map(p => p.id));

  const toDelete = [...existingIds].filter(id => !newIds.has(id));
  if (toDelete.length > 0) {
    await supabase.from('products').delete().in('id', toDelete);
  }

  if (products.length > 0) {
    const { error } = await supabase.from('products').upsert(
      products.map(p => ({
        id: p.id,
        shop_id: shopId,
        name: p.name,
        price: p.price,
        unit: p.unit,
        gst_rate: p.gstRate,
        category: p.category,
      }))
    );
    if (error) throw error;
  }
}

// ── Operators ────────────────────────────────────────────────

export async function getOperators(shopId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('operators')
    .select('name')
    .eq('shop_id', shopId)
    .order('created_at');
  if (error) throw error;
  return (data ?? []).map(r => r.name);
}

export async function saveOperators(shopId: string, names: string[]): Promise<void> {
  await supabase.from('operators').delete().eq('shop_id', shopId);
  if (names.length > 0) {
    const { error } = await supabase.from('operators').insert(
      names.map(name => ({ shop_id: shopId, name }))
    );
    if (error) throw error;
  }
}

// ── Bills ────────────────────────────────────────────────────

export async function getBills(shopId: string): Promise<Bill[]> {
  const { data, error } = await supabase
    .from('bills')
    .select('*, bill_items(*)')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(dbBillToBill);
}

export async function saveBill(shopId: string, bill: Bill): Promise<void> {
  const { error: bErr } = await supabase.from('bills').insert({
    id: bill.id,
    shop_id: shopId,
    bill_number: bill.billNumber,
    date: bill.date,
    customer_name: bill.customerName,
    customer_phone: bill.customerPhone,
    payment_mode: bill.paymentMode,
    operator_name: bill.operatorName ?? '',
    subtotal: bill.subtotal,
    total_cgst: bill.totalCGST,
    total_sgst: bill.totalSGST,
    total_gst: bill.totalGST,
    discount: bill.discount,
    grand_total: bill.grandTotal,
  });
  if (bErr) throw bErr;

  const { error: iErr } = await supabase.from('bill_items').insert(
    bill.items.map(item => ({
      bill_id: bill.id,
      product_id: item.productId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      unit: item.unit,
      gst_rate: item.gstRate,
      taxable_amount: item.taxableAmount,
      cgst: item.cgst,
      sgst: item.sgst,
      line_total: item.lineTotal,
    }))
  );
  if (iErr) throw iErr;
}

export async function deleteBill(billId: string): Promise<void> {
  const { error } = await supabase.from('bills').delete().eq('id', billId);
  if (error) throw error;
}

// ── Helpers ──────────────────────────────────────────────────

function dbBillToBill(r: Record<string, unknown>): Bill {
  const items = ((r.bill_items as Record<string, unknown>[]) ?? []).map(i => ({
    productId: String(i.product_id),
    name: String(i.name),
    price: Number(i.price),
    quantity: Number(i.quantity),
    unit: String(i.unit),
    gstRate: Number(i.gst_rate),
    taxableAmount: Number(i.taxable_amount),
    cgst: Number(i.cgst),
    sgst: Number(i.sgst),
    lineTotal: Number(i.line_total),
  } as BillItem));

  return {
    id: String(r.id),
    billNumber: String(r.bill_number),
    date: String(r.date),
    customerName: String(r.customer_name ?? ''),
    customerPhone: String(r.customer_phone ?? ''),
    paymentMode: String(r.payment_mode) as Bill['paymentMode'],
    operatorName: String(r.operator_name ?? ''),
    subtotal: Number(r.subtotal),
    totalCGST: Number(r.total_cgst),
    totalSGST: Number(r.total_sgst),
    totalGST: Number(r.total_gst),
    discount: Number(r.discount),
    grandTotal: Number(r.grand_total),
    items,
  };
}
