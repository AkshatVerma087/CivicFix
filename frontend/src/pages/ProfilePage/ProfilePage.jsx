import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api/auth';
import {
  User,
  Mail,
  MapPin,
  Phone,
  Building2,
  Shield,
  Save,
  Lock,
  Loader,
  CheckCircle2,
  AlertCircle,
  Edit3,
  X,
} from 'lucide-react';
import './ProfilePage.css';

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Password change
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await authAPI.getProfile();
        setProfile(res.profile);
        setForm(res.profile);
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {};
      if (form.name !== profile.name) data.name = form.name;
      if (user?.role === 'citizen' && form.address !== profile.address) data.address = form.address;
      if (user?.role === 'authority') {
        if (form.phone !== profile.phone) data.phone = form.phone;
        if (form.department !== profile.department) data.department = form.department;
        if (form.zone !== profile.zone) data.zone = form.zone;
      }

      if (Object.keys(data).length === 0) {
        setEditing(false);
        return;
      }

      const res = await authAPI.updateProfile(data);
      setProfile(res.profile);
      setForm(res.profile);
      setEditing(false);
      showMessage('Profile updated successfully');

      // Update localStorage user name
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      if (data.name) stored.name = data.name;
      if (data.department) stored.department = data.department;
      if (data.zone) stored.zone = data.zone;
      localStorage.setItem('user', JSON.stringify(stored));
    } catch (err) {
      showMessage(err.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirm) {
      showMessage('New passwords do not match', 'error');
      return;
    }
    setPasswordSaving(true);
    try {
      await authAPI.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      showMessage('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirm: '' });
      setShowPasswordForm(false);
    } catch (err) {
      showMessage(err.message || 'Failed to change password', 'error');
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Loader size={32} className="spin" />
      </div>
    );
  }

  const roleLabel = user?.role === 'authority' ? 'Authority Officer' : user?.role === 'admin' ? 'Administrator' : 'Citizen';

  return (
    <div className="profile-page">
      {message.text && (
        <div className={`profile-page__message profile-page__message--${message.type}`}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      <div className="profile-page__header">
        <div className="profile-page__avatar">
          {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <div className="profile-page__header-info">
          <h1>{profile?.name}</h1>
          <span className="profile-page__role-badge">
            <Shield size={14} /> {roleLabel}
          </span>
          <span className="profile-page__email">
            <Mail size={14} /> {profile?.email}
          </span>
        </div>
        {!editing ? (
          <button className="btn btn--primary" onClick={() => setEditing(true)}>
            <Edit3 size={16} /> Edit Profile
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
              {saving ? <Loader size={16} className="spin" /> : <Save size={16} />} Save
            </button>
            <button className="btn btn--secondary" onClick={() => { setEditing(false); setForm(profile); }}>
              <X size={16} /> Cancel
            </button>
          </div>
        )}
      </div>

      <div className="profile-page__grid">
        {/* Personal Info Card */}
        <div className="profile-card">
          <h3 className="profile-card__title">
            <User size={18} /> Personal Information
          </h3>
          <div className="profile-card__fields">
            <div className="profile-field">
              <label className="profile-field__label">Full Name</label>
              {editing ? (
                <input
                  className="form-input"
                  value={form.name || ''}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              ) : (
                <span className="profile-field__value">{profile?.name}</span>
              )}
            </div>
            <div className="profile-field">
              <label className="profile-field__label">Email</label>
              <span className="profile-field__value profile-field__value--muted">
                <Mail size={14} /> {profile?.email}
                <span className="profile-field__hint">(cannot be changed)</span>
              </span>
            </div>

            {user?.role === 'citizen' && (
              <div className="profile-field">
                <label className="profile-field__label">Address</label>
                {editing ? (
                  <input
                    className="form-input"
                    value={form.address || ''}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                ) : (
                  <span className="profile-field__value">
                    <MapPin size={14} /> {profile?.address || 'Not set'}
                  </span>
                )}
              </div>
            )}

            {user?.role === 'authority' && (
              <>
                <div className="profile-field">
                  <label className="profile-field__label">Phone</label>
                  {editing ? (
                    <input
                      className="form-input"
                      value={form.phone || ''}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  ) : (
                    <span className="profile-field__value">
                      <Phone size={14} /> {profile?.phone || 'Not set'}
                    </span>
                  )}
                </div>
                <div className="profile-field">
                  <label className="profile-field__label">Department</label>
                  {editing ? (
                    <input
                      className="form-input"
                      value={form.department || ''}
                      onChange={(e) => setForm({ ...form, department: e.target.value })}
                    />
                  ) : (
                    <span className="profile-field__value">
                      <Building2 size={14} /> {profile?.department}
                    </span>
                  )}
                </div>
                <div className="profile-field">
                  <label className="profile-field__label">Zone</label>
                  {editing ? (
                    <input
                      className="form-input"
                      value={form.zone || ''}
                      onChange={(e) => setForm({ ...form, zone: e.target.value })}
                    />
                  ) : (
                    <span className="profile-field__value">
                      <MapPin size={14} /> {profile?.zone}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Security Card */}
        <div className="profile-card">
          <h3 className="profile-card__title">
            <Lock size={18} /> Security
          </h3>
          {!showPasswordForm ? (
            <button
              className="btn btn--secondary"
              onClick={() => setShowPasswordForm(true)}
              style={{ marginTop: 8 }}
            >
              <Lock size={16} /> Change Password
            </button>
          ) : (
            <form className="profile-card__password-form" onSubmit={handlePasswordChange}>
              <div className="profile-field">
                <label className="profile-field__label">Current Password</label>
                <input
                  className="form-input"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  required
                />
              </div>
              <div className="profile-field">
                <label className="profile-field__label">New Password</label>
                <input
                  className="form-input"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  required
                  minLength={8}
                />
              </div>
              <div className="profile-field">
                <label className="profile-field__label">Confirm New Password</label>
                <input
                  className="form-input"
                  type="password"
                  value={passwordForm.confirm}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                  required
                  minLength={8}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button type="submit" className="btn btn--primary" disabled={passwordSaving}>
                  {passwordSaving ? <Loader size={16} className="spin" /> : <Save size={16} />} Update Password
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => setShowPasswordForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Account Info */}
        <div className="profile-card">
          <h3 className="profile-card__title">
            <Shield size={18} /> Account
          </h3>
          <div className="profile-card__fields">
            <div className="profile-field">
              <label className="profile-field__label">Role</label>
              <span className="profile-field__value">{roleLabel}</span>
            </div>
            <div className="profile-field">
              <label className="profile-field__label">Account ID</label>
              <span className="profile-field__value profile-field__value--mono">{profile?._id}</span>
            </div>
            {user?.role === 'authority' && profile?.isVerified !== undefined && (
              <div className="profile-field">
                <label className="profile-field__label">Verification Status</label>
                <span className={`profile-field__value ${profile.isVerified ? 'profile-field__value--success' : 'profile-field__value--warning'}`}>
                  {profile.isVerified ? '✓ Verified' : '⏳ Pending Verification'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
