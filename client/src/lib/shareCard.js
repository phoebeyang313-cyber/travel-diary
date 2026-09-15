// 朋友圈竖版分享卡片：1080 × 1920，简洁清爽风
// 纯 Canvas 绘制，不依赖第三方库

export const CARD_W = 1080;
export const CARD_H = 1920;

const FONT = "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Arial, sans-serif";

export const CARD_THEMES = {
  light: {
    id: 'light',
    name: '浅色',
    bg: '#ffffff',
    ink: '#15171a',
    sub: '#6b7280',
    faint: '#9ca3af',
    line: '#e8eaed',
    desc: '#374151',
    coverA: '#eef2ff',
    coverB: '#faf5ff',
    coverIcon: '#c7d2fe',
    badgeBg: 'rgba(0,0,0,0.45)',
    badgeFg: '#ffffff',
    star: '#f59e0b',
    starOff: '#e8eaed',
  },
  dark: {
    id: 'dark',
    name: '深色',
    bg: '#15171a',
    ink: '#f4f5f7',
    sub: '#a7b0ba',
    faint: '#7b838d',
    line: '#2b2f36',
    desc: '#d3d8de',
    coverA: '#1d2231',
    coverB: '#2a2039',
    coverIcon: '#5b54d6',
    badgeBg: 'rgba(255,255,255,0.18)',
    badgeFg: '#ffffff',
    star: '#f5b544',
    starOff: '#3a3f47',
  },
  warm: {
    id: 'warm',
    name: '暖调',
    bg: '#fdf8f0',
    ink: '#3b2f24',
    sub: '#8a7460',
    faint: '#b3a08c',
    line: '#eadfd0',
    desc: '#5c4a38',
    coverA: '#fde9d0',
    coverB: '#f7e4e6',
    coverIcon: '#d9a066',
    badgeBg: 'rgba(59,47,36,0.45)',
    badgeFg: '#fdf8f0',
    star: '#e08a1e',
    starOff: '#eadfd0',
  },
};

