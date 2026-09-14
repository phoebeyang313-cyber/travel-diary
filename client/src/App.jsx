import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

import MapView from './components/MapView';
import TravelForm from './components/TravelForm';
import TravelList from './components/TravelList';
import TravelDetail from './components/TravelDetail';
import NearbyPanel from './components/NearbyPanel';
import Toast from './components/Toast';

import { loadTravels, saveTravels, newId, exportBackup, downloadJSON } from './lib/storage';
import { deletePhotos, getPhotoBlob, dataURLToBlob, putPhoto } from './lib/media';
import { getCurrentPosition, reverseGeocode, haversine, formatDistance } from './lib/geo';
import { fetchNearby } from './lib/pois';

const ALERT_MOVE_METERS = 1000; // 移动超过这个距离重新触发提醒
const ALERT_MIN_INTERVAL = 4 * 60 * 1000; // 最短提醒间隔

export default function App() {
  const [travels, setTravels] = useState([]);
  const [view, setView] = useState('list'); // list | form | detail
  const [editing, setEditing] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [tab, setTab] = useState('trips'); // trips | discover
  const [mobilePane, setMobilePane] = useState('panel');
  const [focus, setFocus] = useState(null);

  const [nearby, setNearby] = useState({ items: [], loading: false, error: '', address: '' });
  const [nearbyFilter, setNearbyFilter] = useState('all');
  const [myLocation, setMyLocation] = useState(null);
  const [alertOn, setAlertOn] = useState(false);
  const [toast, setToast] = useState(null);

  const importRef = useRef(null);
  const alertRef = useRef({ lat: null, lng: null, at: 0 });
  const toastTimer = useRef(null);

  // ---- 初始化 ----
  useEffect(() => {
    setTravels(loadTravels());
  }, []);

  const notify = useCallback((t) => {
    setToast(t);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), t?.duration || 4200);
  }, []);

  const persist = useCallback((next) => {
    setTravels(next);
    saveTravels(next);
  }, []);

  const selected = useMemo(
    () => travels.find((t) => t.id === selectedId) || null,
    [travels, selectedId]
  );

  // ---- 附近美食美景 ----
  const runNearby = useCallback(
    async (lat, lon, announce = false) => {
      setNearby((n) => ({ ...n, loading: true, error: '' }));
      try {
        const raw = await fetchNearby(lat, lon);
        const items = raw
          .map((it) => {
            const d = haversine(lat, lon, it.latitude, it.longitude);
            return { ...it, distance: d, distanceText: formatDistance(d) };
          })
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 40);

        let address = '';
        try {
          address = await reverseGeocode(lat, lon);
        } catch {
          address = '';
        }
        setNearby({ items, loading: false, error: '', address });

        if (announce) {
          const foods = items.filter((i) => i.category === 'food').length;
          const sights = items.filter((i) => i.category === 'sight').length;
          if (foods + sights > 0) {
            const place = address ? address.split(',').slice(0, 2).join(',').trim() : '新位置';
            notify({
              message: `到达 ${place} · 附近有 ${foods} 处美食、${sights} 处美景`,
              action: {
                label: '去看看',
                onClick: () => {
                  setTab('discover');
                  setMobilePane('panel');
                  setToast(null);
                },
              },
              duration: 8000,
            });
          }
        }
      } catch (e) {
        setNearby((n) => ({ ...n, loading: false, error: e.message || '获取附近推荐失败' }));
        if (announce) notify({ type: 'error', message: e.message || '获取附近推荐失败' });
      }
    },
    [notify]
  );

  const locateAndDiscover = useCallback(async () => {
    setTab('discover');
    setMobilePane('panel');
    try {
      const pos = await getCurrentPosition();
      setMyLocation(pos);
      setFocus({ latitude: pos.latitude, longitude: pos.longitude, zoom: 15, key: Date.now() });
      await runNearby(pos.latitude, pos.longitude);
    } catch (e) {
      notify({ type: 'error', message: e.message || '定位失败' });
      setNearby((n) => ({ ...n, error: e.message || '定位失败' }));
    }
  }, [notify, runNearby]);

  // ---- 到达提醒：位置变化超过阈值就重新推荐 ----
  useEffect(() => {
    if (!alertOn || !navigator.geolocation) return;
    let watchId = null;

    (async () => {
      try {
        const pos = await getCurrentPosition();
        setMyLocation(pos);
        alertRef.current = { lat: pos.latitude, lng: pos.longitude, at: Date.now() };
        await runNearby(pos.latitude, pos.longitude, true);
      } catch (e) {
        notify({ type: 'error', message: e.message || '无法获取位置，提醒未开启' });
        setAlertOn(false);
        return;
      }

      watchId = navigator.geolocation.watchPosition(
        async (p) => {
          const { latitude, longitude, accuracy } = p.coords;
          setMyLocation({ latitude, longitude, accuracy });
          const a = alertRef.current;
          const moved =
            a.lat == null || haversine(a.lat, a.lng, latitude, longitude) > ALERT_MOVE_METERS;
          const stale = Date.now() - a.at > ALERT_MIN_INTERVAL;
          if (moved || stale) {
            alertRef.current = { lat: latitude, lng: longitude, at: Date.now() };
            await runNearby(latitude, longitude, true);
          }
        },
        () => {},
        { enableHighAccuracy: false, maximumAge: 60000, timeout: 30000 }
      );
    })();

    return () => {
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
    };
  }, [alertOn, notify, runNearby]);

  // ---- 增删改 ----
  const handleSubmit = (data) => {
    if (editing) {
      const next = travels.map((t) =>
        t.id === editing.id ? { ...t, ...data, updatedAt: new Date().toISOString() } : t
      );
      persist(next);
      setView('detail');
      notify({ type: 'success', message: '已保存修改' });
    } else {
      const entry = {
        id: newId(),
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      persist([...travels, entry]);
      setSelectedId(entry.id);
      setView('detail');
      setTab('trips');
      setMobilePane('panel');
      setFocus({ latitude: entry.latitude, longitude: entry.longitude, zoom: 13, key: Date.now() });
      notify({ type: 'success', message: '已添加旅行记录' });
    }
    setEditing(null);
  };

  const handleDelete = (id) => {
    const target = travels.find((t) => t.id === id);
    if (target?.photos?.length) deletePhotos(target.photos.map((p) => p.id));
    persist(travels.filter((t) => t.id !== id));
    setSelectedId(null);
    setView('list');
    notify({ message: '记录已删除' });
  };

  const handleSelect = (t) => {
    setSelectedId(t.id);
    setView('detail');
    setFocus({ latitude: t.latitude, longitude: t.longitude, zoom: 13, key: Date.now() });
  };

  const handleBackup = async () => {
    if (!travels.length) {
      notify({ message: '还没有记录可备份' });
      return;
    }
    try {
      const data = await exportBackup(travels, getPhotoBlob);
      downloadJSON(data, `旅行日记备份_${new Date().toISOString().slice(0, 10)}.json`);
      notify({ type: 'success', message: `已导出 ${travels.length} 条记录（含照片）` });
    } catch (e) {
      notify({ type: 'error', message: '备份失败：' + e.message });
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const list = Array.isArray(data) ? data : data.travels;
      if (!Array.isArray(list)) throw new Error('文件格式不正确');

      let photoCount = 0;
      const restored = [];
      for (const t of list) {
        const photos = [];
        for (const p of t.photos || []) {
          if (p.dataUrl) {
            const id = p.id || `ph_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            const blob = dataURLToBlob(p.dataUrl);
            await putPhoto(id, blob);
            photos.push({ id, name: p.name, size: blob.size });
            photoCount++;
          } else if (p.id) {
            photos.push({ id: p.id, name: p.name });
          }
        }
        restored.push({
          ...t,
          id: t.id || newId(),
          photos,
          createdAt: t.createdAt || new Date().toISOString(),
        });
      }

      const existing = new Set(travels.map((t) => t.id));
      const merged = [...travels, ...restored.filter((t) => !existing.has(t.id))];
      persist(merged);
      notify({
        type: 'success',
        message: `已导入 ${restored.length} 条记录、${photoCount} 张照片`,
      });
    } catch (err) {
      notify({ type: 'error', message: '导入失败：' + err.message });
    }
  };

  const goToMyLocation = async () => {
    try {
      const pos = await getCurrentPosition();
      setMyLocation(pos);
      setFocus({ latitude: pos.latitude, longitude: pos.longitude, zoom: 15, key: Date.now() });
      setMobilePane('map');
    } catch (e) {
      notify({ type: 'error', message: e.message || '定位失败' });
    }
  };

  const switchTab = (next) => {
    setTab(next);
    setMobilePane('panel');
    if (next === 'trips') setView('list');
  };

  const startCreate = () => {
    setEditing(null);
    setView('form');
    setTab('trips');
    setMobilePane('panel');
  };

  return (
    <div className="app">
      <header className="appbar">
        <div className="brand">
          <span className="brand-mark">🧳</span>
          <div>
            <div className="brand-name">旅行日记</div>
            <div className="brand-sub">Travel Diary</div>
          </div>
        </div>

        <div className="appbar-actions">
          <button
            className={`btn btn-ghost ${alertOn ? 'is-on' : ''}`}
            onClick={() => setAlertOn((v) => !v)}
            title="到达新地方时提醒附近的美食与美景"
          >
            {alertOn ? '🔔 提醒中' : '🔕 到达提醒'}
          </button>
          <button className="btn btn-ghost" onClick={() => importRef.current?.click()}>
            导入
          </button>
          <button className="btn btn-ghost" onClick={handleBackup}>
            备份
          </button>
          <button className="btn btn-primary" onClick={startCreate}>
            ＋ 新增
          </button>
        </div>

        <input
          ref={importRef}
          type="file"
          accept="application/json"
          onChange={handleImport}
          hidden
        />
      </header>

      <main className="app-main" data-mobile-pane={mobilePane}>
        <aside className="panel">
          <div className="panel-tabs">
            <button className={tab === 'trips' ? 'on' : ''} onClick={() => switchTab('trips')}>
              我的记录 {travels.length > 0 && <span className="badge">{travels.length}</span>}
            </button>
            <button
              className={tab === 'discover' ? 'on' : ''}
              onClick={() => {
                switchTab('discover');
                if (!nearby.items.length && !nearby.loading) locateAndDiscover();
              }}
            >
              附近发现
            </button>
          </div>

          <div className="panel-body">
            {tab === 'discover' ? (
              <NearbyPanel
                items={nearby.items}
                loading={nearby.loading}
                error={nearby.error}
                address={nearby.address}
                filter={nearbyFilter}
                setFilter={setNearbyFilter}
                onRefresh={locateAndDiscover}
                onPick={(p) => {
                  setMobilePane('map');
                  setFocus({ latitude: p.latitude, longitude: p.longitude, zoom: 16, key: Date.now() });
                }}
              />
            ) : view === 'form' ? (
              <TravelForm
                initial={editing}
                onSubmit={handleSubmit}
                onCancel={() => {
                  setEditing(null);
                  setView(editing ? 'detail' : 'list');
                }}
                onToast={notify}
              />
            ) : view === 'detail' && selected ? (
              <TravelDetail
                travel={selected}
                onEdit={() => {
                  setEditing(selected);
                  setView('form');
                }}
                onDelete={handleDelete}
                onBack={() => {
                  setView('list');
                  setSelectedId(null);
                }}
              />
            ) : (
              <TravelList travels={travels} selectedId={selectedId} onSelect={handleSelect} />
            )}
          </div>
        </aside>

        <section className="map-pane">
          <MapView
            travels={travels}
            selectedId={selectedId}
            onSelectTravel={handleSelect}
            focus={focus}
            pois={nearbyFilter === 'all' ? nearby.items : nearby.items.filter((i) => i.category === nearbyFilter)}
            myLocation={myLocation}
          />

          <div className="map-fabs">
            <button className="fab" onClick={goToMyLocation} title="定位到我的位置">
              🎯
            </button>
            {nearby.items.length > 0 && (
              <button
                className="fab"
                onClick={() => switchTab('discover')}
                title="附近发现"
              >
                🍽️
              </button>
            )}
          </div>
        </section>
      </main>

      <nav className="tabbar">
        <button
          className={mobilePane === 'panel' && tab === 'trips' ? 'on' : ''}
          onClick={() => switchTab('trips')}
        >
          <span>🧳</span>记录
        </button>
        <button className={mobilePane === 'map' ? 'on' : ''} onClick={() => setMobilePane('map')}>
          <span>🗺️</span>地图
        </button>
        <button
          className={mobilePane === 'panel' && tab === 'discover' ? 'on' : ''}
          onClick={() => {
            switchTab('discover');
            if (!nearby.items.length && !nearby.loading) locateAndDiscover();
          }}
        >
          <span>🍽️</span>发现
        </button>
      </nav>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
