import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { postsAPI } from '../../api/posts';
import PostCard from '../../components/PostCard';
import { FileText, PlusCircle, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './MyPostsPage.css';

export default function MyPostsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myPosts, setMyPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMyPosts() {
      try {
        const res = await postsAPI.getMyPosts({ limit: 50 });
        setMyPosts(res.posts || []);
      } catch (err) {
        console.error('Failed to fetch my posts:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchMyPosts();
  }, []);

  if (loading) {
    return (
      <div className="my-posts-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Loader size={32} className="spin" />
      </div>
    );
  }

  return (
    <div className="my-posts-page">
      <div className="my-posts-page__header">
        <div>
          <h1 className="my-posts-page__title">
            <FileText size={24} />
            My Posts
          </h1>
          <p className="my-posts-page__subtitle">
            Issues you've reported ({myPosts.length})
          </p>
        </div>
        <button className="btn btn--primary" onClick={() => navigate('/report')}>
          <PlusCircle size={18} />
          Report New Issue
        </button>
      </div>

      <div className="my-posts-page__grid">
        {myPosts.length > 0 ? (
          myPosts.map((post) => <PostCard key={post._id} post={post} />)
        ) : (
          <div className="my-posts-page__empty">
            <FileText size={48} />
            <h3>No posts yet</h3>
            <p>You haven't reported any issues yet. Start by reporting one!</p>
            <button className="btn btn--primary" onClick={() => navigate('/report')}>
              <PlusCircle size={18} />
              Report Issue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
