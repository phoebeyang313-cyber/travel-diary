import './NearbyPanel.css';
import { CATEGORY_META } from '../lib/pois';

export default function NearbyPanel({
  items = [],
  loading,
  error,
  address,
  filter,
  setFilter,
  onRefresh,
  onPick,
}) {
  const foods = items.filter((i) => i.category === 'food');
  const sights = items.filter((i) => i.category === 'sight');
  const shown = filter === 'all' ? items : items.filter((i) => i.category === filter);

  return (
    <div className="nearby">
      <div className="nb-head">
        <div>
          <div className="nb-title">附近发现</div>
          <div className="nb-addr">{address || '尚未定位'}</div>
        </div>
        <button className="btn btn-ghost" onClick={onRefresh} disabled={loading}>
          {loading ? <span className="spinner" /> : '重新定位'}
        </button>
      </div>

      <div className="nb-tabs">
        <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>
          全部 {items.length}
        </button>
        <button className={filter === 'food' ? 'on' : ''} onClick={() => setFilter('food')}>
          🍽️ 美食 {foods.length}
        </button>
        <button className={filter === 'sight' ? 'on' : ''} onClick={() => setFilter('sight')}>
          🏞️ 美景 {sights.length}
        </button>
      </div>

      {error && <div className="nb-state error">{error}</div>}

      {!error && loading && (
        <div className="nb-state">
          <span className="spinner" /> 正在寻找附近的美食与美景…
        </div>
      )}

      {!error && !loading && shown.length === 0 && (
        <div className="empty">
          <span className="emoji">🔍</span>
          <p>附近暂无结果</p>
          <small>换个位置再试试，或扩大搜索范围</small>
        </div>
      )}

      {!loading && (
        <div className="nb-list">
          {shown.map((p) => {
            const meta = CATEGORY_META[p.category] || CATEGORY_META.food;
            return (
              <button key={p.id} className="nb-item" onClick={() => onPick?.(p)}>
                <span className="nb-emoji">{meta.icon}</span>
                <span className="nb-body">
                  <span className="nb-name">{p.name}</span>
                  <span className="nb-sub">
                    {p.label}
                    {p.distanceText ? ` · ${p.distanceText}` : ''}
                  </span>
                  {p.openingHours && <span className="nb-sub dim">🕒 {p.openingHours}</span>}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <p className="nb-source">数据来源：OpenStreetMap · Overpass API</p>
    </div>
  );
}
