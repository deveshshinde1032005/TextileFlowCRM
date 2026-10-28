
import { useEffect, useState } from 'react';
import api from '../api';
import Modal from '../components/Modal';
import {
  Loading,
  ErrorBox,
  PageHeading,
  EmptyState,
  dateShort,
} from '../components/UI';

export default function Customers() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [details, setDetails] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const emptyForm = {
    business_name: '',
    contact_person: '',
    phone: '',
    email: '',
    city: '',
    state: '',
    gstin: '',
    buyer_type: 'Wholesaler',
    notes: '',
  };

  const [form, setForm] = useState(emptyForm);

  async function load() {
    setLoading(true);

    try {
      const response = await api.get('/customers');
      setRows(response.data);
      setError('');
    } catch (e) {
      setError(
        e.response?.data?.error || 'Could not load customers'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function open(customer) {
    setEditing(customer);
    setForm(
      customer
        ? {
            ...emptyForm,
            ...customer,
          }
        : { ...emptyForm }
    );
    setModal(true);
    setError('');
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (editing) {
        await api.put(`/customers/${editing.id}`, form);
      } else {
        await api.post('/customers', form);
      }

      setModal(false);
      setEditing(null);
      setForm({ ...emptyForm });
      await load();
    } catch (e) {
      setError(
        e.response?.data?.error || 'Could not save customer'
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(customer) {
    const confirmed = window.confirm(
      `Delete ${customer.business_name}?`
    );

    if (!confirmed) return;

    try {
      await api.delete(`/customers/${customer.id}`);
      await load();
    } catch (e) {
      setError(
        e.response?.data?.error || 'Could not delete customer'
      );
    }
  }

  const filteredRows = rows.filter((customer) => {
    const query = search.toLowerCase();

    return [
      customer.business_name,
      customer.contact_person,
      customer.phone,
      customer.city,
      customer.email,
    ].some((value) =>
      String(value || '').toLowerCase().includes(query)
    );
  });

  return (
    <div>
      <PageHeading
        eyebrow="RELATIONSHIPS"
        title="Customers"
        subtitle="Keep every buyer, shop and business relationship organized."
        action={
          <button
            className="btn btn-primary"
            onClick={() => open(null)}
          >
            <i className="bi bi-plus-lg me-2" />
            Add customer
          </button>
        }
      />

      <ErrorBox message={error} />

      <div className="mini-stat-row">
        <div className="mini-stat">
          <span>Total customers</span>
          <strong>{rows.length}</strong>
        </div>

        <div className="mini-stat">
          <span>Cities represented</span>
          <strong>
            {new Set(rows.map((c) => c.city).filter(Boolean)).size}
          </strong>
        </div>

        <div className="mini-stat">
          <span>Buyer types</span>
          <strong>
            {new Set(rows.map((c) => c.buyer_type)).size}
          </strong>
        </div>
      </div>

      <section className="panel">
        <div className="toolbar">
          <div className="search-box">
            <i className="bi bi-search" />
            <input
              placeholder="Search business, contact, phone or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <Loading />
        ) : (
          <div className="table-responsive">
            <table className="table app-table align-middle">
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Contact</th>
                  <th>Phone</th>
                  <th>City</th>
                  <th>Buyer type</th>
                  <th>Added</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <div className="person-cell">
                        <div className="person-avatar teal-avatar">
                          {(customer.business_name || '?').slice(0, 1)}
                        </div>

                        <div>
                          <strong>{customer.business_name}</strong>
                          <small className="table-sub">
                            {customer.gstin || 'GSTIN not added'}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td>{customer.contact_person || '—'}</td>
                    <td>{customer.phone || '—'}</td>
                    <td>{customer.city || '—'}</td>

                    <td>
                      <span className="type-pill">
                        {customer.buyer_type || 'Other'}
                      </span>
                    </td>

                    <td>{dateShort(customer.created_at)}</td>

                    <td>
                      <div className="d-flex gap-1">
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => setDetails(customer)}
                          title="View customer details"
                        >
                          <i className="bi bi-eye" />
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => open(customer)}
                          title="Edit"
                        >
                          <i className="bi bi-pencil" />
                        </button>

                        <button
                          type="button"
                          className="icon-btn danger"
                          onClick={() => remove(customer)}
                          title="Delete"
                        >
                          <i className="bi bi-trash3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!filteredRows.length && (
              <EmptyState
                icon="bi-people"
                title="No customers found"
              />
            )}
          </div>
        )}
      </section>

      {modal && (
        <Modal
          title={editing ? 'Edit customer' : 'Add customer'}
          onClose={() => setModal(false)}
        >
          <form onSubmit={save}>
            <div className="form-grid">
              {[
                ['Business name *', 'business_name'],
                ['Contact person', 'contact_person'],
                ['Phone *', 'phone'],
                ['Email', 'email'],
                ['City', 'city'],
                ['State', 'state'],
                ['GSTIN', 'gstin'],
              ].map(([label, key]) => (
                <div key={key}>
                  <label className="form-label">{label}</label>

                  <input
                    className="form-control"
                    required={label.includes('*')}
                    type={key === 'email' ? 'email' : 'text'}
                    value={form[key] || ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        [key]: e.target.value,
                      })
                    }
                  />
                </div>
              ))}

              <div>
                <label className="form-label">Buyer type</label>

                <select
                  className="form-select"
                  value={form.buyer_type || 'Wholesaler'}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      buyer_type: e.target.value,
                    })
                  }
                >
                  {[
                    'Retailer',
                    'Wholesaler',
                    'Distributor',
                    'Manufacturer',
                    'Other',
                  ].map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-full">
                <label className="form-label">Notes</label>

                <textarea
                  className="form-control"
                  rows="2"
                  value={form.notes || ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      notes: e.target.value,
                    })
                  }
                />
              </div>
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
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save customer'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {details && (
        <Modal title="Customer details" onClose={() => setDetails(null)}>
          <div className="detail-grid">
            <Detail label="Business" value={details.business_name} />
            <Detail label="Contact person" value={details.contact_person} />
            <Detail label="Phone" value={details.phone} />
            <Detail label="Email" value={details.email} />
            <Detail label="City / state" value={[details.city, details.state].filter(Boolean).join(', ')} />
            <Detail label="Buyer type" value={details.buyer_type} />
            <Detail label="GSTIN" value={details.gstin} />
            <Detail label="Added" value={dateShort(details.created_at)} />
            <div className="field-full"><label className="form-label">Notes</label><p>{details.notes || 'No notes added.'}</p></div>
          </div>
          <div className="modal-actions"><button className="btn btn-primary" onClick={() => { setDetails(null); open(details); }}>Edit customer</button></div>
        </Modal>
      )}
    </div>
  );
}

function Detail({ label, value }) {
  return <div><label className="form-label">{label}</label><p>{value || '—'}</p></div>;
}
