import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../api';
import { Loading, ErrorBox, StatusBadge, money, dateShort, PageHeading } from '../components/UI';

const COLORS = ['#635bff','#21b8a6','#f5a623','#ec6a82','#9b8afb','#94a3b8'];
export default function Dashboard() {
  const [data,setData] = useState(null); const [error,setError] = useState('');
  const [notifications,setNotifications] = useState([]);
  useEffect(()=>{ api.get('/dashboard').then(r=>setData(r.data)).catch(e=>setError(e.response?.data?.error || 'Unable to load dashboard.')).catch(()=>{}); },[]);
  useEffect(()=>{ api.get('/notifications').then(r=>setNotifications(r.data.slice(0,3))).catch(()=>{}); },[]);
  if (!data && !error) return <Loading/>;
  return <div>
    <PageHeading eyebrow="YOUR BUSINESS AT A GLANCE" title="Good business starts with good follow-ups." subtitle="Here's what's happening across your textile sales workspace." action={<Link className="btn btn-primary" to="/leads"><i className="bi bi-plus-lg me-2"/>Add a lead</Link>}/>
    <ErrorBox message={error}/>
    <section className="quick-actions-grid" aria-label="CRM modules">{[{to:'/customers',icon:'bi-people',title:'Customers',copy:'Manage buyer relationships',tone:'teal'},{to:'/leads',icon:'bi-person-lines-fill',title:'Leads',copy:'Assign and convert prospects',tone:'purple'},{to:'/deals',icon:'bi-briefcase',title:'Sales & deals',copy:'Track opportunities to close',tone:'amber'},{to:'/support',icon:'bi-headset',title:'Support',copy:'Resolve customer tickets',tone:'pink'}].map(item=><Link to={item.to} className="quick-action-card" key={item.to}><span className={`quick-action-icon ${item.tone}`}><i className={`bi ${item.icon}`}/></span><span><strong>{item.title}</strong><small>{item.copy}</small></span><i className="bi bi-arrow-up-right ms-auto"/></Link>)}</section>
    <section className="reminder-preview"><div className="panel-title-row"><div><h3>Next actions</h3><p>Upcoming follow-ups and active support requests</p></div><Link className="text-link" to="/notifications">View reminders <i className="bi bi-arrow-right"/></Link></div>{notifications.length?<div className="reminder-preview-list">{notifications.map(item=><Link key={item.id} to={item.href}><span className="reminder-preview-icon"><i className={`bi ${item.kind==='Support ticket'?'bi-headset':'bi-calendar-check'}`}/></span><span><strong>{item.title}</strong><small>{item.kind} · {item.detail}</small></span><small className="ms-auto">{dateShort(item.date)}</small></Link>)}</div>:<p className="text-muted mb-0">No reminders due in the next 7 days.</p>}</section>
    {data && <>
      <div className="metric-grid">
        <Metric icon="bi-person-lines-fill" label="Total leads" value={data.leads.totalLeads||0} note={`${data.leads.openLeads||0} currently open`} tone="purple"/>
        <Metric icon="bi-people" label="Customers" value={data.customers||0} note="Business contacts" tone="teal"/>
        <Metric icon="bi-currency-rupee" label="Open deal pipeline" value={money(data.deals?.pipelineValue ?? data.leads.pipelineValue)} note={`${data.deals?.openDeals||0} active deals`} tone="amber"/>
        <Metric icon="bi-trophy" label="Won deal value" value={money(data.deals?.wonValue ?? data.leads.wonValue)} note={`${data.deals?.wonDeals ?? data.leads.wonLeads ?? 0} deals won`} tone="pink"/>
      </div>
      <div className="dashboard-grid">
        <section className="panel chart-panel"><div className="panel-title-row"><div><h3>Lead pipeline</h3><p>Distribution of current opportunities</p></div><Link to="/leads" className="text-link">View leads <i className="bi bi-arrow-up-right"/></Link></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.byStatus}><defs><linearGradient id="leadFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#635bff" stopOpacity={0.22}/><stop offset="95%" stopColor="#635bff" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf0f5"/><XAxis dataKey="status" axisLine={false} tickLine={false} tick={{fill:'#8a94a6',fontSize:11}}/><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fill:'#8a94a6',fontSize:11}}/><Tooltip/><Area type="monotone" dataKey="value" name="Leads" stroke="#635bff" strokeWidth={3} fill="url(#leadFill)"/></AreaChart></ResponsiveContainer></div></section>
        <section className="panel source-panel"><div className="panel-title-row"><div><h3>Lead sources</h3><p>Where inquiries come from</p></div></div><div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.bySource} dataKey="value" nameKey="source" innerRadius={57} outerRadius={82} paddingAngle={3} stroke="none">{data.bySource.map((x,i)=><Cell key={x.source} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div><div className="source-legend">{data.bySource.map((s,i)=><div key={s.source}><span><i style={{background:COLORS[i%COLORS.length]}}/>{s.source}</span><strong>{s.value}</strong></div>)}</div></section>
      </div>
      <div className="dashboard-grid bottom-grid">
        <section className="panel"><div className="panel-title-row"><div><h3>Recent leads</h3><p>Latest activity in your pipeline</p></div><Link to="/leads" className="text-link">See all</Link></div><div className="table-responsive"><table className="table app-table align-middle"><thead><tr><th>Lead</th><th>Source</th><th>Status</th><th>Value</th></tr></thead><tbody>{data.recentLeads.map(l=><tr key={l.id}><td><strong>{l.name}</strong><small className="table-sub">{l.business_name||l.city||'—'}</small></td><td>{l.source}</td><td><StatusBadge status={l.status}/></td><td>{money(l.estimated_value)}</td></tr>)}</tbody></table></div></section>
        <section className="panel"><div className="panel-title-row"><div><h3>Follow-up queue</h3><p>Stay on top of customer conversations</p></div><Link to="/follow-ups" className="text-link">View all</Link></div><div className="follow-list">{data.followUpsList.map(f=><div className="follow-row" key={f.id}><div className={`follow-icon ${f.is_completed?'done':''}`}><i className={`bi ${f.is_completed?'bi-check2':'bi-telephone'}`}/></div><div className="follow-copy"><strong>{f.task}</strong><span>{f.lead_name} · {dateShort(f.due_date)}</span></div>{f.is_completed?<span className="tiny-tag">Done</span>:<span className="tiny-tag due">Pending</span>}</div>)}</div><div className="queue-summary"><span><i className="bi bi-clock-history"/> {data.followUps.pendingFollowups||0} pending</span><span className="overdue">{data.followUps.overdueFollowups||0} overdue</span></div></section>
      </div>
    </>}
  </div>;
}
function Metric({icon,label,value,note,tone}) { return <div className="metric-card"><div className={`metric-icon ${tone}`}><i className={`bi ${icon}`}/></div><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-note">{note}</div></div>; }
