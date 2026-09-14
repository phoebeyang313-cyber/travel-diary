// 照片处理：压缩 + IndexedDB 持久化
// localStorage 只存元数据，照片二进制放 IndexedDB，避免 5MB 配额爆掉

const DB_NAME = 'travel-diary-media';
const STORE = 'photos';
const DB_VERSION = 1;

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('当前浏览器不支持 IndexedDB'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx(mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    let result;
    try {
      result = fn(store);
    } catch (e) {
      reject(e);
      return;
    }
    t.oncomplete = () => resolve(result && result.result !== undefined ? result.result : result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

/** 把 File 压缩成 JPEG Blob（长边不超过 maxEdge） */
export function compressImage(file, maxEdge = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('图片解析失败：' + file.name));
      img.onload = () => {
        let { width, height } = img;
        const scale = Math.min(1, maxEdge / Math.max(width, height));
        width = Math.round(width * scale);
        height = Math.round(height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        if (canvas.toBlob) {
          canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('图片压缩失败'))),
            'image/jpeg',
            quality
          );
        } else {
          resolve(dataURLToBlob(canvas.toDataURL('image/jpeg', quality)));
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function dataURLToBlob(dataURL) {
  const [head, body] = dataURL.split(',');
  const mime = (head.match(/:(.*?);/) || [])[1] || 'image/jpeg';
  const bin = atob(body);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return new Blob([buf], { type: mime });
}

export async function putPhoto(id, blob) {
  if (!('indexedDB' in window)) return false;
  try {
    await tx('readwrite', (store) => store.put(blob, id));
    return true;
  } catch (e) {
    console.warn('照片写入 IndexedDB 失败', e);
    return false;
  }
}

export async function getPhotoBlob(id) {
  if (!('indexedDB' in window)) return null;
  try {
    const blob = await tx('readonly', (store) => store.get(id));
    return blob || null;
  } catch (e) {
    console.warn('照片读取失败', e);
    return null;
  }
}

export async function deletePhotos(ids = []) {
  if (!('indexedDB' in window)) return;
  try {
    await tx('readwrite', (store) => {
      ids.forEach((id) => store.delete(id));
    });
  } catch (e) {
    console.warn('照片删除失败', e);
  }
}

export async function clearAllPhotos() {
  if (!('indexedDB' in window)) return;
  try {
    await tx('readwrite', (store) => store.clear());
  } catch (e) {
    console.warn('清空照片失败', e);
  }
}

// ---- 内存缓存：同一个 id 复用 objectURL，避免反复创建 ----
const urlCache = new Map();

export async function getPhotoURL(id) {
  if (!id) return null;
  if (urlCache.has(id)) return urlCache.get(id);
  const blob = await getPhotoBlob(id);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urlCache.set(id, url);
  return url;
}

export function peekPhotoURL(id) {
  return urlCache.get(id) || null;
}

export function revokePhotoURL(id) {
  const url = urlCache.get(id);
  if (url) {
    URL.revokeObjectURL(url);
    urlCache.delete(id);
  }
}

/** 上传一批文件：压缩 → 入库，返回 photo 元数据数组 */
export async function ingestFiles(files) {
  const out = [];
  for (const file of files) {
    const id = `ph_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    try {
      const blob = await compressImage(file);
      const ok = await putPhoto(id, blob);
      if (!ok) throw new Error('入库失败');
      out.push({
        id,
        name: file.name,
        width: 0,
        height: 0,
        size: blob.size,
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('跳过无法处理的图片：', file.name, e);
    }
  }
  return out;
}
