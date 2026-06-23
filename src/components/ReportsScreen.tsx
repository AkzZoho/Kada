import React, { useState } from 'react';
import { TrendingUp, ClipboardList, Package, Banknote, CreditCard, Smartphone, Users, ChevronDown } from 'lucide-react';
import type { Bill, Product } from '../types';
import BillHistory from './BillHistory';

interface ReportsScreenProps {
  bills: Bill[];
  products: Product[];
  onDelete: (id: string) => Promise<void>;
}

type Period = 'today' | 'week' | 'month' | 'all';
type Tab = 'sales' | 'history' | 'stock' | 'customers';

const PERIOD_LABELS: Record<Period, string> = { today: 'Today', week: 'This Week', month: 'This Month', all: 'All Time' };

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function filterByPeriod(bills: Bill[], period: Period): Bill[] {
  if (period === 'all') return bills;
  const now = new Date();
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = startOf(now);
  if (period === 'today') return bills.filter(b => new Date(b.date) >= today);
  if (period === 'week') {
    const ws = new Date(today);
    ws.setDate(today.getDate() - today.getDay());
    return bills.filter(b => new Date(b.date) >= ws);
  }
  const ms = new Date(now.getFullYear(), now.getMonth(), 1);
  return bills.filter(b => new Date(b.date) >= ms);
}

interface CustomerSummary {
  key: string;
  name: string;
  phone: string;
  billCount: number;
  totalSpend: number;
  lastVisit: string;
  bills: Bill[];
}

