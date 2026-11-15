# QuickABC 项目交接与当前状态

更新日期：2026-11-15

## 仓库与本地路径

| 角色 | GitHub | 本地路径 |
| --- | --- | --- |
| H5 前端 | `Sheep12306/QuickABC-H5`（public） | `C:\Users\alex\Desktop\QuickABC-H5` |
| 共享后端 | `Sheep12306/QuickABC-Server`（private） | `C:\Users\alex\Desktop\QuickABC-Server` |
| 小程序前端 | `Sheep12306/QuickABC`（public） | `C:\Users\alex\WeChatProjects\miniprogram-1` |

后端已从 QuickABC 仓库的 `vocab-server/` 拆出，QuickABC 远端已删除旧目录；本地小程序工作副本需要 `git pull` 才会同步。

## 已完成

- H5 性能优化：路由懒加载、页面 CSS 按需分包、启动不阻塞登录、vendor 拆分。
- 四六级词汇卷模块：发现页入口、`/vocab-paper`、今日单词自动填入、示例卷、打印/PDF。
- 后端独立仓库；已合入 `POST /api/auth/h5-login` 与 `POST /api/practice/generate`。
- 本地端到端联调：登录、词书、学习记录、今日单词自动填入、示例试卷。
- 后端 AI 调用增加 120 秒超时和 1 次重试；未配置 Key 时返回明确中文提示。

## 本地运行方式

1. 临时 MySQL：`127.0.0.1:3307`，隔离数据目录 `C:\Users\alex\AppData\Local\Temp\quickabc-mysql-data`（不是 3306）。
2. 后端：`cd C:\Users\alex\Desktop\QuickABC-Server && npm start`，端口 3001。
3. H5：`cd C:\Users\alex\Desktop\QuickABC-H5 && npm run dev`，端口 5173。
4. `.env.local`（H5）和 `.env`（后端）都是本地文件，未提交。

临时库已 seed：四级 4428 词、六级 5651 词。

## 待办

1. 在 `QuickABC-Server/.env` 配置 `ANTHROPIC_API_KEY`，重启后端，测试真实 AI 出卷。
2. 部署后端到服务器：PM2 + Nginx，`/api` 代理超时 180 秒。
3. 构建并部署 H5，把 `VITE_API_BASE` 指向线上后端。
4. 手动删除 GitHub 上的重复仓库 `Sheep12306/-QuickABC-Server`。
5. 在 `WeChatProjects/miniprogram-1` 执行 `git pull`，同步已删除的 `vocab-server/`。
6. 视需要停止临时 MySQL / 后端 / H5 进程。

## 已知限制

- 真实 AI 出卷尚未用有效 `ANTHROPIC_API_KEY` 验证。当前环境只有 DeepSeek 兼容端点，默认 `claude-opus-5-5` 不适用。
- 临时 MySQL 是隔离实例，重启机器或清理临时目录后数据会丢失。
- H5 的“今日单词”来自当前浏览器 localStorage；小程序或其他设备的学习记录不会自动同步到该列表。
