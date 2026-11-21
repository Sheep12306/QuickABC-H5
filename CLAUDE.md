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
npm run port            # 从小程序源码生成到 port-out/，仅供比对，不改 src
```

## 目录与架构

- `src/main.js`：入口。启动时立即挂载，不等登录；`ensureLogin` 在后台执行，API 请求通过 authGate 等待登录结果。
- `src/router.js`：路由。首页静态打包，其余页面懒加载，页面 CSS 随路由按需加载。
- `src/pages/`：页面组件；`src/styles/pages/`：页面样式；`src/styles/global.css`：全局样式。
- `src/styles/app-base.css`：全局 token（颜色、圆角、间距、`--font-*` 字体变量）；`src/styles/fonts.css` + `public/fonts/`：webfont。
- `src/mp/wx.js`：小程序 `wx.*` API 兼容层；`page.js`：`Page({...})` → Vue；`nav.js`：小程序路径 → 路由/导航栈。
- `src/utils/api.js`：fetch 封装（相对 `/api` 或 `VITE_API_BASE`）；`auth.js`：H5 设备号登录。
- `src/data/practiceSamples.js`：内置四六级示例试卷。
- `scripts/`：迁移与冒烟脚本；`server-patch/`：历史后端补丁，已合入 QuickABC-Server。

## 字体规范

- 字体全部通过 `src/styles/app-base.css` 的 `:root` 变量引用，不要在页面里写死 `font-family`：
  - `--font-serif`：思源宋体（标题、词书名、中文释义）
  - `--font-word`：Inter（英文单词）
  - `--font-ui`：系统无衬线（按钮、标签、进度、导航等小字）
  - `--font-num`：Georgia（百分比、数字）
- `body` 默认 `--font-ui`，宋体是 opt-in；**12px 以下不用宋体**。
- 字号用 rem（`1rem = min(10vw, 48px)`），不要写 px。
- 字体资源由 `python scripts/build-fonts.py` 生成；`src/styles/fonts.css` 与 `public/fonts/shserif-slices.css` 是生成物，不要手改。
- 完整规则（分层、字号换算、加载策略、已知限制）见 [docs/font-spec.md](docs/font-spec.md)。

## 本地联调

`.env.local`（不提交）：

```bash
VITE_API_BASE=http://127.0.0.1:3001/api
VITE_SERVER_BASE=http://127.0.0.1:3001
VITE_AUTO_LOGIN=true
```

启动顺序：MySQL（本地可用 3307 隔离实例）→ 后端 3001 → H5 5173。
后端代码在 `../QuickABC-Server`，修改后端后在该目录重启服务，H5 HMR 不需要重启。

## 当前状态（2026-11-21）

- 已完成路由懒加载、页面 CSS 分包、非阻塞登录、Vue vendor 拆分。
- 已完成「四六级词汇卷」：发现页入口、`/vocab-paper`、今日单词自动填入、示例卷、打印/PDF。
- 本地端到端已验证：登录、词书、学习记录、今日单词自动填入、示例试卷。
- AI 出卷需要后端配置 `ANTHROPIC_API_KEY`，当前未验证真实生成。
- 已接入思源宋体 + Inter webfont：首屏核心片 20KB、101 个分片异步加载；全部页面已按 `docs/font-spec.md` 接入字体 token（标题/释义用宋体、英文单词用 Inter、数字用 Georgia、UI 小字用系统无衬线）。
- 视觉已切到纸张底色 + 墨绿（`#326d43`）：Home / Discover / My / Learn / Review / NewWordReview / Settings 为手写重做，并新增 `AppIcon` / `AppSketch` / `LiquidGlassTabbar` / `PagePlaceholder` / `/search` 随身听独立页。
- 已上线 `https://quickabc.kuaikeli.tech`：push `main` 后 GitHub Actions 自动构建并 rsync 到服务器 `/opt/QuickABC/vocab-server/h5`，Nginx 同域反代 `/api` 到 3001，证书由 acme.sh 自动续期（见 `deploy/README.md`）。
- 错词本「连续两次认识才移出」只在 H5 实现，小程序源码待同步。

## 约定与坑

- 不提交 `.env`、`.env.local`、`dist/`、`node_modules/`。
- `npm run port` 只输出到 `port-out/`，不碰 `src`。确需回写要手动加 `--in-place --force`：会覆盖生成页，已手写的 Home / Discover / My / Learn / Review / NewWordReview / Settings 会被跳过，但其它页面样式仍会被小程序旧配色覆盖。`app-base.css` 永不被覆盖。
- 小程序侧还有两份源码副本（`WeChatProjects/miniprogram-1`、`Desktop/QuickABC`），改小程序逻辑时注意两处都同步；`port.mjs` 只读前者。
- 页面依赖 `window.wx` 兼容层，页面代码尽量保持小程序写法。
- 新增页面需要在 `src/router.js` 的 `pageLoaders` 登记，并提供同名 `src/styles/pages/<key>.css`。
- 临时 QA 脚本、截图不要提交到仓库。
- 字体一律用 `var(--font-*)`，不要写死字体栈；改字体前先看 `docs/font-spec.md`。
- 图标统一用 `<AppIcon name="..." />`（`src/components/AppIcon.vue`，已全局注册）：24 网格、1.7 描边、圆角端点；不要再写字母圆圈、emoji 或 `›` 文字箭头。新增图标在组件里的 `ICONS` 表登记。
- `public/fonts/` 约 6.9MB，删除后只能靠 `scripts/build-fonts.py`（需本机思源宋体源文件）重新生成。
