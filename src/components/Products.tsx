import React from 'react';
import type { Product, GSTRate } from '../types';

interface ProductsProps {
  products: Product[];
  onUpdate: (products: Product[]) => void;
}

const UNITS = ['piece', 'kg', 'g', 'litre', 'ml', 'box', 'set'];
const GST_RATES: GSTRate[] = [0, 5, 12, 18, 28];

interface FormState {
  name: string;
  category: string;
  price: string;
  unit: string;
  gstRate: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  category: '',
  price: '',
  unit: 'piece',
  gstRate: '0',
};

const Products: React.FC<ProductsProps> = ({ products, onUpdate }) => {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null);
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [error, setError] = React.useState('');

  function openAdd() {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setError('');
    setModalOpen(true);
  }

  function openEdit(product: Product) {
    setEditingProduct(product);
    setForm({
      name: product.name,
      category: product.category,
      price: String(product.price),
      unit: product.unit,
      gstRate: String(product.gstRate),
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

    if (!name) {
      setError('Product name is required.');
      return;
    }
    if (!form.price || isNaN(price) || price < 0) {
      setError('A valid price is required.');
      return;
    }

    const productData: Product = {
      id: editingProduct ? editingProduct.id : crypto.randomUUID(),
      name,
      category: form.category.trim(),
      price,
      unit: form.unit,
      gstRate: parseInt(form.gstRate, 10) as GSTRate,
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
    <div className="screen">
      <div className="screen-header">
        <div className="screen-header-text">
          <h2>Products</h2>
          <span className="count-badge">{products.length} items</span>
        </div>
        <button className="btn btn-gold" onClick={openAdd}>
          + Add Product
        </button>
      </div>

      <div className="table-card">
        {products.length === 0 ? (
          <div className="empty-table">No products yet. Add your first product!</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th className="th">Name</th>
                <th className="th">Category</th>
                <th className="th">Price</th>
                <th className="th">Unit</th>
                <th className="th">GST Rate</th>
                <th className="th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="td">{product.name}</td>
                  <td className="td">
                    {product.category ? (
                      <span className="cat-badge">{product.category}</span>
                    ) : (
                      <span style={{ color: '#aaa' }}>—</span>
                    )}
                  </td>
                  <td className="td">₹{product.price.toFixed(2)}</td>
                  <td className="td">{product.unit}</td>
                  <td className="td">
                    <span className="gst-badge">{product.gstRate}%</span>
                  </td>
                  <td className="td">
                    <div className="row-actions">
                      <button
                        className="icon-btn edit"
                        title="Edit"
                        onClick={() => openEdit(product)}
                      >
                        ✏️
                      </button>
                      <button
                        className="icon-btn del"
                        title="Delete"
                        onClick={() => handleDelete(product.id)}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingProduct ? 'Edit Product' : 'Add Product'}</h3>
              <button className="modal-close" onClick={closeModal}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              {error && <div className="form-error">{error}</div>}

              <div className="form-grid">
                <div className="form-field">
                  <label>Product Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => handleField('name', e.target.value)}
                    placeholder="e.g. Rice"
                    style={{ width: '100%' }}
                  />
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label>Category</label>
                    <input
                      type="text"
                      value={form.category}
                      onChange={(e) => handleField('category', e.target.value)}
                      placeholder="e.g. Grocery"
                    />
                  </div>
                  <div className="form-field">
                    <label>Price (₹) *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price}
                      onChange={(e) => handleField('price', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label>Unit</label>
                    <select
                      value={form.unit}
                      onChange={(e) => handleField('unit', e.target.value)}
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>GST Rate</label>
                    <select
                      value={form.gstRate}
                      onChange={(e) => handleField('gstRate', e.target.value)}
                    >
                      {GST_RATES.map((r) => (
                        <option key={r} value={r}>
                          {r}%
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeModal}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                {editingProduct ? 'Update' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
