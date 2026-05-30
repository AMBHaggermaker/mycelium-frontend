import { Link } from 'react-router-dom';

const BASE = 'https://mycelium.unprecedentedtimes.org';
function resolveUrl(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : `${BASE}${url}`;
}

export default function ProfileCardThumbnail({ profile }) {
  if (!profile) return null;
  const {
    username, display_name, avatar_url, banner_url, banner_color,
    accent_color, background_color, mood_emoji, mood_label,
    status_text, is_verified, founding_member, font_style,
  } = profile;

  const accent = accent_color || '#00ff88';
  const bg     = background_color || '#0d0d1a';

  const fontMap = {
    mystical:   "'Cinzel Decorative', serif",
    modern:     "-apple-system, 'Segoe UI', sans-serif",
    classic:    "'Georgia', serif",
    typewriter: "'Courier New', monospace",
  };
  const fontFamily = fontMap[font_style] || 'inherit';

  const bannerStyle = banner_url
    ? { backgroundImage: `url(${resolveUrl(banner_url)})`, backgroundSize: 'cover', backgroundPosition: 'center top' }
    : { background: banner_color || `linear-gradient(135deg, ${accent}22, ${bg})` };

  return (
    <Link to={`/profile/${username}`} className="pct-card" style={{ '--pct-accent': accent, '--pct-bg': bg }}>
      {/* Top third: banner */}
      <div className="pct-banner" style={bannerStyle} />

      {/* Avatar overlapping banner */}
      <div className="pct-avatar-wrap">
        <div className="pct-avatar">
          {avatar_url
            ? <img src={resolveUrl(avatar_url)} alt={username} />
            : <span>{(display_name || username || '?')[0].toUpperCase()}</span>
          }
        </div>
        {mood_emoji && <span className="pct-mood-emoji">{mood_emoji}</span>}
      </div>

      {/* Bottom two thirds: info */}
      <div className="pct-body" style={{ background: bg }}>
        <div className="pct-name" style={{ fontFamily }}>{display_name || username}</div>
        {mood_label && <div className="pct-mood-label">{mood_label}</div>}
        {status_text && <div className="pct-status">{status_text}</div>}
        <div className="pct-badges">
          {is_verified    && <span className="pct-badge pct-verified" title="Verified">✓</span>}
          {founding_member && <span className="pct-badge pct-founding" title="Founding member">⬡</span>}
        </div>
        <div className="pct-view-link">View Profile</div>
      </div>
    </Link>
  );
}
