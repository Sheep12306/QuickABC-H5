<template>
  <nav ref="rootEl" class="lg-tabbar" aria-label="主导航">
    <!--
      液态玻璃的折射/色散由「backdrop-filter + SVG 位移」完成：
      浏览器只允许通过 backdrop-filter 采样元素背后的真实页面内容，
      WebGL 读不到 DOM 像素，所以折射必须走这条链路。
      位移图是运行时按导航栏尺寸生成的圆角矩形 SDF 法线图。
    -->
    <svg v-if="canRefract" class="lg-defs" width="0" height="0" aria-hidden="true" focusable="false">
      <filter
        id="lg-refract"
        x="-12%"
        y="-35%"
        width="124%"
        height="170%"
        color-interpolation-filters="sRGB"
      >
        <feImage
          v-if="mapHref"
          :href="mapHref"
          x="0"
          y="0"
          :width="barW"
          :height="barH"
          preserveAspectRatio="none"
          result="map"
        />
        <feGaussianBlur in="SourceGraphic" stdDeviation="0.2" result="base" />

        <!-- RGB 分通道位移：三通道位移幅度不同，边缘自然出现彩边 -->
        <feColorMatrix
          in="base"
          type="matrix"
          values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
          result="rIn"
        />
        <feDisplacementMap in="rIn" in2="map" scale="34" xChannelSelector="R" yChannelSelector="G" result="rOut" />

        <feColorMatrix
          in="base"
          type="matrix"
          values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
          result="gIn"
        />
        <feDisplacementMap in="gIn" in2="map" scale="28" xChannelSelector="R" yChannelSelector="G" result="gOut" />

        <feColorMatrix
          in="base"
          type="matrix"
          values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
          result="bIn"
        />
        <feDisplacementMap in="bIn" in2="map" scale="22" xChannelSelector="R" yChannelSelector="G" result="bOut" />

        <feBlend in="rOut" in2="gOut" mode="screen" result="rgOut" />
        <feBlend in="rgOut" in2="bOut" mode="screen" result="rgbOut" />
        <feGaussianBlur in="rgbOut" stdDeviation="0.45" />
      </filter>
    </svg>

    <div
      ref="barEl"
      class="lg-bar"
      :class="{ 'lg-bar--refract': canRefract && !!mapHref }"
      @pointermove="onPointerMove"
      @pointerdown="onPointerDown"
    >
      <span ref="indicatorEl" class="lg-indicator" aria-hidden="true"></span>
      <canvas ref="canvasEl" class="lg-shader" aria-hidden="true"></canvas>

      <button
        v-for="(item, index) in items"
        :key="item.path"
        :ref="(el) => setTabEl(el, index)"
        class="lg-tab"
        :class="{ active: index === activeIndex }"
        type="button"
        :aria-current="index === activeIndex ? 'page' : undefined"
        @click="select(item, index)"
      >
        <AppIcon :name="item.icon" class="lg-icon" />
        <span class="lg-label">{{ item.text }}</span>
      </button>
    </div>
  </nav>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps({
  // [{ path, text, icon }]，icon: 'home' | 'compass' | 'user'
  items: { type: Array, required: true },
  activePath: { type: String, default: '/' },
});
const emit = defineEmits(['select']);

const rootEl = ref(null);
const barEl = ref(null);
const canvasEl = ref(null);
const indicatorEl = ref(null);

const barW = ref(0);
const barH = ref(0);
const mapHref = ref('');
const canRefract = ref(false);

const tabEls = [];
function setTabEl(el, index) {
  if (el) tabEls[index] = el;
}

const activeIndex = computed(() => {
  const path = props.activePath;
  const index = props.items.findIndex((item) =>
    item.path === '/' ? path === '/' : path.startsWith(item.path)
  );
  return index < 0 ? 0 : index;
});

const reducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---- 弹簧状态：位置 x / 宽度 w 各一根弹簧，速度驱动横向「果冻」拉伸 ----
const spring = { x: 0, vx: 0, w: 0, vw: 0 };
const target = { x: 0, w: 0 };
const STIFFNESS = 180;
const DAMPING = 16;

let rafId = 0;
let lastTs = 0;
let sheenEnergy = 0; // 交互后残留的高光能量，用于决定何时停止渲染
let pointerX = 0.5;
let sheenOffset = 0; // 滚动带来的高光漂移
let lastScrollTop = 0;
let resizeObserver = null;
let scrollEl = null;

