import { useState, useEffect } from 'react';
import { postsAPI } from '../../api/posts';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area,
  LineChart, Line,
} from 'recharts';
import {
  BarChart3,
  PieChart as PieIcon,
  TrendingUp,
  Clock,
  AlertCircle,
  Loader,
  Activity,
} from 'lucide-react';
import './AnalyticsPage.css';

const CATEGORY_COLORS = {
  water: '#74b9ff',
  electricity: '#fdcb6e',
  sanitation: '#55efc4',
  road: '#fd79a8',
  other: '#a29bfe',
};

const SEVERITY_COLORS = {
  low: '#55efc4',
  medium: '#fdcb6e',
  high: '#ff7675',
};

const PIE_COLORS = ['#74b9ff', '#fdcb6e', '#55efc4', '#fd79a8', '#a29bfe', '#6c5ce7'];

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await postsAPI.getAnalytics();
        setData(res);
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="analytics-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Loader size={32} className="spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="analytics-page">
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <AlertCircle size={48} />
          <h3>Failed to load analytics</h3>
        </div>
      </div>
    );
  }

  const { byCategory = [], bySeverity = [], monthly = [], avgResolutionHours = 0 } = data;

  // Backend already returns mapped {name, value} for category/severity
  const categoryData = byCategory;
  const severityData = bySeverity;
  // Monthly data uses {month, total, resolved} — map month to name for chart XAxis
  const monthlyData = monthly.map((m) => ({
    name: m.month,
    total: m.total,
    resolved: m.resolved,
  }));

  const totalIssues = byCategory.reduce((sum, c) => sum + c.value, 0);
  const totalResolved = monthly.reduce((sum, m) => sum + m.resolved, 0);
  const resolutionRate = totalIssues > 0 ? ((totalResolved / totalIssues) * 100).toFixed(1) : 0;

  return (
    <div className="analytics-page">
      <div className="analytics-page__header">
        <h1>
          <Activity size={24} /> Analytics Dashboard
        </h1>
        <p className="analytics-page__subtitle">Insights into community issues and resolution performance</p>
      </div>

      {/* Stat Cards */}
      <div className="analytics-page__stats">
        <div className="analytics-stat">
          <div className="analytics-stat__icon analytics-stat__icon--blue">
            <BarChart3 size={22} />
          </div>
          <div className="analytics-stat__info">
            <span className="analytics-stat__value">{totalIssues}</span>
            <span className="analytics-stat__label">Total Issues</span>
          </div>
        </div>
        <div className="analytics-stat">
          <div className="analytics-stat__icon analytics-stat__icon--green">
            <TrendingUp size={22} />
          </div>
          <div className="analytics-stat__info">
            <span className="analytics-stat__value">{resolutionRate}%</span>
            <span className="analytics-stat__label">Resolution Rate</span>
          </div>
        </div>
        <div className="analytics-stat">
          <div className="analytics-stat__icon analytics-stat__icon--orange">
            <Clock size={22} />
          </div>
          <div className="analytics-stat__info">
            <span className="analytics-stat__value">
              {avgResolutionHours > 0 ? `${Math.round(avgResolutionHours)}h` : 'N/A'}
            </span>
            <span className="analytics-stat__label">Avg Resolution Time</span>
          </div>
        </div>
        <div className="analytics-stat">
          <div className="analytics-stat__icon analytics-stat__icon--purple">
            <PieIcon size={22} />
          </div>
          <div className="analytics-stat__info">
            <span className="analytics-stat__value">{byCategory.length}</span>
            <span className="analytics-stat__label">Categories</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="analytics-page__charts">
        {/* Category Pie Chart */}
        <div className="analytics-chart-card">
          <h3 className="analytics-chart-card__title">
            <PieIcon size={18} /> Issues by Category
          </h3>
          <div className="analytics-chart-card__body">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, value }) => `${name} (${value})`}
                  >
                    {categoryData.map((entry, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[entry.name] || PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-primary)' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="analytics-chart-card__empty">No category data available</p>
            )}
          </div>
        </div>

        {/* Severity Bar Chart */}
        <div className="analytics-chart-card">
          <h3 className="analytics-chart-card__title">
            <BarChart3 size={18} /> Issues by Severity
          </h3>
          <div className="analytics-chart-card__body">
            {severityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={severityData} barSize={48}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" />
                  <YAxis stroke="var(--text-secondary)" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-primary)' }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {severityData.map((entry, i) => (
                      <Cell key={i} fill={SEVERITY_COLORS[entry.name] || '#a29bfe'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="analytics-chart-card__empty">No severity data available</p>
            )}
          </div>
        </div>

        {/* Monthly Trend Chart (Full Width) */}
        <div className="analytics-chart-card analytics-chart-card--full">
          <h3 className="analytics-chart-card__title">
            <TrendingUp size={18} /> Monthly Issue Trend
          </h3>
          <div className="analytics-chart-card__body">
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6c5ce7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6c5ce7" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="resolvedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#55efc4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#55efc4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" />
                  <YAxis stroke="var(--text-secondary)" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-primary)' }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="total" name="Total Reported" stroke="#6c5ce7" fill="url(#totalGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#55efc4" fill="url(#resolvedGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="analytics-chart-card__empty">No monthly data available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
