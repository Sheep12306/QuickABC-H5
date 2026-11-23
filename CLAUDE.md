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

- `src/main.js`：入口。启动即挂载；登录态由 `router.beforeEach` 判定，无 token 跳 `/login`。
- `src/router.js`：路由。首页静态打包，其余页面懒加载，页面 CSS 随路由按需加载；`/login`、`/register`、`/forgot-password` 为 `public + guestOnly`。
- `src/pages/`：页面组件；`src/styles/pages/`：页面样式；`src/styles/global.css`：全局样式。
- `src/styles/app-base.css`：全局 token（颜色、圆角、间距、`--font-*` 字体变量）；`src/styles/fonts.css` + `public/fonts/`：webfont。
- `src/mp/wx.js`：小程序 `wx.*` API 兼容层；`page.js`：`Page({...})` → Vue；`nav.js`：小程序路径 → 路由/导航栈。
- `src/utils/api.js`：fetch 封装（相对 `/api` 或 `VITE_API_BASE`）；`auth.js`：手机号 + 密码注册/登录/找回密码；`lesson.js`：课时会话缓存与倒计时格式化；`wordExport.js`：按日期汇总单词并生成 Word / 打印版测验。
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
```

启动顺序：MySQL（本地可用 3307 隔离实例）→ 后端 3001 → H5 5173。
后端代码在 `../QuickABC-Server`，修改后端后在该目录重启服务，H5 HMR 不需要重启。

## 当前状态（2026-11-23）

- 已完成手机号 + 密码登录体系：`/login`、`/register`、`/forgot-password`；未登录访问任意页会被路由守卫拦到登录页，设备号自动登录已移除。
- `/register` 新增必填「出生日期」，以 `birthday`（`YYYY-MM-DD`）随注册请求提交；H5 不展示该字段，由 BSS 用户资料/筛选使用。
- 「我的」页 `Lv.X` 改为读取后端下发的 `lessonLevel`（按累计学习课时计算）；`/auth/register`、`/auth/phone-login`、`/auth/userinfo`、`/user/study-data` 返回该字段，缺失时回退旧 `level`，再回退 1。H5 不自行计算等级。
- 找回密码没有短信服务：用户在 `/forgot-password` 提交申请，管理员在 `/admin/#/reset-requests` 重置密码并告知新密码。
- 「我的」页昵称名片内显示只读「课时」徽标：读取用户对象 / `/auth/userinfo` / `/user/study-data` 的 `lessonHours`；前端不提供增加或重置入口，课时由 BSS 后台发放。后端未返回时显示「--」作为兜底。
- 首页「继续背单词」改为先选课时（1 课时 = 60 分钟，整数加减），进入 `/learn` 后调用 `POST /lesson/start` 扣课时并倒计时；左上角返回会提示剩余时间，时间结束弹「稍等一会 / 结束学习」。会话存 `activeLessonSession`，刷新按 `endsAt` 续时，避免重复扣费。逻辑在 `src/utils/lesson.js` 和 `Learn.vue`。
- 课时弹层要求填写「老师编号」（1-20 位字母、数字、下划线或横线），首次填写后存 `lessonTeacherCode` 并自动带出；编号随 URL 传给 `/learn`，再由 `POST /lesson/start` 的 `teacherCode` 字段上报。后端需持久化该字段并建立统计才能生效，H5 侧只负责采集与透传。
- 「我的」页「今日打卡」列表第一项为「导出单词」（原「打卡目标」行与其弹层已删除；每日目标仍可在「做计划」页设置）：进入 `/export-words` 按日期选择历史学习记录（日期卡片，今天置顶标记），打开本地组件 `WordExportSheet` 导出。试卷标题为「日期 + 测验」，副标题左姓名右得分（同一日期仅首页显示标题与姓名/得分，后续页直接接单词表）；正文是四列：单词 | 翻译 | 单词 | 翻译（即两列单词，编号跟在单词前）。可选择「单词 + 翻译 / 隐藏翻译 / 隐藏单词」。分页按每组 5 词对齐：A4 每页 20 词（两列 × 10 行）、A5 每页 10 词（两列 × 5 行），可切换 A4 / A5（A5 是 A4 的一半）。默认下载 Word（可直接编辑），也可打印窗口另存 PDF。逻辑在 `src/utils/wordExport.js`，读取 `dailyLearnedWords_<bookId>_<date>`，不需要后端接口。
- 随身听 `public/uihtml/quickabc_walkman.html` 在 `embed=1` 时读取本机 `dailyLearnedWords_<bookId>_<date>`（`quickabc:` 前缀），按日期倒序生成歌单，今天在最前。界面只显示日期 + 词数，不再显示「第几组」。学习模式合并为「单词 / 听听力」：单词模式可用小眼睛隐藏拼写（即原听写），并支持单词间隔 1-10 秒、重复 1-5 遍（设置存 `quickabc:walkmanSettings`）；顺序 / 单曲 / 随机仍用左下角按钮切换。首页随身听入口带 `bookId`；抗遗忘页「听写复习」带 `mode=dictation`（映射为单词模式 + 隐藏拼写）。
- 已完成路由懒加载、页面 CSS 分包、Vue vendor 拆分。
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
