import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { defineCustomElements } from '@ionic/pwa-elements/loader';
import './index.css'
import App from './App.tsx'
import { initNativeStorage } from './services/storage';

// 初始化 Capacitor 原生存储（启动时从 Preferences 加载数据到内存）
initNativeStorage().then(() => {
  console.log('[App] Native storage ready');
}).catch((e) => {
  console.warn('[App] Native storage init failed:', e);
});

// 注册 Capacitor 自定义元素（相机、文件选择等原生组件）
defineCustomElements(window);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
