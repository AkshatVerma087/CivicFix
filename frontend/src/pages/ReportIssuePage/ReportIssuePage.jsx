import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { postsAPI } from '../../api/posts';
import {
  Camera,
  Video,
  X,
  MapPin,
  Send,
  ArrowLeft,
  AlertTriangle,
  FileText,
  Tag,
  Gauge,
  Loader,
  Navigation
} from 'lucide-react';
import './ReportIssuePage.css';

const CATEGORIES = [
  { value: 'water', label: 'Water', emoji: '💧' },
  { value: 'electricity', label: 'Electricity', emoji: '⚡' },
  { value: 'sanitation', label: 'Sanitation', emoji: '🗑️' },
  { value: 'road', label: 'Road', emoji: '🛣️' },
  { value: 'other', label: 'Other', emoji: '📋' },
];

const SEVERITIES = [
  { value: 'low', label: 'Low', desc: 'Minor inconvenience' },
  { value: 'medium', label: 'Medium', desc: 'Significant problem' },
  { value: 'high', label: 'High', desc: 'Urgent attention needed' },
];

export default function ReportIssuePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    severity: 'medium',
    latitude: '',
    longitude: '',
  });
  const [mediaType, setMediaType] = useState('photos');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewFiles, setPreviewFiles] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const newPreviews = files.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      url: URL.createObjectURL(file),
      type: file.type,
      file, // keep reference to actual File object
    }));
    setSelectedFiles([...selectedFiles, ...files]);
    setPreviewFiles([...previewFiles, ...newPreviews]);
  };

  const removeFile = (id) => {
    const idx = previewFiles.findIndex((f) => f.id === id);
    if (idx !== -1) {
      const newPreviews = previewFiles.filter((f) => f.id !== id);
      const newFiles = [...selectedFiles];
      newFiles.splice(idx, 1);
      setPreviewFiles(newPreviews);
      setSelectedFiles(newFiles);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported by your browser');
      return;
    }

    setLocLoading(true);
    setLocError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));
        setLocLoading(false);
      },
      (err) => {
        let msg = 'Failed to get location';
        if (err.code === 1) msg = 'Location permission denied. Please allow location access.';
        else if (err.code === 2) msg = 'Location unavailable. Please try again.';
        else if (err.code === 3) msg = 'Location request timed out. Please try again.';
        setLocError(msg);
        setLocLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.category) {
      setError('Please select a category');
      return;
    }

    if (selectedFiles.length === 0) {
      setError('Please upload at least one photo or video');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('description', form.description);
      formData.append('category', form.category);
      formData.append('severity', form.severity);

      if (form.latitude && form.longitude) {
        formData.append('location', JSON.stringify({
          latitude: parseFloat(form.latitude),
          longitude: parseFloat(form.longitude),
        }));
      }

      // Append files with correct field name
      selectedFiles.forEach((file) => {
        if (mediaType === 'photos') {
          formData.append('photos', file);
        } else {
          formData.append('videos', file);
        }
      });

      await postsAPI.create(formData);
      setSubmitted(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="report-page">
        <div className="report-success fade-in">
          <div className="report-success__icon">✅</div>
          <h2>Issue Reported Successfully!</h2>
          <p>Your report has been submitted and will be reviewed by the authorities.</p>
          <p className="report-success__redirect">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="report-page">
      <div className="report-page__header">
        <button className="btn btn--ghost" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          Back
        </button>
        <div>
          <h1 className="report-page__title">Report an Issue</h1>
          <p className="report-page__subtitle">Help improve your community by reporting civic issues</p>
        </div>
      </div>

      <form className="report-form" onSubmit={handleSubmit}>
        <div className="report-form__grid">
          {/* Left Column - Main Info */}
          <div className="report-form__main">
            {/* Title */}
            <div className="form-group">
              <label className="form-label">
                <FileText size={15} /> Issue Title
              </label>
              <input
                type="text"
                name="title"
                className="form-input"
                placeholder="Brief title describing the issue"
                value={form.title}
                onChange={handleChange}
                required
              />
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label">
                <AlertTriangle size={15} /> Description
              </label>
              <textarea
                name="description"
                className="form-textarea"
                placeholder="Provide detailed information about the issue, including when it started and how it affects the community..."
                value={form.description}
                onChange={handleChange}
                rows={5}
                required
              />
            </div>

            {/* Category Selection */}
            <div className="form-group">
              <label className="form-label">
                <Tag size={15} /> Category
              </label>
              <div className="report-categories">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    className={`report-cat-btn ${form.category === cat.value ? 'report-cat-btn--active' : ''}`}
                    onClick={() => setForm({ ...form, category: cat.value })}
                  >
                    <span className="report-cat-btn__emoji">{cat.emoji}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Severity */}
            <div className="form-group">
              <label className="form-label">
                <Gauge size={15} /> Severity Level
              </label>
              <div className="report-severities">
                {SEVERITIES.map((sev) => (
                  <button
                    key={sev.value}
                    type="button"
                    className={`report-sev-btn report-sev-btn--${sev.value} ${form.severity === sev.value ? 'report-sev-btn--active' : ''}`}
                    onClick={() => setForm({ ...form, severity: sev.value })}
                  >
                    <span className="report-sev-btn__label">{sev.label}</span>
                    <span className="report-sev-btn__desc">{sev.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Location & Media */}
          <div className="report-form__side">
            {/* Location */}
            <div className="report-section">
              <h3 className="report-section__title">
                <MapPin size={18} /> Location
              </h3>
              <div className="report-location">
                <div className="form-group">
                  <label className="form-label">Latitude</label>
                  <input
                    type="number"
                    name="latitude"
                    className="form-input"
                    placeholder="19.076"
                    value={form.latitude}
                    onChange={handleChange}
                    step="any"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Longitude</label>
                  <input
                    type="number"
                    name="longitude"
                    className="form-input"
                    placeholder="72.8777"
                    value={form.longitude}
                    onChange={handleChange}
                    step="any"
                  />
                </div>
              </div>
              <button type="button" className="btn btn--secondary btn--sm report-location-btn" onClick={handleUseCurrentLocation} disabled={locLoading}>
                {locLoading ? <><Loader size={14} className="spin" /> Getting location...</> : <><Navigation size={14} /> Use Current Location</>}
              </button>
              {locError && <p className="report-loc-error">{locError}</p>}
            </div>

            {/* Media Upload */}
            <div className="report-section">
              <h3 className="report-section__title">
                <Camera size={18} /> Media
              </h3>

              <div className="report-media-toggle">
                <button
                  type="button"
                  className={`report-media-toggle__btn ${mediaType === 'photos' ? 'report-media-toggle__btn--active' : ''}`}
                  onClick={() => { setMediaType('photos'); setPreviewFiles([]); }}
                >
                  <Camera size={16} /> Photos
                </button>
                <button
                  type="button"
                  className={`report-media-toggle__btn ${mediaType === 'videos' ? 'report-media-toggle__btn--active' : ''}`}
                  onClick={() => { setMediaType('videos'); setPreviewFiles([]); }}
                >
                  <Video size={16} /> Video
                </button>
              </div>

              <label className="report-upload-area">
                <input
                  type="file"
                  accept={mediaType === 'photos' ? 'image/*' : 'video/*'}
                  multiple={mediaType === 'photos'}
                  onChange={handleFileChange}
                  className="sr-only"
                />
                <div className="report-upload-area__content">
                  {mediaType === 'photos' ? <Camera size={32} /> : <Video size={32} />}
                  <span>Click to upload {mediaType}</span>
                  <span className="report-upload-area__hint">
                    {mediaType === 'photos'
                      ? 'Upload up to 5 photos (JPEG, PNG)'
                      : 'Upload 1 video (MP4, max 50MB)'}
                  </span>
                </div>
              </label>

              {/* File Previews */}
              {previewFiles.length > 0 && (
                <div className="report-previews">
                  {previewFiles.map((file) => (
                    <div key={file.id} className="report-preview">
                      {file.type.startsWith('image') ? (
                        <img src={file.url} alt={file.name} />
                      ) : (
                        <video src={file.url} />
                      )}
                      <button
                        type="button"
                        className="report-preview__remove"
                        onClick={() => removeFile(file.id)}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit */}
            {error && <p className="report-error">{error}</p>}
            <button type="submit" className="btn btn--primary btn--lg report-submit" disabled={loading}>
              {loading ? <><Loader size={18} className="spin" /> Submitting...</> : <><Send size={18} /> Submit Report</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
