import React, { useState } from 'react';
import { TrendingUp, ClipboardList, Package, Banknote, CreditCard, Smartphone } from 'lucide-react';
import type { Bill } from '../types';
import BillHistory from './BillHistory';

interface ReportsScreenProps {
  bills: Bill[];
  onDelete: (id: string) => Promise<void>;
}

type Period = 'today' | 'week' | 'month' | 'all';
type Tab = 'sales' | 'history' | 'stock';

const PERIOD_LABELS: Record<Period, string> = { today: 'Today', week: 'This Week', month: 'This Month', all: 'All Time' };

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
  // month
  const ms = new Date(now.getFullYear(), now.getMonth(), 1);
  return bills.filter(b => new Date(b.date) >= ms);
}

const ReportsScreen: React.FC<ReportsScreenProps> = ({ bills, onDelete }) => {
  const [tab, setTab] = useState<Tab>('sales');
  const [period, setPeriod] = useState<Period>('month');

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

  const stockStats = React.useMemo(() => {
    const itemMap = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const bill of bills) {
      for (const item of bill.items) {
        const existing = itemMap.get(item.productId) ?? { name: item.name, qty: 0, revenue: 0 };
        itemMap.set(item.productId, {
          name: item.name,
          qty: existing.qty + item.quantity,
          revenue: existing.revenue + item.lineTotal,
        });
      }
    }
    return Array.from(itemMap.values()).sort((a, b) => b.qty - a.qty);
  }, [bills]);

  return (
    <div>
      {/* Tab Bar */}
      <div className="report-tabs">
        {([['sales', TrendingUp, 'Sales'], ['history', ClipboardList, 'History'], ['stock', Package, 'Stock']] as [Tab, React.FC<{size:number}>, string][]).map(([id, Icon, label]) => (
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
          {/* Period filter */}
          <div className="period-filter">
            {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(([p, label]) => (
              <button
                key={p}
                className={`period-btn${period === p ? ' active' : ''}`}
                onClick={() => setPeriod(p)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Stat cards */}
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

          {/* Payment breakdown */}
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
                  <div className="pbc-bar" style={{
                    width: `${salesStats.totalSales > 0 ? (amount / salesStats.totalSales) * 100 : 0}%`,
                  }} />
                </div>
              ))}
            </div>
          </div>

          {/* Top products */}
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

          {salesStats.billCount === 0 && (
            <div className="no-bills">No bills in this period.</div>
          )}
        </div>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <BillHistory bills={bills} onDelete={onDelete} />
      )}

      {/* Stock Tab */}
      {tab === 'stock' && (
        <div>
          <div className="screen-header" style={{ marginBottom: 12 }}>
            <div className="screen-header-text">
              <h2>Product Summary</h2>
              <p>Units sold across all time</p>
            </div>
          </div>
          {stockStats.length === 0 ? (
            <div className="no-bills">No sales data yet.</div>
          ) : (
            <div className="table-card">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Product</th>
                    <th style={{ textAlign: 'right' }}>Units Sold</th>
                    <th style={{ textAlign: 'right' }}>Total Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {stockStats.map((item, i) => (
                    <tr key={item.name}>
                      <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{item.name}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'Outfit', fontWeight: 700 }}>{item.qty}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'Outfit', fontWeight: 700, color: 'var(--green-dark)' }}>
                        ₹{item.revenue.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportsScreen;
