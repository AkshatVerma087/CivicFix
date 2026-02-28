import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, Shield, User, Mail, Lock, MapPin, Phone, Building, Loader } from 'lucide-react';
import './LoginPage.css';

const ROLES = [
  { id: 'citizen', label: 'Citizen', icon: User, desc: 'Report and track civic issues' },
  { id: 'authority', label: 'Authority', icon: Shield, desc: 'Manage and resolve issues' },
];

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('citizen');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    address: '',
    phone: '',
    department: '',
    zone: '',
  });

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let formData = { ...form };

      // Capture geolocation for authority registration
      if (!isLogin && role === 'authority' && navigator.geolocation) {
        try {
          const pos = await new Promise((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
            })
          );
          formData.location = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
        } catch {
          // Location is optional – continue without it
          console.warn('Geolocation not available, registering without location');
        }
      }

      const userData = await login({ role, isLogin, formData });
      navigate(userData.role === 'admin' ? '/admin' : userData.role === 'authority' ? '/authority' : '/dashboard');
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-page__bg">
        <div className="login-page__bg-gradient" />
        <div className="login-page__bg-grid" />
      </div>

      <div className="login-container fade-in">
        <div className="login-header">
          <div className="login-header__logo">
            <div className="login-header__logo-icon">CS</div>
            <h1 className="login-header__title">CivicFix</h1>
          </div>
          <p className="login-header__subtitle">
            Empowering citizens to build better communities
          </p>
        </div>

        {/* Role Selector */}
        <div className="login-roles">
          {ROLES.map((r) => (
            <button
              key={r.id}
              className={`login-role ${role === r.id ? 'login-role--active' : ''}`}
              onClick={() => { setRole(r.id); if (r.id === 'admin') setIsLogin(true); }}
              type="button"
            >
              <r.icon size={20} />
              <div>
                <span className="login-role__label">{r.label}</span>
                <span className="login-role__desc">{r.desc}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Toggle Login / Register (admin is login-only) */}
        {role !== 'admin' && (
          <div className="login-toggle">
            <button
              className={`login-toggle__btn ${isLogin ? 'login-toggle__btn--active' : ''}`}
              onClick={() => setIsLogin(true)}
            >
              Sign In
            </button>
            <button
              className={`login-toggle__btn ${!isLogin ? 'login-toggle__btn--active' : ''}`}
              onClick={() => setIsLogin(false)}
            >
              Register
            </button>
          </div>
        )}

        {/* Form */}
        <form className="login-form" onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div className="login-input-wrap">
                <User size={18} className="login-input-icon" />
                <input
                  type="text"
                  name="name"
                  className="form-input login-input"
                  placeholder="Enter your full name"
                  value={form.name}
                  onChange={handleChange}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="login-input-wrap">
              <Mail size={18} className="login-input-icon" />
              <input
                type="email"
                name="email"
                className="form-input login-input"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="login-input-wrap">
              <Lock size={18} className="login-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                className="form-input login-input"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
              />
              <button
                type="button"
                className="login-input-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {!isLogin && role === 'citizen' && (
            <div className="form-group">
              <label className="form-label">Address</label>
              <div className="login-input-wrap">
                <MapPin size={18} className="login-input-icon" />
                <input
                  type="text"
                  name="address"
                  className="form-input login-input"
                  placeholder="Your residential address"
                  value={form.address}
                  onChange={handleChange}
                />
              </div>
            </div>
          )}

          {!isLogin && role === 'authority' && (
            <>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <div className="login-input-wrap">
                  <Phone size={18} className="login-input-icon" />
                  <input
                    type="text"
                    name="phone"
                    className="form-input login-input"
                    placeholder="Your phone number"
                    value={form.phone}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Department</label>
                <div className="login-input-wrap">
                  <Building size={18} className="login-input-icon" />
                  <select
                    name="department"
                    className="form-select login-input"
                    value={form.department}
                    onChange={handleChange}
                  >
                    <option value="">Select Department</option>
                    <option value="water">Water</option>
                    <option value="electricity">Electricity</option>
                    <option value="road">Road</option>
                    <option value="sanitation">Sanitation</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Zone / Ward</label>
                <div className="login-input-wrap">
                  <MapPin size={18} className="login-input-icon" />
                  <input
                    type="text"
                    name="zone"
                    className="form-input login-input"
                    placeholder="Zone or Ward number"
                    value={form.zone}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </>
          )}

          <button type="submit" className="btn btn--primary btn--lg login-submit" disabled={loading}>
            {loading ? <><Loader size={18} className="spin" /> Please wait...</> : (isLogin ? 'Sign In' : 'Create Account')}
          </button>

          {error && <p className="login-error">{error}</p>}
        </form>

        {role !== 'admin' && (
          <p className="login-footer-text">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              className="login-footer-link"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? 'Register here' : 'Sign in'}
            </button>
          </p>
        )}

        <p className="login-footer-text login-footer-admin">
          {role === 'admin' ? (
            <>
              Not an admin?{' '}
              <button
                type="button"
                className="login-footer-link"
                onClick={() => { setRole('citizen'); setIsLogin(true); }}
              >
                Back to login
              </button>
            </>
          ) : (
            <>
              Admin?{' '}
              <button
                type="button"
                className="login-footer-link"
                onClick={() => { setRole('admin'); setIsLogin(true); }}
              >
                Login here
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
