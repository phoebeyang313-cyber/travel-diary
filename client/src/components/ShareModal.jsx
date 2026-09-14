import './ShareModal.css';

export default function ShareModal({ imageUrl, filename, onDownload, onClose }) {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  return (
    <div className="share-mask" onClick={onClose}>
      <div className="share-box" onClick={(e) => e.stopPropagation()}>
        <div className="share-head">
          <h3>朋友圈卡片已生成</h3>
          <button className="share-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        <div className="share-img-wrap">
          <img src={imageUrl} alt="旅行分享卡片" />
        </div>

        <p className="share-tip">
          {isMobile ? '长按上方图片即可保存到相册' : '点击下方按钮保存到本地'}
        </p>

        <div className="share-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            关闭
          </button>
          <button className="btn btn-primary" onClick={() => onDownload(imageUrl, filename)}>
            保存图片
          </button>
        </div>
      </div>
    </div>
  );
}
