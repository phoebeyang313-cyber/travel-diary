// 附近「美食 + 美景」：OpenStreetMap Overpass API，免费无需 key

// 多个公共 Overpass 节点轮换，主节点繁忙时自动换下一个
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

const RETRY = { attempts: 3, baseDelay: 600, timeout: 18000 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const FOOD_FILTER = 'node["amenity"~"^(restaurant|cafe|fast_food|bakery|ice_cream|bar|pub)$"]';
const SIGHT_FILTER =
  'node["tourism"~"^(attraction|viewpoint|museum|artwork|gallery|zoo)$"];node["historic"~"^(monument|memorial|castle|ruins)$"];node["leisure"~"^(park|garden|beach_resort|nature_reserve)$"]';

function buildQuery(lat, lon, radius) {
  return `[out:json][timeout:15];
(
  ${FOOD_FILTER}(around:${radius},${lat},${lon});
  ${SIGHT_FILTER}(around:${radius * 2},${lat},${lon});
);
out body 60;`;
}

function classify(tags = {}) {
  const sight =
    ['attraction', 'viewpoint', 'museum', 'artwork', 'gallery', 'zoo'].includes(tags.tourism) ||
    ['monument', 'memorial', 'castle', 'ruins'].includes(tags.historic) ||
    ['park', 'garden', 'beach_resort', 'nature_reserve'].includes(tags.leisure);
  return sight ? 'sight' : 'food';
}

function labelOf(tags = {}) {
  if (tags.cuisine) return tags.cuisine.split(';')[0];
  if (tags.tourism === 'viewpoint') return '观景点';
  if (tags.tourism === 'museum') return '博物馆';
  if (tags.tourism === 'artwork') return '艺术装置';
  if (tags.tourism === 'gallery') return '画廊';
  if (tags.tourism === 'attraction') return '景点';
  if (tags.tourism === 'zoo') return '动物园';
  if (tags.historic === 'monument') return '纪念碑';
  if (tags.historic === 'memorial') return '纪念地';
  if (tags.historic === 'castle') return '城堡';
  if (tags.historic === 'ruins') return '遗迹';
  if (tags.leisure === 'park') return '公园';
  if (tags.leisure === 'garden') return '花园';
  if (tags.leisure === 'beach_resort') return '海滨';
  if (tags.leisure === 'nature_reserve') return '自然保护区';
  if (tags.amenity === 'cafe') return '咖啡';
  if (tags.amenity === 'fast_food') return '快餐';
  if (tags.amenity === 'bakery') return '烘焙';
  if (tags.amenity === 'ice_cream') return '甜品';
  if (tags.amenity === 'bar' || tags.amenity === 'pub') return '酒吧';
  if (tags.amenity === 'restaurant') return '餐厅';
  return '推荐';
}

/** 单次请求：带超时中断，失败直接抛错交给外层重试 */
async function queryOnce(endpoint, body, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      body: 'data=' + encodeURIComponent(body),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    // Overpass 偶发返回 200 + 错误信息体，elements 缺失时视为失败
    if (!data || !Array.isArray(data.elements)) {
      throw new Error(data?.remark || '返回格式异常');
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

/** 拉取附近的美食与景点（自动重试 + 多节点轮换） */
export async function fetchNearby(lat, lon, radius = 1200) {
  const body = buildQuery(lat, lon, radius);
  let lastErr;

  for (let i = 0; i < RETRY.attempts; i++) {
    const endpoint = ENDPOINTS[i % ENDPOINTS.length];
    try {
      const data = await queryOnce(endpoint, body, RETRY.timeout);
      return normalize(data);
    } catch (e) {
      lastErr = e;
      if (i < RETRY.attempts - 1) await sleep(RETRY.baseDelay * 2 ** i);
    }
  }
  console.warn('Overpass 连续失败', lastErr);
  throw new Error('附近推荐暂时取不到，稍后再试');
}

function normalize(data) {
  const items = (data.elements || [])
    .filter((el) => el.tags && el.tags.name)
    .map((el) => ({
      id: `${el.type}/${el.id}`,
      name: el.tags.name,
      category: classify(el.tags),
      label: labelOf(el.tags),
      latitude: el.lat,
      longitude: el.lon,
      cuisine: el.tags.cuisine || '',
      website: el.tags.website || '',
      openingHours: el.tags.opening_hours || '',
    }));

  // 同名去重
  const seen = new Set();
  return items.filter((it) => {
    const k = it.name.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export const CATEGORY_META = {
  food: { icon: '🍽️', text: '美食' },
  sight: { icon: '🏞️', text: '美景' },
};
