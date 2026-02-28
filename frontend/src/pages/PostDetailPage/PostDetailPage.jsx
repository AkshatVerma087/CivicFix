import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { postsAPI } from '../../api/posts';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowLeft,
  ArrowUp,
  MessageCircle,
  MapPin,
  Clock,
  Send,
  Trash2,
  ChevronLeft,
  ChevronRight,
  User,
  Shield,
  Calendar,
  Loader,
  X,
  ZoomIn,
} from 'lucide-react';
import './PostDetailPage.css';

const categoryIcons = {
  water: '💧',
  electricity: '⚡',
  sanitation: '🗑️',
  road: '🛣️',
  other: '📋',
};

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PostDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [upvoteCount, setUpvoteCount] = useState(0);
  const [upvoted, setUpvoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [commentLoading, setCommentLoading] = useState(false);

  useEffect(() => {
    async function fetchPost() {
      try {
        const [postRes, commentsRes] = await Promise.all([
          postsAPI.getById(id),
          postsAPI.getComments(id),
        ]);
        setPost(postRes.post);
        setComments(commentsRes.comments || []);
        setUpvoteCount(postRes.post?.upvotes || 0);
        setUpvoted(postRes.post?.upvotedBy?.includes(user?._id) || false);
      } catch (err) {
        console.error('Failed to fetch post:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPost();
  }, [id, user?._id]);

  if (loading) {
    return (
      <div className="post-detail" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Loader size={32} className="spin" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="post-detail">
        <div className="post-detail__not-found">
          <h2>Issue not found</h2>
          <p>The issue you&apos;re looking for doesn&apos;t exist.</p>
          <button className="btn btn--primary" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleUpvote = async () => {
    try {
      if (upvoted) {
        await postsAPI.removeUpvote(id);
        setUpvoteCount((c) => c - 1);
        setUpvoted(false);
      } else {
        await postsAPI.upvote(id);
        setUpvoteCount((c) => c + 1);
        setUpvoted(true);
      }
    } catch (err) {
      console.error('Upvote failed:', err);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setCommentLoading(true);
    try {
      const res = await postsAPI.addComment(id, newComment.trim());
      setComments(res.comments || []);
      setNewComment('');
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await postsAPI.deleteComment(id, commentId);
      setComments(comments.filter((c) => c._id !== commentId));
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  return (
    <div className="post-detail">
      <button className="btn btn--ghost post-detail__back" onClick={() => navigate(-1)}>
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="post-detail__layout">
        {/* Main Content */}
        <div className="post-detail__main">
          {/* Photo Gallery */}
          {post.photos?.length > 0 && (
            <div className="post-detail__gallery">
              <div className="post-detail__gallery-main" onClick={() => setLightboxOpen(true)}>
                <img
                  src={post.photos[currentPhoto]?.url}
                  alt={`${post.title} - Photo ${currentPhoto + 1}`}
                  className="post-detail__gallery-img"
                />
                <div className="post-detail__gallery-zoom">
                  <ZoomIn size={20} />
                </div>
              </div>
              {post.photos.length > 1 && (
                <>
                  <button
                    className="post-detail__gallery-nav post-detail__gallery-nav--prev"
                    onClick={() => setCurrentPhoto(currentPhoto > 0 ? currentPhoto - 1 : post.photos.length - 1)}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    className="post-detail__gallery-nav post-detail__gallery-nav--next"
                    onClick={() => setCurrentPhoto(currentPhoto < post.photos.length - 1 ? currentPhoto + 1 : 0)}
                  >
                    <ChevronRight size={20} />
                  </button>
                  <div className="post-detail__gallery-dots">
                    {post.photos.map((_, i) => (
                      <button
                        key={i}
                        className={`post-detail__gallery-dot ${i === currentPhoto ? 'post-detail__gallery-dot--active' : ''}`}
                        onClick={() => setCurrentPhoto(i)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Post Header */}
          <div className="post-detail__header">
            <div className="post-detail__badges">
              <span className={`badge badge--${post.category}`}>
                {categoryIcons[post.category]} {post.category}
              </span>
              <span className={`badge badge--${post.status}`}>
                {post.status === 'inProgress' ? 'In Progress' : post.status === 'pendingResolution' ? 'Pending Confirmation' : post.status}
              </span>
              <span className={`badge badge--${post.severity}`}>
                {post.severity} severity
              </span>
            </div>
            <h1 className="post-detail__title">{post.title}</h1>

            <div className="post-detail__meta">
              <span className="post-detail__meta-item">
                <User size={15} />
                {post.citizen?.name || 'Anonymous'}
              </span>
              <span className="post-detail__meta-item">
                <Calendar size={15} />
                {formatDate(post.createdAt)}
              </span>
              {post.location && (
                <span className="post-detail__meta-item">
                  <MapPin size={15} />
                  {post.location.latitude?.toFixed(4)}, {post.location.longitude?.toFixed(4)}
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="post-detail__description">
            <p>{post.description}</p>
          </div>

          {/* Actions */}
          <div className="post-detail__actions">
            <button
              className={`btn ${upvoted ? 'btn--primary' : 'btn--secondary'} post-detail__upvote`}
              onClick={handleUpvote}
            >
              <ArrowUp size={18} />
              Upvote ({upvoteCount})
            </button>
            <span className="post-detail__stat">
              <MessageCircle size={16} />
              {comments.length} Comments
            </span>
            <span className="post-detail__stat">
              Priority Score: <strong>{post.priorityScore}</strong>
            </span>
          </div>

          {/* Comments Section */}
          <div className="post-detail__comments">
            <h3 className="post-detail__comments-title">
              <MessageCircle size={20} />
              Comments ({comments.length})
            </h3>

            <div className="post-detail__comments-list">
              {comments.map((comment) => (
                <div key={comment._id} className="comment fade-in">
                  <div className="comment__avatar">
                    {comment.role === 'authority' ? (
                      <Shield size={16} />
                    ) : (
                      <User size={16} />
                    )}
                  </div>
                  <div className="comment__body">
                    <div className="comment__header">
                      <span className={`comment__role comment__role--${comment.role}`}>
                        {comment.role}
                      </span>
                      <span className="comment__time">
                        <Clock size={12} />
                        {formatDate(comment.createdAt)}
                      </span>
                    </div>
                    <p className="comment__text">{comment.text}</p>
                  </div>
                  <button
                    className="comment__delete"
                    onClick={() => handleDeleteComment(comment._id)}
                    title="Delete comment"
                    style={{ display: comment.userId === user?._id ? 'flex' : 'none' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              {comments.length === 0 && (
                <p className="post-detail__no-comments">No comments yet. Be the first to comment!</p>
              )}
            </div>

            {/* Add Comment */}
            <form className="post-detail__add-comment" onSubmit={handleAddComment}>
              <input
                type="text"
                className="form-input"
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <button type="submit" className="btn btn--primary" disabled={commentLoading}>
                {commentLoading ? <Loader size={16} className="spin" /> : <Send size={16} />}
              </button>
            </form>
          </div>
        </div>

        {/* Sidebar Info */}
        <aside className="post-detail__sidebar">
          <div className="post-detail__info-card">
            <h3>Issue Details</h3>
            <div className="post-detail__info-row">
              <span className="post-detail__info-label">Status</span>
              <span className={`badge badge--${post.status}`}>
                {post.status === 'inProgress' ? 'In Progress' : post.status === 'pendingResolution' ? 'Pending Confirmation' : post.status}
              </span>
            </div>
            <div className="post-detail__info-row">
              <span className="post-detail__info-label">Category</span>
              <span>{categoryIcons[post.category]} {post.category}</span>
            </div>
            <div className="post-detail__info-row">
              <span className="post-detail__info-label">Severity</span>
              <span className={`badge badge--${post.severity}`}>{post.severity}</span>
            </div>
            <div className="post-detail__info-row">
              <span className="post-detail__info-label">Priority</span>
              <span className="post-detail__priority-score">{post.priorityScore}</span>
            </div>
            <div className="post-detail__info-row">
              <span className="post-detail__info-label">Reported</span>
              <span>{formatDate(post.createdAt)}</span>
            </div>
            <div className="post-detail__info-row">
              <span className="post-detail__info-label">Upvotes</span>
              <span>{upvoteCount}</span>
            </div>
          </div>

          {post.location && (
            <div className="post-detail__info-card">
              <h3>Location</h3>
              <div className="post-detail__map-placeholder">
                <MapPin size={32} />
                <p>{post.location.latitude?.toFixed(4)}, {post.location.longitude?.toFixed(4)}</p>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Lightbox */}
      {lightboxOpen && post.photos?.length > 0 && (
        <div className="lightbox-overlay" onClick={() => setLightboxOpen(false)}>
          <button className="lightbox-overlay__close" onClick={() => setLightboxOpen(false)}>
            <X size={24} />
          </button>
          <img
            src={post.photos[currentPhoto]?.url}
            alt={`${post.title} - Photo ${currentPhoto + 1}`}
            className="lightbox-overlay__img"
            onClick={(e) => e.stopPropagation()}
          />
          {post.photos.length > 1 && (
            <>
              <button
                className="lightbox-overlay__nav lightbox-overlay__nav--prev"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentPhoto(currentPhoto > 0 ? currentPhoto - 1 : post.photos.length - 1);
                }}
              >
                <ChevronLeft size={28} />
              </button>
              <button
                className="lightbox-overlay__nav lightbox-overlay__nav--next"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentPhoto(currentPhoto < post.photos.length - 1 ? currentPhoto + 1 : 0);
                }}
              >
                <ChevronRight size={28} />
              </button>
              <div className="lightbox-overlay__counter">
                {currentPhoto + 1} / {post.photos.length}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
