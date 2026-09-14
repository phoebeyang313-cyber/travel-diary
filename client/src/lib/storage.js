// 旅行记录元数据：localStorage 读写 + 备份导入导出

const KEY = 'travel_diary_v2';
const LEGACY_KEY = 'travels';

export function loadTravels() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed.travels) ? parsed.travels : [];
    }
    // 兼容旧版本数据：blob URL 已经失效，只保留文字信息
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const old = JSON.parse(legacy);
      if (Array.isArray(old) && old.length) {
        const migrated = old.map((t) => ({
          id: t.id || `travel_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          title: t.title || '未命名',
          description: t.description || '',
          address: t.address || '',
          latitude: Number(t.latitude) || 0,
          longitude: Number(t.longitude) || 0,
          rating: Number(t.rating) || 5,
          visitedAt: t.created_at || new Date().toISOString(),
          createdAt: t.created_at || new Date().toISOString(),
          updatedAt: t.updated_at || new Date().toISOString(),
          photos: [],
        }));
        saveTravels(migrated);
        return migrated;
      }
    }
  } catch (e) {
    console.warn('读取本地数据失败', e);
  }
  return [];
}

export function saveTravels(travels) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: 2, travels }));
    return true;
  } catch (e) {
    console.warn('保存失败', e);
    return false;
  }
}

export function newId() {
  return `travel_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** 导出备份：把照片转成 base64 一起打包，方便换设备迁移 */
export async function exportBackup(travels, getBlob) {
  const payload = [];
  for (const t of travels) {
    const photos = [];
    for (const p of t.photos || []) {
      const blob = await getBlob(p.id);
      if (!blob) continue;
      const dataUrl = await blobToDataURL(blob);
      photos.push({ ...p, dataUrl });
    }
    payload.push({ ...t, photos });
  }
  return { version: 2, exportedAt: new Date().toISOString(), travels: payload };
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function formatDate(iso, withTime = false) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const opt = { year: 'numeric', month: 'long', day: 'numeric' };
  if (withTime) {
    opt.hour = '2-digit';
    opt.minute = '2-digit';
  }
  return d.toLocaleDateString('zh-CN', opt);
}
