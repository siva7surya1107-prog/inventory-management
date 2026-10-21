import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Button from '../components/Button';
import Input from '../components/Input';

const Login = () => {
  const [isSignUp, setIsSignUp] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (isSignUp) {
      // Sign Up validation
      if (!name.trim() || !email.trim() || !password) {
        setErrorMsg('Please fill in all required fields');
        return;
      }
      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters long');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match');
        return;
      }

      try {
        setLoading(true);
        const user = await register(name.trim(), email.trim(), password);
        showToast(`Account created successfully! Welcome, ${user.name}!`, 'success');
        const destination = location.state?.from?.pathname || '/dashboard';
        navigate(destination, { replace: true });
      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'Registration failed';
        setErrorMsg(msg);
      } finally {
        setLoading(false);
      }
    } else {
      // Sign In validation
      if (!email.trim() || !password) {
        setErrorMsg('Please enter both email and password');
        return;
      }

      try {
        setLoading(true);
        const user = await login(email.trim(), password);
        showToast(`Welcome back, ${user.name}!`, 'success');
        const destination = location.state?.from?.pathname || '/dashboard';
        navigate(destination, { replace: true });
      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'Invalid email or password';
        setErrorMsg(msg);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleFillDemo = (demoEmail, demoPassword) => {
    setIsSignUp(false);
    setEmail(demoEmail);
    setPassword(demoPassword);
    setErrorMsg('');
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">📦</div>
          <h2 className="login-title">Inventory Portal</h2>
          <p className="login-subtitle">
            {isSignUp ? 'Create an account to join the inventory team' : 'Sign in to access your inventory control center'}
          </p>
        </div>

        {/* Tab Toggle: Sign In vs Sign Up */}
        <div
          style={{
            display: 'flex',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            padding: '0.25rem',
            marginBottom: '1.25rem',
            border: '1px solid var(--border-color)'
          }}
        >
          <button
            type="button"
            style={{
              flex: 1,
              padding: '0.6rem 0.5rem',
              border: 'none',
              background: !isSignUp ? 'var(--accent-primary)' : 'transparent',
              color: !isSignUp ? '#fff' : 'var(--text-secondary)',
              fontWeight: !isSignUp ? 600 : 500,
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '0.875rem'
            }}
            onClick={() => {
              setIsSignUp(false);
              setErrorMsg('');
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            style={{
              flex: 1,
              padding: '0.6rem 0.5rem',
              border: 'none',
              background: isSignUp ? 'var(--accent-primary)' : 'transparent',
              color: isSignUp ? '#fff' : 'var(--text-secondary)',
              fontWeight: isSignUp ? 600 : 500,
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '0.875rem'
            }}
            onClick={() => {
              setIsSignUp(true);
              setErrorMsg('');
            }}
          >
            Sign Up
          </button>
        </div>

        {errorMsg && <div className="login-alert">{errorMsg}</div>}

        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <Input
              label="Full Name"
              id="signup-name"
              type="text"
              placeholder="e.g. Rahul Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          )}

          <Input
            label="Email Address"
            id="login-email"
            type="email"
            placeholder="admin@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">
              Password <span className="required-star">*</span>
            </label>
            <div className="password-input-wrapper">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {isSignUp && (
            <div className="form-group">
              <label className="form-label" htmlFor="signup-confirm-password">
                Confirm Password <span className="required-star">*</span>
              </label>
              <input
                id="signup-confirm-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            className="w-full mt-4"
            style={{ width: '100%', marginTop: '1.25rem' }}
          >
            {isSignUp ? 'Create Account & Sign In' : 'Sign In to Dashboard'}
          </Button>
        </form>

        {/* Demo Credentials Quick-Fill Chips */}
        {!isSignUp && (
          <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textAlign: 'center' }}>
              Quick Fill Demo Credentials:
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => handleFillDemo('admin@example.com', 'Admin@123')}
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
              >
                👑 Admin
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => handleFillDemo('staff@example.com', 'Staff@123')}
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
              >
                📦 Staff
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
