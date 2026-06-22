import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Plus, Pencil, Trash2, QrCode, X, Printer } from 'lucide-react';
import type { Product, GSTRate } from '../types';
import UnitSelect from './UnitSelect';

interface ProductsProps {
  products: Product[];
  onUpdate: (products: Product[]) => void;
  units: string[];
  onAddUnit: (unit: string) => void;
}

const GST_RATES: GSTRate[] = [0, 5, 12, 18, 28];

interface FormState {
  sku: string;
  name: string;
  category: string;
  price: string;
  unit: string;
  gstRate: string;
  stock: string;
}

const EMPTY_FORM: FormState = { sku: '', name: '', category: '', price: '', unit: 'piece', gstRate: '0', stock: '' };

function nextSKU(products: Product[]): string {
  const nums = products
    .map(p => p.sku?.match(/^P(\d+)$/i)?.[1])
    .filter(Boolean)
    .map(Number);
  return `P${String((nums.length > 0 ? Math.max(...nums) : 0) + 1).padStart(3, '0')}`;
}

function qrData(p: Product): string {
  return `KADA:${p.id}\n${p.name}\n₹${p.price.toFixed(2)}/${p.unit}`;
}

function stockLabel(stock?: number): { text: string; cls: string } | null {
  if (stock === undefined || stock === null) return null;
  if (stock === 0) return { text: 'Out of stock', cls: 'stock-out' };
  if (stock <= 5) return { text: `${stock} left`, cls: 'stock-low' };
  return { text: `${stock} in stock`, cls: 'stock-ok' };
}

