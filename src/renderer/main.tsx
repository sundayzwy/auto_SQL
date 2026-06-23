import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

/**
 * 渲染进程入口文件
 *
 * 负责将 React 应用挂载到 DOM 的 #root 节点上。
 * 使用 React.StrictMode 包裹以启用开发时的额外检查。
 * 导入全局样式文件 global.css（包含 Tailwind CSS 基础样式）。
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
