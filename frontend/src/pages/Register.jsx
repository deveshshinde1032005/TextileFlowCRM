import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ErrorBox } from '../components/UI';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match.');
    setBusy(true);
    try {
      await register(form.name, form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create your account.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="login-page">
    <div className="login-art"><div className="login-brand"><div className="brand-mark">T</div><strong>TextileFlow</strong></div><div className="login-art-copy"><span className="eyebrow light-eyebrow">YOUR SALES WORKSPACE</span><h1>Build better<br/>buyer relationships.</h1><p>Keep customers, opportunities and follow-ups moving in one place.</p></div><div className="fabric-shapes"><div/><div/><div/></div></div>
    <div className="login-panel"><div className="login-form-wrap"><div className="mobile-brand"><div className="brand-mark">T</div><strong>TextileFlow</strong></div><span className="eyebrow">GET STARTED</span><h2>Create your account</h2><p className="muted">Your account will be added to the sales team.</p><ErrorBox message={error}/><form onSubmit={submit}><label className="form-label">Full name</label><input className="form-control" autoComplete="name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/><label className="form-label mt-3">Email address</label><input className="form-control" type="email" autoComplete="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required/><label className="form-label mt-3">Password</label><input className="form-control" type="password" autoComplete="new-password" minLength={8} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required/><label className="form-label mt-3">Confirm password</label><input className="form-control" type="password" autoComplete="new-password" minLength={8} value={form.confirm} onChange={e=>setForm({...form,confirm:e.target.value})} required/><button className="btn btn-primary w-100 login-submit" disabled={busy}>{busy?'Creating account…':'Create account'} <i className="bi bi-arrow-right ms-2"/></button></form><p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p><small className="login-foot">Registration creates a salesperson account</small></div></div>
  </div>;
}
