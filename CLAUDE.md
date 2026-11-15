# QuickABC-H5 — Claude Code 项目说明

## 项目定位

快背单词 H5 前端，由微信小程序迁移而来。Vue 3 + Vite + Vue Router（hash 模式），无 UI 框架依赖。

- H5 仓库：`Sheep12306/QuickABC-H5`（public）
- 共享后端：`../QuickABC-Server`（`Sheep12306/QuickABC-Server`，private）
- 小程序：`Sheep12306/QuickABC`（public）

## 常用命令

```bash
npm run dev      # 开发服务器，http://localhost:5173
npm run build    # 生产构建，输出 dist/
npm run preview  # 预览构建，http://localhost:4173
npm run port     # 从小程序源码重新生成页面（会覆盖 src/pages 与 src/styles/pages）
```

## 目录与架构

- `src/main.js`：入口。启动时立即挂载，不等登录；`ensureLogin` 在后台执行，API 请求通过 authGate 等待登录结果。
- `src/router.js`：路由。首页静态打包，其余页面懒加载，页面 CSS 随路由按需加载。
- `src/pages/`：页面组件；`src/styles/pages/`：页面样式；`src/styles/global.css`：全局样式。
- `src/mp/wx.js`：小程序 `wx.*` API 兼容层；`page.js`：`Page({...})` → Vue；`nav.js`：小程序路径 → 路由/导航栈。
- `src/utils/api.js`：fetch 封装（相对 `/api` 或 `VITE_API_BASE`）；`auth.js`：H5 设备号登录。
- `src/data/practiceSamples.js`：内置四六级示例试卷。
- `scripts/`：迁移与冒烟脚本；`server-patch/`：历史后端补丁，已合入 QuickABC-Server。

## 本地联调

`.env.local`（不提交）：

```bash
VITE_API_BASE=http://127.0.0.1:3001/api
VITE_SERVER_BASE=http://127.0.0.1:3001
VITE_AUTO_LOGIN=true
```

启动顺序：MySQL（本地可用 3307 隔离实例）→ 后端 3001 → H5 5173。
后端代码在 `../QuickABC-Server`，修改后端后在该目录重启服务，H5 HMR 不需要重启。

## 当前状态（2026-11-15）

- 已完成路由懒加载、页面 CSS 分包、非阻塞登录、Vue vendor 拆分。
- 已完成「四六级词汇卷」：发现页入口、`/vocab-paper`、今日单词自动填入、示例卷、打印/PDF。
- 本地端到端已验证：登录、词书、学习记录、今日单词自动填入、示例试卷。
- AI 出卷需要后端配置 `ANTHROPIC_API_KEY`，当前未验证真实生成。

## 约定与坑

- 不提交 `.env`、`.env.local`、`dist/`、`node_modules/`。
- 重新运行 `npm run port` 会覆盖手写页面（如 `VocabPaper.vue`）和样式，执行前先确认。
- 页面依赖 `window.wx` 兼容层，页面代码尽量保持小程序写法。
- 新增页面需要在 `src/router.js` 的 `pageLoaders` 登记，并提供同名 `src/styles/pages/<key>.css`。
- 临时 QA 脚本、截图不要提交到仓库。
