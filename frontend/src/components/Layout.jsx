import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const nav = [
  { label: 'Overview', to: '/', icon: 'bi-grid-1x2' },
  { label: 'Customers', to: '/customers', icon: 'bi-people' },
  { label: 'Leads', to: '/leads', icon: 'bi-person-lines-fill' },
  { label: 'Sales & deals', to: '/deals', icon: 'bi-briefcase' },
  { label: 'Support tickets', to: '/support', icon: 'bi-headset' },
  { label: 'Reminders', to: '/notifications', icon: 'bi-bell' },
  { label: 'Follow-up tasks', to: '/follow-ups', icon: 'bi-calendar-check' },
  { label: 'Reports', to: '/reports', icon: 'bi-bar-chart' },
  { label: 'Product catalog', to: '/products', icon: 'bi-box-seam' },
  { label: 'Quotations', to: '/quotations', icon: 'bi-file-earmark-text' },
  { label: 'Marketing', to: '/marketing', icon: 'bi-megaphone' },
  { label: 'WhatsApp Demo', to: '/whatsapp', icon: 'bi-whatsapp' },
];
const titles = { '/':'Overview','/leads':'Lead Management','/customers':'Customers','/deals':'Sales & Deals','/support':'Support Tickets','/notifications':'Reminders & Notifications','/products':'Textile Catalog','/follow-ups':'Follow-ups','/quotations':'Quotations','/marketing':'Marketing Analytics','/whatsapp':'WhatsApp Inbox Demo','/reports':'Reports' };

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [reminderCount, setReminderCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const title = titles[location.pathname] || 'TextileFlow CRM';
  useEffect(() => {
    api.get('/notifications').then(({ data }) => setReminderCount(data.length)).catch(() => setReminderCount(0));
  }, [location.pathname]);
  return <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark">T</div><div><strong>TextileFlow</strong><small>CRM WORKSPACE</small></div></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="side-nav">
        {nav.map(item => <NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={() => setMenuOpen(false)} className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <i className={`bi ${item.icon}`} /><span>{item.label}</span>
        </NavLink>)}
      </nav>
      <div className="sidebar-bottom"><div className="help-card"><i className="bi bi-lightbulb" /><strong>Textile tip</strong><p>Follow up quickly to convert more inquiries into orders.</p></div><div className="sidebar-user"><div className="avatar">{user?.name?.slice(0,1) || 'A'}</div><div className="user-copy"><strong>{user?.name || 'Admin'}</strong><small>{user?.role || 'admin'}</small></div><button className="icon-btn light" title="Log out" onClick={logout}><i className="bi bi-box-arrow-right"/></button></div></div>
    </aside>
      {menuOpen&&<button type="button" className="sidebar-scrim" aria-label="Close navigation menu" onClick={()=>setMenuOpen(false)}/>}
    <main className="main-area">
      <header className="topbar"><div className="topbar-heading"><button type="button" className="mobile-nav-toggle" aria-label={menuOpen?'Close navigation':'Open navigation'} aria-expanded={menuOpen} onClick={()=>setMenuOpen(!menuOpen)}><i className={`bi ${menuOpen?'bi-x-lg':'bi-list'}`}/></button><div><div className="breadcrumb-text">Workspace <span>/</span> <strong>{title}</strong></div><h1>{title}</h1></div></div><div className="topbar-right"><span className="today-pill"><i className="bi bi-calendar3"/> {new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</span><Link className="notification-shortcut" to="/notifications" aria-label={`${reminderCount} reminders`}><i className="bi bi-bell"/>{reminderCount>0&&<span>{reminderCount>9?'9+':reminderCount}</span>}</Link><div className="top-avatar">{user?.name?.slice(0,1) || 'A'}</div></div></header>
      <div className="page-content"><Outlet /></div>
      <footer className="footer-note">© 2026 TextileFlow CRM <span>Built for Surat textile businesses · College project</span></footer>
    </main>
  </div>;
}
