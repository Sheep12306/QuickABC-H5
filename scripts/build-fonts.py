"""生成 H5 字体资源。

做三件事：
1. 从 Google Fonts 拉取 Noto Serif SC 的分片（400 / 700 两个静态字重），
   下载到 public/fonts/shs/；
2. 用本地思源宋体源文件切一片「首屏核心片」，覆盖首页固定文案用字，
   让首屏只下载一次字体请求；
3. 生成 src/styles/fonts.css。

依赖：python + fonttools + brotli。源字体用本机安装的 Noto Serif SC 可变字体，
可用 --src-font 指定。

用法：python scripts/build-fonts.py [--src-font 路径]
"""

import argparse
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_DIR = os.path.join(ROOT, 'public', 'fonts', 'shs')
# 核心片规则进主样式（很小），101 个分片的规则单独成文件异步加载（约 60KB gzip）
CSS_PATH = os.path.join(ROOT, 'src', 'styles', 'fonts.css')
SLICES_CSS_PATH = os.path.join(ROOT, 'public', 'fonts', 'shserif-slices.css')
TMP = os.path.join(os.environ.get('TEMP', '/tmp'), 'quickabc-fonts')
UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/120.0 Safari/537.36')

# 首页固定衬线文案：问候语、状态默认值、卡片眉标、区块标题、封面小字、空态
CORE_TEXT = (
    '你好，同学'
    '坚持学习遇见更好的自己'
    '当前学习'
    '学习轨迹'
    '本周还没有学习记录'
    '核心词汇'
    '切换词书'
    '暂无单词书'
    '选择一本单词书'
    '大学英语四六八级考托福雅思考研高频'
    '。、；：？！'
    ' '  # 词书名里可能出现空格，如「CET-4 核心词汇」
)
# 拉丁字母不进核心片：会带进整套 OpenType 表，体积翻 5 倍；
# 英文让分片里的拉丁片（约 1.5KB）兜底即可。
CORE_EXTRA = ''


def curl(url):
    return subprocess.run(
        ['curl', '-s', '-L', '--max-time', '60', '-H', f'User-Agent: {UA}', url],
        capture_output=True, check=True,
    ).stdout


def parse_css(css):
    ranges = re.findall(r'unicode-range:\s*([^;]+);', css)
    urls = re.findall(r'url\((https://[^)]+\.woff2)\)', css)
    return list(zip(ranges, urls))


def to_intervals(rng):
    out = []
    for part in rng.split(','):
        part = part.strip().replace('U+', '')
        if '-' in part:
            a, b = part.split('-')
            out.append((int(a, 16), int(b, 16)))
        else:
            out.append((int(part, 16), int(part, 16)))
    return sorted(out)


def merge(intervals):
    merged = []
    for a, b in sorted(intervals):
        if merged and a <= merged[-1][1] + 1:
            merged[-1] = (merged[-1][0], max(merged[-1][1], b))
        else:
            merged.append((a, b))
    return merged


def fmt_range(intervals):
    parts = []
    for a, b in merge(intervals):
        parts.append(f'U+{a:04X}' if a == b else f'U+{a:04X}-{b:04X}')
    return ','.join(parts)


def fetch_slices():
    os.makedirs(FONT_DIR, exist_ok=True)
    total = 0
    for weight in (400, 700):
        css = curl(f'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@{weight}'
                   '&display=swap').decode()
        pairs = parse_css(css)
        if not pairs:
            sys.exit(f'字体分片 CSS 解析失败（weight={weight}）')
        for i, (rng, url) in enumerate(pairs):
            name = f's{weight}-{i:03d}.woff2'
            path = os.path.join(FONT_DIR, name)
            if not os.path.exists(path):
                with open(path, 'wb') as f:
                    f.write(curl(url))
            total += os.path.getsize(path)
        written.append((weight, [r for r, _ in pairs]))
    print(f'分片：{len(written[0][1])} 片 × 2 字重，共 {total / 1048576:.1f} MB')


