import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";

import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
build: {
sourcemap: 'hidden',
rollupOptions: {
output: {
manualChunks: {
// React core - critical path
'reactor-core': ['react', 'react-dom', 'react-router-dom'],
// UI libraries - lazy load donde sea posible
'reactor-ui': ['framer-motion', 'lucide-react'],
// Charting - lazy load
'reactor-charts': ['chart.js', 'react-chartjs-2', 'recharts'],
// UI primitives
'reactor-ui-primitives': ['@radix-ui/react-slot'],
// Database layer
'reactor-db': ['@supabase/supabase-js', '@tanstack/react-query', 'dexie', 'dexie-react-hooks'],
// Utilities
'reactor-utils': ['zod', 'react-hook-form', 'uuid', 'node-forge'],
// PDF generation - lazy load
'reactor-pdf': ['jspdf', 'jspdf-autotable'],
},
},
},
},
  plugins: [
    react({
      babel: {
        plugins: [
          'react-dev-locator',
        ],
      },
    }),
    tsconfigPaths(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'robots.txt'],
      devOptions: {
        enabled: true // HABILITA EL SW EN MODO DESARROLLO
      },
      manifest: {
        name: 'Cifrix - Software Contable',
        short_name: 'Cifrix',
        description: 'Software Contable PWA (Multitenant & Iglesias)',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        maximumFileSizeToCacheInBytes: 6000000,
        navigateFallback: '/index.html', // IMPORTANTE: Sirve index.html para cualquier ruta desconocida (F5 offline)
        navigateFallbackAllowlist: [/^(?!\/__).*/] // Ignorar rutas de Vite internas
      }
    })
  ],
})
