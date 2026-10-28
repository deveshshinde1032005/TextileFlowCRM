import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import Modal from '../components/Modal';
import { Loading, ErrorBox, StatusBadge, money, dateShort, PageHeading, EmptyState } from '../components/UI';

const blank = { name:'', business_name:'', phone:'', city:'', buyer_type:'Retailer', source:'Manual', status:'New', estimated_value:'', notes:'', assigned_to:'' };
const statusOptions = ['New','Contacted','Qualified','Quotation','Won','Lost'];
const sourceOptions = ['Manual','WhatsApp','Facebook Ads','Instagram Ads','Website','Referral','IndiaMART'];
const scoreLead = lead => Math.min(100, 20 + (lead.status === 'Qualified' ? 30 : 0) + (lead.status === 'Quotation' ? 35 : 0) + (lead.status === 'Won' ? 40 : 0) + (Number(lead.estimated_value) > 50000 ? 20 : 0));

export default function Leads() {
  const [rows,setRows]=useState([]),[users,setUsers]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [search,setSearch]=useState(''),[status,setStatus]=useState(''),[modal,setModal]=useState(false),[editing,setEditing]=useState(null),[form,setForm]=useState(blank),[saving,setSaving]=useState(false);
  async function load() {
    setLoading(true);
    try { const {data}=await api.get('/leads',{params:{search,status}}); setRows(data); setError(''); }
    catch(err) { setError(err.response?.data?.error||'Could not load leads.'); }
    finally { setLoading(false); }
  }
  useEffect(()=>{load()},[search,status]);
  useEffect(()=>{api.get('/users').then(r=>setUsers(r.data)).catch(()=>{})},[]);
  function openLead(lead) { setEditing(lead); setForm(lead?{...blank,...lead,estimated_value:String(lead.estimated_value??''),assigned_to:lead.assigned_to||''}:{...blank}); setModal(true); setError(''); }
  async function save(event) {
    event.preventDefault(); setSaving(true); setError('');
    try { if(editing) await api.put(`/leads/${editing.id}`,form); else await api.post('/leads',form); setModal(false); setNotice(editing?'Lead updated.':'Lead created.'); load(); }
    catch(err) { setError(err.response?.data?.error||'Could not save lead.'); }
    finally { setSaving(false); }
  }
  async function convert(lead) {
    try { const {data}=await api.post(`/leads/${lead.id}/convert`); setNotice(data.alreadyConverted?'This lead is already a customer.':'Lead converted to customer.'); load(); }
    catch(err) { setError(err.response?.data?.error||'Could not convert this lead.'); }
  }
  async function remove(lead) {
    if(!window.confirm(`Delete lead ${lead.name}?`)) return;
    try { await api.delete(`/leads/${lead.id}`); load(); }
    catch(err) { setError(err.response?.data?.error||'Could not delete lead.'); }
  }
  const hotCount=useMemo(()=>rows.filter(row=>scoreLead(row)>=65).length,[rows]);
  return <div>
    <PageHeading eyebrow="CUSTOMER ACQUISITION" title="Lead management" subtitle="Capture every inquiry, assign an owner and convert qualified buyers into customers." action={<button className="btn btn-primary" onClick={()=>openLead(null)}><i className="bi bi-plus-lg me-2"/>Add new lead</button>}/>
    {notice&&<div className="alert alert-success py-2">{notice}<button className="btn-close float-end" onClick={()=>setNotice('')}/></div>}<ErrorBox message={error}/>
    <div className="mini-stat-row"><div className="mini-stat"><span>Visible leads</span><strong>{rows.length}</strong></div><div className="mini-stat"><span>High priority</span><strong className="text-primary">{hotCount}</strong></div><div className="mini-stat"><span>Open pipeline</span><strong>{money(rows.filter(l=>!['Won','Lost'].includes(l.status)).reduce((n,l)=>n+Number(l.estimated_value||0),0))}</strong></div><div className="mini-stat"><span>Converted</span><strong>{rows.filter(l=>l.customer_id).length}</strong></div></div>
    <section className="panel"><div className="toolbar"><div className="search-box"><i className="bi bi-search"/><input placeholder="Search contact, business, phone or city" value={search} onChange={e=>setSearch(e.target.value)}/></div><select className="form-select filter-select" value={status} onChange={e=>setStatus(e.target.value)}><option value="">All lead statuses</option>{statusOptions.map(s=><option key={s}>{s}</option>)}</select></div>
      {loading?<Loading/>:<div className="table-responsive"><table className="table app-table align-middle workflow-table"><thead><tr><th>Lead</th><th>Location</th><th>Source</th><th>Owner</th><th>Score</th><th>Status</th><th>Value</th><th>Actions</th></tr></thead><tbody>{rows.map(lead=><tr key={lead.id}><td><div className="person-cell"><div className="person-avatar">{lead.name?.slice(0,1)}</div><div><strong>{lead.name}</strong><small className="table-sub">{lead.business_name||lead.phone}</small></div></div></td><td>{lead.city||'—'}</td><td>{lead.source}</td><td>{lead.assigned_name||'Unassigned'}</td><td><span className={`score-pill ${scoreLead(lead)>=65?'hot':scoreLead(lead)>=40?'warm':'cold'}`}>{scoreLead(lead)}</span></td><td><StatusBadge status={lead.status}/></td><td>{money(lead.estimated_value)}</td><td><div className="d-flex gap-1"><button className="icon-btn" title="Edit / assign lead" onClick={()=>openLead(lead)}><i className="bi bi-pencil"/></button>{lead.customer_id?<span className="type-pill">Customer</span>:<button className="btn btn-sm btn-outline-success" onClick={()=>convert(lead)} title="Convert this lead to a customer"><i className="bi bi-person-check me-1"/>Convert</button>}<button className="icon-btn danger" title="Delete" onClick={()=>remove(lead)}><i className="bi bi-trash3"/></button></div></td></tr>)}</tbody></table>{!rows.length&&<EmptyState icon="bi-person-lines-fill" title="No leads found" text="Add a lead to start tracking a new buyer opportunity."/>}</div>}
    </section>
    {modal&&<Modal title={editing?'Edit and assign lead':'Add new lead'} onClose={()=>setModal(false)}><form onSubmit={save}><div className="form-grid">{[['Contact name *','name','text'],['Business name','business_name','text'],['Phone number *','phone','tel'],['City','city','text']].map(([label,key,type])=><Field key={key} label={label}><input className="form-control" type={type} required={label.includes('*')} value={form[key]||''} onChange={e=>setForm({...form,[key]:e.target.value})}/></Field>)}<Field label="Buyer type"><select className="form-select" value={form.buyer_type||'Retailer'} onChange={e=>setForm({...form,buyer_type:e.target.value})}>{['Retailer','Wholesaler','Distributor','Manufacturer','Other'].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Lead source"><select className="form-select" value={form.source||'Manual'} onChange={e=>setForm({...form,source:e.target.value})}>{sourceOptions.map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Follow-up status"><select className="form-select" value={form.status||'New'} onChange={e=>setForm({...form,status:e.target.value})}>{statusOptions.map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Estimated deal value"><input type="number" min="0" className="form-control" value={form.estimated_value||''} onChange={e=>setForm({...form,estimated_value:e.target.value})}/></Field><Field label="Assign to"><select className="form-select" value={form.assigned_to||''} onChange={e=>setForm({...form,assigned_to:e.target.value})}><option value="">Unassigned</option>{users.map(u=><option key={u.id} value={u.id}>{u.name} · {u.role}</option>)}</select></Field><Field label="Notes" full><textarea className="form-control" rows="3" value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})}/></Field></div><div className="modal-actions"><button type="button" className="btn btn-light" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-primary" disabled={saving}>{saving?'Saving…':'Save lead'}</button></div></form></Modal>}
  </div>;
}
function Field({label,children,full}){return <div className={full?'field-full':''}><label className="form-label">{label}</label>{children}</div>}