export const DEFAULT_THEME = 'light';

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(v, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** 按字符换行，兼容中英文混排；超出 maxLines 时末行加省略号 */
function wrapText(ctx, text, maxWidth, maxLines) {
  const lines = [];
  let line = '';
  for (const ch of Array.from(String(text || ''))) {
    if (ch === '\n') {
      lines.push(line);
      line = '';
      continue;
    }
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;

  const out = lines.slice(0, maxLines);
  out[maxLines - 1] = clipTail(ctx, out[maxLines - 1], maxWidth);
  return out;
}

function clipTail(ctx, text, maxWidth) {
  let out = text;
  while (out.length > 1 && ctx.measureText(out + '…').width > maxWidth) {
    out = out.slice(0, -1);
  }
  return out + '…';
}

function drawCover(ctx, img, x, y, w, h) {
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

/**
 * 多图宫格布局：1 张整幅 / 2 张上下 / 3 张上 1 下 2 / 4 张及以上上 1 下 3
 * 总高度与单图一致，文字区布局不受影响
 */
function galleryLayout(n, x, y, w, h, gap) {
  if (n <= 1) return [{ x, y, w, h }];
  if (n === 2) {
    const ch = (h - gap) / 2;
    return [
      { x, y, w, h: ch },
      { x, y: y + ch + gap, w, h: ch },
    ];
  }
  const topH = Math.round(h * 0.62);
  const botH = h - topH - gap;
  const cols = n === 3 ? 2 : 3;
  const cw = (w - gap * (cols - 1)) / cols;
  const cells = [{ x, y, w, h: topH }];
  for (let i = 0; i < cols; i++) {
    cells.push({ x: x + i * (cw + gap), y: y + topH + gap, w: cw, h: botH });
  }
  return cells;
}

/** 画宫格；overflow > 0 时最后一格叠「+N」遮罩 */
function drawGallery(ctx, imgs, x, y, w, h, overflow = 0) {
  const GAP = 6;
  const cells = galleryLayout(imgs.length, x, y, w, h, GAP);

  cells.forEach((c, i) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(c.x, c.y, c.w, c.h);
    ctx.clip();
    if (imgs[i]) drawCover(ctx, imgs[i], c.x, c.y, c.w, c.h);
    ctx.restore();
  });

  if (overflow > 0 && cells.length > 1) {
    const last = cells[cells.length - 1];
    ctx.save();
    ctx.beginPath();
    ctx.rect(last.x, last.y, last.w, last.h);
    ctx.clip();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(last.x, last.y, last.w, last.h);
    ctx.fillStyle = '#fff';
    ctx.font = `600 64px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`+${overflow}`, last.x + last.w / 2, last.y + last.h / 2);
    ctx.restore();
  }
}

function drawStars(ctx, rating, x, y, size = 30, t = CARD_THEMES.light) {
  const filled = Math.round(rating || 0);
  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = t.star;
  ctx.fillText('★'.repeat(filled), x, y);
  ctx.fillStyle = t.starOff;
  ctx.fillText('★'.repeat(Math.max(0, 5 - filled)), x + size * filled, y);
}

/** 用 OSM 瓦片拼一张小地图（带中心标记），失败返回 null */
export async function fetchMapThumb(lat, lon, zoom = 13, w = 972, h = 300) {
  try {
    const n = Math.pow(2, zoom);
    const fx = ((lon + 180) / 360) * n;
    const rad = (lat * Math.PI) / 180;
    const fy = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n;

    const cols = Math.ceil(w / 256) + 1;
    const rows = Math.ceil(h / 256) + 1;
    const baseX = Math.floor(fx) - Math.floor((cols - 1) / 2);
    const baseY = Math.floor(fy) - Math.floor((rows - 1) / 2);

    const canvas = document.createElement('canvas');
    canvas.width = cols * 256;
    canvas.height = rows * 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#eef1f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const jobs = [];
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const url = `https://tile.openstreetmap.org/${zoom}/${baseX + i}/${baseY + j}.png`;
        jobs.push(
          loadImage(url).then((img) => {
            if (img) ctx.drawImage(img, i * 256, j * 256, 256, 256);
          })
        );
      }
    }
    await Promise.all(jobs);

    // 居中裁剪出目标尺寸
    const sx = fx * 256 - baseX * 256 - w / 2;
    const sy = fy * 256 - baseY * 256 - h / 2;
    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const octx = out.getContext('2d');
    octx.drawImage(canvas, Math.max(0, sx), Math.max(0, sy), w, h, 0, 0, w, h);

    // 中心标记
    const cx = w / 2;
    const cy = h / 2;
    octx.beginPath();
    octx.arc(cx, cy, 11, 0, Math.PI * 2);
    octx.fillStyle = '#4f46e5';
    octx.fill();
    octx.lineWidth = 4;
    octx.strokeStyle = '#ffffff';
    octx.stroke();

    return out;
  } catch (e) {
    console.warn('地图缩略图生成失败', e);
    return null;
  }
}

