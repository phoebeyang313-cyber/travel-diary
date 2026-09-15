import { useEffect, useState } from 'react';
import './TravelDetail.css';
import { formatDate } from '../lib/storage';
import { getPhotoURL } from '../lib/media';
import { renderShareCard, canvasToBlob, fetchMapThumb } from '../lib/shareCard';
import ShareModal from './ShareModal';

export default function TravelDetail({ travel, onEdit, onDelete, onBack }) {
  const [gallery, setGallery] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [share, setShare] = useState(null);

  const loadGallery = async () => {
    const ids = (travel.photos || []).map((p) => p.id);
    if (!ids.length) return;
    const urls = await Promise.all(ids.map((id) => getPhotoURL(id)));
    const list = urls.filter(Boolean);
    if (list.length) setGallery(list);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      // 卡片最多排 4 张，没必要把全部原图读进内存
      const all = travel.photos || [];
      const ids = all.slice(0, 4).map((p) => p.id);
      const urls = ids.length ? await Promise.all(ids.map((id) => getPhotoURL(id))) : [];
      const photos = urls.filter(Boolean);
      const mapThumb = await fetchMapThumb(travel.latitude, travel.longitude);
      const canvas = await renderShareCard(travel, { photos, mapThumb, photoCount: all.length });
      const blob = await canvasToBlob(canvas);
      const date = (travel.visitedAt || travel.createdAt || '').slice(0, 10);
      setShare({
        url: URL.createObjectURL(blob),
        filename: `旅行日记_${travel.title}_${date}.jpg`.replace(/[\\/:*?"<>|]/g, ''),
      });
    } catch (e) {
      console.error(e);
      alert('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="travel-detail">
      <div className="detail-head">
        <button className="btn btn-ghost" onClick={onBack}>
          ← 返回
        </button>
        <div className="detail-actions">
          <button className="btn btn-ghost" onClick={onEdit}>
            编辑
          </button>
          <button
            className="btn btn-danger"
            onClick={() => {
              if (window.confirm(`确定删除「${travel.title}」？删除后不可恢复。`)) onDelete(travel.id);
            }}
          >
            删除
          </button>
        </div>
      </div>

      {travel.photos?.length > 0 && (
        <div className="detail-photos">
          <button className="dp-main" onClick={loadGallery}>
            <Photo id={travel.photos[0].id} alt={travel.title} />
            {travel.photos.length > 1 && <span className="dp-more">共 {travel.photos.length} 张</span>}
          </button>
          <div className="dp-sub">
            {travel.photos.slice(1, 4).map((p) => (
              <button key={p.id} onClick={loadGallery}>
                <Photo id={p.id} alt="" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="detail-body">
        <h2>{travel.title}</h2>

        <div className="detail-line">
          <span className="dl-rating">{'★'.repeat(travel.rating || 0)}</span>
          <span className="dl-date">{formatDate(travel.visitedAt || travel.createdAt)}</span>
        </div>

        <div className="detail-addr">📍 {travel.address || '未填写地址'}</div>

        <div className="detail-coord">
          {Number(travel.latitude).toFixed(5)}, {Number(travel.longitude).toFixed(5)}
        </div>

        {travel.description && <p className="detail-desc">{travel.description}</p>}
      </div>

      <div className="detail-export">
        <button className="btn btn-primary btn-block" onClick={handleExport} disabled={exporting}>
          {exporting ? <span className="spinner" /> : '🖼️'}
          {exporting ? ' 正在生成…' : ' 导出朋友圈卡片（1080×1920）'}
        </button>
        <p className="hint">竖版卡片：封面图 + 地点 + 日期 + 描述 + 小地图</p>
      </div>

      {gallery && (
        <div className="lightbox" onClick={() => setGallery(null)}>
          <button className="lb-close" onClick={() => setGallery(null)}>
            ×
          </button>
          {gallery.map((u, i) => (
            <img key={i} src={u} alt={`照片 ${i + 1}`} />
          ))}
        </div>
      )}

      {share && (
        <ShareModal
          imageUrl={share.url}
          filename={share.filename}
          onDownload={(blobUrl) => {
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = share.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }}
          onClose={() => {
            URL.revokeObjectURL(share.url);
            setShare(null);
          }}
        />
      )}
    </div>
  );
}

function Photo({ id, alt }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let alive = true;
    if (!id) return;
    getPhotoURL(id).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [id]);
  if (!url) return <div className="ph-skeleton" />;
  return <img src={url} alt={alt} />;
}
