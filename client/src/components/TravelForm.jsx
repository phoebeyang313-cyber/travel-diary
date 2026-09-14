import { useEffect, useRef, useState } from 'react';
import './TravelForm.css';
import { ingestFiles, deletePhotos, getPhotoURL } from '../lib/media';
import { searchPlace, getCurrentPosition, reverseGeocode } from '../lib/geo';

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function TravelForm({ initial, onSubmit, onCancel, onToast }) {
  const isEdit = Boolean(initial);

  const [form, setForm] = useState(() => ({
    title: initial?.title || '',
    description: initial?.description || '',
    address: initial?.address || '',
    latitude: initial?.latitude ?? '',
    longitude: initial?.longitude ?? '',
    rating: initial?.rating || 5,
    visitedAt: initial?.visitedAt ? initial.visitedAt.slice(0, 10) : todayStr(),
  }));

  const [photos, setPhotos] = useState([]);
  const [query, setQuery] = useState('');
  const [suggests, setSuggests] = useState([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showCoords, setShowCoords] = useState(false);
  const [errors, setErrors] = useState({});

  const stagedIds = useRef([]);
  const initialPhotoIds = useRef((initial?.photos || []).map((p) => p.id));
  const suggestTimer = useRef(null);

  // 编辑态：把已有照片读出来预览
  useEffect(() => {
    let alive = true;
    const list = initial?.photos || [];
    if (!list.length) return;
    Promise.all(list.map(async (p) => ({ ...p, url: await getPhotoURL(p.id) }))).then((res) => {
      if (alive) setPhotos(res.filter((p) => p.url));
    });
    return () => {
      alive = false;
    };
  }, [initial?.id]);

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  // ---- 地点搜索（防抖 450ms）----
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSuggests([]);
      return;
    }
    clearTimeout(suggestTimer.current);
    suggestTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchPlace(query.trim());
        setSuggests(res);
      } catch {
        setSuggests([]);
      } finally {
        setSearching(false);
      }
    }, 450);
    return () => clearTimeout(suggestTimer.current);
  }, [query]);

  const pickSuggest = (item) => {
    setForm((prev) => ({
      ...prev,
      latitude: Number(item.latitude.toFixed(6)),
      longitude: Number(item.longitude.toFixed(6)),
      address: item.name,
      title: prev.title || item.shortName,
    }));
    setQuery(item.shortName);
    setSuggests([]);
    setErrors((e) => ({ ...e, latitude: false, longitude: false }));
  };

  const handleLocate = async () => {
    setLocating(true);
    try {
      const pos = await getCurrentPosition();
      set('latitude', Number(pos.latitude.toFixed(6)));
      set('longitude', Number(pos.longitude.toFixed(6)));
      setErrors((e) => ({ ...e, latitude: false, longitude: false }));
      const addr = await reverseGeocode(pos.latitude, pos.longitude);
      if (addr) set('address', addr);
      onToast?.({ type: 'success', message: '已获取当前位置' });
    } catch (e) {
      onToast?.({ type: 'error', message: e.message || '定位失败' });
    } finally {
      setLocating(false);
    }
  };

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setUploading(true);
    try {
      const metas = await ingestFiles(files);
      const withUrl = await Promise.all(
        metas.map(async (m) => ({ ...m, url: await getPhotoURL(m.id) }))
      );
      const usable = withUrl.filter((p) => p.url);
      stagedIds.current.push(...usable.map((p) => p.id));
      setPhotos((prev) => [...prev, ...usable]);
      if (metas.length < files.length) {
        onToast?.({ type: 'error', message: `有 ${files.length - metas.length} 张图片处理失败` });
      }
    } catch (err) {
      onToast?.({ type: 'error', message: '图片处理失败：' + err.message });
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (id) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const handleCancel = () => {
    // 取消时丢弃本次新上传、未保存的照片
    if (stagedIds.current.length) deletePhotos(stagedIds.current);
    onCancel?.();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!form.title.trim()) nextErrors.title = true;
    if (form.latitude === '' || form.longitude === '' || isNaN(Number(form.latitude)))
      nextErrors.coords = true;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      if (nextErrors.coords) setShowCoords(true);
      onToast?.({ type: 'error', message: '请填写标题和位置信息' });
      return;
    }

    const keptIds = photos.map((p) => p.id);
    // 编辑时被移除的旧照片，真正从库中删掉
    const dropped = initialPhotoIds.current.filter((id) => !keptIds.includes(id));
    if (dropped.length) deletePhotos(dropped);

    const visitedAt = new Date(`${form.visitedAt || todayStr()}T12:00:00`).toISOString();

    onSubmit({
      title: form.title.trim(),
      description: form.description.trim(),
      address: form.address.trim(),
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      rating: Number(form.rating),
      visitedAt,
      photos: photos.map(({ id, name, size }) => ({ id, name, size })),
    });
    stagedIds.current = [];
  };

  return (
    <form className="travel-form" onSubmit={handleSubmit}>
      <div className="form-head">
        <h3>{isEdit ? '编辑记录' : '新增旅行记录'}</h3>
        <button type="button" className="btn btn-ghost" onClick={handleCancel}>
          取消
        </button>
      </div>

      <div className="field">
        <label>
          标题<span className="req">*</span>
        </label>
        <input
          className={`input ${errors.title ? 'is-error' : ''}`}
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="例如：京都 · 伏见稻荷大社"
        />
      </div>

      <div className="field suggest-field">
        <label>搜索地点</label>
        <div className="suggest-box">
          <input
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="输入城市 / 景点 / 地址，自动定位坐标"
            autoComplete="off"
          />
          {searching && <span className="suggest-loading spinner" />}
          {suggests.length > 0 && (
            <ul className="suggest-list">
              {suggests.map((s) => (
                <li key={s.id}>
                  <button type="button" onClick={() => pickSuggest(s)}>
                    <span className="s-name">{s.shortName}</span>
                    <span className="s-full">{s.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <button type="button" className="btn btn-soft btn-block" onClick={handleLocate} disabled={locating}>
        {locating ? <span className="spinner" /> : '📍'}
        {locating ? ' 定位中…' : ' 使用我的当前位置'}
      </button>

      <div className="coord-toggle">
        <button type="button" onClick={() => setShowCoords((v) => !v)}>
          {showCoords ? '▾' : '▸'} 经纬度{form.latitude !== '' ? '（已设置）' : '（未设置）'}
        </button>
      </div>

      {showCoords && (
        <div className="row">
          <div className="field">
            <label>纬度</label>
            <input
              className="input"
              type="number"
              step="0.000001"
              value={form.latitude}
              onChange={(e) => set('latitude', e.target.value)}
              placeholder=" Latitude"
            />
          </div>
          <div className="field">
            <label>经度</label>
            <input
              className="input"
              type="number"
              step="0.000001"
              value={form.longitude}
              onChange={(e) => set('longitude', e.target.value)}
              placeholder="Longitude"
            />
          </div>
        </div>
      )}

      <div className="field">
        <label>地址</label>
        <input
          className="input"
          value={form.address}
          onChange={(e) => set('address', e.target.value)}
          placeholder="地点名称或详细地址"
        />
      </div>

      <div className="row">
        <div className="field">
          <label>到访日期</label>
          <input
            className="input"
            type="date"
            value={form.visitedAt}
            onChange={(e) => set('visitedAt', e.target.value)}
          />
        </div>
        <div className="field">
          <label>评分</label>
          <div className="star-picker">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={n <= form.rating ? 'on' : ''}
                onClick={() => set('rating', n)}
                aria-label={`${n} 星`}
              >
                ★
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="field">
        <label>照片</label>
        <label className="photo-drop">
          <input type="file" multiple accept="image/*" onChange={handleFiles} />
          <span>{uploading ? '处理中…' : '＋ 选择照片'}</span>
        </label>
        {photos.length > 0 && (
          <div className="photo-grid">
            {photos.map((p, i) => (
              <div className="photo-cell" key={p.id}>
                <img src={p.url} alt={p.name || `照片 ${i + 1}`} />
                <button type="button" onClick={() => removePhoto(p.id)} aria-label="移除">
                  ×
                </button>
                {i === 0 && <span className="cover-tag">封面</span>}
              </div>
            ))}
          </div>
        )}
        <p className="hint">第一张作为导出卡片的封面图</p>
      </div>

      <div className="field">
        <label>描述</label>
        <textarea
          className="textarea"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="记录你的体验与感受…"
          rows={4}
        />
      </div>

      <div className="form-foot">
        <button type="submit" className="btn btn-primary btn-block" disabled={uploading}>
          {isEdit ? '保存修改' : '保存记录'}
        </button>
      </div>
    </form>
  );
}