// ---- WebGL 高光层 ----
const shader = {
  gl: null,
  program: null,
  uniforms: {},
  ready: false,
};

const VERTEX_SRC = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAGMENT_SRC = `
precision mediump float;

uniform vec2 uRes;      // 画布尺寸（设备像素）
uniform float uRadius;  // 圆角半径（设备像素）
uniform float uLens;    // 当前指示器中心位置 0..1
uniform float uVel;     // 指示器横向速度 -1..1
uniform float uSheen;   // 高光带位置 0..1
uniform float uPress;   // 按压能量 0..1

// 圆角矩形有向距离场（内部为负）
float sdRoundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

void main() {
  vec2 res = uRes;
  vec2 p = gl_FragCoord.xy - res * 0.5;
  vec2 halfSize = res * 0.5 - 1.0;
  float d = sdRoundBox(p, halfSize, uRadius);

  float inside = 1.0 - smoothstep(-1.5, 0.5, d);

  // ① 边缘细白边：贴着边框内侧，三通道错开 → 轻微色散
  vec3 rim;
  rim.r = 1.0 - smoothstep(0.0, 1.9, abs(d + 1.5));
  rim.g = 1.0 - smoothstep(0.0, 1.8, abs(d + 1.0));
  rim.b = 1.0 - smoothstep(0.0, 1.9, abs(d + 0.5));

  // ② 指示器下方的液态透镜：随速度拉伸，形成果冻感
  vec2 lensPos = vec2((uLens - 0.5) * res.x, 0.0);
  vec2 lp = p - lensPos;
  lp.x /= 1.0 + abs(uVel) * 1.4;
  lp.y /= 1.0 - abs(uVel) * 0.35;
  float lensR = 30.0 * (uRes.y / 60.0);
  float lens = exp(-dot(lp, lp) / (2.0 * lensR * lensR));

  // ③ 掠过的高光带（色散偏移）
  float bandPos = (p.x / res.x + 0.5 - uSheen);
  float band = exp(-pow(bandPos * 5.5, 2.0));
  float bandR = exp(-pow((bandPos - 0.012) * 5.5, 2.0));
  float bandB = exp(-pow((bandPos + 0.012) * 5.5, 2.0));

  // 玻璃的「光」都是加白的：颜色接近纯白，只让 alpha 决定亮度，
  // 否则在浅色背景上会变成压暗的一层灰罩。
  float rimMask = max(max(rim.r, rim.g), rim.b);

  // 边缘偏暖、中心偏冷的极轻色偏；高光带两侧用 bandR/bandB 错开 → 色散感
  vec3 tint = mix(vec3(1.0, 0.982, 0.952), vec3(0.972, 1.0, 0.988), clamp(lens + band, 0.0, 1.0));
  tint.r = min(1.0, tint.r + bandR * 0.03);
  tint.b = min(1.0, tint.b + bandB * 0.03);

  float alpha = rimMask * 0.66 * inside;
  alpha += lens * 0.15 * inside;
  alpha += band * 0.05 * inside;
  alpha += uPress * lens * 0.03 * inside;
  alpha = clamp(alpha, 0.0, 1.0);

  // 预乘 alpha 输出，交给浏览器合成
  gl_FragColor = vec4(tint * alpha, alpha);
}
`;

function compile(gl, type, source) {
  const shaderObj = gl.createShader(type);
  gl.shaderSource(shaderObj, source);
  gl.compileShader(shaderObj);
  if (!gl.getShaderParameter(shaderObj, gl.COMPILE_STATUS)) {
    console.warn('[liquid-glass] shader 编译失败:', gl.getShaderInfoLog(shaderObj));
    gl.deleteShader(shaderObj);
    return null;
  }
  return shaderObj;
}

