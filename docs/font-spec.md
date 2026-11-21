# 字体规范

更新日期：2026-11-15

一句话：**中文大字和释义用思源宋体，英文单词用 Inter，UI 小字用系统无衬线**。所有字体通过 `src/styles/app-base.css` 里的 4 个 CSS 变量引用，不要在页面里写死字体栈。

## 1. 分层与 token

| 层 | token | 字体栈 | 用途 |
| --- | --- | --- | --- |
| 展示层 / 阅读层 | `--font-serif` | `'Noto Serif SC Core', 'Noto Serif SC', 'Songti SC', SimSun, serif` | 页面主标题、卡片眉标、词书名、区块标题、中文释义、例句翻译 |
| 英文单词 | `--font-word` | `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` | 单词卡片主视觉 |
| UI 层 | `--font-ui` | `-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', 'Microsoft YaHei', sans-serif` | 按钮、标签、进度、分组、导航等小字 |
| 数字 | `--font-num` | `Georgia, 'Times New Roman', serif` | 百分比、页码、缩写 |

`body` 默认是 `--font-ui`。宋体是 **opt-in**：只有显式使用 `--font-serif` 的元素才会加载宋体，不要改成全局继承。

## 2. 用法对照

| 场景 | 字体 | 字重 | 字号 | 其他 |
| --- | --- | --- | --- | --- |
| 页面主标题、区块标题 | `--font-serif` | 700 | ≥ 20px | 字距 +0.012rem |
| 卡片眉标、词书名 | `--font-serif` | 700 | 18–22px | — |
| 中文释义、例句 | `--font-serif` | 400 | ≥ 16px | 行高 1.75，字距 0.019em |
| 英文单词 | `--font-word` | 700 | 22px @375 | — |
| 按钮、标签、进度、分组 | `--font-ui` | 400–600 | 12–14px | 可用 `.word-tip` |
| 百分比、数字 | `--font-num` | 700 | 按场景 | — |

已有实现参考：`src/styles/pages/learn.css` 的 `.word-en`（Inter）与 `.part-meaning`（宋体）。

## 3. 字号与 rem

根字号是 `html { font-size: min(10vw, 48px) }`，即 **1rem = 视口宽 / 10**（上限 48px）：

| 视口宽 | 1rem | 0.5867rem | 0.4267rem | 0.3733rem | 0.32rem |
| --- | --- | --- | --- | --- | --- |
| 375（设计基准） | 37.5px | 22px | 16px | 14px | 12px |
| 430 | 43px | 25.2px | 18.3px | 16px | 13.8px |
| ≥480 | 48px | 28.2px | 20.5px | 17.9px | 15.4px |

**新样式一律用 rem，不要写 px**——写 px 会在 430 及以上的屏上比现有页面小一圈。

## 4. 禁止事项

- **12px 以下不得使用宋体**（375 宽下对应 `< 0.32rem`），小字号宋体在低 DPI 屏会发虚断笔。
- **不要给宋体文本加 `-webkit-font-smoothing: antialiased`**：它会让字更细，与“防小字发虚”的目标相反；`global.css` 的 `body` 已统一开启，重复声明无意义（且 Windows 上完全无效）。
- **不要写死 `font-family`**，一律用 token。
- **不要手改** `src/styles/fonts.css` 和 `public/fonts/shserif-slices.css`，它们是 `scripts/build-fonts.py` 的产物。
- **不要改** `src/styles/pages/vocab-paper.css` 里的 `SimSun` / `Times New Roman`，那是试卷打印刻意要的印刷效果。
- 英文单词不要用宋体，中文释义不要用 Inter。

## 5. 资源与加载

字体放在 `public/fonts/`，共约 6.9MB：

| 路径 | 体积 | 说明 |
| --- | --- | --- |
| `shs/core-400.woff2` / `core-700.woff2` | 20KB ×2 | 首屏核心片，60 个字符，覆盖首页固定衬线文案 |
| `shs/s400-000…100.woff2` / `s700-…` | 3.0 + 3.1MB | 101 个按码位切的分片 × 2 字重，按需下载 |
| `shserif-slices.css` | 180KB | 202 条分片的 `@font-face` 规则，**异步加载** |
| `inter-400.woff2` / `inter-700.woff2` | 24KB ×2 | Inter 拉丁子集 |
| `OFL-Inter.txt` / `OFL-NotoSerifSC.txt` | — | OFL 授权，分发时需保留 |

`src/styles/fonts.css`（2KB）只含核心片和 Inter 的规则，随主样式加载；`index.html` 里：

```html
<link rel="preload" href="/fonts/shs/core-700.woff2" as="font" type="font/woff2" crossorigin />
<link rel="stylesheet" href="/fonts/shserif-slices.css" media="print" onload="this.media='all'" />
```

加载顺序：核心片（preload）→ 分片 CSS（异步）→ 浏览器按实际出现的字符拉对应分片。

## 6. 重新生成字体

```bash
python scripts/build-fonts.py            # 默认用 C:\Windows\Fonts\NotoSerifSC-VF.ttf
python scripts/build-fonts.py --src-font <源字体路径>
```

- 依赖：Python + `fonttools` + `brotli`
- 分片从 Google Fonts 拉取（`Noto Serif SC` 400 / 700），Inter 从 jsdelivr 拉取
- 要新增首屏字符，修改脚本里的 `CORE_TEXT` 后重跑；脚本会重建核心片和两个 CSS
- 脚本可重复执行，已存在的分片不会重复下载

## 7. 为什么这样设计

- **用分片而不是固定子集**：释义来自后端词库，字符不可枚举；固定子集遇到漏字会和系统字体混排，比整体用宋体更难看。
- **首屏核心片只有 60 字**：首页固定文案就这么多，20KB 换掉 300KB 的分片请求。
- **拉丁字母不进核心片**：会带进整套 OpenType 表，核心片从 20KB 涨到 107KB；英文交给分片里的拉丁片（约 1.5KB）即可。
- **两个静态字重而不是可变字体**：同字符集下静态比 VF 小约 40%，且展示层只用 700、阅读层只用 400。
- **`font-display: swap`**：先显示系统兜底，字体到达后替换，避免文字空白。

## 8. 已知限制

- 分片 CSS 是异步的，动态字符（昵称、后端下发的词书名）首帧会先用系统宋体，稍后替换。
- 音标仍用系统字体（`.word-phonetic` 未接 Inter，IPA 字符在系统无衬线里更完整）。
- 全部页面的标题、释义、英文单词与数字已接入对应 token；`profile`、`settings` 等只有 12–15px 小字的页面保持系统无衬线（符合规范），不强行用小字号宋体。
- `public/uihtml/quickabc_walkman.html` 是独立 HTML 页，已内联同一套 `@font-face` 并接入 `--font-serif` / Inter / UI 字体栈；后续改字体时需要和 `src/styles/app-base.css` 同步。
- `public/boot.css` 的首屏骨架用系统无衬线：它在应用样式与字体 token 之前生效。
- `public/fonts/` 约 6.9MB，是否提交仓库需自行决定；若不提交，部署前必须跑一次生成脚本。
