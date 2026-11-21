# 快背单词 · H5

由微信小程序（`miniprogram-1/miniprogram`）迁移而来的 H5 版本。后端接口与小程序共用；H5 页面已切换到纸张底色 + 墨绿的视觉体系，首页 / 发现 / 我的 / 学习 / 复习 / 设置等页面为手写重做，不再与小程序逐像素一致。

技术栈：**Vue 3 + Vite + Vue Router（hash 模式）**，无 UI 框架依赖。

## 功能

- 首页单词预览、切换词书、连续打卡
- 分组学习：点击单词计数、发音、进度恢复（本地 + 云端）
- 复习：当日复习、混组复习、抗遗忘打卡（按日期）
- 错词本（本地存储，连续两次「认识」才移出）
- 听写：5/10/15 秒间隔、单词列表、隐藏/显示（浏览器需先点击播放）
- 词汇量测试、学习计划（每日目标）、打卡日历
- 单词搜索（H5 独有，`/search`）
- 通勤英语：英语早报 + 昨日单词听觉复习（后端 Edge TTS）
- 随身听：首页入口进入独立播放页（`public/uihtml/quickabc_walkman.html`）
- 四六级词汇卷：按今日单词调用 Claude 生成 CET-4/CET-6 选词填空 + 阅读理解 + 答案解析，支持打印/保存 PDF
- 我的：主题换肤、个人资料、头像上传、手机号、设置

## 快速开始

```bash
npm install
npm run dev        # http://localhost:5173
```

默认后端地址是 `http://115.29.149.87:3001/api`（见 `src/utils/api.js`）。
如需修改，复制 `.env.example` 为 `.env`：

```bash
VITE_API_BASE=http://你的服务器:3001/api
VITE_SERVER_BASE=http://你的服务器:3001
```

> 浏览器直接访问 HTTP 接口时，如果 H5 页面本身是 HTTPS，会被浏览器拦截（混合内容）。
> 正式部署推荐用同域反向代理（见下方「部署」），并把 `VITE_API_BASE` 设为 `/api`。

## 后端准备（重要）

后端已经拆成独立仓库，小程序和 H5 共用：

**`https://github.com/Sheep12306/QuickABC-Server`**（private）

- 已包含 H5 设备号登录 `POST /api/auth/h5-login`
- 已包含四六级 AI 出卷 `POST /api/practice/generate`
- 部署与接口说明见后端仓库的 README
- 本仓库的 `server-patch/` 仅保留为历史参考，新部署直接使用后端仓库

部署好后端后，把 H5 的 `VITE_API_BASE` / `VITE_SERVER_BASE` 指向它即可：

```bash
VITE_API_BASE=https://api.你的域名.com/api
VITE_SERVER_BASE=https://api.你的域名.com
```

- 未部署登录接口时：首页仍可打开，但学习数据、词书等接口会失败，并提示「登录失败：后端尚未部署 H5 登录接口」。
- 未部署出卷接口时：页面会提示「后端尚未部署出卷接口」，可先用内置示例试卷预览版式和打印效果。
- 「我的」页也提供手动 **H5 登录** 按钮（可填写昵称）。

## 构建与部署

```bash
npm run build      # 输出到 dist/
```

将 `dist/` 放到任意静态服务器即可。因为使用 hash 路由（`/#/learn?...`），不需要额外配置 history fallback。

推荐用 Nginx 同域托管 + 反向代理后端：

```bash
# 构建时使用相对 API 地址（走同域代理，避免混合内容/CORS）
VITE_API_BASE=/api VITE_SERVER_BASE= npm run build
```

示例配置见 `deploy/nginx.conf.example`。

### CI/CD

push 到 `main` 后，GitHub Actions（`.github/workflows/deploy.yml`）会自动构建并 rsync 到
`115.29.149.87:/opt/QuickABC/vocab-server/h5`，线上地址 `https://quickabc.kuaikeli.tech`。

首次使用需要在仓库 Settings → Secrets 配置 `DEPLOY_HOST` / `DEPLOY_USER` / `DEPLOY_SSH_KEY`，
详见 [deploy/README.md](deploy/README.md)。

## 目录结构

```
src/
├── App.vue                 # H5 外壳：顶部导航、底部 TabBar、Toast/Modal 容器
├── main.js                 # 入口、全局 wx/getApp 注入、登录引导
├── router.js               # 全部路由
├── mp/                     # 小程序兼容层
│   ├── wx.js               # wx.* API（存储/导航/Toast/Modal/音频/选图…）
│   ├── page.js             # Page({...}) → Vue 组件；setData、小程序事件对象
│   └── nav.js              # 小程序页面路径 → H5 路由；导航栈、getCurrentPages
├── utils/
│   ├── api.js              # 后端接口（fetch）
│   ├── auth.js             # H5 设备号登录
│   ├── tts.js              # 后端 Edge TTS
│   ├── commute.js          # 通勤复习词工具
│   ├── checkin.js          # 每日打卡（按组计目标）
│   ├── ebbinghaus.js       # 抗遗忘复习 / 错词到期计算
│   └── practiceApi.js      # 四六级出卷的本地 API 配置
├── pages/                  # 26 个页面组件
├── components/             # AppIcon / AppSketch / LiquidGlassTabbar / MpProgress / MpUI / PagePlaceholder
└── styles/
    ├── app-base.css        # 字体 / 颜色 / 圆角 token（手写维护，不再由 app.wxss 覆盖）
    ├── global.css          # H5 外壳、纸张版式、Toast/Modal 等共用样式
    └── pages/*.css         # 页面样式；重做页用 .xxx-page，其余仍按 .page-xxx 隔离
```

## 页面 / 路由对照

