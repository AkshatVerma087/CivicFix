import { useState, useEffect } from 'react';
import { postsAPI } from '../../api/posts';
import {
  Trophy,
  Award,
  Medal,
  Star,
  Shield,
  User,
  ArrowUp,
  CheckCircle2,
  Loader,
  AlertCircle,
} from 'lucide-react';
import './LeaderboardPage.css';

function getRankIcon(index) {
  if (index === 0) return <Trophy size={20} className="lb-rank--gold" />;
  if (index === 1) return <Award size={20} className="lb-rank--silver" />;
  if (index === 2) return <Medal size={20} className="lb-rank--bronze" />;
  return <span className="lb-rank__number">#{index + 1}</span>;
}

export default function LeaderboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('reporters');

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const res = await postsAPI.getLeaderboard();
        setData(res);
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="leaderboard" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Loader size={32} className="spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="leaderboard">
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <AlertCircle size={48} />
          <h3>Failed to load leaderboard</h3>
        </div>
      </div>
    );
  }

  const { topReporters = [], topAuthorities = [] } = data;
  const activeList = activeTab === 'reporters' ? topReporters : topAuthorities;

  return (
    <div className="leaderboard">
      <div className="leaderboard__header">
        <h1>
          <Trophy size={24} /> Community Leaderboard
        </h1>
        <p className="leaderboard__subtitle">Recognizing the most active community members</p>
      </div>

      {/* Tab Switch */}
      <div className="leaderboard__tabs">
        <button
          className={`leaderboard__tab ${activeTab === 'reporters' ? 'leaderboard__tab--active' : ''}`}
          onClick={() => setActiveTab('reporters')}
        >
          <User size={16} /> Top Reporters
        </button>
        <button
          className={`leaderboard__tab ${activeTab === 'authorities' ? 'leaderboard__tab--active' : ''}`}
          onClick={() => setActiveTab('authorities')}
        >
          <Shield size={16} /> Top Authorities
        </button>
      </div>

      {/* Top 3 Podium */}
      {activeList.length >= 3 && (
        <div className="leaderboard__podium">
          {/* 2nd place */}
          <div className="podium-card podium-card--silver">
            <div className="podium-card__rank">
              <Award size={28} />
            </div>
            <div className="podium-card__avatar">
              {activeList[1]?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <h4 className="podium-card__name">{activeList[1]?.name}</h4>
            <span className="podium-card__score">
              {activeTab === 'reporters' ? (
                <><Star size={14} /> {activeList[1]?.issuesReported} issues</>
              ) : (
                <><CheckCircle2 size={14} /> {activeList[1]?.resolved} resolved</>
              )}
            </span>
          </div>

          {/* 1st place */}
          <div className="podium-card podium-card--gold">
            <div className="podium-card__rank">
              <Trophy size={32} />
            </div>
            <div className="podium-card__avatar podium-card__avatar--lg">
              {activeList[0]?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <h4 className="podium-card__name">{activeList[0]?.name}</h4>
            <span className="podium-card__score">
              {activeTab === 'reporters' ? (
                <><Star size={14} /> {activeList[0]?.issuesReported} issues</>
              ) : (
                <><CheckCircle2 size={14} /> {activeList[0]?.resolved} resolved</>
              )}
            </span>
          </div>

          {/* 3rd place */}
          <div className="podium-card podium-card--bronze">
            <div className="podium-card__rank">
              <Medal size={28} />
            </div>
            <div className="podium-card__avatar">
              {activeList[2]?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <h4 className="podium-card__name">{activeList[2]?.name}</h4>
            <span className="podium-card__score">
              {activeTab === 'reporters' ? (
                <><Star size={14} /> {activeList[2]?.issuesReported} issues</>
              ) : (
                <><CheckCircle2 size={14} /> {activeList[2]?.resolved} resolved</>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Full Ranking Table */}
      <div className="leaderboard__table-wrapper">
        <table className="leaderboard__table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Name</th>
              {activeTab === 'reporters' ? (
                <>
                  <th>Issues Reported</th>
                  <th>Total Upvotes</th>
                </>
              ) : (
                <th>Issues Resolved</th>
              )}
            </tr>
          </thead>
          <tbody>
            {activeList.map((entry, i) => (
              <tr key={entry._id} className={i < 3 ? `leaderboard__row--top` : ''}>
                <td className="leaderboard__rank-cell">{getRankIcon(i)}</td>
                <td>
                  <div className="leaderboard__user-cell">
                    <div className="leaderboard__user-avatar">
                      {entry.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <span>{entry.name}</span>
                  </div>
                </td>
                {activeTab === 'reporters' ? (
                  <>
                    <td>
                      <span className="leaderboard__stat-pill">
                        <Star size={14} /> {entry.issuesReported}
                      </span>
                    </td>
                    <td>
                      <span className="leaderboard__stat-pill leaderboard__stat-pill--upvotes">
                        <ArrowUp size={14} /> {entry.totalUpvotes}
                      </span>
                    </td>
                  </>
                ) : (
                  <td>
                    <span className="leaderboard__stat-pill leaderboard__stat-pill--resolved">
                      <CheckCircle2 size={14} /> {entry.resolved}
                    </span>
                  </td>
                )}
              </tr>
            ))}
            {activeList.length === 0 && (
              <tr>
                <td colSpan={activeTab === 'reporters' ? 4 : 3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  No data available yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
