# 声形绘 API 接口文档

> 本文档是后端实现的唯一依据。所有请求/响应的字段名、类型、示例必须严格按本文档实现。
> 适用对象：后端开发者、AI 实现模型。禁止自行新增/修改/删除接口。

---

## 通用规范

### Base URL
- 开发环境：`http://localhost:3000`
- 生产环境：通过环境变量 `API_URL` 配置

### 请求格式
- `Content-Type: application/json`（除文件上传外）
- 文件上传：`Content-Type: multipart/form-data`
- 字符集：UTF-8

### 认证方式
- 需认证的接口：请求头携带 `Authorization: Bearer <token>`
- Token 由 `/api/auth/login` 或 `/api/auth/register` 返回
- Token 有效期：7 天

### 响应格式

**成功响应（HTTP 2xx）**
```json
{
  "code": 0,
  "data": { ... }
}
```

**失败响应（HTTP 4xx/5xx）**
```json
{
  "code": "ERROR_CODE",
  "message": "用户可读的中文消息",
  "details": {}  // 可选
}
```

### 分页规范
- 查询参数：`?page=1&pageSize=20`（page 从 1 开始）
- 响应结构：
```json
{
  "code": 0,
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

### 限流
- 全局：每 IP 每分钟 60 次
- 认证接口（login/register）：每 IP 每分钟 5 次
- 超限返回 429 + `RATE_LIMITED`

---

## 一、认证模块

### 1.1 注册

`POST /api/auth/register`

**请求体**
```json
{
  "email": "user@example.com",
  "password": "MyPass123",
  "nickname": "小明"
}
```

**字段约束**
| 字段 | 类型 | 必填 | 约束 |
|------|------|------|------|
| email | string | 是 | 合法邮箱格式，最长 255 |
| password | string | 是 | 8-32 位，至少含字母+数字 |
| nickname | string | 是 | 1-20 字符 |

**成功响应（200）**
```json
{
  "code": 0,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "nickname": "小明",
      "createdAt": "2026-06-28T10:00:00Z"
    }
  }
}
```

**失败响应**
| HTTP | code | 场景 |
|------|------|------|
| 400 | VALIDATION_ERROR | 字段不合法 |
| 409 | CONFLICT | 邮箱已注册 |

---

### 1.2 登录

`POST /api/auth/login`

**请求体**
```json
{
  "email": "user@example.com",
  "password": "MyPass123"
}
```

**成功响应（200）**
```json
{
  "code": 0,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "nickname": "小明",
      "createdAt": "2026-06-28T10:00:00Z"
    }
  }
}
```

**失败响应**
| HTTP | code | 场景 |
|------|------|------|
| 400 | VALIDATION_ERROR | 字段缺失 |
| 401 | AUTH_INVALID_CREDENTIALS | 邮箱或密码错误 |

---

### 1.3 获取当前用户

`GET /api/auth/me`

**请求头**
```
Authorization: Bearer <token>
```

**成功响应（200）**
```json
{
  "code": 0,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "nickname": "小明",
    "createdAt": "2026-06-28T10:00:00Z"
  }
}
```

**失败响应**
| HTTP | code | 场景 |
|------|------|------|
| 401 | AUTH_TOKEN_MISSING | 无 Token |
| 401 | AUTH_TOKEN_INVALID | Token 无效/过期 |

---

## 二、演奏记录模块

### 2.1 查询演奏记录

`GET /api/records?page=1&pageSize=20`

**请求头**
```
Authorization: Bearer <token>
```

**查询参数**
| 参数 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| page | number | 否 | 1 | 页码 |
| pageSize | number | 否 | 20 | 每页条数（最大 50） |

**成功响应（200）**
```json
{
  "code": 0,
  "data": {
    "items": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "userId": "550e8400-e29b-41d4-a716-446655440000",
        "instrument": "piano",
        "notesPlayed": [
          { "note": "C4", "timestamp": 0 },
          { "note": "D4", "timestamp": 500 },
          { "note": "E4", "timestamp": 1000 }
        ],
        "durationSec": 30,
        "createdAt": "2026-06-28T14:30:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 20
  }
}
```

---

### 2.2 创建演奏记录

`POST /api/records`

**请求头**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**
```json
{
  "instrument": "piano",
  "notesPlayed": [
    { "note": "C4", "timestamp": 0 },
    { "note": "D4", "timestamp": 500 }
  ],
  "durationSec": 30
}
```

**字段约束**
| 字段 | 类型 | 必填 | 约束 |
|------|------|------|------|
| instrument | string | 是 | 枚举：piano/guitar/violin/flute/drums |
| notesPlayed | array | 否 | 最长 1000 条 |
| durationSec | number | 是 | 1-3600 |

**成功响应（201）**
```json
{
  "code": 0,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "instrument": "piano",
    "notesPlayed": [...],
    "durationSec": 30,
    "createdAt": "2026-06-28T14:30:00Z"
  }
}
```

---

### 2.3 删除演奏记录

`DELETE /api/records/:id`

**请求头**
```
Authorization: Bearer <token>
```

**成功响应（200）**
```json
{
  "code": 0,
  "data": { "id": "660e8400-..." }
}
```

**失败响应**
| HTTP | code | 场景 |
|------|------|------|
| 404 | NOT_FOUND | 记录不存在或不属于当前用户 |

---

## 三、调音记录模块

### 3.1 查询调音记录

`GET /api/tunings?page=1&pageSize=20`

**成功响应（200）**
```json
{
  "code": 0,
  "data": {
    "items": [
      {
        "id": "770e8400-e29b-41d4-a716-446655440002",
        "userId": "550e8400-...",
        "instrument": "guitar",
        "targetNote": "E2",
        "measuredFreq": 82.35,
        "deviationCents": -3.2,
        "createdAt": "2026-06-28T15:00:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 20
  }
}
```

---

### 3.2 创建调音记录

`POST /api/tunings`

**请求体**
```json
{
  "instrument": "guitar",
  "targetNote": "E2",
  "measuredFreq": 82.35,
  "deviationCents": -3.2
}
```

**字段约束**
| 字段 | 类型 | 必填 | 约束 |
|------|------|------|------|
| instrument | string | 是 | 枚举：guitar/violin |
| targetNote | string | 是 | 如 "E2"、"A4" |
| measuredFreq | number | 是 | 20-2000 |
| deviationCents | number | 是 | -50 到 50 |

**成功响应（201）**
```json
{
  "code": 0,
  "data": {
    "id": "770e8400-...",
    "createdAt": "2026-06-28T15:00:00Z"
  }
}
```

---

### 3.3 删除调音记录

`DELETE /api/tunings/:id`

同 2.3 模式。

---

## 四、键位布局模块

### 4.1 查询自定义布局

`GET /api/layouts?page=1&pageSize=20`

**成功响应（200）**
```json
{
  "code": 0,
  "data": {
    "items": [
      {
        "id": "880e8400-...",
        "userId": "550e8400-...",
        "name": "我的钢琴布局",
        "instrument": "piano",
        "shapes": [
          {
            "type": "rect",
            "bounds": { "x": 0.1, "y": 0.4, "width": 0.1, "height": 0.2 }
          }
        ],
        "createdAt": "2026-06-28T16:00:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 20
  }
}
```

---

### 4.2 保存自定义布局

`POST /api/layouts`

**请求体**
```json
{
  "name": "我的钢琴布局",
  "instrument": "piano",
  "shapes": [
    {
      "type": "rect",
      "bounds": { "x": 0.1, "y": 0.4, "width": 0.1, "height": 0.2 }
    }
  ]
}
```

**字段约束**
| 字段 | 类型 | 必填 | 约束 |
|------|------|------|------|
| name | string | 是 | 1-50 字符 |
| instrument | string | 是 | 枚举 |
| shapes | array | 是 | 1-20 个形状 |

**成功响应（201）**
```json
{
  "code": 0,
  "data": {
    "id": "880e8400-...",
    "createdAt": "2026-06-28T16:00:00Z"
  }
}
```

---

### 4.3 删除布局

`DELETE /api/layouts/:id`

同 2.3 模式。

---

## 五、曲库模块

### 5.1 获取曲库列表

`GET /api/songs?instrument=piano&difficulty=1`

**查询参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| instrument | string | 否 | 筛选乐器 |
| difficulty | number | 否 | 筛选难度 1-5 |

**成功响应（200）**
```json
{
  "code": 0,
  "data": {
    "items": [
      {
        "id": "twinkle",
        "title": "小星星",
        "artist": "传统民谣",
        "instrument": "piano",
        "difficulty": 1,
        "bpm": 80,
        "durationSec": 30,
        "coverImage": "/covers/twinkle.png"
      }
    ],
    "total": 10
  }
}
```

---

### 5.2 获取单曲详情

`GET /api/songs/:id`

**成功响应（200）**
```json
{
  "code": 0,
  "data": {
    "id": "twinkle",
    "title": "小星星",
    "artist": "传统民谣",
    "instrument": "piano",
    "difficulty": 1,
    "bpm": 80,
    "durationSec": 30,
    "coverImage": "/covers/twinkle.png",
    "notes": [
      { "note": "C4", "startTime": 0, "duration": 500 },
      { "note": "C4", "startTime": 500, "duration": 500 },
      { "note": "G4", "startTime": 1000, "duration": 500 },
      { "note": "G4", "startTime": 1500, "duration": 500 },
      { "note": "A4", "startTime": 2000, "duration": 500 },
      { "note": "A4", "startTime": 2500, "duration": 500 },
      { "note": "G4", "startTime": 3000, "duration": 1000 }
    ]
  }
}
```

**失败响应**
| HTTP | code | 场景 |
|------|------|------|
| 404 | NOT_FOUND | 曲目不存在 |

---

## 六、分享视频模块

### 6.1 上传演奏视频

`POST /api/clips`

**请求头**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**表单字段**
| 字段 | 类型 | 必填 | 约束 |
|------|------|------|------|
| video | file | 是 | webm/mp4，最大 20MB |
| instrument | string | 是 | 枚举 |
| durationSec | number | 是 | 1-60 |

**成功响应（201）**
```json
{
  "code": 0,
  "data": {
    "id": "990e8400-...",
    "videoUrl": "https://storage.supabase.co/clips/990e8400.webm",
    "thumbnailUrl": "https://storage.supabase.co/clips/990e8400.jpg",
    "createdAt": "2026-06-28T17:00:00Z"
  }
}
```

**失败响应**
| HTTP | code | 场景 |
|------|------|------|
| 400 | VALIDATION_ERROR | 文件格式/大小不符 |
| 413 | FILE_TOO_LARGE | 超过 20MB |

---

### 6.2 获取分享视频

`GET /api/clips/:id`

**无需认证**

**成功响应（200）**
```json
{
  "code": 0,
  "data": {
    "id": "990e8400-...",
    "userId": "550e8400-...",
    "nickname": "小明",
    "instrument": "piano",
    "durationSec": 30,
    "videoUrl": "https://storage.supabase.co/clips/990e8400.webm",
    "thumbnailUrl": "https://storage.supabase.co/clips/990e8400.jpg",
    "createdAt": "2026-06-28T17:00:00Z"
  }
}
```

---

### 6.3 查询自己的视频

`GET /api/clips?page=1&pageSize=20`

**需认证**

**成功响应（200）**
```json
{
  "code": 0,
  "data": {
    "items": [...],
    "total": 5,
    "page": 1,
    "pageSize": 20
  }
}
```

---

### 6.4 删除视频

`DELETE /api/clips/:id`

**需认证**，只能删除自己的视频。

---

## 七、挑战模块

### 7.1 获取今日挑战

`GET /api/challenge/today`

**无需认证**

**成功响应（200）**
```json
{
  "code": 0,
  "data": {
    "date": "2026-06-28",
    "song": {
      "id": "twinkle",
      "title": "小星星",
      "instrument": "piano",
      "difficulty": 1,
      "bpm": 80,
      "notes": [...]
    }
  }
}
```

**说明**
- 挑战曲目按日期轮换，规则：`songs[date.getDate() % songs.length]`
- 当天固定，所有用户相同

---

### 7.2 提交挑战成绩

`POST /api/challenge/submit`

**请求头**
```
Authorization: Bearer <token>
```

**请求体**
```json
{
  "date": "2026-06-28",
  "correctCount": 45,
  "totalCount": 50,
  "maxCombo": 20,
  "durationSec": 30
}
```

**字段约束**
| 字段 | 类型 | 必填 | 约束 |
|------|------|------|------|
| date | string | 是 | YYYY-MM-DD |
| correctCount | number | 是 | 0-totalCount |
| totalCount | number | 是 | >0 |
| maxCombo | number | 是 | >=0 |
| durationSec | number | 是 | 1-300 |

**后端计算分数（固定公式）**
```
accuracy = correctCount / totalCount
score = round(accuracy * 100) + floor(maxCombo / 10) * 5
```

**成功响应（201）**
```json
{
  "code": 0,
  "data": {
    "id": "aa0e8400-...",
    "score": 95,
    "rank": 3,
    "isBest": true
  }
}
```

**说明**
- `isBest`：是否为当日个人最高分（是则更新排行榜，否则不更新）
- `rank`：当日排行榜名次（若 isBest=false，返回历史最高分的名次）

---

### 7.3 获取排行榜

`GET /api/challenge/leaderboard?date=2026-06-28`

**查询参数**
| 参数 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| date | string | 否 | 今天 | YYYY-MM-DD |

**成功响应（200）**
```json
{
  "code": 0,
  "data": {
    "date": "2026-06-28",
    "songTitle": "小星星",
    "leaderboard": [
      { "rank": 1, "userId": "xxx", "nickname": "小明", "score": 98, "maxCombo": 30 },
      { "rank": 2, "userId": "yyy", "nickname": "小红", "score": 95, "maxCombo": 20 }
    ]
  }
}
```

**说明**
- 只返回前 100 名
- 同分按提交时间排序（早的在前）

---

## 八、错误码完整表

| HTTP | code | message | 触发场景 |
|------|------|---------|---------|
| 400 | VALIDATION_ERROR | 请求参数错误 | 字段校验失败 |
| 401 | AUTH_TOKEN_MISSING | 未登录，请先登录 | 无 Authorization 头 |
| 401 | AUTH_TOKEN_INVALID | 登录已失效，请重新登录 | Token 无效/过期 |
| 401 | AUTH_INVALID_CREDENTIALS | 邮箱或密码错误 | 登录失败 |
| 403 | FORBIDDEN | 无权操作此资源 | 操作他人资源 |
| 404 | NOT_FOUND | 资源不存在 | 资源不存在 |
| 409 | CONFLICT | 资源已存在 | 邮箱已注册等 |
| 413 | FILE_TOO_LARGE | 文件过大 | 上传超过限制 |
| 429 | RATE_LIMITED | 操作过于频繁，请稍后再试 | 限流 |
| 500 | INTERNAL_ERROR | 服务器内部错误 | 未知异常 |
| 503 | SERVICE_UNAVAILABLE | 服务暂不可用，请稍后重试 | 数据库不可达等 |

---

## 九、环境变量

### 后端环境变量
| 变量名 | 说明 | 示例 |
|--------|------|------|
| PORT | 服务端口 | 3000 |
| DATABASE_URL | PostgreSQL 连接串 | postgresql://user:pass@host:5432/db |
| JWT_SECRET | JWT 签名密钥 | 随机 32 位字符串 |
| JWT_EXPIRES_IN | Token 有效期 | 7d |
| SUPABASE_URL | Supabase 项目 URL | https://xxx.supabase.co |
| SUPABASE_SERVICE_KEY | Supabase 服务密钥 | eyJ... |
| CORS_ORIGIN | 允许的前端域名 | https://soundshape.vercel.app |
| MAX_FILE_SIZE | 上传文件大小上限（字节） | 20971520 |

### 前端环境变量
| 变量名 | 说明 | 示例 |
|--------|------|------|
| VITE_API_URL | 后端 API 地址 | https://soundshape-api.onrender.com |

---

## 十、禁止事项

1. **禁止**自行新增 API 端点
2. **禁止**修改字段名（如 `notesPlayed` 不能改成 `notes_played`）
3. **禁止**修改响应结构（必须 `{ code, data }` 或 `{ code, message }`）
4. **禁止**在未定义的 HTTP 状态码返回成功
5. **禁止**省略错误码（每个 4xx/5xx 必须有 code 字段）
6. **禁止**修改分页参数名（`page`/`pageSize`）
7. **禁止**修改 Token 格式（必须 `Bearer <jwt>`）
8. **禁止**在 GET 请求中传 body
9. **禁止**使用非 UTF-8 编码
10. **禁止**在响应中返回密码哈希等敏感字段

如有未覆盖的场景，必须先补充本文档再实现。
