import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, User, Crown, MapPin, Phone, Building, Loader } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { homePathForRole } from '../../config/auth';
import '../LoginPage/LoginPage.css';

const BASE_ROLES = [
  { id: 'citizen', label: 'Citizen', icon: User, desc: 'Report and track civic issues' },
  { id: 'authority', label: 'Authority', icon: Shield, desc: 'Manage and resolve issues' },
];
const ADMIN_ROLE = { id: 'admin', label: 'Admin', icon: Crown, desc: 'Full system administration' };

// Shown once after Clerk sign-up: pick a role and fill in the profile.
export default function OnboardingPage() {
  const { onboard, adminEligible, logout } = useAuth();
  const navigate = useNavigate();
  const roles = adminEligible ? [...BASE_ROLES, ADMIN_ROLE] : BASE_ROLES;

  const [role, setRole] = useState('citizen');
  const [form, setForm] = useState({ address: '', phone: '', department: '', zone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = { role };
      if (role === 'citizen') {
        data.address = form.address;
      } else if (role === 'authority') {
        Object.assign(data, { phone: form.phone, department: form.department, zone: form.zone });
        // Location is optional; capture it if the browser allows.
        if (navigator.geolocation) {
          try {
            const pos = await new Promise((resolve, reject) =>
              navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000 })
            );
            data.location = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          } catch {
            console.warn('Geolocation not available, continuing without location');
          }
        }
      }

      const user = await onboard(data);
      navigate(homePathForRole(user.role), { replace: true });
    } catch (err) {
      const fieldErrors = err.data?.errors;
      setError(
        Array.isArray(fieldErrors) && fieldErrors.length
          ? fieldErrors.map((f) => `${f.field} ${f.error}`).join(', ')
          : err.message || 'Something went wrong. Please try again.'
      );
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
            <h1 className="login-header__title">Almost there</h1>
          </div>
          <p className="login-header__subtitle">Tell us how you'll use CivicFix</p>
        </div>

        <div className="login-roles">
          {roles.map((r) => (
            <button
              key={r.id}
              className={`login-role ${role === r.id ? 'login-role--active' : ''}`}
              onClick={() => { setRole(r.id); setError(''); }}
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

        <form className="login-form" onSubmit={handleSubmit}>
          {role === 'citizen' && (
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
                  required
                />
              </div>
            </div>
          )}

          {role === 'authority' && (
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
                    required
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
                    required
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
                    required
                  />
                </div>
              </div>
            </>
          )}

          {role === 'admin' && (
            <p className="login-footer-text">Your email is on the admin list. No extra details needed.</p>
          )}

          <button type="submit" className="btn btn--primary btn--lg login-submit" disabled={loading}>
            {loading ? <><Loader size={18} className="spin" /> Please wait...</> : 'Continue'}
          </button>

          {error && <p className="login-error">{error}</p>}
        </form>

        <p className="login-footer-text">
          Wrong account?{' '}
          <button type="button" className="login-footer-link" onClick={logout}>
            Sign out
          </button>
        </p>
      </div>
    </div>
  );
}
