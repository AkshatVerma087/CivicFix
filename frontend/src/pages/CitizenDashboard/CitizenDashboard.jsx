import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { postsAPI } from '../../api/posts';
import PostCard from '../../components/PostCard';
import {
  PlusCircle,
  Search,
  Filter,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  BarChart3,
  Loader,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import './CitizenDashboard.css';

const STATUS_FILTERS = ['all', 'new', 'inProgress', 'resolved'];
const CATEGORY_FILTERS = ['all', 'water', 'electricity', 'sanitation', 'road', 'other'];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'priority', label: 'Highest Priority' },
  { value: 'upvotes', label: 'Most Upvoted' },
];

export default function CitizenDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  const [posts, setPosts] = useState([]);
  const [summary, setSummary] = useState({ totalPosts: 0, byStatus: { new: 0, inProgress: 0, resolved: 0 } });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [postsRes, summaryRes] = await Promise.all([
          postsAPI.getAll({ limit: 100 }),
          postsAPI.getSummary(),
        ]);
        setPosts(postsRes.posts || []);
        setSummary(summaryRes);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredPosts = useMemo(() => {
    let result = [...posts];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((p) => p.status === statusFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter((p) => p.category === categoryFilter);
    }

    // Sort
    switch (sortBy) {
      case 'oldest':
        result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case 'priority':
        result.sort((a, b) => b.priorityScore - a.priorityScore);
        break;
      case 'upvotes':
        result.sort((a, b) => b.upvotes - a.upvotes);
        break;
      default:
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return result;
  }, [search, statusFilter, categoryFilter, sortBy, posts]);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, categoryFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / ITEMS_PER_PAGE));
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (loading) {
    return (
      <div className="citizen-dash" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Loader size={32} className="spin" />
      </div>
    );
  }

  return (
    <div className="citizen-dash">
      {/* Welcome Header */}
      <div className="citizen-dash__header">
        <div>
          <h1 className="citizen-dash__greeting">
            Welcome back, {user?.name?.split(' ')[0] || 'Citizen'} 👋
          </h1>
          <p className="citizen-dash__subtitle">
            Here&apos;s what&apos;s happening in your community
          </p>
        </div>
        <button
          className="btn btn--primary"
          onClick={() => navigate('/report')}
        >
          <PlusCircle size={18} />
          Report Issue
        </button>
      </div>

      {/* Stats Cards */}
      <div className="citizen-dash__stats">
        <div className="stat-card stat-card--total">
          <div className="stat-card__icon">
            <BarChart3 size={22} />
          </div>
          <div className="stat-card__info">
            <span className="stat-card__value">{summary.totalPosts}</span>
            <span className="stat-card__label">Total Issues</span>
          </div>
        </div>
        <div className="stat-card stat-card--new">
          <div className="stat-card__icon">
            <AlertCircle size={22} />
          </div>
          <div className="stat-card__info">
            <span className="stat-card__value">{summary.byStatus?.new || 0}</span>
            <span className="stat-card__label">New</span>
          </div>
        </div>
        <div className="stat-card stat-card--progress">
          <div className="stat-card__icon">
            <Clock size={22} />
          </div>
          <div className="stat-card__info">
            <span className="stat-card__value">{summary.byStatus?.inProgress || 0}</span>
            <span className="stat-card__label">In Progress</span>
          </div>
        </div>
        <div className="stat-card stat-card--resolved">
          <div className="stat-card__icon">
            <CheckCircle2 size={22} />
          </div>
          <div className="stat-card__info">
            <span className="stat-card__value">{summary.byStatus?.resolved || 0}</span>
            <span className="stat-card__label">Resolved</span>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="citizen-dash__toolbar">
        <div className="citizen-dash__search">
          <Search size={18} className="citizen-dash__search-icon" />
          <input
            type="text"
            className="form-input citizen-dash__search-input"
            placeholder="Search issues..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button
          className={`btn btn--secondary ${showFilters ? 'btn--active' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={16} />
          Filters
        </button>

        <select
          className="form-select citizen-dash__sort"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Filter Chips */}
      {showFilters && (
        <div className="citizen-dash__filters fade-in">
          <div className="filter-section">
            <span className="filter-section__label">Status</span>
            <div className="filter-chips">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  className={`filter-chip ${statusFilter === s ? 'filter-chip--active' : ''}`}
                  onClick={() => setStatusFilter(s)}
                >
                  {s === 'inProgress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-section">
            <span className="filter-section__label">Category</span>
            <div className="filter-chips">
              {CATEGORY_FILTERS.map((c) => (
                <button
                  key={c}
                  className={`filter-chip ${categoryFilter === c ? 'filter-chip--active' : ''}`}
                  onClick={() => setCategoryFilter(c)}
                >
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results count */}
      <div className="citizen-dash__results-info">
        <TrendingUp size={16} />
        <span>Showing {paginatedPosts.length} of {filteredPosts.length} issues</span>
      </div>

      {/* Posts Grid */}
      <div className="citizen-dash__grid">
        {paginatedPosts.length > 0 ? (
          paginatedPosts.map((post) => <PostCard key={post._id} post={post} />)
        ) : (
          <div className="citizen-dash__empty">
            <AlertCircle size={48} />
            <h3>No issues found</h3>
            <p>Try adjusting your filters or search query</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="citizen-dash__pagination">
          <button
            className="btn btn--secondary btn--sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            <ChevronLeft size={16} /> Previous
          </button>
          <div className="citizen-dash__page-numbers">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .reduce((acc, p, i, arr) => {
                if (i > 0 && p - arr[i - 1] > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === '...' ? (
                  <span key={`ellipsis-${i}`} className="citizen-dash__page-ellipsis">...</span>
                ) : (
                  <button
                    key={p}
                    className={`citizen-dash__page-btn ${currentPage === p ? 'citizen-dash__page-btn--active' : ''}`}
                    onClick={() => setCurrentPage(p)}
                  >
                    {p}
                  </button>
                )
              )}
          </div>
          <button
            className="btn btn--secondary btn--sm"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
