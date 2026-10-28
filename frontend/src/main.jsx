import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './styles.css';
import './workflow.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';

class AppErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('TextileFlow render error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return <main role="alert" style={{ maxWidth: 720, margin: '10vh auto', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <h1>TextileFlow could not load</h1>
        <p>A page hit an unexpected error. Refresh the page to try again.</p>
        <pre style={{ whiteSpace: 'pre-wrap', color: '#a11' }}>{this.state.error.message}</pre>
      </main>;
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <AuthProvider><App /></AuthProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  </React.StrictMode>
);
