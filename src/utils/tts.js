// 语音合成封装：后端 Edge TTS 生成 MP3 后返回音频地址
import api from './api';

const TTS_AVAILABLE = true;
const cache = {};

export function isAvailable() {
  return TTS_AVAILABLE;
}

function getAudioUrl(text, lang) {
  return api.getCommuteTts(text, lang);
}

export function textToSpeech(text, lang = 'en_US') {
  const key = `${lang}:${text}`;
  if (cache[key]) return Promise.resolve(cache[key]);
  return getAudioUrl(text, lang).then((url) => {
    if (url) cache[key] = url;
    return url;
  });
}

export default { textToSpeech, isAvailable };
