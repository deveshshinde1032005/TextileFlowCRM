import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { EmptyState, ErrorBox, Loading, PageHeading, dateShort } from '../components/UI';

export default function Notifications(){
  const [items,setItems]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const load=useCallback(async()=>{setLoading(true);try{const {data}=await api.get('/notifications');setItems(data);setError('')}catch(e){setError(e.response?.data?.error||'Could not load reminders.')}finally{setLoading(false)}},[]);
  useEffect(()=>{load()},[load]);
  const now=new Date();
  return <div><PageHeading eyebrow="YOUR NEXT ACTIONS" title="Reminders & notifications" subtitle="Upcoming follow-ups and open support work, ordered by when they need attention." action={<button className="btn btn-outline-secondary" onClick={load}><i className="bi bi-arrow-clockwise me-2"/>Refresh</button>}/><ErrorBox message={error}/>
    <div className="reminder-summary"><i className="bi bi-bell-fill"/><div><strong>{items.length} items need attention</strong><span>Follow-ups due in the next 7 days and support tickets still in progress.</span></div></div>
    {loading?<Loading/>:items.length?<div className="reminder-list">{items.map(item=>{const due=new Date(item.date);const overdue=due<now&&item.kind==='Follow-up';return <article className={`reminder-card ${overdue?'is-overdue':''}`} key={item.id}><div className={`reminder-icon ${item.kind==='Support ticket'?'ticket':''}`}><i className={`bi ${item.kind==='Support ticket'?'bi-headset':'bi-calendar-check'}`}/></div><div className="reminder-copy"><span className="eyebrow">{item.kind}{overdue?' · OVERDUE':''}</span><h3>{item.title}</h3><p>{item.detail}</p></div><div className="reminder-date"><strong>{dateShort(item.date)}</strong><Link to={item.href}>Open <i className="bi bi-arrow-up-right"/></Link></div></article>})}</div>:<EmptyState icon="bi-check2-circle" title="You're all caught up" text="New reminders will appear here when follow-ups or tickets need attention."/>}
  </div>;
}
