// 地理能力：浏览器定位、距离计算、地名搜索（Nominatim）、坐标反查地址

export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(m) {
  if (m == null) return '';
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`;
}

export function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('浏览器不支持定位'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) => {
        const map = {
          1: '定位权限被拒绝，请在浏览器地址栏允许定位',
          2: '暂时无法获取位置，请稍后再试',
          3: '定位超时，请检查网络或 GPS',
        };
        reject(new Error(map[err.code] || '定位失败'));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000, ...options }
    );
  });
}

/** 地名 → 候选坐标列表（OpenStreetMap Nominatim，免费、无需 key） */
export async function searchPlace(query, limit = 6) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('q', query);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('accept-language', 'zh-CN,zh,en');

  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('地点搜索服务暂时不可用');
  const data = await res.json();
  return data.map((item) => ({
    id: item.place_id,
    name: item.display_name,
    shortName: item.display_name.split(',').slice(0, 2).join(',').trim(),
    latitude: parseFloat(item.lat),
    longitude: parseFloat(item.lon),
    type: item.type,
  }));
}

/** 坐标 → 地址文字 */
export async function reverseGeocode(lat, lon) {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lon));
    url.searchParams.set('accept-language', 'zh-CN,zh,en');
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return '';
    const data = await res.json();
    return data.display_name || data.name || '';
  } catch (e) {
    console.warn('反查地址失败', e);
    return '';
  }
}
