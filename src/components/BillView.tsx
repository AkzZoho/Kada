import React from 'react';
import { X, Printer, Share2 } from 'lucide-react';
import type { Bill, ShopInfo } from '../types';
import { storage } from '../storage';

interface BillViewProps {
  bill: Bill;
  shopName: string; // kept for compat; actual details read from storage
  onClose: () => void;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${h}:${m} ${ampm}`;
}

function fmt(n: number) { return `₹${n.toFixed(2)}`; }

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function buildShareText(bill: Bill, shop: ShopInfo): string {
  const sep = '━━━━━━━━━━━━━━━━━━━━━━';
  const items = bill.items.map(i => `  ${i.name} ×${i.quantity} = ${fmt(i.lineTotal)}`).join('\n');
  const discount = bill.discount > 0 ? `\nDiscount: -${fmt(bill.discount)}` : '';
  return (
    `*${shop.name}*\n` +
    (shop.address ? `${shop.address}\n` : '') +
    (shop.phone ? `Ph: ${shop.phone}\n` : '') +
    (shop.gstin ? `GSTIN: ${shop.gstin}\n` : '') +
    `${sep}\n` +
    `*TAX INVOICE*\n` +
    `Bill No: ${bill.billNumber}\n` +
    `Date: ${formatDate(bill.date)}\n` +
    (bill.customerName ? `Customer: ${bill.customerName}\n` : '') +
    (bill.customerPhone ? `Phone: ${bill.customerPhone}\n` : '') +
    `${sep}\n` +
    `${items}\n` +
    `${sep}\n` +
    `Taxable: ${fmt(bill.subtotal)}\n` +
    `CGST: ${fmt(bill.totalCGST)}\n` +
    `SGST: ${fmt(bill.totalSGST)}` +
    `${discount}\n` +
    `*TOTAL: ${fmt(bill.grandTotal)}*\n` +
    `Payment: ${bill.paymentMode.toUpperCase()}\n` +
    `${sep}\n` +
    `Thank you for shopping! 🙏`
  );
}

// Group items by GST rate for the tax summary section
function buildTaxSummary(bill: Bill) {
  const map = new Map<number, { taxable: number; cgst: number; sgst: number }>();
  for (const item of bill.items) {
    const existing = map.get(item.gstRate) ?? { taxable: 0, cgst: 0, sgst: 0 };
    map.set(item.gstRate, {
      taxable: existing.taxable + item.taxableAmount,
      cgst: existing.cgst + item.cgst,
      sgst: existing.sgst + item.sgst,
    });
  }
  return Array.from(map.entries()).sort(([a], [b]) => a - b);
}

const BillView: React.FC<BillViewProps> = ({ bill, onClose }) => {
  const shop: ShopInfo = storage.getShopInfo();
  const taxSummary = buildTaxSummary(bill);

  function handleShare() {
    const text = buildShareText(bill, shop);
    if ('share' in navigator) {
      (navigator as Navigator & { share: (d: object) => Promise<void> })
        .share({ title: `Bill ${bill.billNumber} — ${shop.name}`, text }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal bill-view" onClick={e => e.stopPropagation()}>

        {/* Close button only — invoice header has all details */}
        <div className="inv-close-bar no-print">
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body invoice-body">
          <div className="invoice">

            {/* Shop Header */}
            <div className="inv-shop-header">
              <div className="inv-logo">{getInitials(shop.name)}</div>
              <div className="inv-shop-info">
                <div className="inv-shop-name">{shop.name}</div>
                {shop.address && <div className="inv-shop-detail">{shop.address}</div>}
                {shop.phone && <div className="inv-shop-detail">Ph: {shop.phone}</div>}
                {shop.gstin && <div className="inv-shop-detail">GSTIN: {shop.gstin}</div>}
              </div>
              <div className="inv-label">TAX INVOICE</div>
            </div>

            <div className="inv-divider" />

            {/* Bill Meta */}
            <div className="inv-meta-grid">
              <div>
                <div className="inv-meta-key">Invoice No</div>
                <div className="inv-meta-val inv-mono">{bill.billNumber}</div>
              </div>
              <div>
                <div className="inv-meta-key">Date &amp; Time</div>
                <div className="inv-meta-val">{formatDate(bill.date)}</div>
              </div>
              {bill.customerName && (
                <div>
                  <div className="inv-meta-key">Customer</div>
                  <div className="inv-meta-val">{bill.customerName}</div>
                </div>
              )}
              {bill.customerPhone && (
                <div>
                  <div className="inv-meta-key">Phone</div>
                  <div className="inv-meta-val">{bill.customerPhone}</div>
                </div>
              )}
              <div>
                <div className="inv-meta-key">Payment</div>
                <div className="inv-meta-val">
                  <span className={`pay-chip ${bill.paymentMode}`}>{bill.paymentMode.toUpperCase()}</span>
                </div>
              </div>
            </div>

            <div className="inv-divider" />

            {/* Items List */}
            <div className="inv-items">
              {bill.items.map((item, i) => (
                <div key={i} className="inv-item">
                  <div className="inv-item-top">
                    <span className="inv-item-name">{item.name}</span>
                    <span className="inv-item-total">{fmt(item.lineTotal)}</span>
                  </div>
                  <div className="inv-item-sub">
                    {item.quantity} {item.unit} × {fmt(item.price)}
                    {item.gstRate > 0 && ` · Taxable ${fmt(item.taxableAmount)} · GST ${item.gstRate}%`}
                  </div>
                </div>
              ))}
            </div>

            <div className="inv-divider" />

            {/* Tax Summary */}
            {taxSummary.some(([rate]) => rate > 0) && (
              <>
                <div className="inv-tax-summary">
                  <div className="inv-tax-header">
                    <span>GST%</span>
                    <span className="right">Taxable</span>
                    <span className="right">CGST</span>
                    <span className="right">SGST</span>
                    <span className="right">Total GST</span>
                  </div>
                  {taxSummary.filter(([rate]) => rate > 0).map(([rate, vals]) => (
                    <div key={rate} className="inv-tax-row">
                      <span>{rate}%</span>
                      <span className="right">{fmt(vals.taxable)}</span>
                      <span className="right">{fmt(vals.cgst)}</span>
                      <span className="right">{fmt(vals.sgst)}</span>
                      <span className="right">{fmt(vals.cgst + vals.sgst)}</span>
                    </div>
                  ))}
                </div>
                <div className="inv-divider" />
              </>
            )}

            {/* Totals */}
            <div className="inv-totals">
              <div className="inv-total-row">
                <span>Subtotal (Taxable)</span>
                <span>{fmt(bill.subtotal)}</span>
              </div>
              <div className="inv-total-row">
                <span>CGST</span>
                <span>{fmt(bill.totalCGST)}</span>
              </div>
              <div className="inv-total-row">
                <span>SGST</span>
                <span>{fmt(bill.totalSGST)}</span>
              </div>
              {bill.discount > 0 && (
                <div className="inv-total-row discount">
                  <span>Discount</span>
                  <span>− {fmt(bill.discount)}</span>
                </div>
              )}
              <div className="inv-grand-total">
                <span>GRAND TOTAL</span>
                <span>{fmt(bill.grandTotal)}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="inv-footer">
              <div className="inv-footer-note">Thank you for shopping at {shop.name}! Come again. 🙏</div>
              {shop.gstin && <div className="inv-footer-gstin">This is a computer-generated tax invoice</div>}
            </div>

          </div>
        </div>

        {/* Action buttons */}
        <div className="modal-footer no-print">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
          <button
            className="btn"
            style={{ background: '#25D366', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={handleShare}
          >
            <Share2 size={15} />
            {'share' in navigator ? 'Share' : 'WhatsApp'}
          </button>
          <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => window.print()}>
            <Printer size={15} /> Print
          </button>
        </div>

      </div>
    </div>
  );
};

export default BillView;
