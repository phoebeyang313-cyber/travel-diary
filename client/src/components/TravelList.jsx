import './TravelList.css';
import { formatDate } from '../lib/storage';
import { getPhotoURL } from '../lib/media';
import { useEffect, useState } from 'react';

function Thumb({ photoId, alt }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let alive = true;
    if (!photoId) return;
    getPhotoURL(photoId).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [photoId]);
  if (!url) return <div className="thumb thumb-empty">🖼️</div>;
  return <img className="thumb" src={url} alt={alt} loading="lazy" />;
}

export default function TravelList({ travels, selectedId, onSelect }) {
  if (!travels.length) {
    return (
      <div className="empty">
        <span className="emoji">🧳</span>
        <p>还没有旅行记录</p>
        <small>点击「新增记录」，记下第一个去过的地方</small>
      </div>
    );
  }

  const sorted = [...travels].sort(
    (a, b) => new Date(b.visitedAt || b.createdAt) - new Date(a.visitedAt || a.createdAt)
  );

  return (
    <div className="travel-list">
      {sorted.map((t) => (
        <button
          key={t.id}
          className={`travel-card ${selectedId === t.id ? 'active' : ''}`}
          onClick={() => onSelect(t)}
        >
          <Thumb photoId={t.photos?.[0]?.id} alt={t.title} />
          <div className="tc-body">
            <div className="tc-title">{t.title}</div>
            <div className="tc-meta">
              <span className="tc-date">{formatDate(t.visitedAt || t.createdAt)}</span>
              <span className="tc-rating">{'★'.repeat(t.rating || 0)}</span>
            </div>
            <div className="tc-addr">{t.address || '未填写地址'}</div>
          </div>
          {t.photos?.length > 1 && <span className="tc-count">📷 {t.photos.length}</span>}
        </button>
      ))}
    </div>
  );
}
