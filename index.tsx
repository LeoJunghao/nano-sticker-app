
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 建立運行時墊片，避免 'process is not defined' 錯誤
// 這樣做可以確保 @google/genai SDK 讀取 process.env.API_KEY 時不會崩潰
if (typeof (window as any).process === 'undefined') {
  (window as any).process = { env: {} };
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
