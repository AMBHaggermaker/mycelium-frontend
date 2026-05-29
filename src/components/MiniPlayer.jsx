import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { usePlayer } from '../contexts/PlayerContext';

export default function MiniPlayer() {
  const { track, isPlaying, toggle, clearTrack, audioRef } = usePlayer();
  const internalRef = useRef(null);

  // Keep audioRef in sync with internal ref
  useEffect(() => {
    if (audioRef) audioRef.current = internalRef.current;
  }, [audioRef]);

  useEffect(() => {
    const el = internalRef.current;
    if (!el) return;
    if (isPlaying) el.play().catch(() => {});
    else           el.pause();
  }, [isPlaying, track]);

  if (!track) return null;

  function handleEnded() {
    clearTrack();
  }

  return (
    <div className="mini-player">
      <audio
        ref={internalRef}
        src={track.r2_url}
        onEnded={handleEnded}
        style={{ display: 'none' }}
      />
      <div className="mini-player-info">
        <span className="mini-player-title">{track.title}</span>
        <span className="mini-player-maker">
          <Link to={`/makers/${track.username}`} className="mini-player-link">
            {track.maker_name}
          </Link>
        </span>
      </div>
      <div className="mini-player-controls">
        <button className="mini-player-btn" onClick={toggle} aria-label={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        <Link to={`/makers/works/${track.id}`} className="mini-player-detail-link" title="Go to track page">
          ↗
        </Link>
        <button className="mini-player-btn mini-player-close" onClick={clearTrack} aria-label="Close player">
          ✕
        </button>
      </div>
    </div>
  );
}
