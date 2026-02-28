import { useState, useEffect } from 'react';
import { notificationsAPI } from '../../api/notifications';
import { postsAPI } from '../../api/posts';
import {
  Bell,
  BellOff,
  CheckCheck,
  ArrowUp,
  MessageCircle,
  RefreshCw,
  Circle,
  Loader,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock
} from 'lucide-react';
import './NotificationsPage.css';

const typeIcons = {
  'status-update': RefreshCw,
  'new-comment': MessageCircle,
  'upvote': ArrowUp,
  'resolution-confirmation': AlertTriangle,
  'auto-resolved': CheckCircle2,
};

const typeColors = {
  'status-update': 'var(--status-progress)',
  'new-comment': 'var(--accent-secondary)',
  'upvote': 'var(--accent-primary)',
  'resolution-confirmation': 'var(--status-new, #f39c12)',
  'auto-resolved': 'var(--status-resolved, #00b894)',
};

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString();
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // postId being acted on

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const res = await notificationsAPI.getMy({ limit: 50 });
        setNotifications(res.notifications || []);
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchNotifications();
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const toggleRead = async (id) => {
    const notif = notifications.find((n) => n._id === id);
    if (notif && !notif.isRead) {
      try {
        await notificationsAPI.markRead(id);
        setNotifications(
          notifications.map((n) =>
            n._id === id ? { ...n, isRead: true } : n
          )
        );
      } catch (err) {
        console.error('Failed to mark as read:', err);
      }
    }
  };

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.isRead);
    try {
      await Promise.all(unread.map((n) => notificationsAPI.markRead(n._id)));
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'read') return n.isRead;
    return true;
  });

  const handleConfirmResolution = async (postId, notifId) => {
    setActionLoading(postId);
    try {
      await postsAPI.confirmResolution(postId);
      await notificationsAPI.markRead(notifId);
      setNotifications(
        notifications.map((n) =>
          n._id === notifId ? { ...n, isRead: true, _resolved: true } : n
        )
      );
    } catch (err) {
      console.error('Failed to confirm resolution:', err);
      alert(err.message || 'Failed to confirm');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectResolution = async (postId, notifId) => {
    setActionLoading(postId);
    try {
      await postsAPI.rejectResolution(postId);
      await notificationsAPI.markRead(notifId);
      setNotifications(
        notifications.map((n) =>
          n._id === notifId ? { ...n, isRead: true, _rejected: true } : n
        )
      );
    } catch (err) {
      console.error('Failed to reject resolution:', err);
      alert(err.message || 'Failed to reject');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="notif-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Loader size={32} className="spin" />
      </div>
    );
  }

  return (
    <div className="notif-page">
      <div className="notif-page__header">
        <div>
          <h1 className="notif-page__title">
            <Bell size={24} />
            Notifications
          </h1>
          <p className="notif-page__subtitle">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
              : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn--secondary" onClick={markAllRead}>
            <CheckCheck size={16} />
            Mark all read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="notif-page__filters">
        <button
          className={`filter-chip ${filter === 'all' ? 'filter-chip--active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({notifications.length})
        </button>
        <button
          className={`filter-chip ${filter === 'unread' ? 'filter-chip--active' : ''}`}
          onClick={() => setFilter('unread')}
        >
          Unread ({unreadCount})
        </button>
        <button
          className={`filter-chip ${filter === 'read' ? 'filter-chip--active' : ''}`}
          onClick={() => setFilter('read')}
        >
          Read ({notifications.length - unreadCount})
        </button>
      </div>

      {/* Notification List */}
      <div className="notif-list">
        {filtered.map((notif) => {
          const Icon = typeIcons[notif.type] || Bell;
          const color = typeColors[notif.type] || 'var(--text-muted)';

          return (
            <div
              key={notif._id}
              className={`notif-item fade-in ${!notif.isRead ? 'notif-item--unread' : ''} ${notif.type === 'resolution-confirmation' && !notif.isRead ? 'notif-item--action' : ''}`}
              onClick={() => notif.type !== 'resolution-confirmation' && toggleRead(notif._id)}
            >
              <div className="notif-item__icon" style={{ color, background: `${color}15` }}>
                <Icon size={18} />
              </div>
              <div className="notif-item__content">
                <div className="notif-item__header">
                  <span className="notif-item__title">{notif.title}</span>
                  {!notif.isRead && (
                    <Circle size={8} fill="var(--accent-primary)" color="var(--accent-primary)" />
                  )}
                </div>
                <p className="notif-item__message">{notif.message}</p>

                {/* Resolution confirmation actions */}
                {notif.type === 'resolution-confirmation' && !notif.isRead && !notif._resolved && !notif._rejected && (
                  <div className="notif-item__actions">
                    <button
                      className="btn btn--success btn--sm"
                      onClick={(e) => { e.stopPropagation(); handleConfirmResolution(notif.postId, notif._id); }}
                      disabled={actionLoading === notif.postId}
                    >
                      {actionLoading === notif.postId ? <Loader size={14} className="spin" /> : <CheckCircle2 size={14} />}
                      Yes, it's fixed
                    </button>
                    <button
                      className="btn btn--danger btn--sm"
                      onClick={(e) => { e.stopPropagation(); handleRejectResolution(notif.postId, notif._id); }}
                      disabled={actionLoading === notif.postId}
                    >
                      <XCircle size={14} />
                      Not fixed
                    </button>
                    <span className="notif-item__deadline">
                      <Clock size={12} /> Auto-resolves in 2 days
                    </span>
                  </div>
                )}

                {notif._resolved && (
                  <div className="notif-item__result notif-item__result--confirmed">
                    <CheckCircle2 size={14} /> You confirmed this issue as resolved
                  </div>
                )}

                {notif._rejected && (
                  <div className="notif-item__result notif-item__result--rejected">
                    <XCircle size={14} /> You reported this issue as not fixed
                  </div>
                )}

                <span className="notif-item__time">{timeAgo(notif.createdAt)}</span>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="notif-page__empty">
            <BellOff size={48} />
            <h3>No notifications</h3>
            <p>{filter === 'unread' ? "You've read all notifications" : 'Nothing here yet'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
