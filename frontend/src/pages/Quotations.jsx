
import { useEffect, useState } from 'react';
import api from '../api';
import Modal from '../components/Modal';
import {
  Loading,
  ErrorBox,
  PageHeading,
  EmptyState,
  StatusBadge,
  money,
  dateShort,
} from '../components/UI';

export default function Quotations() {
  const [rows, setRows] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);
  const [customer, setCustomer] = useState('');
  const [lead, setLead] = useState('');
  const [discount, setDiscount] = useState(0);
  const [valid, setValid] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([
    { product_id: '', quantity: 1, unit_price: '' },
  ]);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);

    try {
      const [q, c, p, l] = await Promise.all([
        api.get('/quotations'),
        api.get('/customers'),
        api.get('/products'),
        api.get('/leads'),
      ]);

      setRows(q.data);
      setCustomers(c.data);
      setProducts(p.data);
      setLeads(l.data);
      setError('');
    } catch (e) {
      setError(
        e.response?.data?.error || 'Could not load quotations'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function updateItem(i, key, value) {
    setItems((currentItems) =>
      currentItems.map((item, index) =>
        index === i ? { ...item, [key]: value } : item
      )
    );
  }

  const subtotal = items.reduce((sum, item) => {
    const product = products.find(
      (p) => p.id === Number(item.product_id)
    );

    const price =
      item.unit_price !== ''
        ? Number(item.unit_price)
        : Number(product?.price || 0);

    return sum + (Number(item.quantity) || 0) * price;
  }, 0);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = {
        customer_id: customer || null,
        lead_id: lead || null,
        discount: Number(discount) || 0,
        valid_until: valid || null,
        notes,
        items: items.map((item) => ({
          product_id: Number(item.product_id),
          quantity: Number(item.quantity),
          unit_price:
            item.unit_price === ''
              ? undefined
              : Number(item.unit_price),
        })),
      };

      await api.post('/quotations', payload);

      setModal(false);
      setCustomer('');
      setLead('');
      setDiscount(0);
      setValid('');
      setNotes('');
      setItems([
        { product_id: '', quantity: 1, unit_price: '' },
      ]);

      await load();
    } catch (e) {
      setError(
        e.response?.data?.error || 'Could not create quotation'
      );
    } finally {
      setSaving(false);
    }
  }

  async function status(id, value) {
    try {
      await api.patch(`/quotations/${id}/status`, {
        status: value,
      });

      await load();
    } catch (e) {
      setError(
        e.response?.data?.error || 'Could not update status'
      );
    }
  }

  function printQuote(q) {
    const w = window.open('', '_blank');

    if (!w) {
      setError('Please allow pop-ups to print the quotation.');
      return;
    }

    w.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>${q.quotation_number}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              color: #222;
            }

            h1 {
              color: #3730a3;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 24px;
            }

            td, th {
              padding: 12px;
              border-bottom: 1px solid #ddd;
              text-align: left;
            }

            .total {
              font-size: 18px;
            }
          </style>
        </head>
        <body>
          <h1>TextileFlow CRM</h1>
          <h2>Quotation ${q.quotation_number}</h2>
          <p>Customer: ${q.business_name || 'Not linked'}</p>
          <p>
            Status: ${q.status}
            · Created: ${dateShort(q.created_at)}
          </p>

          <table>
            <tr>
              <th>Subtotal</th>
              <td>${money(q.subtotal)}</td>
            </tr>
            <tr>
              <th>Discount</th>
              <td>${money(q.discount)}</td>
            </tr>
            <tr>
              <th>Total</th>
              <td class="total">
                <strong>${money(q.total)}</strong>
              </td>
            </tr>
          </table>

          <p>TextileFlow CRM — Surat textile trade</p>
        </body>
      </html>
    `);

    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <div>
      <PageHeading
        eyebrow="SALES DOCUMENTS"
        title="Quotations"
        subtitle="Prepare wholesale offers and track buyer decisions."
        action={
          <button
            className="btn btn-primary"
            onClick={() => setModal(true)}
          >
            <i className="bi bi-plus-lg me-2" />
            New quotation
          </button>
        }
      />

      <ErrorBox message={error} />

      <div className="mini-stat-row">
        <div className="mini-stat">
          <span>Total quotations</span>
          <strong>{rows.length}</strong>
        </div>

        <div className="mini-stat">
          <span>Accepted</span>
          <strong>
            {rows.filter((q) => q.status === 'Accepted').length}
          </strong>
        </div>

        <div className="mini-stat">
          <span>Quoted value</span>
          <strong>
            {money(
              rows.reduce(
                (sum, q) => sum + Number(q.total || 0),
                0
              )
            )}
          </strong>
        </div>
      </div>

      <section className="panel">
        {loading ? (
          <Loading />
        ) : (
          <div className="table-responsive">
            <table className="table app-table align-middle">
              <thead>
                <tr>
                  <th>Quotation</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Subtotal</th>
                  <th>Discount</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((q) => (
                  <tr key={q.id}>
                    <td>
                      <strong>{q.quotation_number}</strong>
                    </td>

                    <td>{q.business_name || 'Unlinked lead'}</td>
                    <td>{dateShort(q.created_at)}</td>
                    <td>{money(q.subtotal)}</td>
                    <td>{money(q.discount)}</td>

                    <td>
                      <strong>{money(q.total)}</strong>
                    </td>

                    <td>
                      <StatusBadge status={q.status} />
                    </td>

                    <td>
                      <div className="d-flex gap-2 align-items-center">
                        <select
                          className="form-select form-select-sm quote-status"
                          value={q.status}
                          onChange={(e) =>
                            status(q.id, e.target.value)
                          }
                        >
                          {[
                            'Draft',
                            'Sent',
                            'Accepted',
                            'Rejected',
                            'Expired',
                          ].map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          className="icon-btn"
                          title="Print"
                          onClick={() => printQuote(q)}
                        >
                          <i className="bi bi-printer" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!rows.length && (
              <EmptyState
                icon="bi-file-earmark-text"
                title="No quotations yet"
                text="Create a quotation from products in the catalog."
              />
            )}
          </div>
        )}
      </section>

      {modal && (
        <Modal
          title="Create quotation"
          onClose={() => setModal(false)}
          size="wide"
        >
          <form onSubmit={save}>
            <div className="form-grid">
              <div>
                <label className="form-label">Customer</label>

                <select
                  className="form-select"
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                >
                  <option value="">Select customer (optional)</option>

                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.business_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Related lead</label>

                <select
                  className="form-select"
                  value={lead}
                  onChange={(e) => setLead(e.target.value)}
                >
                  <option value="">Select lead (optional)</option>

                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="quote-items-head">
              <strong>Products</strong>

              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={() =>
                  setItems((currentItems) => [
                    ...currentItems,
                    {
                      product_id: '',
                      quantity: 1,
                      unit_price: '',
                    },
                  ])
                }
              >
                <i className="bi bi-plus me-1" />
                Add item
              </button>
            </div>

            {items.map((item, i) => {
              const product = products.find(
                (p) => p.id === Number(item.product_id)
              );

              return (
                <div className="quote-item-row" key={i}>
                  <div>
                    <label className="form-label">Product</label>

                    <select
                      className="form-select"
                      required
                      value={item.product_id}
                      onChange={(e) =>
                        updateItem(i, 'product_id', e.target.value)
                      }
                    >
                      <option value="">Choose product</option>

                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.design_code} · {p.product_name} (MOQ {p.moq})
                        </option>
                      ))}
                    </select>

                    {product && (
                      <small className="text-muted">
                        Stock {product.stock_quantity} · Default{' '}
                        {money(product.price)}
                      </small>
                    )}
                  </div>

                  <div>
                    <label className="form-label">Qty</label>

                    <input
                      className="form-control"
                      type="number"
                      min={product?.moq || 1}
                      max={product?.stock_quantity || undefined}
                      required
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(i, 'quantity', e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label className="form-label">Unit price</label>

                    <input
                      className="form-control"
                      type="number"
                      min="0"
                      value={
                        item.unit_price === ''
                          ? product?.price ?? ''
                          : item.unit_price
                      }
                      onChange={(e) =>
                        updateItem(i, 'unit_price', e.target.value)
                      }
                    />
                  </div>

                  <button
                    type="button"
                    className="icon-btn danger quote-remove"
                    disabled={items.length === 1}
                    title="Remove item"
                    onClick={() =>
                      setItems((currentItems) =>
                        currentItems.filter((_, n) => n !== i)
                      )
                    }
                  >
                    <i className="bi bi-trash3" />
                  </button>
                </div>
              );
            })}

            <div className="form-grid mt-3">
              <div>
                <label className="form-label">Discount (₹)</label>

                <input
                  className="form-control"
                  type="number"
                  min="0"
                  max={subtotal}
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Valid until</label>

                <input
                  className="form-control"
                  type="date"
                  value={valid}
                  onChange={(e) => setValid(e.target.value)}
                />
              </div>

              <div className="field-full">
                <label className="form-label">Notes</label>

                <textarea
                  className="form-control"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="quote-total">
              <span>Subtotal {money(subtotal)}</span>

              <strong>
                Total{' '}
                {money(
                  Math.max(0, subtotal - (Number(discount) || 0))
                )}
              </strong>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-light"
                onClick={() => setModal(false)}
              >
                Cancel
              </button>

              <button
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? 'Creating…' : 'Create quotation'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