def build_core(src_font):
    from fontTools import subset
    from fontTools.ttLib import TTFont
    from fontTools.varLib.instancer import instantiateVariableFont

    chars = sorted(set(CORE_TEXT + CORE_EXTRA))
    for weight in (400, 700):
        font = TTFont(src_font)
        instantiateVariableFont(font, {'wght': weight}, inplace=True)
        opts = subset.Options()
        opts.flavor = 'woff2'
        opts.layout_features = ['*']
        opts.hinting = False
        sub = subset.Subsetter(options=opts)
        sub.populate(unicodes=[ord(c) for c in chars])
        sub.subset(font)
        path = os.path.join(FONT_DIR, f'core-{weight}.woff2')
        font.save(path)
        font.close()
        print(f'核心片 {os.path.basename(path)}：{len(chars)} 字，'
              f'{os.path.getsize(path) / 1024:.1f} KB')


INTER_LATIN_RANGE = ('U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,'
                     'U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+2074,U+20AC,U+2122,'
                     'U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD')


def fetch_inter():
    os.makedirs(os.path.dirname(FONT_DIR), exist_ok=True)
    base = os.path.join(ROOT, 'public', 'fonts')
    files = {
        'inter-400.woff2': 'https://cdn.jsdelivr.net/npm/@fontsource/inter@5/files/inter-latin-400-normal.woff2',
        'inter-700.woff2': 'https://cdn.jsdelivr.net/npm/@fontsource/inter@5/files/inter-latin-700-normal.woff2',
        'OFL-Inter.txt': 'https://cdn.jsdelivr.net/npm/@fontsource/inter@5/LICENSE',
        'OFL-NotoSerifSC.txt': 'https://cdn.jsdelivr.net/npm/@fontsource/noto-serif-sc@5/LICENSE',
    }
    for name, url in files.items():
        path = os.path.join(base, name)
        if not os.path.exists(path):
            with open(path, 'wb') as f:
                f.write(curl(url))
    print('Inter 拉丁子集：', ', '.join(
        f'{n} {os.path.getsize(os.path.join(base, n)) / 1024:.1f} KB'
        for n in ('inter-400.woff2', 'inter-700.woff2')))


def write_css():
    core_range = fmt_range([(ord(c), ord(c)) for c in sorted(set(CORE_TEXT + CORE_EXTRA))])
    core_lines = [
        '/* 由 scripts/build-fonts.py 生成，不要手改 */',
        '/* 首屏核心片：覆盖首页固定衬线文案，随主样式加载 */',
    ]
    for weight in (400, 700):
        core_lines.append(
            "@font-face{font-family:'Noto Serif SC Core';"
            f"src:url(/fonts/shs/core-{weight}.woff2) format('woff2');"
            f'font-weight:{weight};font-style:normal;font-display:swap;'
            f'unicode-range:{core_range}}}')
    core_lines.append('/* Inter：英文单词，拉丁子集（含音标区段由系统字体兜底） */')
    for weight in (400, 700):
        core_lines.append(
            "@font-face{font-family:'Inter';"
            f"src:url(/fonts/inter-{weight}.woff2) format('woff2');"
            f'font-weight:{weight};font-style:normal;font-display:swap;'
            f'unicode-range:{INTER_LATIN_RANGE}}}')
    with open(CSS_PATH, 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(core_lines) + '\n')

    slice_lines = [
        '/* 由 scripts/build-fonts.py 生成，不要手改 */',
        '/* 按码位切分的分片规则：异步加载，浏览器只下载实际用到的片 */',
    ]
    for weight, ranges in written:
        for i, rng in enumerate(ranges):
            slice_lines.append(
                "@font-face{font-family:'Noto Serif SC';"
                f"src:url(/fonts/shs/s{weight}-{i:03d}.woff2) format('woff2');"
                f'font-weight:{weight};font-style:normal;font-display:swap;'
                f'unicode-range:{fmt_range(to_intervals(rng))}}}')
    with open(SLICES_CSS_PATH, 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(slice_lines) + '\n')

    print(f'{CSS_PATH}：{os.path.getsize(CSS_PATH) / 1024:.1f} KB，2 条 @font-face')
    print(f'{SLICES_CSS_PATH}：{os.path.getsize(SLICES_CSS_PATH) / 1024:.1f} KB，'
          f'{len(slice_lines) - 2} 条 @font-face')


written = []

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--src-font', default=r'C:\Windows\Fonts\NotoSerifSC-VF.ttf')
    args = parser.parse_args()
    fetch_slices()
    fetch_inter()
    if os.path.exists(args.src_font):
        build_core(args.src_font)
    else:
        print(f'跳过核心片：找不到源字体 {args.src_font}（用 --src-font 指定）')
    write_css()
