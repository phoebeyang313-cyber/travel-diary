import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import Map from './components/Map';
import TravelForm from './components/TravelForm';
import TravelList from './components/TravelList';

function App() {
  const [travels, setTravels] = useState([]);
  const [selectedTravel, setSelectedTravel] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [useLocalStorage, setUseLocalStorage] = useState(true);

  // Fetch all travels on mount
  useEffect(() => {
    fetchTravels();
  }, []);

  const fetchTravels = async () => {
    try {
      // 尝试从 API 获取（如果后端可用）
      const response = await axios.get('/api/travels', { timeout: 2000 });
      setTravels(response.data);
      setUseLocalStorage(false);
    } catch (error) {
      // 使用本地存储作为 fallback
      const stored = localStorage.getItem('travels');
      if (stored) {
        setTravels(JSON.parse(stored));
      }
      setUseLocalStorage(true);
    }
  };

  const handleAddTravel = async (formData) => {
    try {
      const travelEntry = {
        id: `travel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: formData.title,
        description: formData.description,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        address: formData.address,
        rating: formData.rating,
        photos: formData.photos.map((photo, idx) => ({
          id: `photo_${Date.now()}_${idx}`,
          filename: photo.name,
          file_path: URL.createObjectURL(photo)
        })),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (useLocalStorage) {
        // 使用本地存储
        const updated = [...travels, travelEntry];
        setTravels(updated);
        localStorage.setItem('travels', JSON.stringify(updated));
      } else {
        // 尝试使用 API
        try {
          await axios.post('/api/travels', {
            title: formData.title,
            description: formData.description,
            latitude: formData.latitude,
            longitude: formData.longitude,
            address: formData.address,
            rating: formData.rating
          });
          fetchTravels();
        } catch (apiError) {
          // 回退到本地存储
          const updated = [...travels, travelEntry];
          setTravels(updated);
          localStorage.setItem('travels', JSON.stringify(updated));
          setUseLocalStorage(true);
        }
      }

      setShowForm(false);
    } catch (error) {
      console.error('Failed to add travel:', error);
      alert('添加记录失败，请重试');
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🌍 Travel Diary - 旅行日记</h1>
        <p>记录你的旅行足迹，发现本地美食美景</p>
        {useLocalStorage && (
          <p className="status-message">💾 使用本地存储模式（在线版本）</p>
        )}
      </header>

      <div className="app-content">
        <div className="sidebar">
          <button 
            className="btn-add-travel"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? '取消' : '➕ 新增旅行记录'}
          </button>

          {showForm && (
            <TravelForm onSubmit={handleAddTravel} onCancel={() => setShowForm(false)} />
          )}

          <TravelList 
            travels={travels}
            selectedTravel={selectedTravel}
            onSelectTravel={setSelectedTravel}
          />
        </div>

        <div className="map-container">
          <Map travels={travels} selectedTravel={selectedTravel} />
        </div>
      </div>
    </div>
  );
}

export default App;
