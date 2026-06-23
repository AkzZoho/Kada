import { doc, writeBatch, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { Bill, BillItem, Product, Purchase, PurchaseItem, GSTRate, PaymentMode } from '../types';

// ── Helpers ────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  // Spread across the day so ordering looks natural
  d.setHours(Math.floor(Math.random() * 10) + 8);
  d.setMinutes(Math.floor(Math.random() * 59));
  return d.toISOString();
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

// ── Seed catalogue ─────────────────────────────────────────────

const PRODUCTS: (Omit<Product, 'id'>)[] = [
  { sku: 'P001', name: 'Silk Saree',            category: 'Clothing',    price: 2500, unit: 'piece',  gstRate: 5  as GSTRate, stock: 12 },
  { sku: 'P002', name: 'Cotton Saree',           category: 'Clothing',    price: 850,  unit: 'piece',  gstRate: 5  as GSTRate, stock: 25 },
  { sku: 'P003', name: 'Kasavu Set',             category: 'Clothing',    price: 1800, unit: 'piece',  gstRate: 5  as GSTRate, stock: 8  },
  { sku: 'P004', name: 'Lungi',                  category: 'Clothing',    price: 350,  unit: 'piece',  gstRate: 5  as GSTRate, stock: 40 },
  { sku: 'P005', name: 'Mundu',                  category: 'Clothing',    price: 450,  unit: 'piece',  gstRate: 5  as GSTRate, stock: 30 },
  { sku: 'P006', name: 'Ladies Churidar',        category: 'Clothing',    price: 650,  unit: 'piece',  gstRate: 5  as GSTRate, stock: 18 },
  { sku: 'P007', name: 'Handloom Towel',         category: 'Clothing',    price: 180,  unit: 'piece',  gstRate: 5  as GSTRate, stock: 50 },
  { sku: 'P008', name: 'Coconut Oil 1L',         category: 'Grocery',     price: 180,  unit: 'litre',  gstRate: 5  as GSTRate, stock: 60 },
  { sku: 'P009', name: 'Raw Rice 5kg',           category: 'Grocery',     price: 320,  unit: 'bag',    gstRate: 0  as GSTRate, stock: 35 },
  { sku: 'P010', name: 'Coconut',                category: 'Grocery',     price: 25,   unit: 'piece',  gstRate: 0  as GSTRate, stock: 150},
  { sku: 'P011', name: 'Banana Leaf',            category: 'Grocery',     price: 30,   unit: 'piece',  gstRate: 0  as GSTRate, stock: 200},
  { sku: 'P012', name: 'Turmeric Powder 100g',   category: 'Spices',      price: 45,   unit: 'packet', gstRate: 5  as GSTRate, stock: 80 },
  { sku: 'P013', name: 'Red Chilli Powder 100g', category: 'Spices',      price: 55,   unit: 'packet', gstRate: 5  as GSTRate, stock: 70 },
  { sku: 'P014', name: 'Coriander Powder 100g',  category: 'Spices',      price: 40,   unit: 'packet', gstRate: 5  as GSTRate, stock: 65 },
  { sku: 'P015', name: 'Rubber Slipper',         category: 'Footwear',    price: 120,  unit: 'pair',   gstRate: 12 as GSTRate, stock: 45 },
  { sku: 'P016', name: 'Umbrella',               category: 'Accessories', price: 280,  unit: 'piece',  gstRate: 12 as GSTRate, stock: 20 },
  { sku: 'P017', name: 'Steel Vessel 1L',        category: 'Utensils',    price: 350,  unit: 'piece',  gstRate: 12 as GSTRate, stock: 15 },
  { sku: 'P018', name: 'Agarbathi Pack',         category: 'Pooja Items', price: 45,   unit: 'packet', gstRate: 0  as GSTRate, stock: 100},
  { sku: 'P019', name: 'Camphor Box',            category: 'Pooja Items', price: 55,   unit: 'box',    gstRate: 0  as GSTRate, stock: 80 },
  { sku: 'P020', name: 'Hair Oil 200ml',         category: 'Cosmetics',   price: 125,  unit: 'piece',  gstRate: 18 as GSTRate, stock: 40 },
  { sku: 'P021', name: 'Bindi Box',              category: 'Cosmetics',   price: 35,   unit: 'box',    gstRate: 12 as GSTRate, stock: 60 },
  { sku: 'P022', name: 'Jasmine Garland',        category: 'Flowers',     price: 80,   unit: 'piece',  gstRate: 0  as GSTRate, stock: 0  },
];

const CUSTOMERS = [
  { name: 'Meera Nair',    phone: '9876543210' },
  { name: 'Rajan Pillai',  phone: '9845678901' },
  { name: 'Sreeja Kumar',  phone: '9812345678' },
  { name: 'Arun Menon',    phone: '9901234567' },
  { name: 'Latha Krishnan',phone: '9788901234' },
  { name: 'Vijayan P',     phone: '9922334455' },
  { name: 'Anitha Mohan',  phone: '9933445566' },
  { name: 'Suresh T',      phone: '9944556677' },
  { name: 'Divya Raj',     phone: '9955667788' },
  { name: 'Pradeep VS',    phone: '' },
  { name: '',              phone: '' },   // walk-in
];

const SUPPLIERS = [
  'ABC Traders', 'Kerala Textiles Wholesale',
  'Malabar Distributors', 'Star Suppliers', 'Royal Trading Co',
];

const PAYMENT_MODES: PaymentMode[] = [
  'cash','cash','cash','cash','cash','upi','upi','upi','card',
];

// ── Bill item builder ──────────────────────────────────────────

function makeBillItem(p: Product & { id: string }, qty: number): BillItem {
  const taxableAmount = p.price * qty;
  const cgst = parseFloat(((taxableAmount * p.gstRate) / 200).toFixed(2));
  const sgst = cgst;
  return {
    productId: p.id,
    name: p.name,
    price: p.price,
    quantity: qty,
    unit: p.unit,
    gstRate: p.gstRate,
    taxableAmount,
    cgst,
    sgst,
    lineTotal: parseFloat((taxableAmount + cgst + sgst).toFixed(2)),
  };
}

// ── Main seed function ─────────────────────────────────────────

export async function seedTestData(shopId: string): Promise<void> {
  const products: (Product & { id: string })[] = PRODUCTS.map((p, i) => ({
    ...p,
    id: `seed-${String(i + 1).padStart(3, '0')}`,
  }));

  // ── 1. Products ──────────────────────────────────────────────
  {
    const batch = writeBatch(db);
    for (const { id, stock, ...rest } of products) {
      const data: Record<string, unknown> = { ...rest };
      if (stock !== undefined) data.stock = stock;
      batch.set(doc(db, 'shops', shopId, 'products', id), data);
    }
    await batch.commit();
  }

  // ── 2. Bills (72 bills over 6 months) ───────────────────────
  const bills: Bill[] = [];
  for (let i = 0; i < 72; i++) {
    const daysBack = Math.floor(Math.random() * 180);
    const customer = pick(CUSTOMERS);
    const itemCount = Math.floor(Math.random() * 4) + 1;
    const selectedProducts = shuffle(products).slice(0, itemCount);

    const items: BillItem[] = selectedProducts.map(p =>
      makeBillItem(p, Math.floor(Math.random() * 3) + 1)
    );

    const subtotal     = parseFloat(items.reduce((s, it) => s + it.taxableAmount, 0).toFixed(2));
    const totalCGST    = parseFloat(items.reduce((s, it) => s + it.cgst, 0).toFixed(2));
    const totalSGST    = parseFloat(items.reduce((s, it) => s + it.sgst, 0).toFixed(2));
    const totalGST     = parseFloat((totalCGST + totalSGST).toFixed(2));
    const discount     = Math.random() < 0.18 ? pick([50, 100, 150, 200, 250]) : 0;
    const grandTotal   = parseFloat((subtotal + totalGST - discount).toFixed(2));

    bills.push({
      id:           `seed-bill-${String(i + 1).padStart(4, '0')}`,
      billNumber:   `BILL-${String(i + 1).padStart(4, '0')}`,
      date:         daysAgo(daysBack),
      items,
      subtotal,
      totalCGST,
      totalSGST,
      totalGST,
      discount,
      grandTotal,
      customerName:  customer.name,
      customerPhone: customer.phone,
      paymentMode:   pick(PAYMENT_MODES),
      operatorName:  '',
    });
  }

  // Firestore batch limit = 500; bills fit in one batch
  {
    const batch = writeBatch(db);
    for (const { id, ...data } of bills) {
      batch.set(doc(db, 'shops', shopId, 'bills', id), data);
    }
    await batch.commit();
  }

  // ── 3. Purchases (18 requests, 10 received) ──────────────────
  const purchases: Purchase[] = [];
  for (let i = 0; i < 18; i++) {
    const daysBack = Math.floor(Math.random() * 90);
    const itemCount = Math.floor(Math.random() * 4) + 1;
    const selectedProducts = shuffle(products).slice(0, itemCount);
    const status: 'pending' | 'received' = i < 10 ? 'received' : 'pending';

    const items: PurchaseItem[] = selectedProducts.map(p => ({
      productId: p.id,
      name:      p.name,
      quantity:  Math.floor(Math.random() * 20) + 5,
      unit:      p.unit,
      pricePerUnit: Math.floor(p.price * 0.58),
    }));

    const totalAmount = parseFloat(
      items.reduce((s, it) => s + it.quantity * it.pricePerUnit, 0).toFixed(2)
    );

    purchases.push({
      id:              `seed-pr-${String(i + 1).padStart(4, '0')}`,
      purchaseNumber:  `PR-${String(i + 1).padStart(4, '0')}`,
      date:            daysAgo(daysBack),
      supplierName:    pick(SUPPLIERS),
      expectedDelivery:'',
      notes:           '',
      items,
      status,
      totalAmount,
    });
  }

  {
    const batch = writeBatch(db);
    for (const { id, ...data } of purchases) {
      batch.set(doc(db, 'shops', shopId, 'purchases', id), data);
    }
    await batch.commit();
  }

  // ── 4. Update shop counters ───────────────────────────────────
  await updateDoc(doc(db, 'shops', shopId), {
    billCounter:     72,
    purchaseCounter: 18,
  });
}
