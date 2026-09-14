// 附近「美食 + 美景」：OpenStreetMap Overpass API，免费无需 key

const ENDPOINT = 'https://overpass-api.de/api/interpreter';

const FOOD_FILTER = 'node["amenity"~"^(restaurant|cafe|fast_food|bakery|ice_cream|bar|pub)$"]';
const SIGHT_FILTER =
  'node["tourism"~"^(attraction|viewpoint|museum|artwork|gallery|zoo)$"];node["historic"~"^(monument|memorial|castle|ruins)$"];node["leisure"~"^(park|garden|beach_resort|nature_reserve)$"]';

function buildQuery(lat, lon, radius) {
  return `[out:json][timeout:25];
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

/** 拉取附近的美食与景点 */
export async function fetchNearby(lat, lon, radius = 1200) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    body: 'data=' + encodeURIComponent(buildQuery(lat, lon, radius)),
  });
  if (!res.ok) throw new Error('附近推荐服务暂时不可用');
  const data = await res.json();
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