function initShader() {
  const canvas = canvasEl.value;
  if (!canvas) return;
  const gl = canvas.getContext('webgl', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
  });
  if (!gl) return; // 不支持 WebGL 时自动降级为纯 CSS 玻璃

  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SRC);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC);
  if (!vs || !fs) return;

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn('[liquid-glass] program 链接失败:', gl.getProgramInfoLog(program));
    return;
  }
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // 预乘 alpha
  gl.clearColor(0, 0, 0, 0);

  shader.gl = gl;
  shader.program = program;
  shader.uniforms = {
    uRes: gl.getUniformLocation(program, 'uRes'),
    uRadius: gl.getUniformLocation(program, 'uRadius'),
    uLens: gl.getUniformLocation(program, 'uLens'),
    uVel: gl.getUniformLocation(program, 'uVel'),
    uSheen: gl.getUniformLocation(program, 'uSheen'),
    uPress: gl.getUniformLocation(program, 'uPress'),
  };
  shader.ready = true;
}

function drawShader(time) {
  if (!shader.ready) return;
  const gl = shader.gl;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = canvasEl.value;
  if (!canvas) return;

  const width = Math.max(1, Math.round((barW.value || 1) * dpr));
  const height = Math.max(1, Math.round((barH.value || 1) * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  gl.viewport(0, 0, width, height);
  gl.clear(gl.COLOR_BUFFER_BIT);

  const barCenter = spring.x + spring.w / 2;
  const totalW = barW.value || 1;
  const velocity = Math.max(-1, Math.min(1, spring.vx / 900));

  gl.useProgram(shader.program);
  gl.uniform2f(shader.uniforms.uRes, width, height);
  gl.uniform1f(shader.uniforms.uRadius, Math.min(width, height) * 0.5);
  gl.uniform1f(shader.uniforms.uLens, barCenter / totalW);
  gl.uniform1f(shader.uniforms.uVel, velocity);
  const sheen = (pointerX + sheenOffset + Math.sin(time * 0.9) * 0.04) % 1;
  gl.uniform1f(shader.uniforms.uSheen, sheen < 0 ? sheen + 1 : sheen);
  gl.uniform1f(shader.uniforms.uPress, Math.min(1, sheenEnergy));

  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

// ---- 圆角矩形 SDF：与 shader 中保持一致 ----
function sdRoundRect(x, y, w, h, r) {
  const px = x - w / 2;
  const py = y - h / 2;
  const bx = w / 2 - r;
  const by = h / 2 - r;
  const qx = Math.abs(px) - bx;
  const qy = Math.abs(py) - by;
  const ax = Math.max(qx, 0);
  const ay = Math.max(qy, 0);
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(ax, ay) - r;
}

// 生成折射位移图：边缘处沿法线外推，越往中心越接近零
function buildRefractionMap(w, h, radius) {
  const width = Math.max(2, Math.round(w));
  const height = Math.max(2, Math.round(h));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(width, height);
  const data = image.data;
  const softness = Math.max(5, height * 0.16);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const d = sdRoundRect(x + 0.5, y + 0.5, width, height, radius);
      // 边缘处从 0 平滑升起，向内指数衰减：最外 1px 保持干净，弯折集中在边缘内侧
      const depth = Math.max(0, -d);
      const falloff = Math.min(1, (1 - Math.exp(-depth / 1.1)) * Math.exp(d / softness));
      const dx = sdRoundRect(x + 1.5, y + 0.5, width, height, radius) -
        sdRoundRect(x - 0.5, y + 0.5, width, height, radius);
      const dy = sdRoundRect(x + 0.5, y + 1.5, width, height, radius) -
        sdRoundRect(x + 0.5, y - 0.5, width, height, radius);
      const len = Math.hypot(dx, dy) || 1;
      const i = (y * width + x) * 4;
      data[i] = 128 + (dx / len) * falloff * 127;
      data[i + 1] = 128 + (dy / len) * falloff * 127;
      data[i + 2] = 128;
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas.toDataURL('image/png');
}

function measure() {
  const bar = barEl.value;
  if (!bar) return;
  const rect = bar.getBoundingClientRect();
  const w = Math.round(rect.width);
  const h = Math.round(rect.height);
  if (!w || !h) return;

  const sizeChanged = w !== barW.value || h !== barH.value;
  barW.value = w;
  barH.value = h;

  if (canRefract.value && sizeChanged) {
    const radius = parseFloat(getComputedStyle(bar).borderTopLeftRadius) || h / 2;
    mapHref.value = buildRefractionMap(w, h, radius);
  }

  updateTargets();
}

function updateTargets() {
  const el = tabEls[activeIndex.value];
  if (!el) return;
  target.x = el.offsetLeft;
  target.w = el.offsetWidth;
  if (!spring.w || reducedMotion) {
    // 首次落位 / 用户偏好减少动效：直接到位，不走弹簧
    spring.x = target.x;
    spring.w = target.w;
    spring.vx = 0;
    spring.vw = 0;
    applyIndicator();
  }
  requestFrame();
}

function applyIndicator() {
  const el = indicatorEl.value;
  if (!el) return;
  const stretch = Math.min(0.16, Math.abs(spring.vx) * 0.00022);
  const squash = Math.min(0.12, Math.abs(spring.vx) * 0.00016);
  el.style.width = `${spring.w}px`;
  el.style.transform =
    `translate3d(${spring.x}px, 0, 0) scaleX(${1 + stretch}) scaleY(${1 - squash})`;
}

function stepSpring(dt) {
  let moving = false;

  for (const key of ['x', 'w']) {
    const vKey = key === 'x' ? 'vx' : 'vw';
    const diff = spring[key] - target[key];
    if (Math.abs(diff) > 0.05 || Math.abs(spring[vKey]) > 0.5) {
      const accel = -STIFFNESS * diff - DAMPING * spring[vKey];
      spring[vKey] += accel * dt;
      spring[key] += spring[vKey] * dt;
      moving = true;
    } else {
      spring[key] = target[key];
      spring[vKey] = 0;
    }
  }
  return moving;
}

function frame(ts) {
  rafId = 0;
  if (!lastTs) lastTs = ts;
  const dt = Math.min(0.032, Math.max(0.001, (ts - lastTs) / 1000));
  lastTs = ts;

  const moving = stepSpring(dt);
  applyIndicator();

  sheenEnergy = Math.max(0, sheenEnergy - dt * 0.7);
  drawShader(ts / 1000);

  const keepGoing =
    moving || sheenEnergy > 0.01 || Math.abs(spring.vx) > 1 || Math.abs(spring.vw) > 1;
  if (keepGoing) {
    requestFrame();
  } else {
    lastTs = 0;
    // 停下后再补一帧，保证最后状态精确
    drawShader(ts / 1000);
  }
}

function requestFrame() {
  if (rafId) return;
  rafId = requestAnimationFrame(frame);
}

function kick(energy = 1) {
  sheenEnergy = Math.max(sheenEnergy, energy);
  requestFrame();
}

function select(item, index) {
  pointerX = (tabEls[index] ? tabEls[index].offsetLeft + tabEls[index].offsetWidth / 2 : 0) / (barW.value || 1);
  kick(1);
  emit('select', item.path);
}

function onPointerMove(event) {
  const rect = barEl.value && barEl.value.getBoundingClientRect();
  if (!rect) return;
  pointerX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  kick(0.55);
}

function onPointerDown() {
  kick(1);
}

function onScroll() {
  if (scrollEl) {
    const top = scrollEl.scrollTop;
    // 内容滑动时高光带随之漂移，玻璃才有「活」的折射感
    sheenOffset = (sheenOffset + (top - lastScrollTop) * 0.0018) % 1;
    lastScrollTop = top;
  }
  kick(0.8);
}

watch(activeIndex, () => {
  updateTargets();
  kick(1);
});

onMounted(async () => {
  canRefract.value =
    typeof CSS !== 'undefined' &&
    CSS.supports &&
    (CSS.supports('backdrop-filter', 'url(#lg-refract)') ||
      CSS.supports('-webkit-backdrop-filter', 'url(#lg-refract)'));

  initShader();

  await nextTick();
  measure();

  if (typeof ResizeObserver !== 'undefined' && barEl.value) {
    resizeObserver = new ResizeObserver(() => measure());
    resizeObserver.observe(barEl.value);
  }

  // 页面滚动时给玻璃一点光，让折射感“活”起来
  scrollEl = document.querySelector('.page-scroll');
  if (scrollEl) {
    lastScrollTop = scrollEl.scrollTop;
    scrollEl.addEventListener('scroll', onScroll, { passive: true });
  }

  if (!reducedMotion) kick(1);
});

onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
  if (resizeObserver) resizeObserver.disconnect();
  if (scrollEl) scrollEl.removeEventListener('scroll', onScroll);
  const gl = shader.gl;
  if (gl) {
    const ext = gl.getExtension('WEBGL_lose_context');
    if (ext) ext.loseContext();
  }
  shader.ready = false;
});
</script>
