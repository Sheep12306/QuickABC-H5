import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    // 当 VITE_API_BASE=/api 时，开发环境把请求代理到后端，避免 CORS/混合内容
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://115.29.149.87:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: process.env.VITE_PROXY_TARGET || 'http://115.29.149.87:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // 页面按路由拆分后，CSS 也随页面各自拆包并按需加载
    cssCodeSplit: true,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        // 框架代码单独成块，发版后未变化时可继续命中浏览器缓存
        manualChunks: {
          vendor: ['vue', 'vue-router'],
        },
      },
    },
  },
});