/**
 * 绘制分享卡片
 * @param {object} travel 旅行记录
 * @param {object} opts { photos: [url...] 最多 4 张, mapThumb: canvas|null, photoCount: 实际总张数, theme: 'light'|'dark'|'warm' }
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function renderShareCard(travel, opts = {}) {
  const { photos = [], mapThumb = null } = opts;
  const photoCount = opts.photoCount ?? photos.length;
  const t = CARD_THEMES[opts.theme] || CARD_THEMES[DEFAULT_THEME];

  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');

  // 背景
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // ---- 顶部图片区（1~4 张自动排版，最多取 4 张）----
  const HERO_H = 1080;
  const wanted = Math.min(photos.length, 4);
  const loaded = await Promise.all(photos.slice(0, wanted).map(loadImage));
  const imgs = loaded.filter(Boolean);
  const overflow = Math.max(0, photoCount - imgs.length);

  if (imgs.length) {
    drawGallery(ctx, imgs, 0, 0, CARD_W, HERO_H, overflow);
    // 底部淡出，过渡到文字区（跟随主题底色）
    const grad = ctx.createLinearGradient(0, HERO_H - 260, 0, HERO_H);
    grad.addColorStop(0, hexToRgba(t.bg, 0));
    grad.addColorStop(1, hexToRgba(t.bg, 1));
    ctx.fillStyle = grad;
    ctx.fillRect(0, HERO_H - 260, CARD_W, 260);
  } else {
    // 无照片：柔和渐变封面
    const g = ctx.createLinearGradient(0, 0, CARD_W, HERO_H);
    g.addColorStop(0, t.coverA);
    g.addColorStop(1, t.coverB);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CARD_W, HERO_H);
    ctx.fillStyle = t.coverIcon;
    ctx.font = `200px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🧳', CARD_W / 2, HERO_H / 2);
  }

  // 张数角标
  if (photoCount > 1) {
    const txt = `📷 ${photoCount}`;
    ctx.font = `28px ${FONT}`;
    const tw = ctx.measureText(txt).width;
    const px = CARD_W - 48 - (tw + 40);
    ctx.fillStyle = t.badgeBg;
    roundRect(ctx, px, 48, tw + 40, 56, 28);
    ctx.fill();
    ctx.fillStyle = t.badgeFg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, px + (tw + 40) / 2, 76);
  }

  // ---- 文字区 ----
  const PAD = 76;
  const CONTENT_W = CARD_W - PAD * 2;
  let y = HERO_H - 30;

  // 地点（📍 + 地址）
  const place = travel.address || travel.title;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = `34px ${FONT}`;
  ctx.fillStyle = t.sub;
  const placeLines = wrapText(ctx, `📍 ${place}`, CONTENT_W, 2);
  placeLines.forEach((l) => {
    ctx.fillText(l, PAD, y);
    y += 44;
  });

  y += 16;

  // 标题
  ctx.font = `600 68px ${FONT}`;
  ctx.fillStyle = t.ink;
  const titleLines = wrapText(ctx, travel.title || '未命名地点', CONTENT_W, 2);
  titleLines.forEach((l) => {
    ctx.fillText(l, PAD, y);
    y += 84;
  });

  y += 10;

  // 日期 + 评分
  const dateText = formatCardDate(travel.visitedAt || travel.createdAt);
  ctx.font = `30px ${FONT}`;
  ctx.fillStyle = t.faint;
  ctx.fillText(dateText, PAD, y + 4);

  if (travel.rating) {
    ctx.font = `30px ${FONT}`;
    const dw = ctx.measureText(dateText).width;
    drawStars(ctx, travel.rating, PAD + dw + 28, y + 17, 28, t);
  }
  y += 60;

  // 分隔线
  ctx.fillStyle = t.line;
  ctx.fillRect(PAD, y, CONTENT_W, 2);
  y += 30;

  // 描述（按剩余空间动态决定行数，避免和底部区域重叠）
  const FOOT_TOP = CARD_H - 190;
  const DESC_LH = 56;
  if (travel.description) {
    const room = Math.max(1, Math.floor((FOOT_TOP - 30 - y) / DESC_LH));
    const maxLines = Math.min(6, room);
    ctx.font = `36px ${FONT}`;
    ctx.fillStyle = t.desc;
    const descLines = wrapText(ctx, travel.description, CONTENT_W, maxLines);
    descLines.forEach((l) => {
      ctx.fillText(l, PAD, y);
      y += DESC_LH;
    });
  }

  // ---- 底部：小地图 + 落款 ----
  ctx.fillStyle = t.line;
  ctx.fillRect(PAD, FOOT_TOP, CONTENT_W, 2);

  const MAP_W = 320;
  const MAP_H = 148;
  if (mapThumb) {
    const mx = PAD;
    const my = FOOT_TOP + 26;
    ctx.save();
    roundRect(ctx, mx, my, MAP_W, MAP_H, 16);
    ctx.clip();
    ctx.drawImage(mapThumb, mx, my, MAP_W, MAP_H);
    ctx.restore();
  }

  const tx = PAD + MAP_W + 28;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `26px ${FONT}`;
  ctx.fillStyle = t.faint;
  const coord = `${Number(travel.latitude).toFixed(4)}, ${Number(travel.longitude).toFixed(4)}`;
  ctx.fillText(coord, tx, FOOT_TOP + 62);

  ctx.font = `600 26px ${FONT}`;
  ctx.fillStyle = t.sub;
  ctx.fillText('TRAVEL DIARY · 旅行日记', tx, FOOT_TOP + 112);

  return canvas;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function formatCardDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

export function canvasToBlob(canvas, quality = 0.92) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
  });
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
