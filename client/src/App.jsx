import { useState, useEffect } from 'react';
import './App.css';
import Map from './components/Map';
import TravelForm from './components/TravelForm';
import TravelList from './components/TravelList';

function App() {
  const [travels, setTravels] = useState([]);
  const [selectedTravel, setSelectedTravel] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('travels');
    if (stored) {
      setTravels(JSON.parse(stored));
    }
  }, []);

  const handleAddTravel = (formData) => {
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

    const updated = [...travels, travelEntry];
    setTravels(updated);
    localStorage.setItem('travels', JSON.stringify(updated));
    setShowForm(false);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🌍 Travel Diary - 旅行日记</h1>
        <p>记录你的旅行足迹，发现本地美食美景</p>
        <p className="status-message">💾 使用浏览器本地存储（在线版本）</p>
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
