import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ErrorBox } from '../components/UI';

export default function Login() {
  const [email, setEmail] = useState('admin@textileflow.local');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check that the backend is running.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="login-page">
    <div className="login-art"><div className="login-brand"><div className="brand-mark">T</div><strong>TextileFlow</strong></div><div className="login-art-copy"><span className="eyebrow light-eyebrow">BUILT FOR TEXTILE TRADE</span><h1>Every lead.<br/>Every design.<br/><em>Every opportunity.</em></h1><p>One workspace to manage customers, deals, support and sales for your textile business.</p><div className="login-art-stats"><div><strong>360°</strong><span>Customer view</span></div><div><strong>One</strong><span>Sales pipeline</span></div><div><strong>Smart</strong><span>Follow-ups</span></div></div></div><div className="fabric-shapes"><div/><div/><div/></div></div>
    <div className="login-panel"><div className="login-form-wrap"><div className="mobile-brand"><div className="brand-mark">T</div><strong>TextileFlow</strong></div><span className="eyebrow">WELCOME BACK</span><h2>Sign in to your workspace</h2><p className="muted">Manage your textile sales with clarity.</p><ErrorBox message={error}/><form onSubmit={submit}><label className="form-label">Email address</label><div className="input-icon-wrap"><i className="bi bi-envelope"/><input className="form-control" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></div><label className="form-label mt-3">Password</label><div className="input-icon-wrap"><i className="bi bi-lock"/><input className="form-control" type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></div><button className="btn btn-primary w-100 login-submit" disabled={busy}>{busy?'Signing in…':'Sign in'} <i className="bi bi-arrow-right ms-2"/></button></form><div className="demo-credentials"><i className="bi bi-info-circle"/><div><strong>Demo admin login</strong><span>admin@textileflow.local</span><span>password</span></div></div><p className="auth-switch">New to TextileFlow? <Link to="/register">Create an account</Link></p><small className="login-foot">College project demo · Local development</small></div></div>
  </div>;
}
