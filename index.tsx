
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 建立運行時墊片，確保 SDK 能讀取到動態設定的金鑰
if (typeof (window as any).process === 'undefined') {
  (window as any).process = { env: {} };
} else if (!(window as any).process.env) {
  (window as any).process.env = {};
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
