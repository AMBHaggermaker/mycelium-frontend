const DOT_COLORS = { online: '#22c55e', busy: '#f59e0b', away: '#9ca3af' };

export default function PresenceDot({ status, size = 10, border = 'var(--card, #fff)', style = {} }) {
  if (!status || status === 'offline' || !DOT_COLORS[status]) return null;
  return (
    <span
      title={status[0].toUpperCase() + status.slice(1)}
      style={{
        display: 'inline-block', flexShrink: 0,
        width: size, height: size,
        borderRadius: '50%',
        background: DOT_COLORS[status],
        border: `2px solid ${border}`,
        verticalAlign: 'middle',
        ...style,
      }}
    />
  );
}
