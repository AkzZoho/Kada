import type { Bill, Product, ShopInfo } from './types';

const KEYS = {
  products: 'pos_products',
  bills: 'pos_bills',
  counter: 'pos_bill_counter',
  shopName: 'pos_shop_name',
  shopInfo: 'pos_shop_info',
  operators: 'pos_operators',
};

function get<T>(key: string): T | null {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}

function set(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

const SEED_PRODUCTS: Product[] = [
  { id: 'p1',  sku: 'P001', name: 'Kasavu Saree',          category: 'Sarees & Fabrics',   price: 1850, unit: 'piece', gstRate: 5  },
  { id: 'p2',  sku: 'P002', name: 'Kerala Cotton Set',      category: 'Clothing',            price: 650,  unit: 'piece', gstRate: 5  },
  { id: 'p3',  sku: 'P003', name: 'Silk Dupatta',           category: 'Sarees & Fabrics',   price: 450,  unit: 'piece', gstRate: 5  },
  { id: 'p4',  sku: 'P004', name: 'Handloom Churidar',      category: 'Clothing',            price: 780,  unit: 'piece', gstRate: 5  },
  { id: 'p5',  sku: 'P005', name: 'Brass Nilavilakku',      category: 'Home & Décor',        price: 1200, unit: 'piece', gstRate: 12 },
  { id: 'p6',  sku: 'P006', name: 'Coconut Shell Bowl Set', category: 'Home & Décor',        price: 320,  unit: 'set',   gstRate: 12 },
  { id: 'p7',  sku: 'P007', name: 'Bamboo Basket',          category: 'Home & Décor',        price: 280,  unit: 'piece', gstRate: 12 },
  { id: 'p8',  sku: 'P008', name: 'Sandalwood Soap',        category: 'Beauty & Wellness',   price: 120,  unit: 'piece', gstRate: 18 },
  { id: 'p9',  sku: 'P009', name: 'Coconut Oil',            category: 'Grocery',             price: 180,  unit: 'litre', gstRate: 5  },
  { id: 'p10', sku: 'P010', name: 'Kerala Matta Rice',      category: 'Grocery',             price: 75,   unit: 'kg',    gstRate: 0  },
  { id: 'p11', sku: 'P011', name: 'Banana Chips',           category: 'Grocery',             price: 80,   unit: 'piece', gstRate: 5  },
  { id: 'p12', sku: 'P012', name: 'Jackfruit Chips',        category: 'Grocery',             price: 90,   unit: 'piece', gstRate: 5  },
  { id: 'p13', sku: 'P013', name: 'Silver Anklet',          category: 'Accessories',         price: 850,  unit: 'piece', gstRate: 5  },
  { id: 'p14', sku: 'P014', name: 'Bead Necklace',          category: 'Accessories',         price: 420,  unit: 'piece', gstRate: 5  },
  { id: 'p15', sku: 'P015', name: 'Jute Tote Bag',          category: 'Accessories',         price: 190,  unit: 'piece', gstRate: 5  },
];

function makeBill(
  id: string, num: string, daysAgo: number,
  customer: string, phone: string,
  mode: Bill['paymentMode'],
  items: { p: Product; qty: number }[],
  discount = 0
): Bill {
  const billItems = items.map(({ p, qty }) => {
    const taxableAmount = (p.price * qty) / (1 + p.gstRate / 100);
    const cgst = (taxableAmount * p.gstRate) / 200;
    const sgst = cgst;
    return {
      productId: p.id, name: p.name, price: p.price,
      quantity: qty, unit: p.unit, gstRate: p.gstRate,
      taxableAmount, cgst, sgst, lineTotal: taxableAmount + cgst + sgst,
    };
  });
  const subtotal   = billItems.reduce((s, i) => s + i.taxableAmount, 0);
  const totalCGST  = billItems.reduce((s, i) => s + i.cgst, 0);
  const totalSGST  = billItems.reduce((s, i) => s + i.sgst, 0);
  const grandTotal = Math.max(0, subtotal + totalCGST + totalSGST - discount);
  const date = new Date(Date.now() - daysAgo * 86400000).toISOString();
  return {
    id, billNumber: num, date,
    items: billItems, subtotal, totalCGST, totalSGST,
    totalGST: totalCGST + totalSGST,
    discount, grandTotal, customerName: customer, customerPhone: phone, paymentMode: mode,
  };
}

const [p1,p2,p3,p4,p5,p9,p11,p13,p14] = [
  SEED_PRODUCTS[0], SEED_PRODUCTS[1], SEED_PRODUCTS[2], SEED_PRODUCTS[3],
  SEED_PRODUCTS[4], SEED_PRODUCTS[8], SEED_PRODUCTS[10],
  SEED_PRODUCTS[12], SEED_PRODUCTS[13],
];

const SEED_BILLS: Bill[] = [
  makeBill('b1','BILL-0001',2,'Anjali Nair',   '9876543210','upi',  [{p:p1,qty:1},{p:p9,qty:2}],        50),
  makeBill('b2','BILL-0002',1,'Rajan Pillai',  '9845001122','cash', [{p:p2,qty:1},{p:p11,qty:3}],       0),
  makeBill('b3','BILL-0003',1,'Meera Thomas',  '9961234567','card', [{p:p3,qty:1},{p:p14,qty:1}],       0),
  makeBill('b4','BILL-0004',0,'Suresh Menon',  '8800445566','upi',  [{p:p4,qty:1},{p:p13,qty:1}],     100),
  makeBill('b5','BILL-0005',0,'Priya Krishnan','9562233441','cash', [{p:p5,qty:1},{p:p11,qty:2},{p:p9,qty:1}], 0),
];

const DEFAULT_SHOP_INFO: ShopInfo = {
  name: 'Anandha Stores',
  address: 'Thrissur, Kerala',
  gstin: '',
  phone: '',
  operatorName: '',
  logo: '',
};

export const storage = {
  getProducts(): Product[] {
    return get<Product[]>(KEYS.products) ?? [];
  },
  saveProducts(products: Product[]) {
    set(KEYS.products, products);
  },

  getBills(): Bill[] {
    return get<Bill[]>(KEYS.bills) ?? [];
  },
  saveBill(bill: Bill) {
    const bills = this.getBills();
    bills.unshift(bill);
    set(KEYS.bills, bills);
  },
  deleteBill(id: string) {
    const bills = this.getBills().filter((b) => b.id !== id);
    set(KEYS.bills, bills);
  },

  nextBillNumber(): string {
    const count = (get<number>(KEYS.counter) ?? 0) + 1;
    set(KEYS.counter, count);
    return `BILL-${count.toString().padStart(4, '0')}`;
  },

  getShopInfo(): ShopInfo {
    const saved = get<ShopInfo>(KEYS.shopInfo);
    if (saved) return saved;
    // migrate from old shopName key
    const oldName = get<string>(KEYS.shopName);
    return oldName ? { ...DEFAULT_SHOP_INFO, name: oldName } : DEFAULT_SHOP_INFO;
  },
  setShopInfo(info: ShopInfo) {
    set(KEYS.shopInfo, info);
    set(KEYS.shopName, info.name); // backwards compat
  },

  // kept for POS.tsx compat
  getShopName(): string {
    return this.getShopInfo().name;
  },

  getOperators(): string[] {
    return get<string[]>(KEYS.operators) ?? [];
  },
  saveOperators(ops: string[]) {
    set(KEYS.operators, ops);
  },

  seedIfEmpty() {
    if (this.getProducts().length === 0) {
      set(KEYS.products, SEED_PRODUCTS);
    }
    if (this.getBills().length === 0) {
      set(KEYS.bills, SEED_BILLS);
      set(KEYS.counter, SEED_BILLS.length);
    }
    if (!get<ShopInfo>(KEYS.shopInfo) && !get<string>(KEYS.shopName)) {
      set(KEYS.shopInfo, DEFAULT_SHOP_INFO);
      set(KEYS.shopName, DEFAULT_SHOP_INFO.name);
    }
  },
};
