# 后端补丁：H5 设备号登录

> 该补丁已合入独立后端仓库 `Sheep12306/QuickABC-Server`（private）。

H5 端没有 `wx.login`，无法拿微信 `code` 换取 `openid`。本项目用「浏览器设备 ID」代替微信凭证：

1. 首次打开 H5 时，前端生成一个随机 `deviceId` 存到 `localStorage`。
2. 调用 `POST /api/auth/h5-login { deviceId, userInfo? }`。
3. 后端把 `deviceId` 做 SHA-256 后拼成稳定 `openid`，复用原有用户体系并签发 JWT。

这样 H5 与小程序共用同一套用户、单词书、学习记录接口，**不需要改动其他接口**。

## 部署步骤

在 `vocab-server` 项目中：

1. 复制 `h5AuthController.js` 到 `vocab-server/src/controllers/h5AuthController.js`。
2. 修改 `vocab-server/src/routes/auth.js`：

```js
const { Router } = require('express');
const authMiddleware = require('../middleware/auth');
const { login, getUserInfo } = require('../controllers/authController');
const { h5Login } = require('../controllers/h5AuthController');

const router = Router();

router.post('/login', login);
router.post('/h5-login', h5Login);   // ← 新增
router.get('/userinfo', authMiddleware, getUserInfo);

module.exports = router;
```

3. 重启服务（`pm2 restart vocab-server` 或 `npm start`）。

## 验证

```bash
curl -X POST http://127.0.0.1:3001/api/auth/h5-login \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test-device-001"}'
```

返回 `{ "code": 200, "data": { "token": "...", "user": { ... } } }` 即成功。

> 如果不部署该接口，H5 首页仍能打开，但所有需要登录的数据接口都会失败，页面顶部会提示「登录失败：后端尚未部署 H5 登录接口」。

---

# 后端补丁：四六级词汇卷（AI 出卷）

「发现 → 四六级词汇卷」需要后端调用 Claude 实时生成试卷。H5 端只负责提交词表、展示和打印。

> 本补丁已经合入独立后端仓库 `Sheep12306/QuickABC-Server`（private）。以下步骤仅用于其他部署副本参考。

## 部署步骤

在 `QuickABC-Server` 项目中：

1. 安装 Anthropic SDK：

```bash
npm install @anthropic-ai/sdk
```

> Node.js 18+。如果服务器需要通过代理访问 Anthropic API，同时设置 `ANTHROPIC_BASE_URL`。

2. 配置环境变量（写入 `.env` 或 PM2 配置）：

```bash
ANTHROPIC_API_KEY=sk-ant-...
# 可选：默认 claude-opus-5-5
# PRACTICE_MODEL=claude-opus-5-5
# 可选：服务端 refusal fallback 默认开启；代理不支持 beta 参数时设为 off
# PRACTICE_FALLBACKS=off
# 可选：通过代理访问时填写
# ANTHROPIC_BASE_URL=https://your-proxy.example.com
```

3. 复制 `practiceController.js` 到 `src/controllers/practiceController.js`。

4. 新建 `src/routes/practice.js`：

```js
const { Router } = require('express');
const ctrl = require('../controllers/practiceController');

const router = Router();

router.post('/generate', ctrl.generatePaper);

module.exports = router;
```

5. 在 `src/routes/index.js` 中挂载（该项目的鉴权统一在这一层处理）：

```js
const practiceRoutes = require('./practice');

// Protected routes
router.use('/practice', authMiddleware, practiceRoutes);
```

6. 重启服务（`pm2 restart vocab-server` 或 `npm start`）。

## 验证

```bash
TOKEN=... # H5 登录拿到的 JWT

curl -X POST http://127.0.0.1:3001/api/practice/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "level": "cet6",
    "words": [
      { "word": "abundant", "phonetic": "əˈbʌndənt", "meaning": "adj. 丰富的" },
      { "word": "ambiguous", "phonetic": "æmˈbɪɡjuəs", "meaning": "adj. 模糊的" },
      { "word": "compensate", "phonetic": "ˈkɒmpenseɪt", "meaning": "v. 补偿" },
      { "word": "deteriorate", "phonetic": "dɪˈtɪəriəreɪt", "meaning": "v. 恶化" },
      { "word": "inevitable", "phonetic": "ɪnˈevɪtəbl", "meaning": "adj. 不可避免的" }
    ]
  }'
```

返回 `{ "code": 200, "data": { "paper": { ... }, "model": "...", "usage": { ... } } }` 即成功。

## 说明

- 请求参数：`level` 为 `cet4` 或 `cet6`；`words` 为 5-30 个 `{ word, phonetic?, meaning? }`。
- 生成一份完整试卷约需 20-60 秒，前端请求超时设为 180 秒。
- 同一个用户 15 秒内只能请求一次，避免重复点击造成重复计费。
- 生成一份试卷通常需要 20-60 秒。如果前面有 Nginx，请把 `/api/` 的代理超时调到 180 秒以上：

```nginx
location /api/ {
  proxy_pass http://127.0.0.1:3001;
  proxy_read_timeout 180s;
  proxy_send_timeout 180s;
}
```

- 未部署该接口时，页面会提示「后端尚未部署出卷接口」，仍可点击「查看示例试卷」预览版式与打印效果。
