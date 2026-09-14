# 旅行日记 · Travel Diary

记录旅行足迹：上传照片与文字、自动定位、发现附近美食美景，一键导出朋友圈竖版卡片。

在线地址：https://travel-diary-sable.vercel.app/

## 功能

| 功能 | 说明 |
| --- | --- |
| 旅行记录 | 标题、地点、到访日期、评分、描述，支持新增 / 编辑 / 删除 |
| 照片 | 多图上传，自动压缩后存入浏览器 IndexedDB，刷新不丢失 |
| 地图 | Leaflet + OpenStreetMap，标记全部足迹，点击定位 |
| 地点搜索 | 输入地名自动填坐标与地址（Nominatim） |
| 附近发现 | 按当前位置推荐美食与景点（Overpass API），分「美食 / 美景」两类 |
| 到达提醒 | 开启后位置移动超过 1 km 自动推送附近的美食与美景 |
| 朋友圈卡片 | 导出 1080×1920 竖版图片：封面图 + 地点 + 日期 + 描述 + 评分 + 小地图 |
| 数据备份 | JSON 导出 / 导入（含照片），换设备可迁移 |

## 本地开发

```bash
cd client
npm install
npm run dev      # http://localhost:3000
npm run build    # 产物在 client/dist
```

## 技术栈

React 18 + Vite 5 · Leaflet / react-leaflet · IndexedDB · Canvas

第三方数据：OpenStreetMap（地图瓦片、地点搜索）、Overpass API（POI）。全部免费、无需 API Key。

## 部署

仓库已配置 `vercel.json`，推送到 `main` 分支后 Vercel 自动构建部署。

## 说明

数据保存在浏览器本地（元数据在 localStorage，照片在 IndexedDB），不上传服务器。
换浏览器或清理缓存前，请先用「备份」导出 JSON。
