import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { postsAPI } from '../../api/posts';
import { authAPI } from '../../api/auth';
import {
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
  BarChart3,
  Eye,
  TrendingUp,
  Zap,
  Loader,
  Trash2,
  ShieldCheck,
  Users,
  Download,
} from 'lucide-react';
import './AdminDashboard.css';

const STATUS_OPTIONS = ['new', 'inProgress', 'pendingResolution', 'resolved'];
const categoryIcons = {
  water: '💧', electricity: '⚡', sanitation: '🗑️', road: '🛣️', other: '📋',
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [posts, setPosts] = useState([]);
  const [summary, setSummary] = useState({ totalPosts: 0, byStatus: { new: 0, inProgress: 0, pendingResolution: 0, resolved: 0 } });
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [authorities, setAuthorities] = useState([]);
  const [activeTab, setActiveTab] = useState('issues'); // 'issues' | 'authorities'

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const [postsRes, summaryRes, authRes] = await Promise.all([
        postsAPI.getAll({ limit: 100, sortBy: 'priorityScore', sortOrder: 'desc' }),
        postsAPI.getSummary(),
        authAPI.getAllAuthorities(),
      ]);
      setPosts(postsRes.posts || []);
      setSummary(summaryRes);
      setAuthorities(authRes.authorities || []);
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
      setFetchError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

    result.sort((a, b) => b.priorityScore - a.priorityScore);
    return result;
  }, [search, statusFilter, posts]);

  const handleStatusChange = async (postId, newStatus) => {
    try {
      const res = await postsAPI.updateStatus(postId, newStatus);
      const actualStatus = res.post?.status || newStatus;
      setPosts(posts.map((p) =>
        p._id === postId ? { ...p, status: actualStatus } : p
      ));
      const summaryRes = await postsAPI.getSummary();
      setSummary(summaryRes);
    } catch (err) {
      console.error('Failed to update status:', err);
      alert(err.message || 'Failed to update status');
    }
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await postsAPI.delete(postId);
      setPosts(posts.filter((p) => p._id !== postId));
      const summaryRes = await postsAPI.getSummary();
      setSummary(summaryRes);
    } catch (err) {
      console.error('Failed to delete post:', err);
      alert(err.message || 'Failed to delete post');
    }
  };

  const handleAssign = async (postId, authorityId) => {
    try {
      const res = await postsAPI.assign(postId, authorityId || null);
      setPosts(posts.map((p) =>
        p._id === postId ? { ...p, assignedTo: res.post?.assignedTo || null } : p
      ));
    } catch (err) {
      console.error('Failed to assign post:', err);
      alert(err.message || 'Failed to assign post');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Title', 'Category', 'Severity', 'Status', 'Priority Score', 'Upvotes', 'Created At', 'Assigned To'];
    const rows = filteredPosts.map((p) => {
      const auth = authorities.find((a) => a._id === (typeof p.assignedTo === 'object' ? p.assignedTo?._id : p.assignedTo));
      return [
        `"${(p.title || '').replace(/"/g, '""')}"`,
        p.category,
        p.severity,
        p.status,
        p.priorityScore,
        p.upvotes,
        new Date(p.createdAt).toISOString().split('T')[0],
        auth ? `"${auth.name}"` : 'Unassigned',
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `civicfix-issues-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="admin-dash" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Loader size={32} className="spin" />
      </div>
    );
  }

  return (
    <div className="admin-dash">
      {fetchError && (
        <div style={{ background: '#2d1517', border: '1px solid #ef4444', borderRadius: '8px', padding: '12px 16px', marginBottom: '1rem', color: '#f87171', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Error: {fetchError}</span>
          <button className="btn btn--ghost btn--sm" onClick={fetchData}>Retry</button>
        </div>
      )}

      {/* Header */}
      <div className="admin-dash__header">
        <div>
          <h1 className="admin-dash__greeting">
            <ShieldCheck size={28} /> Admin Panel
          </h1>
          <p className="admin-dash__subtitle">
            Welcome, {user?.name || 'Admin'} — Full system administration
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="admin-dash__stats">
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
            <span className="stat-card__label">New</span>
          </div>
        </div>
        <div className="stat-card stat-card--progress">
          <div className="stat-card__icon"><Clock size={22} /></div>
          <div className="stat-card__info">
            <span className="stat-card__value">{summary.byStatus?.inProgress || 0}</span>
            <span className="stat-card__label">In Progress</span>
          </div>
        </div>
        <div className="stat-card stat-card--pending">
          <div className="stat-card__icon"><AlertCircle size={22} /></div>
          <div className="stat-card__info">
            <span className="stat-card__value">{summary.byStatus?.pendingResolution || 0}</span>
            <span className="stat-card__label">Pending Confirm</span>
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

      {/* Tab Switcher */}
      <div className="admin-dash__tabs">
        <button
          className={`admin-dash__tab ${activeTab === 'issues' ? 'admin-dash__tab--active' : ''}`}
          onClick={() => setActiveTab('issues')}
        >
          <BarChart3 size={16} /> Issues ({summary.totalPosts})
        </button>
        <button
          className={`admin-dash__tab ${activeTab === 'authorities' ? 'admin-dash__tab--active' : ''}`}
          onClick={() => setActiveTab('authorities')}
        >
          <Users size={16} /> Authorities ({authorities.length})
        </button>
      </div>

      {activeTab === 'issues' && (
        <>
          {/* Toolbar */}
          <div className="admin-dash__toolbar">
            <div className="admin-dash__search">
              <Search size={18} className="admin-dash__search-icon" />
              <input
                type="text"
                className="form-input admin-dash__search-input"
                placeholder="Search issues..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <button className="btn btn--secondary btn--sm" onClick={handleExportCSV} title="Export as CSV">
              <Download size={16} /> Export CSV
            </button>

            <div className="admin-dash__status-filters">
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
                className={`filter-chip ${statusFilter === 'pendingResolution' ? 'filter-chip--active' : ''}`}
                onClick={() => setStatusFilter('pendingResolution')}
              >
                <AlertCircle size={13} /> Pending
              </button>
              <button
                className={`filter-chip ${statusFilter === 'resolved' ? 'filter-chip--active' : ''}`}
                onClick={() => setStatusFilter('resolved')}
              >
                <CheckCircle2 size={13} /> Resolved
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="admin-dash__results-info">
            <TrendingUp size={16} />
            <span>Showing {filteredPosts.length} issues (sorted by priority)</span>
          </div>

          {/* Issues Table */}
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Issue</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Assigned To</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPosts.map((post) => (
                  <tr key={post._id} className="admin-table__row fade-in">
                    <td>
                      <div className="admin-table__issue">
                        <span className="admin-table__issue-title">{post.title}</span>
                        <span className="admin-table__issue-date">
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
                      <span className="admin-table__priority">{post.priorityScore}</span>
                    </td>
                    <td>
                      <select
                        className="form-select admin-table__assign-select"
                        value={post.assignedTo || ''}
                        onChange={(e) => handleAssign(post._id, e.target.value || null)}
                      >
                        <option value="">Unassigned</option>
                        {authorities.map((a) => (
                          <option key={a._id} value={a._id}>
                            {a.name} ({a.department})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className="form-select admin-table__status-select"
                        value={post.status}
                        onChange={(e) => handleStatusChange(post._id, e.target.value)}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s === 'inProgress' ? 'In Progress' : s === 'pendingResolution' ? 'Pending Confirm' : s.charAt(0).toUpperCase() + s.slice(1)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="admin-table__actions">
                        <button
                          className="btn btn--ghost btn--sm"
                          onClick={() => navigate(`/post/${post._id}`)}
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          className="btn btn--danger btn--sm"
                          onClick={() => handleDelete(post._id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredPosts.length === 0 && (
              <div className="admin-table__empty">
                <AlertCircle size={40} />
                <p>No issues found</p>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'authorities' && (
        <>
          <div className="admin-dash__results-info">
            <Users size={16} />
            <span>{authorities.length} registered authorities</span>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Zone</th>
                  <th>Assigned Issues</th>
                </tr>
              </thead>
              <tbody>
                {authorities.map((auth) => {
                  const assignedCount = posts.filter((p) => p.assignedTo === auth._id).length;
                  return (
                    <tr key={auth._id} className="admin-table__row fade-in">
                      <td>
                        <span style={{ fontWeight: 500 }}>{auth.name}</span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{auth.email}</td>
                      <td>
                        <span className={`badge badge--${auth.department}`}>
                          {auth.department}
                        </span>
                      </td>
                      <td>{auth.zone}</td>
                      <td>
                        <span className="admin-table__priority">{assignedCount}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {authorities.length === 0 && (
              <div className="admin-table__empty">
                <Users size={40} />
                <p>No authorities registered yet</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
