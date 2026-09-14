# 🌍 Travel Diary - 旅行日记

一个网络应用，用于记录你的旅行足迹、分享照片和发现本地美食美景。

## 功能特性

✨ **核心功能**
- 📸 上传照片和文字描述
- 📍 GPS 定位记录位置
- 🍽️ 智能推荐本地美食和美景
- 🗺️ 交互式地图展示所有旅行足迹
- ⭐ 为每个地点评分

## 项目结构

```
travel-diary/
├── server/              # Express.js 后端
│   ├── index.js        # 服务器入口
│   ├── db.js           # 数据库初始化
│   └── routes/         # API 路由
│       ├── travel.js   # 旅行记录 API
│       └── recommendations.js  # 推荐系统 API
├── client/             # React 前端
│   ├── src/
│   │   ├── App.jsx     # 主应用组件
│   │   └── components/ # React 组件
│   │       ├── Map.jsx
│   │       ├── TravelForm.jsx
│   │       └── TravelList.jsx
│   └── package.json
├── package.json        # 主项目依赖
└── README.md
```

## 快速开始

### 前置要求
- Node.js >= 16
- npm 或 yarn

### 安装依赖

```bash
# 安装服务器依赖
npm install

# 安装客户端依赖
cd client
npm install
cd ..
```

### 配置环境变量

复制 `.env.example` 到 `.env` 并填写相关配置：

```bash
cp .env.example .env
```

```env
PORT=5000
NODE_ENV=development
DATABASE_URL=./database/travel-diary.db
UPLOAD_DIR=./upload
GOOGLE_MAPS_API_KEY=your_api_key_here
GOOGLE_PLACES_API_KEY=your_api_key_here
```

### 启动开发服务器

```bash
# 同时启动后端和前端
npm run dev

# 或分别启动
npm run dev:server  # 后端运行在 http://localhost:5000
npm run dev:client  # 前端运行在 http://localhost:3000
```

## API 文档

### 旅行记录

#### 创建旅行记录
```
POST /api/travels
Body: {
  "title": "标题",
  "description": "描述",
  "latitude": 48.8584,
  "longitude": 2.2945,
  "address": "地址",
  "rating": 5
}
```

#### 获取所有旅行记录
```
GET /api/travels
```

#### 获取单条旅行记录及其照片
```
GET /api/travels/:id
```

#### 上传照片
```
POST /api/travels/:id/photos
Content-Type: multipart/form-data
Form Data: photos[] (文件数组)
```

#### 更新旅行记录
```
PUT /api/travels/:id
Body: {
  "title": "新标题",
  "description": "新描述",
  "rating": 4
}
```

#### 删除旅行记录
```
DELETE /api/travels/:id
```

### 推荐系统

#### 获取某位置的推荐
```
GET /api/recommendations/:travelId
```

#### 生成推荐（基于位置）
```
POST /api/recommendations/:travelId/generate
```

#### 添加自定义推荐
```
POST /api/recommendations
Body: {
  "travelId": "travel_id",
  "name": "推荐名称",
  "type": "restaurant|attraction|cafe",
  "latitude": 48.8584,
  "longitude": 2.2945,
  "rating": 4.5
}
```

## 数据库架构

### travels 表
| 字段 | 类型 | 描述 |
|------|------|------|
| id | TEXT | 主键 UUID |
| title | TEXT | 旅行标题 |
| description | TEXT | 描述 |
| latitude | REAL | 纬度 |
| longitude | REAL | 经度 |
| address | TEXT | 地址 |
| rating | INTEGER | 评分 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### photos 表
| 字段 | 类型 | 描述 |
|------|------|------|
| id | TEXT | 主键 UUID |
| travel_id | TEXT | 外键 |
| filename | TEXT | 文件名 |
| file_path | TEXT | 文件路径 |
| uploaded_at | DATETIME | 上传时间 |

### recommendations 表
| 字段 | 类型 | 描述 |
|------|------|------|
| id | TEXT | 主键 UUID |
| travel_id | TEXT | 外键 |
| name | TEXT | 推荐名称 |
| type | TEXT | 类型 |
| latitude | REAL | 纬度 |
| longitude | REAL | 经度 |
| rating | REAL | 评分 |
| added_at | DATETIME | 添加时间 |

## 技术栈

**后端**
- Express.js - Web 框架
- SQLite3 - 数据库
- Multer - 文件上传

**前端**
- React 18 - UI 框架
- Leaflet - 地图库
- Axios - HTTP 请求
- Vite - 打包工具

## 后续改进计划

- [ ] 用户认证系统
- [ ] 集成 Google Places API 进行实时推荐
- [ ] 地理围栏功能 - 到达地点时自动提醒
- [ ] 照片库和相册管理
- [ ] 社交分享功能
- [ ] 旅行路线规划
- [ ] 离线地图支持
- [ ] 移动应用版本

## 许可证

MIT License - 详见 LICENSE 文件

## 联系方式

有问题或建议？欢迎提交 Issue 或 Pull Request！
