import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../api';
import { EmptyState, ErrorBox, Loading, money, PageHeading } from '../components/UI';

const colors=['#635bff','#21b8a6','#f5a623','#ec6a82','#9b8afb','#94a3b8'];
export default function Reports(){
  const [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
  useEffect(()=>{api.get('/reports').then(r=>setData(r.data)).catch(e=>setError(e.response?.data?.error||'Could not load reports.')).finally(()=>setLoading(false))},[]);
  function exportExcel(){
    if(!data)return;
    const rows=[['Report','Category','Name','Count','Value','Status']];
    data.customers.forEach(x=>rows.push(['Customers',x.city,x.city,x.customers_count,'','']));
    data.sales.forEach(x=>rows.push(['Sales', 'Salesperson',x.salesperson,x.deals_count,x.won_value,`${x.won_deals} won`]));
    data.sources.forEach(x=>rows.push(['Lead conversion','Lead source',x.source,x.leads_count,x.pipeline_value,`${x.conversions} converted`]));
    data.support.forEach(x=>rows.push(['Support','Ticket status',x.status,x.tickets_count,'','']));
    data.products.forEach(x=>rows.push(['Inventory','Category',x.category,x.products_count,x.stock_units,'units']));
    const csv='\uFEFF'+rows.map(row=>row.map(value=>`"${String(value??'').replaceAll('"','""')}"`).join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=`textileflow-report-${new Date().toISOString().slice(0,10)}.csv`;link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <div className="reports-page"><PageHeading eyebrow="BUSINESS INTELLIGENCE" title="Reports & analytics" subtitle="Customer coverage, sales performance, lead conversion, support and catalog health." action={<div className="d-flex gap-2"><button className="btn btn-outline-secondary" disabled={!data} onClick={()=>window.print()}><i className="bi bi-file-earmark-pdf me-2"/>Print / PDF</button><button className="btn btn-primary" disabled={!data} onClick={exportExcel}><i className="bi bi-file-earmark-spreadsheet me-2"/>Export for Excel</button></div>}/><ErrorBox message={error}/>
    {loading?<Loading/>:data&&<>
      <div className="dashboard-grid reports-charts"><section className="panel chart-panel"><div className="panel-title-row"><div><h3>Lead conversion</h3><p>Qualified outcomes by source</p></div></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.sources}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf0f5"/><XAxis dataKey="source" tick={{fontSize:10,fill:'#778195'}} axisLine={false} tickLine={false}/><YAxis allowDecimals={false} tick={{fontSize:10}} axisLine={false} tickLine={false}/><Tooltip/><Bar dataKey="leads_count" name="Leads" fill="#c8c3ff" radius={[5,5,0,0]}/><Bar dataKey="conversions" name="Converted" fill="#635bff" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div></section>
      <section className="panel chart-panel"><div className="panel-title-row"><div><h3>Support tickets</h3><p>Current ticket status</p></div></div><div className="report-donut"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.support} dataKey="tickets_count" nameKey="status" innerRadius={52} outerRadius={82} paddingAngle={4}>{data.support.map((x,i)=><Cell key={x.status} fill={colors[i%colors.length]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div><div className="report-legend">{data.support.map((x,i)=><span key={x.status}><i style={{background:colors[i%colors.length]}}/>{x.status}: <strong>{x.tickets_count}</strong></span>)}</div></section></div>
      <div className="report-section-grid"><ReportTable title="Customer report" subtitle="Customers grouped by city" columns={['City','Customers']} rows={data.customers.map(x=>[x.city,x.customers_count])}/><ReportTable title="Sales report" subtitle="Deals owned and successfully closed" columns={['Salesperson','Deals','Won','Won value']} rows={data.sales.map(x=>[x.salesperson,x.deals_count,x.won_deals,money(x.won_value)])}/><ReportTable title="Lead conversion report" subtitle="Leads and estimated pipeline by source" columns={['Source','Leads','Converted','Conversion','Pipeline']} rows={data.sources.map(x=>[x.source,x.leads_count,x.conversions,x.leads_count?`${(100*x.conversions/x.leads_count).toFixed(1)}%`:'0%',money(x.pipeline_value)])}/><ReportTable title="Support report" subtitle="Tickets grouped by current status" columns={['Status','Tickets']} rows={data.support.map(x=>[x.status,x.tickets_count])}/><ReportTable title="Catalog report" subtitle="Products and stock by category" columns={['Category','Products','Stock units']} rows={data.products.map(x=>[x.category,x.products_count,Number(x.stock_units).toLocaleString('en-IN')])}/></div>
    </>}
  </div>;
}
function ReportTable({title,subtitle,columns,rows}){return <section className="panel report-table-panel"><div className="panel-title-row"><div><h3>{title}</h3><p>{subtitle}</p></div></div>{rows.length?<div className="table-responsive"><table className="table app-table align-middle"><thead><tr>{columns.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>:<EmptyState title="No data yet"/>}</section>}
