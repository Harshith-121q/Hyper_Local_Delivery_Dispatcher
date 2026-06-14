import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Mail, Lock, LogIn } from 'lucide-react';

const Login = ({ onToggleAuth }) => {
  const { login, register } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (!res.success) {
      setError(res.message);
    }
  };



  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 'calc(100vh - 80px)',
      padding: '20px'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '440px', boxSizing: 'border-box' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <span style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            fontWeight: 800,
            background: 'var(--accent-glow)',
            color: 'var(--accent-primary)',
            padding: '4px 10px',
            borderRadius: '99px',
            letterSpacing: '0.05em'
          }}>Secure Logistics Portal</span>
          <h2 style={{ fontSize: '28px', marginTop: '10px' }}>Welcome Back</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>Sign in to manage delivery dispatches</p>
        </div>

        {error && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#EF4444',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '14px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-secondary)' }} />
              <input
                type="email"
                required
                className="input-field"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '44px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-secondary)' }} />
              <input
                type="password"
                required
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '44px' }}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '8px'
          }}>
            <LogIn size={18} />
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', margin: '20px 0 16px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Don't have an account?{' '}
          <span onClick={onToggleAuth} style={{ color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 600 }}>
            Create Account
          </span>
        </div>


      </div>
    </div>
  );
};

export default Login;
