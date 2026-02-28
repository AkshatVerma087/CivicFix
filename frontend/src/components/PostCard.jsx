import { useNavigate } from 'react-router-dom';
import { ArrowUp, MessageCircle, MapPin, Clock } from 'lucide-react';
import './PostCard.css';

const categoryIcons = {
  water: '💧',
  electricity: '⚡',
  sanitation: '🗑️',
  road: '🛣️',
  other: '📋',
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

export default function PostCard({ post }) {
  const navigate = useNavigate();

  return (
    <article
      className="post-card card fade-in"
      onClick={() => navigate(`/post/${post._id}`)}
    >
      {post.photos?.length > 0 && (
        <div className="post-card__image">
          <img src={post.photos[0].url} alt={post.title} loading="lazy" />
          {post.photos.length > 1 && (
            <span className="post-card__image-count">+{post.photos.length - 1}</span>
          )}
        </div>
      )}

      <div className="post-card__body">
        <div className="post-card__meta">
          <span className={`badge badge--${post.category}`}>
            {categoryIcons[post.category] || '📋'} {post.category}
          </span>
          <span className={`badge badge--${post.status}`}>
            {post.status === 'inProgress' ? 'In Progress' : post.status}
          </span>
          <span className={`badge badge--${post.severity}`}>
            {post.severity}
          </span>
        </div>

        <h3 className="post-card__title">{post.title}</h3>
        <p className="post-card__desc">{post.description}</p>

        <div className="post-card__footer">
          <div className="post-card__stats">
            <span className="post-card__stat">
              <ArrowUp size={15} />
              {post.upvotes}
            </span>
            <span className="post-card__stat">
              <MessageCircle size={15} />
              {post.comments?.length || 0}
            </span>
            {post.location && (
              <span className="post-card__stat">
                <MapPin size={15} />
                {post.location.latitude?.toFixed(2)}, {post.location.longitude?.toFixed(2)}
              </span>
            )}
          </div>
          <span className="post-card__time">
            <Clock size={13} />
            {timeAgo(post.createdAt)}
          </span>
        </div>
      </div>
    </article>
  );
}
