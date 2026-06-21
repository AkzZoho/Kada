import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthScreen: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setError(error.message);
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setError(error.message);
        } else if (!data.session) {
          setInfo('Check your email for a confirmation link, then come back to log in.');
        }
        // If session exists, onAuthStateChange in App.tsx will handle the redirect
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">K</div>
          <h1>Kada</h1>
          <p>Kerala Shop Billing</p>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab${mode === 'login' ? ' active' : ''}`}
            onClick={() => { setMode('login'); setError(''); setInfo(''); }}
          >
            Log In
          </button>
          <button
            className={`auth-tab${mode === 'signup' ? ' active' : ''}`}
            onClick={() => { setMode('signup'); setError(''); setInfo(''); }}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-field">
            <label>Email</label>
            <input
              type="email"
              autoFocus
              required
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>Password</label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="Min. 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && <div className="auth-error">{error}</div>}
          {info && <div className="auth-info">{info}</div>}

          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Log In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthScreen;