| 小程序页面 | H5 路由 | 说明 |
| --- | --- | --- |
| pages/index/index | `/` | 单词首页（Tab） |
| pages/discover/discover | `/discover` | 发现（Tab） |
| pages/my/my | `/my` | 我的（Tab） |
| pages/learn/learn | `/learn` | 分组学习 |
| pages/review/review | `/review` | 复习 |
| pages/new-word-review/new-word-review | `/new-word-review` | 错词本 |
| pages/review-mode/review-mode | `/review-mode` | 抗遗忘复习列表 |
| pages/review-date/review-date | `/review-date` | 抗遗忘打卡 |
| pages/test-list/test-list | `/test-list` | 听写日期列表 |
| pages/dictation/dictation | `/dictation` | 听写 |
| pages/vocab-Detail/vocab-Detail | `/vocab-detail` | 词汇量 |
| pages/vocab-Test/vocab-Test | `/vocab-test` | 词汇测试 |
| pages/studySetting/studySetting | `/study-setting` | 学习设置 |
| pages/studyRecord/studyRecord | `/study-record` | 打卡日历 |
| pages/levelAnswer/levelAnswer | `/level-answer` | 语法闯关 |
| pages/examSelect/examSelect | `/exam-select` | 选择考试范围 |
| pages/examAnswer/examAnswer | `/exam-answer` | 模拟考试 |
| pages/study-plan/study-plan | `/study-plan` | 学习计划 |
| pages/commute/index | `/commute` | 通勤英语 |
| pages/commute/play | `/commute/play` | 通勤播放 |
| pages/profile/profile | `/profile` | 个人资料 |
| pages/settings/settings | `/settings` | 设置 |
| —（H5 手写） | `/vocab-paper` | 四六级词汇卷 |
| —（H5 手写） | `/search` | 单词搜索 |
| pages/game/game | `/game` | 游戏（占位页） |
| pages/course-detail/course-detail | `/course-detail` | 课程详情（占位页） |

> 小程序里的 `checkin-poster`（打卡海报）和 `wordBookList`（生词本）已在 H5 移除；H5 不再生成分享海报。

## 小程序 → H5 的适配说明

- **API 兼容层**：页面代码基本保持原样，`wx.getStorageSync`、`wx.showToast`、`wx.navigateTo`、`wx.createInnerAudioContext` 等均由 `src/mp/wx.js` 提供；`Page({...})` 经 `src/mp/page.js` 适配为 Vue 组件，`this.setData()`、`this.data`（已转换为 `this.$data`）、事件对象的 `currentTarget.dataset` / `detail.value` 均可用。
- **尺寸**：`rpx` 按 `1rpx = 1/75 rem` 转换，`html` 字号为 `min(10vw, 48px)`；桌面端应用最大宽度 480px 居中。重做页面用 `.xxx-page` 根类，其余页面仍用 `.page-xxx` 前缀隔离，避免同名类冲突。
- **登录**：H5 设备号登录（见「后端准备」）。小程序原有的微信登录逻辑保留但不再使用。
- **音频自动播放**：浏览器要求用户手势后才能出声，因此听写页不自动播放（提示点击播放），通勤播放页和随身听也需要点击播放。单词发音使用有道词典接口，无需登录。
- **头像**：`wx.chooseMedia` 用隐藏的 `<input type="file">` 实现，上传走 `FormData`（字段名仍为 `avatar`）。
- **分享/微信专属能力**：小程序 `open-type="share"`、`wx.login`、`wx.getUserProfile` 等已替换或降级。
- **顶部导航**：小程序原生导航栏由 `App.vue` 中的 H5 导航栏代替；底部 Tab 由 `LiquidGlassTabbar` 使用 `AppIcon` 绘制。
- **随身听**：`public/uihtml/quickabc_walkman.html` 是独立播放页，已接入同一套字体 webfont 与墨绿主题 token。

## 迁移脚本（可选）

`scripts/port.mjs` 是从小程序源码自动生成页面模板/样式/JS 的工具，源路径写死为：

```
C:/Users/alex/WeChatProjects/miniprogram-1/miniprogram
```

```bash
npm run port            # 输出到 port-out/，只用于人工比对，不改 src
```

确需回写时手动执行（会覆盖生成页）：

```bash
node scripts/port.mjs --in-place --force
```

> ⚠️ 回写会跳过手写重做的 Home / Discover / My / Learn / Review / NewWordReview / Settings，但其它页面的字体 token、AppIcon 等 H5 手工改动仍会被小程序旧版本覆盖。`src/styles/app-base.css`（字体与配色 token）永不覆盖，生成结果只写到 `port-out/app-base.css`。

## 可选：运行时冒烟测试

仓库内带有基于 puppeteer-core + 本机 Edge 的端到端测试脚本（不属于构建产物）：

```bash
# 1) 启动预览服务
npm run preview -- --port 4173

# 2) 启动带远程调试的 Edge（Windows 示例）
"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" \
  --headless=new --remote-debugging-port=9333 --no-first-run \
  --user-data-dir=/tmp/edge-qa about:blank

# 3) 运行
npm i --no-save puppeteer-core
node scripts/smoke.mjs / 9000      # 单页渲染
node scripts/interact.mjs          # 点击/输入/弹窗
node scripts/flow.mjs              # 首页→复习→打卡→听写 完整流程
```

## 已知限制

- 后端未部署 `server-patch` 时无法加载在线数据（本地错词本、学习流程等仍可用）。
- 长单词列表（复习/听写）通过 URL 传递，地址栏会较长；页面刷新后若 URL 被截断可能丢失本次列表（数据仍在本地存储中）。
- 微信生态能力（分享到微信好友、保存到相册、微信登录）在 H5 上改为浏览器等价能力。
- 浏览器自动播放限制导致部分音频需要用户先点击一次。
