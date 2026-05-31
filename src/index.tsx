
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const mountApp = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) return;

  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error("Erro crítico ao montar o React:", error);
    rootElement.innerHTML = `<div style="padding:40px;text-align:center;font-family:sans-serif;">
      <h2 style="color:#78350f">Falha ao iniciar App</h2>
      <p>Erro técnico: ${error.message}</p>
      <button onclick="location.reload()" style="background:#78350f;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer">Tentar Novamente</button>
    </div>`;
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountApp);
} else {
  mountApp();
}

// Register Service Worker for PWA support
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('Service Worker registrado com sucesso:', reg.scope);
      })
      .catch((err) => {
        console.error('Falha ao registrar Service Worker:', err);
      });
  });
}
