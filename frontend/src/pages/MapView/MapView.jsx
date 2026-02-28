import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { postsAPI } from '../../api/posts';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Map as MapIcon,
  Loader,
  AlertCircle,
  Navigation,
  Layers,
} from 'lucide-react';
import './MapView.css';

// Fix default marker icon in Leaflet + Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const STATUS_COLORS = {
  new: '#fdcb6e',
  inProgress: '#74b9ff',
  resolved: '#55efc4',
  pendingResolution: '#f39c12',
};

function makeIcon(status) {
  const color = STATUS_COLORS[status] || '#a29bfe';
  return L.divIcon({
    className: 'map-custom-marker',
    html: `<div style="
      background:${color};
      width:14px;height:14px;border-radius:50%;
      border:3px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

const categoryIcons = { water: '💧', electricity: '⚡', sanitation: '🗑️', road: '🛣️', other: '📋' };

export default function MapView() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [center, setCenter] = useState([20.5937, 78.9629]); // Default India center
  const [zoom, setZoom] = useState(5);
  const [statusFilter, setStatusFilter] = useState('all');
  const mapRef = useRef(null);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const res = await postsAPI.getAll({ limit: 100 });
        const allPosts = res.posts || [];
        setPosts(allPosts);

        // If posts have locations, center on the first one
        const located = allPosts.filter(
          (p) => p.location?.latitude && p.location?.longitude
        );
        if (located.length > 0) {
          setCenter([located[0].location.latitude, located[0].location.longitude]);
          setZoom(12);
        }
      } catch (err) {
        console.error('Failed to fetch posts for map:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPosts();
  }, []);

  const filtered = posts.filter((p) => {
    if (!p.location?.latitude || !p.location?.longitude) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    return true;
  });

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCenter([latitude, longitude]);
        setZoom(14);
        if (mapRef.current) {
          mapRef.current.flyTo([latitude, longitude], 14);
        }
      },
      () => {},
      { enableHighAccuracy: true }
    );
  };

  if (loading) {
    return (
      <div className="map-view" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Loader size={32} className="spin" />
      </div>
    );
  }

  return (
    <div className="map-view">
      <div className="map-view__header">
        <div>
          <h1 className="map-view__title">
            <MapIcon size={24} /> Issue Map
          </h1>
          <p className="map-view__subtitle">{filtered.length} issues with location data</p>
        </div>
        <div className="map-view__controls">
          <button className="btn btn--secondary btn--sm" onClick={handleLocateMe}>
            <Navigation size={14} /> My Location
          </button>
        </div>
      </div>

      {/* Status Filter */}
      <div className="map-view__filters">
        <Layers size={16} />
        {['all', 'new', 'inProgress', 'resolved', 'pendingResolution'].map((s) => (
          <button
            key={s}
            className={`filter-chip ${statusFilter === s ? 'filter-chip--active' : ''}`}
            onClick={() => setStatusFilter(s)}
          >
            {s === 'all'
              ? 'All'
              : s === 'inProgress'
              ? 'In Progress'
              : s === 'pendingResolution'
              ? 'Pending'
              : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="map-view__container">
        <MapContainer
          center={center}
          zoom={zoom}
          className="map-view__leaflet"
          ref={mapRef}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          {filtered.map((post) => (
            <Marker
              key={post._id}
              position={[post.location.latitude, post.location.longitude]}
              icon={makeIcon(post.status)}
            >
              <Popup className="map-popup">
                <div className="map-popup__content">
                  <h4>{post.title}</h4>
                  <div className="map-popup__meta">
                    <span className={`badge badge--${post.status}`}>
                      {post.status === 'inProgress' ? 'In Progress' : post.status}
                    </span>
                    <span className={`badge badge--${post.category}`}>
                      {categoryIcons[post.category]} {post.category}
                    </span>
                  </div>
                  <p className="map-popup__desc">
                    {post.description?.substring(0, 80)}
                    {post.description?.length > 80 ? '...' : ''}
                  </p>
                  <button
                    className="btn btn--primary btn--sm"
                    onClick={() => navigate(`/post/${post._id}`)}
                    style={{ width: '100%', marginTop: 8 }}
                  >
                    View Details
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {filtered.length === 0 && (
          <div className="map-view__empty-overlay">
            <AlertCircle size={32} />
            <p>No issues with location data found</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="map-view__legend">
        <span className="map-view__legend-title">Legend:</span>
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <span key={status} className="map-view__legend-item">
            <span className="map-view__legend-dot" style={{ background: color }} />
            {status === 'inProgress' ? 'In Progress' : status === 'pendingResolution' ? 'Pending' : status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        ))}
      </div>
    </div>
  );
}
