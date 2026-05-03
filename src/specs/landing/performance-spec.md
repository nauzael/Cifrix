# Performance Specifications - Cifrix Landing Page

## 1. Overview

This document defines performance budgets, optimization strategies, and validation metrics for the Cifrix landing page.

---

## 2. Performance Budgets

### 2.1 Core Web Vitals

| Metric | Budget | Target | Tool |
|--------|--------|--------|------|
| **LCP (Largest Contentful Paint)** | < 2.5s | < 2.0s | Web Vitals |
| **CLS (Cumulative Layout Shift)** | < 0.1 | < 0.05 | Web Vitals |
| **TBT (Total Blocking Time)** | < 200ms | < 150ms | Lighthouse |
| **FCP (First Contentful Paint)** | < 1.8s | < 1.5s | Web Vitals |
| **TTI (Time to Interactive)** | < 3.8s | < 3.0s | Lighthouse |
| **Speed Index** | < 3.4s | < 3.0s | Lighthouse |

### 2.2 Size Budgets

| Resource | Budget | Target | Tool |
|----------|--------|--------|------|
| **JavaScript (total)** | < 150 KB | < 120 KB | Vite build |
| **JavaScript (initial)** | < 70 KB | < 50 KB | Vite build |
| **CSS (total)** | < 50 KB | < 40 KB | Vite build |
| **CSS (critical)** | < 14 KB | < 10 KB | Critical CSS |
| **Images (total)** | < 500 KB | < 400 KB | Lighthouse |
| **Images (hero)** | < 100 KB | < 80 KB | Optimized |
| **Fonts (total)** | < 100 KB | < 80 KB | Font optimization |
| **Total Page Weight** | < 1 MB | < 800 KB | Lighthouse |

### 2.3 Request Budgets

| Resource Type | Budget | Target |
|--------------|--------|--------|
| **Total Requests** | < 50 | < 40 |
| **JavaScript Requests** | < 10 | < 6 |
| **CSS Requests** | < 5 | < 3 |
| **Image Requests** | < 20 | < 15 |
| **Font Requests** | < 5 | < 3 |
| **Third-party Requests** | < 10 | < 5 |

---

## 3. Optimization Strategies

### 3.1 Code Splitting

```typescript
// Route-based code splitting
const LandingPage = lazy(() => import('./pages/landing/LandingPage'));
const Hero = lazy(() => import('./pages/landing/sections/Hero'));
const Features = lazy(() => import('./pages/landing/sections/Features'));

// Component-level code splitting
const Testimonials = lazy(() => import('./pages/landing/sections/Testimonials'));
const Pricing = lazy(() => import('./pages/landing/sections/Pricing'));
```

### 3.2 Tree Shaking

```javascript
// ✅ Good - Import only what you use
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

// ❌ Bad - Importing entire library
import * as LucideIcons from 'lucide-react';
```

### 3.3 Image Optimization

```html
<!-- Responsive images with WebP -->
<picture>
  <source 
    type="image/webp"
    srcset="
      hero-480.webp 480w,
      hero-768.webp 768w,
      hero-1200.webp 1200w
    "
  />
  <img
    src="hero-768.jpg"
    alt="Dashboard Cifrix"
    loading="eager"
    width="1200"
    height="630"
    fetchpriority="high"
  />
</picture>

<!-- Lazy loading for below-fold images -->
<img
  src="feature-1.webp"
  alt="Feature 1"
  loading="lazy"
  width="400"
  height="300"
/>
```

### 3.4 Font Optimization

```html
<!-- Preload critical fonts -->
<link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin />

<!-- Use font-display: swap -->
<style>
  @font-face {
    font-family: 'Inter';
    src: url('/fonts/inter-var.woff2') format('woff2');
    font-display: swap;
  }
</style>
```

### 3.5 Critical CSS

```html
<!-- Inline critical CSS -->
<style>
  /* Critical CSS for above-fold content */
  .hero { min-height: 100vh; display: flex; align-items: center; }
  .btn { padding: 12px 24px; border-radius: 8px; }
</style>

<!-- Load non-critical CSS asynchronously -->
<link rel="preload" href="/styles/non-critical.css" as="style" onload="this.rel='stylesheet'" />
```

