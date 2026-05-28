import { useState, useRef } from 'react';
import { useAuth } from '../auth';
import api from '../api';

const FEEDBACK_TYPES = [
  { value: 'bug_report',         label: 'Bug Report' },
  { value: 'feature_suggestion', label: 'Feature Suggestion' },
  { value: 'content_issue',      label: 'Content Issue' },
  { value: 'general_feedback',   label: 'General Feedback' },
  { value: 'other',              label: 'Other' },
];

export default function FeedbackButton() {
  const { user, token } = useAuth();
  const [open,        setOpen]        = useState(false);
  const [type,        setType]        = useState('general_feedback');
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [screenshot,  setScreenshot]  = useState(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [success,     setSuccess]     = useState(false);
  const [error,       setError]       = useState(null);
  const fileRef = useRef(null);

  function openModal() {
    setOpen(true);
    setSuccess(false);
    setError(null);
  }

  function closeModal() {
    setOpen(false);
    // Reset form after a short delay so closing animation isn't jarring
    setTimeout(() => {
      setType('general_feedback');
      setDescription('');
      setIsAnonymous(false);
      setScreenshot(null);
      setSuccess(false);
      setError(null);
      if (fileRef.current) fileRef.current.value = '';
    }, 200);
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setScreenshot(file);
    } else {
      setScreenshot(null);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (description.trim().length < 20) {
      setError('Description must be at least 20 characters.');
      return;
    }

    const formData = new FormData();
    formData.append('type', type);
    formData.append('description', description.trim());
    formData.append('is_anonymous', isAnonymous ? 'true' : 'false');
    if (screenshot) formData.append('screenshot', screenshot);

    setSubmitting(true);
    try {
      await api.submitFeedback(formData, token || null);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Floating action button */}
      <button
        className="feedback-fab"
        onClick={openModal}
        aria-label="Send feedback"
        title="Send feedback"
      >
        <svg viewBox="0 0 24 24" fill="none" width="22" height="22" aria-hidden="true">
          <path
            d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
            fill="currentColor" opacity=".9"
          />
        </svg>
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="feedback-overlay" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="feedback-modal" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
            {/* Header */}
            <div className="feedback-modal-header">
              <h2 id="feedback-title" className="feedback-modal-title">Send Feedback</h2>
              <button className="btn btn-ghost feedback-modal-close" onClick={closeModal} aria-label="Close">✕</button>
            </div>

            {success ? (
              <div className="feedback-success">
                <div className="feedback-success-icon">&#10003;</div>
                <p className="feedback-success-text">Thank you — your feedback was submitted!</p>
                <button className="btn btn-primary" onClick={closeModal} style={{ marginTop: '1rem' }}>
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="feedback-form">
                {/* Type */}
                <div className="feedback-field">
                  <label className="feedback-label" htmlFor="feedback-type">
                    Type <span className="feedback-required">*</span>
                  </label>
                  <select
                    id="feedback-type"
                    className="form-select"
                    value={type}
                    onChange={e => setType(e.target.value)}
                    required
                  >
                    {FEEDBACK_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div className="feedback-field">
                  <label className="feedback-label" htmlFor="feedback-description">
                    Description <span className="feedback-required">*</span>
                    <span className="feedback-label-hint"> (min 20 characters)</span>
                  </label>
                  <textarea
                    id="feedback-description"
                    className="form-textarea"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Describe the issue, idea, or feedback in detail…"
                    required
                    minLength={20}
                  />
                  {description.length > 0 && description.length < 20 && (
                    <p className="feedback-char-hint">
                      {20 - description.length} more character{20 - description.length !== 1 ? 's' : ''} needed
                    </p>
                  )}
                </div>

                {/* Screenshot */}
                <div className="feedback-field">
                  <label className="feedback-label" htmlFor="feedback-screenshot">
                    Screenshot <span className="feedback-label-hint">(optional, images only)</span>
                  </label>
                  <input
                    id="feedback-screenshot"
                    type="file"
                    accept="image/*"
                    ref={fileRef}
                    onChange={handleFileChange}
                    className="feedback-file-input"
                  />
                  {screenshot && (
                    <p className="feedback-file-name">{screenshot.name}</p>
                  )}
                </div>

                {/* Anonymous toggle */}
                {user && (
                  <label className="feedback-anon-label">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={e => setIsAnonymous(e.target.checked)}
                      className="feedback-anon-checkbox"
                    />
                    <span>Submit anonymously</span>
                  </label>
                )}

                {/* Error */}
                {error && <p className="feedback-error">{error}</p>}

                {/* Footer */}
                <div className="feedback-modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={closeModal} disabled={submitting}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting || description.trim().length < 20}
                  >
                    {submitting ? 'Submitting…' : 'Send Feedback'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