const Products: React.FC<ProductsProps> = ({ products, onUpdate, units, onAddUnit }) => {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null);
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [error, setError] = React.useState('');
  const [qrProduct, setQrProduct] = React.useState<Product | null>(null);

  function openAdd() {
    setEditingProduct(null);
    setForm({ ...EMPTY_FORM, sku: nextSKU(products) });
    setError('');
    setModalOpen(true);
  }

  function openEdit(product: Product) {
    setEditingProduct(product);
    setForm({
      sku: product.sku ?? '',
      name: product.name,
      category: product.category,
      price: String(product.price),
      unit: product.unit,
      gstRate: String(product.gstRate),
      stock: product.stock !== undefined ? String(product.stock) : '',
    });
    setError('');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setError('');
  }

  function handleField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSave() {
    const name = form.name.trim();
    const price = parseFloat(form.price);
    if (!name) { setError('Product name is required.'); return; }
    if (!form.price || isNaN(price) || price < 0) { setError('A valid price is required.'); return; }

    const otherProducts = editingProduct ? products.filter(p => p.id !== editingProduct.id) : products;
    const sku = form.sku.trim() || nextSKU(otherProducts);
    const stockVal = form.stock.trim() !== '' ? Math.max(0, parseInt(form.stock, 10) || 0) : undefined;
    const productData: Product = {
      id: editingProduct ? editingProduct.id : crypto.randomUUID(),
      sku, name, category: form.category.trim(), price,
      unit: form.unit || 'piece',
      gstRate: parseInt(form.gstRate, 10) as GSTRate,
      stock: stockVal,
    };

    if (editingProduct) {
      onUpdate(products.map((p) => (p.id === editingProduct.id ? productData : p)));
    } else {
      onUpdate([...products, productData]);
    }
    closeModal();
  }

  function handleDelete(id: string) {
    if (window.confirm('Delete this product?')) {
      onUpdate(products.filter((p) => p.id !== id));
    }
  }

  return (
    <div>
      <div className="screen-header">
        <div className="screen-header-text">
          <h2>Products</h2>
          <p>{products.length} item{products.length !== 1 ? 's' : ''} in catalog</p>
        </div>
        <button className="btn btn-gold" onClick={openAdd}>
          <Plus size={16} style={{ marginRight: 4 }} /> Add Product
        </button>
      </div>

      <div className="table-card">
        {products.length === 0 ? (
          <div className="empty-table">
            <div style={{ fontSize: 32 }}>📦</div>
            <p>No products yet. Add your first product!</p>
          </div>
        ) : (
          <div className="product-list">
            {products.map((product) => {
              const sl = stockLabel(product.stock);
              return (
                <div key={product.id} className="pli">
                  <div className="pli-main">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                      {product.sku && <span className="sku-badge">{product.sku}</span>}
                      <div className="pli-name" style={{ marginBottom: 0 }}>{product.name}</div>
                    </div>
                    <div className="pli-tags">
                      {product.category && <span className="cat-badge">{product.category}</span>}
                      <span className="gst-badge">{product.gstRate}%</span>
                      <span className="unit-badge">{product.unit}</span>
                      {sl && <span className={`stock-badge ${sl.cls}`}>{sl.text}</span>}
                    </div>
                  </div>
                  <div className="pli-right">
                    <div className="pli-price">₹{product.price.toFixed(2)}</div>
                    <div className="pli-actions">
                      <button className="icon-btn" title="QR Label" onClick={() => setQrProduct(product)}><QrCode size={14} /></button>
                      <button className="icon-btn edit" title="Edit" onClick={() => openEdit(product)}><Pencil size={14} /></button>
                      <button className="icon-btn del" title="Delete" onClick={() => handleDelete(product.id)}><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingProduct ? 'Edit Product' : 'Add Product'}</h3>
              <button className="modal-close" onClick={closeModal}><X size={18} /></button>
            </div>
            <div className="modal-body">
              {error && (
                <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 6, marginBottom: 12, fontSize: 13 }}>
                  {error}
                </div>
              )}
              <div className="form-grid">
                <div className="form-row">
                  <div className="form-field" style={{ flex: 2 }}>
                    <label>Product Name *</label>
                    <input type="text" value={form.name} onChange={(e) => handleField('name', e.target.value)} placeholder="e.g. Silk Saree" autoFocus />
                  </div>
                  <div className="form-field" style={{ flex: 1 }}>
                    <label>SKU / Code</label>
                    <input type="text" value={form.sku} onChange={(e) => handleField('sku', e.target.value)} placeholder="e.g. P001" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <label>Category</label>
                    <input type="text" value={form.category} onChange={(e) => handleField('category', e.target.value)} placeholder="e.g. Clothing" />
                  </div>
                  <div className="form-field">
                    <label>Price (₹) *</label>
                    <input type="number" min="0" step="0.01" value={form.price} onChange={(e) => handleField('price', e.target.value)} placeholder="0.00" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <label>Unit of Measure</label>
                    <UnitSelect
                      value={form.unit}
                      onChange={v => handleField('unit', v)}
                      units={units}
                      onAddUnit={onAddUnit}
                    />
                  </div>
                  <div className="form-field">
                    <label>GST Rate</label>
                    <div className="gst-rate-pills">
                      {GST_RATES.map(r => (
                        <button
                          key={r}
                          type="button"
                          className={`gst-pill${form.gstRate === String(r) ? ' active' : ''}`}
                          onClick={() => handleField('gstRate', String(r))}
                        >
                          {r}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="form-field">
                  <label>Stock Count <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 12 }}>(optional — leave blank to not track)</span></label>
                  <input
                    type="number" min="0" step="1"
                    value={form.stock}
                    onChange={(e) => handleField('stock', e.target.value)}
                    placeholder="e.g. 50"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>{editingProduct ? 'Update' : 'Add Product'}</button>
            </div>
          </div>
        </div>
      )}

      {/* QR Label Modal */}
      {qrProduct && (
        <div className="modal-overlay" onClick={() => setQrProduct(null)}>
          <div className="modal qr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header no-print">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><QrCode size={17} /> QR Label</h3>
              <button className="modal-close" onClick={() => setQrProduct(null)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', justifyContent: 'center', padding: '28px 20px 20px' }}>
              <div className="qr-label">
                {qrProduct.category && <div className="qr-label-cat">{qrProduct.category}</div>}
                <div className="qr-label-name">{qrProduct.name}</div>
                <div className="qr-label-price">₹{qrProduct.price.toFixed(2)}</div>
                <div className="qr-label-sub">per {qrProduct.unit} · GST {qrProduct.gstRate}%</div>
                <div className="qr-label-code">
                  <QRCodeSVG value={qrData(qrProduct)} size={160} level="M" />
                </div>
                {qrProduct.sku && <div className="qr-label-sku">{qrProduct.sku}</div>}
                <div className="qr-label-hint">Scan with Kada POS to add to cart</div>
              </div>
            </div>
            <div className="modal-footer no-print">
              <button className="btn btn-ghost" onClick={() => setQrProduct(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => window.print()}>
                <Printer size={15} style={{ marginRight: 5 }} /> Print Label
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