### 3.6 Third-Party Script Optimization

```html
<!-- Google Analytics - Async -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>

<!-- Defer non-critical scripts -->
<script defer src="/analytics.js"></script>

<!-- Lazy load after page load -->
<script>
  window.addEventListener('load', () => {
    setTimeout(() => {
      const script = document.createElement('script');
      script.src = '/hotjar.js';
      document.body.appendChild(script);
    }, 5000);
  });
</script>
```

---

## 4. Caching Strategy

### 4.1 HTTP Cache Headers

```
# Static assets (images, fonts, JS, CSS)
Cache-Control: public, max-age=31536000, immutable

# HTML pages
Cache-Control: public, max-age=0, must-revalidate

# API responses
Cache-Control: private, max-age=60, stale-while-revalidate=300
```

### 4.2 Service Worker Strategy

```javascript
// Workbox configuration
const wb = new WorkboxSW();

// Cache-first for static assets
wb.registerRoute(
  /\/static\/.*/,
  new CacheFirstStrategy()
);

// Network-first for API calls
wb.registerRoute(
  /\/api\/.*/,
  new NetworkFirstStrategy()
);

// Stale-while-revalidate for images
wb.registerRoute(
  /\.(jpg|jpeg|png|gif|webp|svg)$/,
  new StaleWhileRevalidateStrategy()
);
```

---

## 5. Performance Monitoring

### 5.1 Real User Monitoring (RUM)

```typescript
// Web Vitals tracking
import { onLCP, onCLS, onTTFB, onFCP, onINP } from 'web-vitals';

function sendToAnalytics(metric) {
  const body = {
    name: metric.name,
    value: metric.value,
    delta: metric.delta,
    rating: metric.rating,
    id: metric.id,
    navigationType: metric.navigationType,
    url: window.location.href,
  };
  
  // Send to analytics
  fetch('/api/metrics', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

onLCP(sendToAnalytics);
onCLS(sendToAnalytics);
onTTFB(sendToAnalytics);
onFCP(sendToAnalytics);
onINP(sendToAnalytics);
```

### 5.2 Performance Budget Alerts

```typescript
// performance-budget.js
const budgets = [
  {
    resourceType: 'script',
    size: 150000, // bytes
  },
  {
    resourceType: 'stylesheet',
    size: 50000,
  },
  {
    resourceType: 'image',
    size: 500000,
  },
  {
    resourceType: 'total',
    size: 1000000,
  },
];
```

---

## 6. Build Optimization

### 6.1 Vite Configuration

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'motion-vendor': ['framer-motion'],
        },
      },
    },
  },
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
});
```

### 6.2 Bundle Analysis

```bash
# Install bundle analyzer
npm install -D rollup-plugin-visualizer

# Add to vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
    }),
  ],
});
```

---

## 7. Performance Checklist

### Pre-Launch

- [ ] Lighthouse Performance score ≥ 90
- [ ] LCP < 2.5s
- [ ] CLS < 0.1
- [ ] TBT < 200ms
- [ ] Bundle size < 200KB
- [ ] Images optimized (WebP, lazy loading)
- [ ] Code splitting implemented
- [ ] Critical CSS inlined
- [ ] Third-party scripts optimized
- [ ] Caching headers configured
- [ ] Service worker configured (PWA)

### Post-Launch

- [ ] Monitor Core Web Vitals in production
- [ ] Track performance trends over time
- [ ] Set up performance budgets in CI/CD
- [ ] Alert on performance regressions
- [ ] Regular performance audits (monthly)

---

## 8. Performance Testing Commands

```bash
# Lighthouse CI
npm install -g @lhci/cli
lhci autorun

# WebPageTest
# https://www.webpagetest.org/

# PageSpeed Insights
# https://pagespeed.web.dev/

# Chrome DevTools Performance tab
# Open DevTools → Performance → Record
```

---

## 9. Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-05-02 | AI Agent | Initial performance spec |

---

**End of Performance Specifications Document**
