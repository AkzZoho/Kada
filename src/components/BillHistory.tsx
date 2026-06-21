import React from 'react';
import { Search, Trash2 } from 'lucide-react';
import type { Bill } from '../types';
import { storage } from '../storage';
import BillView from './BillView';

interface BillHistoryProps {
  bills: Bill[];
  onDelete: (id: string) => void;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDateShort(isoString: string): string {
  const date = new Date(isoString);
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

const BillHistory: React.FC<BillHistoryProps> = ({ bills, onDelete }) => {
  const [search, setSearch] = React.useState('');
  const [selectedBill, setSelectedBill] = React.useState<Bill | null>(null);
  const [shopName] = React.useState(() => storage.getShopName());

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return bills;
    return bills.filter(
      (b) => b.billNumber.toLowerCase().includes(q) || b.customerName.toLowerCase().includes(q)
    );
  }, [bills, search]);

  function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (window.confirm('Delete this bill permanently?')) {
      onDelete(id);
      if (selectedBill?.id === id) setSelectedBill(null);
    }
  }

  return (
    <div>
      <div className="screen-header">
        <div className="screen-header-text">
          <h2>Bill History</h2>
        </div>
      </div>

      <div className="history-filters">
        <div className="search-bar" style={{ flex: 1 }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search by bill number or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
            style={{ border: 'none', padding: '11px 0', background: 'transparent', outline: 'none', flex: 1 }}
          />
        </div>
      </div>

      <div className="stats-line">
        {filtered.length} {filtered.length === 1 ? 'bill' : 'bills'}
        {search && ` matching "${search}"`}
        {!search && bills.length > 0 && ` total`}
      </div>

      {bills.length === 0 ? (
        <div className="no-bills">No bills recorded yet.</div>
      ) : filtered.length === 0 ? (
        <div className="no-bills">No bills match your search.</div>
      ) : (
        <div className="bill-list">
          {filtered.map((bill) => (
            <div key={bill.id} className="bill-card" onClick={() => setSelectedBill(bill)}>
              <div className="bill-info">
                <span className="bill-num">{bill.billNumber}</span>
                <div className="bill-details">
                  <span className="bill-customer">{bill.customerName || 'Walk-in Customer'}</span>
                  <span className="bill-meta-text">
                    {formatDateShort(bill.date)} &middot; {bill.items.length}{' '}
                    {bill.items.length === 1 ? 'item' : 'items'}
                  </span>
                </div>
              </div>
              <div className="bill-amount">
                <span className="bill-total">₹{bill.grandTotal.toFixed(2)}</span>
                <span className={`pay-chip ${bill.paymentMode}`}>{bill.paymentMode.toUpperCase()}</span>
                <button className="icon-btn del" title="Delete bill" onClick={(e) => handleDelete(e, bill.id)}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedBill && (
        <BillView bill={selectedBill} shopName={shopName} onClose={() => setSelectedBill(null)} />
      )}
    </div>
  );
};

export default BillHistory;
