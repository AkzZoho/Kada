export type GSTRate = 0 | 5 | 12 | 18 | 28;

export interface ShopInfo {
  name: string;
  address: string;
  gstin: string;
  phone: string;
  operatorName: string;
  logo: string;
}
export type PaymentMode = 'cash' | 'card' | 'upi';
export type Screen = 'pos' | 'products' | 'purchase' | 'history' | 'reports' | 'settings';

export interface PurchaseItem {
  name: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
}

export interface Purchase {
  id: string;
  purchaseNumber: string;
  date: string;
  supplierName: string;
  expectedDelivery: string;
  notes: string;
  items: PurchaseItem[];
  status: 'pending' | 'received';
  totalAmount: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  unit: string;
  gstRate: GSTRate;
  category: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface BillItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  gstRate: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  lineTotal: number;
}

export interface Bill {
  id: string;
  billNumber: string;
  date: string;
  items: BillItem[];
  subtotal: number;
  totalCGST: number;
  totalSGST: number;
  totalGST: number;
  discount: number;
  grandTotal: number;
  customerName: string;
  customerPhone: string;
  paymentMode: PaymentMode;
  operatorName?: string;
}
