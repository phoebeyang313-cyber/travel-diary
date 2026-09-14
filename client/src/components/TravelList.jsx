import './TravelList.css';

function TravelList({ travels, selectedTravel, onSelectTravel }) {
  return (
    <div className="travel-list">
      {travels.length === 0 ? (
        <div className="empty-state">
          <p>还没有旅行记录</p>
          <small>添加第一条记录开始你的旅行日记</small>
        </div>
      ) : (
        travels.map(travel => (
          <div
            key={travel.id}
            className={`travel-item ${selectedTravel?.id === travel.id ? 'active' : ''}`}
            onClick={() => onSelectTravel(travel)}
          >
            <div className="travel-item-header">
              <h4>{travel.title}</h4>
              <span className="rating">⭐ {travel.rating}</span>
            </div>
            
            {travel.description && (
              <p className="description">{travel.description}</p>
            )}
            
            <p className="address">📍 {travel.address || `${travel.latitude.toFixed(4)}, ${travel.longitude.toFixed(4)}`}</p>
            
            <p className="date">
              {new Date(travel.created_at).toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </p>
          </div>
        ))
      )}
    </div>
  );
}

export default TravelList;
