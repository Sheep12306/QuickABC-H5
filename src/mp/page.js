// 把小程序 Page({...}) 配置适配为 Vue 组件
import { reactive } from 'vue';
import { registerPage } from './nav';

const LIFECYCLE = new Set(['onLoad', 'onShow', 'onHide', 'onUnload', 'onReady', 'onPullDownRefresh', 'onReachBottom']);

function deepClone(value) {
  if (value === null || typeof value !== 'object') return value;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (e) {
    return value;
  }
}

function toNumberIfNumeric(value) {
  if (typeof value !== 'string') return value;
  if (value !== '' && /^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value;
}

function datasetOf(el) {
  const dataset = {};
  if (!el || !el.attributes) return dataset;
  for (const attr of Array.from(el.attributes)) {
    if (!attr.name.startsWith('data-')) continue;
    let key = attr.name.slice(5);
    if (key.endsWith('-json')) {
      const base = key.slice(0, -5);
      try {
        dataset[camel(base)] = JSON.parse(attr.value);
      } catch (e) {
        dataset[camel(base)] = attr.value;
      }
      continue;
    }
    dataset[camel(key)] = toNumberIfNumeric(attr.value);
  }
  return dataset;
}

function camel(s) {
  return s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

export function makeMpEvent(e) {
  const target = e && e.target;
  const currentTarget = (e && e.currentTarget) || target;
  let detailValue;
  if (target) {
    if (target.tagName === 'SELECT') {
      detailValue = toNumberIfNumeric(target.value);
    } else if (target.type === 'checkbox') {
      detailValue = target.checked;
    } else if ('value' in target) {
      detailValue = target.value;
    }
  }
  const detail = { value: detailValue };
  if (target && target.type === 'checkbox') detail.checked = target.checked;
  return {
    type: e && e.type,
    timeStamp: Date.now(),
    detail,
    target: { dataset: datasetOf(target), value: target ? target.value : undefined },
    currentTarget: { dataset: datasetOf(currentTarget), id: currentTarget ? currentTarget.id : '' },
    preventDefault: () => e && e.preventDefault && e.preventDefault(),
    stopPropagation: () => e && e.stopPropagation && e.stopPropagation(),
    _originalEvent: e,
  };
}

function setByPath(obj, path, value) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (cur[key] === null || typeof cur[key] !== 'object') cur[key] = {};
    cur = cur[key];
  }
  cur[parts[parts.length - 1]] = value;
}

export function createPage(config) {
  const sourceData = typeof config.data === 'function' ? config.data() : config.data || {};
  const initialData = deepClone(sourceData);

  const methods = {};
  const extraState = {};

  Object.keys(config).forEach((key) => {
    if (key === 'data' || LIFECYCLE.has(key)) return;
    const value = config[key];
    if (typeof value === 'function') methods[key] = value;
    else extraState[key] = value;
  });

  return {
    data() {
      return deepClone(initialData);
    },
    created() {
      // 小程序里直接挂在 Page 实例上的状态（innerAudioContext、_tapLock 等）保持原始对象，
      // 避免被 Vue 的 reactive 包装（音频/DOM 对象被代理后调用原生方法会报 Illegal invocation）
      Object.keys(extraState).forEach((key) => {
        this[key] = deepClone(extraState[key]);
      });
      // 事件派发走单独的映射：避免 data 中的同名字段（如 my 页 showPhoneModal）遮蔽方法
      this.__mpMethods = methods;
    },
    methods: {
      setData(patch, callback) {
        if (!patch) return;
        Object.keys(patch).forEach((key) => {
          if (key.indexOf('.') !== -1) setByPath(this.$data, key, patch[key]);
          else this.$data[key] = patch[key];
        });
        if (typeof callback === 'function') this.$nextTick(callback);
      },
      mp(name, event) {
        const fn = (this.__mpMethods && this.__mpMethods[name]) || this[name];
        if (typeof fn === 'function') return fn.call(this, makeMpEvent(event));
        console.warn(`[mp] 未找到事件处理函数: ${name}`);
        return undefined;
      },
      ...methods,
    },
    mounted() {
      registerPage(this);
      if (typeof config.onLoad === 'function') config.onLoad.call(this, this.$route.query || {});
      if (typeof config.onReady === 'function') config.onReady.call(this);
      if (typeof config.onShow === 'function') config.onShow.call(this);
    },
    beforeUnmount() {
      if (typeof config.onHide === 'function') config.onHide.call(this);
      if (typeof config.onUnload === 'function') config.onUnload.call(this);
    },
  };
}

// 供特殊页面直接使用响应式对象
export { reactive };
