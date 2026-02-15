import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { syncToSupabase } from './lib/sync';
import { APP_CONFIG, dbLog } from './lib/config';
import './lib/reconnection'; // Registrar listener de reconexión automática
import './lib/maintenance'; // Iniciar servicio de mantenimiento automático

// Initial sync solo si NO estamos en modo producción
if (APP_CONFIG.DB_MODE !== 'production') {
  syncToSupabase();
  dbLog('Initial sync triggered');
} else {
  dbLog('Initial sync SKIPPED - Running in production mode');
}

import { ErrorBoundary } from './components/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Para pruebas de modo offline, necesitamos que el SW funcione incluso en localhost
    // Se recomienda usar el modo "registerType: 'autoUpdate'" en vite.config.ts

    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('SW registered: ', registration);
    }).catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}
