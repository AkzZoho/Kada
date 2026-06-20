import React from 'react';
import type { Bill } from '../types';

interface BillViewProps {
  bill: Bill;
  shopName: string;
  onClose: () => void;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const d = date.getDate();
  const month = MONTHS[date.getMonth()];
  const year = date.getFullYear();
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${d} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
}

function fmt(amount: number): string {
  return `₹${amount.toFixed(2)}`;
}

const BillView: React.FC<BillViewProps> = ({ bill, shopName, onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal bill-view" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Bill #{bill.billNumber}</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="bill-print">
            {/* Shop Header */}
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ margin: '0 0 4px 0', fontSize: '1.4rem' }}>{shopName}</h2>
              <p className="shop-sub">Kerala, India</p>
            </div>

            <hr className="divider" />

            {/* Bill Meta */}
            <div className="bill-meta">
              <div className="meta-row">
                <span><strong>Bill No:</strong> {bill.billNumber}</span>
                <span><strong>Date:</strong> {formatDate(bill.date)}</span>
              </div>
              {(bill.customerName || bill.customerPhone) && (
                <div className="meta-row">
                  {bill.customerName && (
                    <span><strong>Customer:</strong> {bill.customerName}</span>
                  )}
                  {bill.customerPhone && (
                    <span><strong>Phone:</strong> {bill.customerPhone}</span>
                  )}
                </div>
              )}
              <div className="meta-row">
                <span>
                  <strong>Payment:</strong>{' '}
                  {bill.paymentMode.charAt(0).toUpperCase() + bill.paymentMode.slice(1)}
                </span>
              </div>
            </div>

            <hr className="divider" />

            {/* Items Table */}
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th className="th">Item</th>
                  <th className="th" style={{ textAlign: 'right' }}>Qty</th>
                  <th className="th" style={{ textAlign: 'right' }}>Rate</th>
                  <th className="th" style={{ textAlign: 'right' }}>Taxable</th>
                  <th className="th" style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {bill.items.map((item) => (
                  <tr key={item.productId}>
                    <td className="td">{item.name}</td>
                    <td className="td" style={{ textAlign: 'right' }}>
                      {item.quantity} {item.unit}
                    </td>
                    <td className="td" style={{ textAlign: 'right' }}>
                      {fmt(item.price)}
                    </td>
                    <td className="td" style={{ textAlign: 'right' }}>
                      {fmt(item.taxableAmount)}
                    </td>
                    <td className="td" style={{ textAlign: 'right' }}>
                      {fmt(item.lineTotal)}
                    </td>
                  </tr>
                ))}
                <tr className="tax-row">
                  <td className="td" colSpan={4}>CGST</td>
                  <td className="td" style={{ textAlign: 'right' }}>{fmt(bill.totalCGST)}</td>
                </tr>
                <tr className="tax-row">
                  <td className="td" colSpan={4}>SGST</td>
                  <td className="td" style={{ textAlign: 'right' }}>{fmt(bill.totalSGST)}</td>
                </tr>
              </tbody>
            </table>

            <hr className="divider" />

            {/* Totals */}
            {bill.discount > 0 && (
              <div className="meta-row">
                <span>Discount</span>
                <span>- {fmt(bill.discount)}</span>
              </div>
            )}
            <div className="meta-row grand-row">
              <span><strong>Grand Total</strong></span>
              <span><strong>{fmt(bill.grandTotal)}</strong></span>
            </div>

            <div className="footer-note">Thank you for shopping! Come again.</div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-primary" onClick={() => window.print()}>
            Print Bill
          </button>
        </div>
      </div>
    </div>
  );
};

export default BillView;
