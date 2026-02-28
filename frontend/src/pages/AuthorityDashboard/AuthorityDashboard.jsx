import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { postsAPI } from '../../api/posts';
import { authAPI } from '../../api/auth';
import {
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  Clock,
  BarChart3,
  ArrowUp,
  MessageCircle,
  MapPin,
  Eye,
  TrendingUp,
  Zap,
  Loader,
  Navigation,
  FileText,
} from 'lucide-react';
import './AuthorityDashboard.css';

const STATUS_TRANSITIONS = {
  new: ['new', 'inProgress'],
  inProgress: ['inProgress', 'resolved'],
  pendingResolution: ['pendingResolution', 'inProgress'],
  resolved: ['resolved'],
};
const RADIUS_OPTIONS = [5, 10, 25, 50, 100];
const categoryIcons = {
  water: '💧', electricity: '⚡', sanitation: '🗑️', road: '🛣️', other: '📋',
};

export default function AuthorityDashboard() {
  const { user, updateUserLocation } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [posts, setPosts] = useState([]);
  const [summary, setSummary] = useState({ totalPosts: 0, byStatus: { new: 0, inProgress: 0, pendingResolution: 0, resolved: 0 } });
  const [loading, setLoading] = useState(true);
  const [statusNotes, setStatusNotes] = useState({}); // { postId: note }

  // Location filter state
  const [locationFilter, setLocationFilter] = useState(false);
  const [radius, setRadius] = useState(10);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  const authorityLocation = user?.location || null;

  const fetchPosts = useCallback(async (locFilter, rad) => {
    setLoading(true);
    try {
      const params = { limit: 100, sortBy: 'priorityScore', sortOrder: 'desc', assignedTo: user?._id };

      if (locFilter && authorityLocation) {
        params.lat = authorityLocation.latitude;
        params.lng = authorityLocation.longitude;
        params.radius = rad;
      }

      const [postsRes, summaryRes] = await Promise.all([
        postsAPI.getAll(params),
        postsAPI.getSummary(),
      ]);
      setPosts(postsRes.posts || []);
      setSummary(summaryRes);
    } catch (err) {
      console.error('Failed to fetch authority data:', err);
    } finally {
      setLoading(false);
    }
  }, [authorityLocation]);

  // Initial fetch
  useEffect(() => {
    fetchPosts(locationFilter, radius);
  }, []);

  // Re-fetch when location filter or radius changes
  useEffect(() => {
    fetchPosts(locationFilter, radius);
  }, [locationFilter, radius, fetchPosts]);

  const handleSetMyLocation = async () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    setLocating(true);
    setLocationError('');

    try {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        })
      );

      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      // Save to backend
      await authAPI.updateLocation(lat, lng);
      // Update local user context
      updateUserLocation({ latitude: lat, longitude: lng });
      setLocationFilter(true);
    } catch (err) {
      console.error('Geolocation error:', err);
      setLocationError('Unable to get your location. Please allow location access.');
    } finally {
      setLocating(false);
    }
  };

  const filteredPosts = useMemo(() => {
    let result = [...posts];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((p) => p.status === statusFilter);
    }

    // Authority sees highest priority first
    result.sort((a, b) => b.priorityScore - a.priorityScore);
    return result;
  }, [search, statusFilter, posts]);

  const handleStatusChange = async (postId, newStatus) => {
    try {
      const note = statusNotes[postId] || '';
      const res = await postsAPI.updateStatus(postId, newStatus, note);
      const actualStatus = res.post?.status || newStatus;
      setPosts(posts.map((p) =>
        p._id === postId ? { ...p, status: actualStatus, statusNote: note || p.statusNote, resolvedByAuthorityAt: res.post?.resolvedByAuthorityAt } : p
      ));
      setStatusNotes((prev) => { const next = { ...prev }; delete next[postId]; return next; });
      const summaryRes = await postsAPI.getSummary();
      setSummary(summaryRes);
    } catch (err) {
      console.error('Failed to update status:', err);
      alert(err.message || 'Failed to update status');
    }
  };

  if (loading) {
    return (
      <div className="authority-dash" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Loader size={32} className="spin" />
      </div>
    );
  }

  return (
    <div className="authority-dash">
      {/* Header */}
      <div className="authority-dash__header">
        <div>
          <h1 className="authority-dash__greeting">
            Authority Panel
          </h1>
          <p className="authority-dash__subtitle">
            Welcome, {user?.name || 'Officer'} — {user?.department || 'General'} Department
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="authority-dash__stats">
        <div className="stat-card stat-card--total">
          <div className="stat-card__icon"><BarChart3 size={22} /></div>
          <div className="stat-card__info">
            <span className="stat-card__value">{summary.totalPosts}</span>
            <span className="stat-card__label">Total Issues</span>
          </div>
        </div>
        <div className="stat-card stat-card--new">
          <div className="stat-card__icon"><AlertCircle size={22} /></div>
          <div className="stat-card__info">
            <span className="stat-card__value">{summary.byStatus?.new || 0}</span>
            <span className="stat-card__label">Pending</span>
          </div>
        </div>
        <div className="stat-card stat-card--progress">
          <div className="stat-card__icon"><Clock size={22} /></div>
          <div className="stat-card__info">
            <span className="stat-card__value">{summary.byStatus?.inProgress || 0}</span>
            <span className="stat-card__label">In Progress</span>
          </div>
        </div>
        <div className="stat-card stat-card--resolved">
          <div className="stat-card__icon"><CheckCircle2 size={22} /></div>
          <div className="stat-card__info">
            <span className="stat-card__value">{summary.byStatus?.resolved || 0}</span>
            <span className="stat-card__label">Resolved</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="authority-dash__toolbar">
        <div className="authority-dash__search">
          <Search size={18} className="authority-dash__search-icon" />
          <input
            type="text"
            className="form-input authority-dash__search-input"
            placeholder="Search issues..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="authority-dash__status-filters">
          <button
            className={`filter-chip ${statusFilter === 'all' ? 'filter-chip--active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All
          </button>
          <button
            className={`filter-chip ${statusFilter === 'new' ? 'filter-chip--active' : ''}`}
            onClick={() => setStatusFilter('new')}
          >
            <Zap size={13} /> New
          </button>
          <button
            className={`filter-chip ${statusFilter === 'inProgress' ? 'filter-chip--active' : ''}`}
            onClick={() => setStatusFilter('inProgress')}
          >
            <Clock size={13} /> In Progress
          </button>
          <button
            className={`filter-chip ${statusFilter === 'resolved' ? 'filter-chip--active' : ''}`}
            onClick={() => setStatusFilter('resolved')}
          >
            <CheckCircle2 size={13} /> Resolved
          </button>
          <button
            className={`filter-chip ${statusFilter === 'pendingResolution' ? 'filter-chip--active' : ''}`}
            onClick={() => setStatusFilter('pendingResolution')}
          >
            <AlertCircle size={13} /> Awaiting Confirm
          </button>
        </div>
      </div>

      {/* Location Filter Bar */}
      <div className="authority-dash__location-bar">
        <div className="location-filter">
          {authorityLocation ? (
            <>
              <button
                className={`filter-chip filter-chip--location ${locationFilter ? 'filter-chip--active' : ''}`}
                onClick={() => setLocationFilter(!locationFilter)}
              >
                <MapPin size={14} />
                {locationFilter ? 'Near Me' : 'Show Nearby'}
              </button>

              {locationFilter && (
                <div className="location-filter__radius">
                  <span className="location-filter__radius-label">Radius:</span>
                  {RADIUS_OPTIONS.map((r) => (
                    <button
                      key={r}
                      className={`radius-chip ${radius === r ? 'radius-chip--active' : ''}`}
                      onClick={() => setRadius(r)}
                    >
                      {r} km
                    </button>
                  ))}
                </div>
              )}

              <button
                className="btn btn--ghost btn--sm location-filter__update"
                onClick={handleSetMyLocation}
                disabled={locating}
              >
                <Navigation size={14} />
                {locating ? 'Updating...' : 'Update Location'}
              </button>
            </>
          ) : (
            <button
              className="btn btn--accent btn--sm"
              onClick={handleSetMyLocation}
              disabled={locating}
            >
              {locating ? (
                <><Loader size={14} className="spin" /> Detecting location...</>
              ) : (
                <><MapPin size={14} /> Set My Location</>
              )}
            </button>
          )}

          {locationError && (
            <span className="location-filter__error">{locationError}</span>
          )}

          {authorityLocation && locationFilter && (
            <span className="location-filter__info">
              <MapPin size={12} />
              {authorityLocation.latitude.toFixed(4)}, {authorityLocation.longitude.toFixed(4)}
            </span>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="authority-dash__results-info">
        <TrendingUp size={16} />
        <span>Showing {filteredPosts.length} issues (sorted by priority)</span>
      </div>

      {/* Issues Table */}
      <div className="authority-table-wrap">
        <table className="authority-table">
          <thead>
            <tr>
              <th>Issue</th>
              <th>Category</th>
              <th>Severity</th>
              <th>Priority</th>
              <th>Engagement</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredPosts.map((post) => (
              <tr key={post._id} className="authority-table__row fade-in">
                <td>
                  <div className="authority-table__issue">
                    <span className="authority-table__issue-title">{post.title}</span>
                    <span className="authority-table__issue-date">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </td>
                <td>
                  <span className={`badge badge--${post.category}`}>
                    {categoryIcons[post.category]} {post.category}
                  </span>
                </td>
                <td>
                  <span className={`badge badge--${post.severity}`}>
                    {post.severity}
                  </span>
                </td>
                <td>
                  <span className="authority-table__priority">{post.priorityScore}</span>
                </td>
                <td>
                  <div className="authority-table__engagement">
                    <span><ArrowUp size={13} /> {post.upvotes}</span>
                    <span><MessageCircle size={13} /> {post.comments?.length || 0}</span>
                  </div>
                </td>
                <td>
                  <select
                    className="form-select authority-table__status-select"
                    value={post.status}
                    onChange={(e) => handleStatusChange(post._id, e.target.value)}
                    disabled={post.status === 'resolved'}
                  >
                    {(STATUS_TRANSITIONS[post.status] || [post.status]).map((s) => (
                      <option key={s} value={s}>
                        {s === 'inProgress' ? 'In Progress' : s === 'pendingResolution' ? 'Awaiting Confirm' : s === 'resolved' ? 'Resolved' : s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                  {post.status !== 'resolved' && (
                    <input
                      type="text"
                      className="form-input authority-table__note-input"
                      placeholder="Add note..."
                      value={statusNotes[post._id] || ''}
                      onChange={(e) => setStatusNotes((prev) => ({ ...prev, [post._id]: e.target.value }))}
                      maxLength={500}
                    />
                  )}
                  {post.statusNote && (
                    <span className="authority-table__note-display">
                      <FileText size={12} /> {post.statusNote}
                    </span>
                  )}
                </td>
                <td>
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={() => navigate(`/post/${post._id}`)}
                  >
                    <Eye size={15} /> View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredPosts.length === 0 && (
          <div className="authority-table__empty">
            <AlertCircle size={40} />
            <p>No issues found</p>
          </div>
        )}
      </div>
    </div>
  );
}
