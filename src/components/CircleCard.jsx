import { useNavigate } from 'react-router-dom';

export default function CircleCard({ circle, onJoin, joining }) {
  const navigate = useNavigate();

  return (
    <div className="card circle-card" onClick={() => navigate(`/commons/${circle.id}`)}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '.5rem' }}>
        <h3 className="circle-name">{circle.name}</h3>
        {circle.is_private && <span className="badge badge-gray">Private</span>}
      </div>

      {circle.description && <p className="circle-desc">{circle.description}</p>}

      <div className="circle-footer">
        <span className="circle-meta">
          {circle.member_count ?? 0} member{circle.member_count !== 1 ? 's' : ''}
          {circle.creator_username && ` · by ${circle.creator_username}`}
        </span>
        {onJoin && !circle.is_private && (
          <button
            className="btn btn-outline btn-sm"
            disabled={joining}
            onClick={e => { e.stopPropagation(); onJoin(circle.id); }}
          >
            {joining ? '…' : 'Join'}
          </button>
        )}
      </div>
    </div>
  );
}
