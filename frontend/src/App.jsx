import React from "react";
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Customers from './pages/Customers';
import Products from './pages/Products';
import FollowUps from './pages/FollowUps';
import Quotations from './pages/Quotations';
import Marketing from './pages/Marketing';
import WhatsApp from './pages/WhatsApp';
import Reports from './pages/Reports';
import Register from './pages/Register';
import Deals from './pages/Deals';
import Support from './pages/Support';
import Notifications from './pages/Notifications';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="app-loading"><div className="spinner-border text-primary"/><span>Loading TextileFlow…</span></div>;
  return user ? children : <Navigate to="/login" replace />;
}
export default function App() {
  const { user } = useAuth();
  return <Routes>
    <Route path="/login" element={user ? <Navigate to="/" replace/> : <Login/>}/>
    <Route path="/register" element={user ? <Navigate to="/" replace/> : <Register/>}/>
    <Route element={<Protected><Layout/></Protected>}>
      <Route path="/" element={<Dashboard/>}/>
      <Route path="/leads" element={<Leads/>}/>
      <Route path="/customers" element={<Customers/>}/>
      <Route path="/deals" element={<Deals/>}/>
      <Route path="/support" element={<Support/>}/>
      <Route path="/notifications" element={<Notifications/>}/>
      <Route path="/products" element={<Products/>}/>
      <Route path="/follow-ups" element={<FollowUps/>}/>
      <Route path="/quotations" element={<Quotations/>}/>
      <Route path="/marketing" element={<Marketing/>}/>
      <Route path="/whatsapp" element={<WhatsApp/>}/>
      <Route path="/reports" element={<Reports/>}/>
    </Route>
    <Route path="*" element={<Navigate to={user?'/':'/login'} replace/>}/>
  </Routes>;
}