function buildCustomers(bills: Bill[]): CustomerSummary[] {
  const map = new Map<string, CustomerSummary>();
  for (const bill of bills) {
    const name = bill.customerName?.trim() || '';
    const phone = bill.customerPhone?.trim() || '';
    if (!name && !phone) continue;
    const key = phone || name.toLowerCase();
    const existing = map.get(key);
    if (existing) {
      existing.billCount += 1;
      existing.totalSpend += bill.grandTotal;
      if (bill.date > existing.lastVisit) existing.lastVisit = bill.date;
      existing.bills.push(bill);
    } else {
      map.set(key, { key, name, phone, billCount: 1, totalSpend: bill.grandTotal, lastVisit: bill.date, bills: [bill] });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.totalSpend - a.totalSpend);
}

const ReportsScreen: React.FC<ReportsScreenProps> = ({ bills, products, onDelete }) => {
  const [tab, setTab] = useState<Tab>('sales');
  const [period, setPeriod] = useState<Period>('month');
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [custSearch, setCustSearch] = useState('');

  const filtered = React.useMemo(() => filterByPeriod(bills, period), [bills, period]);

  const salesStats = React.useMemo(() => {
    const totalSales = filtered.reduce((s, b) => s + b.grandTotal, 0);
    const totalGST = filtered.reduce((s, b) => s + b.totalGST, 0);
    const billCount = filtered.length;
    const avgOrder = billCount > 0 ? totalSales / billCount : 0;
    const byCash = filtered.filter(b => b.paymentMode === 'cash').reduce((s, b) => s + b.grandTotal, 0);
    const byCard = filtered.filter(b => b.paymentMode === 'card').reduce((s, b) => s + b.grandTotal, 0);
    const byUpi  = filtered.filter(b => b.paymentMode === 'upi').reduce((s, b) => s + b.grandTotal, 0);

    const itemMap = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const bill of filtered) {
      for (const item of bill.items) {
        const existing = itemMap.get(item.productId) ?? { name: item.name, qty: 0, revenue: 0 };
        itemMap.set(item.productId, {
          name: item.name,
          qty: existing.qty + item.quantity,
          revenue: existing.revenue + item.lineTotal,
        });
      }
    }
    const topItems = Array.from(itemMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    return { totalSales, totalGST, billCount, avgOrder, byCash, byCard, byUpi, topItems };
  }, [filtered]);

  const trackedProducts = React.useMemo(() =>
    products
      .filter(p => p.stock !== undefined && p.stock !== null)
      .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0)),
  [products]);

  const customers = React.useMemo(() => buildCustomers(bills), [bills]);

  const filteredCustomers = React.useMemo(() => {
    const q = custSearch.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [customers, custSearch]);

  const TABS: [Tab, React.FC<{ size: number }>, string][] = [
    ['sales', TrendingUp, 'Sales'],
    ['history', ClipboardList, 'History'],
    ['stock', Package, 'Stock'],
    ['customers', Users, 'Customers'],
  ];

  return (
    <div>
      {/* Tab Bar */}
      <div className="report-tabs">
        {TABS.map(([id, Icon, label]) => (
          <button
            key={id}
            className={`report-tab${tab === id ? ' active' : ''}`}
            onClick={() => setTab(id)}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Sales Tab */}
      {tab === 'sales' && (
        <div>
          <div className="period-filter">
            {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(([p, label]) => (
              <button key={p} className={`period-btn${period === p ? ' active' : ''}`} onClick={() => setPeriod(p)}>
                {label}
              </button>
            ))}
          </div>

          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Total Sales</div>
              <div className="stat-value">₹{salesStats.totalSales.toFixed(2)}</div>
              <div className="stat-sub">{salesStats.billCount} bills</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total GST</div>
              <div className="stat-value">₹{salesStats.totalGST.toFixed(2)}</div>
              <div className="stat-sub">collected</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Avg Order</div>
              <div className="stat-value">₹{salesStats.avgOrder.toFixed(2)}</div>
              <div className="stat-sub">per bill</div>
            </div>
          </div>

          <div className="report-section">
            <div className="report-section-title">Payment Breakdown</div>
            <div className="pay-breakdown">
              {[
                { mode: 'Cash', icon: <Banknote size={16} />, amount: salesStats.byCash, cls: 'cash' },
                { mode: 'Card', icon: <CreditCard size={16} />, amount: salesStats.byCard, cls: 'card' },
                { mode: 'UPI',  icon: <Smartphone size={16} />, amount: salesStats.byUpi,  cls: 'upi'  },
              ].map(({ mode, icon, amount, cls }) => (
                <div key={mode} className={`pay-breakdown-card ${cls}`}>
                  <span className="pbc-icon">{icon}</span>
                  <span className="pbc-mode">{mode}</span>
                  <span className="pbc-amount">₹{amount.toFixed(0)}</span>
                  <div className="pbc-bar" style={{ width: `${salesStats.totalSales > 0 ? (amount / salesStats.totalSales) * 100 : 0}%` }} />
                </div>
              ))}
            </div>
          </div>

          {salesStats.topItems.length > 0 && (
            <div className="report-section">
              <div className="report-section-title">Top Products</div>
              <div className="table-card">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Product</th>
                      <th style={{ textAlign: 'right' }}>Qty Sold</th>
                      <th style={{ textAlign: 'right' }}>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesStats.topItems.map((item, i) => (
                      <tr key={item.name}>
                        <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{i + 1}</td>
                        <td style={{ fontWeight: 600 }}>{item.name}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'Outfit' }}>{item.qty}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'Outfit', fontWeight: 700, color: 'var(--green-dark)' }}>
                          ₹{item.revenue.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {salesStats.billCount === 0 && <div className="no-bills">No bills in this period.</div>}
        </div>
      )}

      {/* History Tab */}
      {tab === 'history' && <BillHistory bills={bills} onDelete={onDelete} />}

      {/* Stock Tab */}
      {tab === 'stock' && (
        <div>
          <div className="screen-header" style={{ marginBottom: 12 }}>
            <div className="screen-header-text">
              <h2>Inventory Stock</h2>
              <p>{trackedProducts.length} product{trackedProducts.length !== 1 ? 's' : ''} tracked · sorted by lowest first</p>
            </div>
          </div>

          {trackedProducts.length === 0 ? (
            <div className="no-bills">
              No stock tracking enabled. Set a stock count on products to track inventory here.
            </div>
          ) : (
            <>
              {/* Summary chips */}
              <div className="stock-summary-row">
                <div className="stock-summary-chip out">
                  <span className="stock-summary-count">{trackedProducts.filter(p => p.stock === 0).length}</span>
                  <span>Out of Stock</span>
                </div>
                <div className="stock-summary-chip low">
                  <span className="stock-summary-count">{trackedProducts.filter(p => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 5).length}</span>
                  <span>Low Stock</span>
                </div>
                <div className="stock-summary-chip ok">
                  <span className="stock-summary-count">{trackedProducts.filter(p => (p.stock ?? 0) > 5).length}</span>
                  <span>Sufficient</span>
                </div>
              </div>

              <div className="table-card">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th style={{ textAlign: 'right' }}>Stock</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trackedProducts.map(p => {
                      const stock = p.stock ?? 0;
                      const statusCls = stock === 0 ? 'stock-out' : stock <= 5 ? 'stock-low' : 'stock-ok';
                      const statusText = stock === 0 ? 'Out of stock' : stock <= 5 ? 'Low' : 'OK';
                      return (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 600 }}>{p.name}</td>
                          <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: 12 }}>{p.sku || '—'}</td>
                          <td style={{ textAlign: 'right', fontFamily: 'Outfit', fontWeight: 700 }}>{stock}</td>
                          <td><span className={`stock-badge ${statusCls}`}>{statusText}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Customers Tab */}
      {tab === 'customers' && (
        <div>
          <div className="screen-header" style={{ marginBottom: 12 }}>
            <div className="screen-header-text">
              <h2>Customers</h2>
              <p>{customers.length} customer{customers.length !== 1 ? 's' : ''} found</p>
            </div>
          </div>

          <div className="history-filters" style={{ marginBottom: 16 }}>
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={custSearch}
              onChange={e => setCustSearch(e.target.value)}
            />
          </div>

          {filteredCustomers.length === 0 ? (
            <div className="no-bills">
              {bills.length === 0
                ? 'No bills yet. Customer history will appear once you start billing.'
                : customers.length === 0
                  ? 'No customer details found. Add customer name/phone when creating bills.'
                  : 'No customers match your search.'}
            </div>
          ) : (
            <div className="cust-list">
              {filteredCustomers.map(c => (
                <div key={c.key} className="cust-card">
                  <div
                    className="cust-card-header"
                    onClick={() => setExpandedCustomer(expandedCustomer === c.key ? null : c.key)}
                  >
                    <div className="cust-card-left">
                      <div className="cust-avatar">
                        {(c.name || c.phone).charAt(0).toUpperCase()}
                      </div>
                      <div className="cust-info">
                        <div className="cust-name">{c.name || c.phone}</div>
                        <div className="cust-meta">
                          {c.phone && c.name && <span>{c.phone} · </span>}
                          <span>{c.billCount} visit{c.billCount !== 1 ? 's' : ''}</span>
                          <span> · Last: {fmtDate(c.lastVisit)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="cust-card-right">
                      <div className="cust-spend">₹{c.totalSpend.toFixed(0)}</div>
                      <ChevronDown
                        size={16}
                        color="var(--text-muted)"
                        style={{ transform: expandedCustomer === c.key ? 'rotate(180deg)' : undefined, transition: '0.2s' }}
                      />
                    </div>
                  </div>

                  {expandedCustomer === c.key && (
                    <div className="cust-bills">
                      {c.bills.sort((a, b) => b.date.localeCompare(a.date)).map(bill => (
                        <div key={bill.id} className="cust-bill-row">
                          <div className="cust-bill-left">
                            <span className="cust-bill-num">{bill.billNumber}</span>
                            <span className="cust-bill-date">{fmtDate(bill.date)}</span>
                            <span className="cust-bill-items">{bill.items.length} item{bill.items.length !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="cust-bill-total">₹{bill.grandTotal.toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportsScreen;
