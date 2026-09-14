import { useState } from 'react';
import './TravelForm.css';

function TravelForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    address: '',
    latitude: '',
    longitude: '',
    rating: 5,
    photos: []
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'rating' ? Number(value) : value
    }));
  };

  const handlePhotoChange = (e) => {
    setFormData(prev => ({
      ...prev,
      photos: Array.from(e.target.files)
    }));
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude.toFixed(6),
            longitude: position.coords.longitude.toFixed(6)
          }));
          setLoading(false);
        },
        (error) => {
          alert('获取位置失败：' + error.message);
          setLoading(false);
        }
      );
    } else {
      alert('您的浏览器不支持地理定位');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.latitude || !formData.longitude) {
      alert('请填写标题和位置信息');
      return;
    }

    onSubmit(formData);
    setFormData({
      title: '',
      description: '',
      address: '',
      latitude: '',
      longitude: '',
      rating: 5,
      photos: []
    });
  };

  return (
    <form className="travel-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label>标题 *</label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="例如：巴黎埃菲尔铁塔"
          required
        />
      </div>

      <div className="form-group">
        <label>描述</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="记录你的体验和感受..."
          rows="3"
        />
      </div>

      <div className="form-group">
        <label>地址</label>
        <input
          type="text"
          name="address"
          value={formData.address}
          onChange={handleChange}
          placeholder="地点名称或地址"
        />
      </div>

      <div className="location-group">
        <div className="form-group">
          <label>纬度 *</label>
          <input
            type="number"
            name="latitude"
            value={formData.latitude}
            onChange={handleChange}
            placeholder="Latitude"
            step="0.000001"
            required
          />
        </div>

        <div className="form-group">
          <label>经度 *</label>
          <input
            type="number"
            name="longitude"
            value={formData.longitude}
            onChange={handleChange}
            placeholder="Longitude"
            step="0.000001"
            required
          />
        </div>
      </div>

      <button
        type="button"
        className="btn-get-location"
        onClick={handleGetLocation}
        disabled={loading}
      >
        {loading ? '正在获取...' : '📍 使用当前位置'}
      </button>

      <div className="form-group">
        <label>评分</label>
        <select name="rating" value={formData.rating} onChange={handleChange}>
          <option value={5}>⭐⭐⭐⭐⭐ 5星</option>
          <option value={4}>⭐⭐⭐⭐ 4星</option>
          <option value={3}>⭐⭐⭐ 3星</option>
          <option value={2}>⭐⭐ 2星</option>
          <option value={1}>⭐ 1星</option>
        </select>
      </div>

      <div className="form-group">
        <label>上传照片</label>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handlePhotoChange}
        />
        {formData.photos.length > 0 && (
          <p className="photo-count">已选择 {formData.photos.length} 张照片</p>
        )}
      </div>

      <div className="form-actions">
        <button type="submit" className="btn-submit">保存记录</button>
        <button type="button" className="btn-cancel" onClick={onCancel}>取消</button>
      </div>
    </form>
  );
}

export default TravelForm;
