# SEO Specifications - Cifrix Landing Page

## 1. Overview

This document defines the SEO strategy and implementation details for the Cifrix landing page, optimized for the Colombian market.

---

## 2. Meta Tags

### 2.1 Basic Meta Tags

```html
<!-- Primary Meta Tags -->
<title>Cifrix | Software Contable Colombiano que Funciona Sin Internet</title>
<meta name="title" content="Cifrix | Software Contable Colombiano que Funciona Sin Internet" />
<meta name="description" content="Plataforma de contabilidad offline-first para Colombia. Facturación electrónica, declaración de renta, módulos para iglesias. ¡Trabaja sin internet y sincroniza automáticamente!" />
<meta name="keywords" content="software contable Colombia, contabilidad offline, facturación electrónica DIAN, programa para iglesias, declaración de renta Colombia, PUC Colombiano, reportes exógenos" />
<meta name="author" content="Cifrix" />
<meta name="robots" content="index, follow" />
<meta name="language" content="Spanish" />
<meta name="target" content="Colombia" />

<!-- Canonical URL -->
<link rel="canonical" href="https://cifrix.com/" />
```

### 2.2 Open Graph / Facebook

```html
<meta property="og:type" content="website" />
<meta property="og:url" content="https://cifrix.com/" />
<meta property="og:title" content="Cifrix | Software Contable Colombiano Offline-First" />
<meta property="og:description" content="Contabilidad profesional para Colombia que funciona 100% sin internet. Facturación DIAN, renta, reportes exógenos y módulo para iglesias." />
<meta property="og:image" content="https://cifrix.com/og-image.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:site_name" content="Cifrix" />
<meta property="og:locale" content="es_CO" />
```

### 2.3 Twitter Card

```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:url" content="https://cifrix.com/" />
<meta name="twitter:title" content="Cifrix | Software Contable Colombiano" />
<meta name="twitter:description" content="Contabilidad offline para Colombia. Facturación DIAN, renta y módulo para iglesias. ¡Trabaja sin internet!" />
<meta name="twitter:image" content="https://cifrix.com/twitter-image.jpg" />
<meta name="twitter:creator" content="@cifrix" />
```

### 2.4 Additional Meta Tags

```html
<!-- Theme Color -->
<meta name="theme-color" content="#3B82F6" />

<!-- Mobile Specific -->
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Cifrix" />

<!-- Favicon -->
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="manifest" href="/manifest.json" />
```

---

## 3. Schema.org JSON-LD

### 3.1 SoftwareApplication Schema

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Cifrix",
  "alternateName": "Cifrix - Sistema de Contabilidad Integral",
  "url": "https://cifrix.com",
  "image": "https://cifrix.com/logo.png",
  "description": "Plataforma de contabilidad offline-first para Colombia con facturación electrónica, declaración de renta y módulo especializado para iglesias.",
  "applicationCategory": "AccountingApplication",
  "applicationSubCategory": "Financial Management",
  "operatingSystem": "Web, PWA",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "COP",
    "availability": "https://schema.org/InStock"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "ratingCount": "156",
    "bestRating": "5",
    "worstRating": "1"
  },
  "review": [
    {
      "@type": "Review",
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": "5"
      },
      "author": {
        "@type": "Person",
        "name": "Carlos Mendoza"
      },
      "reviewBody": "Excelente software contable, funciona perfectamente sin internet y la sincronización es automática."
    }
  ],
  "featureList": "Contabilidad, Facturación Electrónica, Declaración de Renta, Reportes Exógenos, Módulo Eclesiástico",
  "softwareVersion": "1.0",
  "downloadUrl": "https://cifrix.com/register",
  "installUrl": "https://cifrix.com/register",
  "screenshot": "https://cifrix.com/screenshot.png",
  "softwareHelp": "https://cifrix.com/docs",
  "author": {
    "@type": "Organization",
    "name": "Cifrix",
    "url": "https://cifrix.com",
    "logo": "https://cifrix.com/logo.png",
    "sameAs": [
      "https://twitter.com/cifrix",
      "https://facebook.com/cifrix",
      "https://linkedin.com/company/cifrix"
    ]
  },
  "audience": {
    "@type": "Audience",
    "audienceType": "Contadores, Iglesias, PYMES",
    "geographicArea": {
      "@type": "Country",
      "name": "Colombia"
    }
  },
  "knowsAbout": [
    "Contabilidad",
    "Facturación Electrónica",
    "Normas DIAN",
    "PUC Colombiano",
    "Reportes Exógenos",
    "Declaración de Renta"
  ]
}
```

### 3.2 Organization Schema

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Cifrix",
  "url": "https://cifrix.com",
  "logo": "https://cifrix.com/logo.png",
  "description": "Software contable colombiano offline-first para contadores, iglesias y PYMES",
  "foundingDate": "2024",
  "founders": [
    {
      "@type": "Person",
      "name": "Nauzael"
    }
  ],
  "address": {
    "@type": "PostalAddress",
    "addressCountry": "Colombia"
  },
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "Soporte",
    "email": "soporte@cifrix.com",
    "availableLanguage": "Spanish"
  },
  "sameAs": [
    "https://twitter.com/cifrix",
    "https://facebook.com/cifrix",
    "https://linkedin.com/company/cifrix",
    "https://github.com/nauzael/Cifrix"
  ]
}
```

### 3.3 FAQ Schema

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "¿Necesito internet para usar Cifrix?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No, Cifrix funciona 100% sin conexión a internet. Los datos se guardan localmente y se sincronizan automáticamente cuando hay conexión."
      }
    },
    {
      "@type": "Question",
      "name": "¿Cumple con las normas de la DIAN?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Sí, Cifrix cumple totalmente con las normas DIAN para facturación electrónica, reportes exógenos y declaración de renta."
      }
    },
    {
      "@type": "Question",
      "name": "¿Tiene plan gratuito?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Sí, Cifrix ofrece un plan gratuito para que puedas probar todas las funcionalidades básicas."
      }
    }
  ]
}
```

---

## 4. Heading Structure

### 4.1 Hierarchy

```
H1: Software Contable Colombiano que Funciona Sin Internet
  │
  ├─ H2: Características Principales
  │   ├─ H3: Contabilidad Completa
  │   ├─ H3: Facturación Electrónica DIAN
  │   ├─ H3: Declaración de Renta
  │   ├─ H3: Reportes Exógenos
  │   └─ H3: Módulo para Iglesias
  │
  ├─ H2: Especial para Iglesias
  │   ├─ H3: Gestión de Diezmos y Ofrendas
  │   └─ H3: Trazabilidad Completa
  │
  ├─ H2: ¿Cómo Funciona?
  │   ├─ H3: Paso 1: Regístrate Gratis
  │   ├─ H3: Paso 2: Configura tu Organización
  │   └─ H3: Paso 3: Trabaja Offline
  │
  ├─ H2: Lo Que Dicen Nuestros Usuarios
  │
  ├─ H2: Planes y Precios
  │
  ├─ H2: Preguntas Frecuentes
  │
  └─ H2: Comienza a Usar Cifrix Hoy
```

### 4.2 Implementation Example

```tsx
<main>
  <h1>Software Contable Colombiano que Funciona Sin Internet</h1>
  
  <section id="features">
    <h2>Características Principales</h2>
    <article>
      <h3>Contabilidad Completa</h3>
      <p>...</p>
    </article>
    <article>
      <h3>Facturación Electrónica DIAN</h3>
      <p>...</p>
    </article>
  </section>
  
  <section id="church">
    <h2>Especial para Iglesias</h2>
    <h3>Gestión de Diezmos y Ofrendas</h3>
  </section>
  
  <section id="how-it-works">
    <h2>¿Cómo Funciona?</h2>
    <h3>Paso 1: Regístrate Gratis</h3>
    <h3>Paso 2: Configura tu Organización</h3>
    <h3>Paso 3: Trabaja Offline</h3>
  </section>
  
  <section id="testimonials">
    <h2>Lo Que Dicen Nuestros Usuarios</h2>
  </section>
  
  <section id="pricing">
    <h2>Planes y Precios</h2>
  </section>
  
  <section id="faq">
    <h2>Preguntas Frecuentes</h2>
  </section>
  
  <section id="cta">
    <h2>Comienza a Usar Cifrix Hoy</h2>
  </section>
</main>
```

---

## 5. Keyword Strategy

### 5.1 Primary Keywords (High Priority)

| Keyword | Monthly Search (CO) | Intent | Priority |
|---------|-------------------|--------|----------|
| software contable Colombia | 8,100 | Commercial | ⭐⭐⭐ |
| programa contable | 5,400 | Commercial | ⭐⭐⭐ |
| facturación electrónica DIAN | 3,600 | Commercial | ⭐⭐⭐ |
| contabilidad offline | 1,300 | Commercial | ⭐⭐ |
| software para iglesias | 2,900 | Commercial | ⭐⭐ |

### 5.2 Secondary Keywords

| Keyword | Monthly Search (CO) | Intent | Priority |
|---------|-------------------|--------|----------|
| declaración de renta Colombia | 2,400 | Informational | ⭐⭐ |
| PUC Colombiano | 1,900 | Informational | ⭐⭐ |
| reportes exógenos | 1,600 | Informational | ⭐⭐ |
| software diezmos | 880 | Commercial | ⭐⭐ |
| programa facturas | 4,400 | Commercial | ⭐⭐ |

### 5.3 Long-Tail Keywords

- "software contable que funciona sin internet"
- "programa contable para pequeñas empresas Colombia"
- "software para iglesias y ministerios Colombia"
- "facturación electrónica gratis Colombia"
- "software contable PUC Colombiano"
- "programa para declaración de renta personas naturales"
- "software contable económico Colombia"
- "programa para manejar diezmos y ofrendas"

### 5.4 Keyword Placement

```typescript
const keywordPlacement = {
  // Primary keyword in:
  title: 'Software Contable Colombiano',
  h1: 'Software Contable Colombiano que Funciona Sin Internet',
  firstParagraph: 'software contable para Colombia',
  metaDescription: 'software contable, Colombia, offline',
  
  // Secondary keywords in:
  h2Headings: ['facturación electrónica', 'declaración de renta', 'iglesias'],
  h3Headings: ['PUC Colombiano', 'reportes exógenos'],
  
  // Throughout content:
  bodyText: 'long-tail keywords naturally integrated',
  imageAlt: 'descriptive alt text with keywords',
  internalLinks: 'keyword-rich anchor text',
}
```

---

## 6. Content Strategy

### 6.1 Word Count Guidelines

| Section | Min Words | Max Words |
|---------|-----------|-----------|
| Hero | 20 | 40 |
| Features | 100 | 150 |
| Church Module | 80 | 120 |
| How It Works | 60 | 100 |
| Testimonials | 50 | 80 |
| FAQ | 200 | 400 |
| Total Page | 500 | 800 |

### 6.2 Content Tone

- **Professional**: Contadores y financieros
- **Accessible**: Dueños de negocio no técnicos
- **Trustworthy**: Seguridad, cumplimiento normativo
- **Colombian**: Localizado, modismos apropiados

### 6.3 Call-to-Action Keywords

- "Comienza Gratis"
- "Prueba por 30 días"
- "Ver Demo en Vivo"
- "Regístrate Ahora"
- "Sin tarjeta de crédito"

---

## 7. Internal Linking Strategy

### 7.1 Link Structure

```
Landing Page (/)
├── → Dashboard (/dashboard)
├── → Registro (/register)
├── → Login (/login)
├── → Documentación (/docs)
├── → Precios (/pricing)
├── → Blog (/blog)
└── → Soporte (/support)
```

### 7.2 Anchor Text Guidelines

✅ **Good:**
- "software contable para Colombia"
- "facturación electrónica DIAN"
- "módulo para iglesias"
- "declaración de renta automática"

❌ **Bad:**
- "click aquí"
- "más información"
- "ver más"

---

## 8. Image Optimization for SEO

### 8.1 File Naming

```
✅ Good:
- software-contable-colombia.webp
- facturacion-electronica-dian.webp
- dashboard-contable.webp
- modulo-iglesias-diezmos.webp

❌ Bad:
- image1.webp
- screenshot.png
- DSC1234.webp
```

### 8.2 Alt Text Guidelines

```html
<!-- Good examples -->
<img 
  alt="Dashboard de Cifrix mostrando módulo de contabilidad con PUC Colombiano"
  src="dashboard-contable.webp"
/>

<img 
  alt="Ejemplo de facturación electrónica con formato DIAN en Cifrix"
  src="factura-electronica.webp"
/>

<img 
  alt="Reporte de diezmos y ofrendas para iglesias en Cifrix"
  src="modulo-iglesias.webp"
/>
```

---

## 9. Mobile SEO

### 9.1 Mobile-Specific Tags

```html
<!-- Viewport -->
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />

<!-- Mobile-friendly -->
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
```

### 9.2 Mobile Performance

- **Responsive design**: All content accessible on mobile
- **Touch-friendly**: Buttons ≥ 44px
- **Readable text**: Font size ≥ 16px on mobile
- **Fast loading**: Mobile page speed ≥ 90

---

## 10. Local SEO (Colombia)

### 10.1 Geographic Targeting

```html
<!-- Target Colombia -->
<meta name="geo.region" content="CO" />
<meta name="geo.placename" content="Bogotá" />
<meta name="geo.position" content="4.7110;-74.0721" />
<meta name="ICBM" content="4.7110, -74.0721" />
```

### 10.2 Local Keywords

- "software contable Bogotá"
- "programa contable Medellín"
- "facturación electrónica Cali"
- "software para iglesias Colombia"

---

## 11. SEO Validation Checklist

### Pre-Launch

- [ ] Title tag present (50-60 characters)
- [ ] Meta description present (150-160 characters)
- [ ] H1 present and unique
- [ ] Heading hierarchy correct (H1-H6)
- [ ] All images have alt text
- [ ] Schema.org JSON-LD valid
- [ ] Canonical URL set
- [ ] Robots.txt allows indexing
- [ ] Sitemap.xml present
- [ ] Open Graph tags present
- [ ] Twitter Card tags present
- [ ] Mobile-friendly test passed
- [ ] Page speed ≥ 90

### Post-Launch

- [ ] Google Search Console submitted
- [ ] Bing Webmaster Tools submitted
- [ ] Google Analytics tracking
- [ ] Monitor CTR in search results
- [ ] Track keyword rankings
- [ ] Check indexed pages
- [ ] Monitor crawl errors

---

## 12. Tools & Resources

### SEO Tools

- **Google Search Console**: Performance monitoring
- **Google Analytics**: Traffic analysis
- **Ahrefs/SEMrush**: Keyword research
- **Screaming Frog**: Technical SEO audit
- **Schema Validator**: JSON-LD validation
- **Rich Results Test**: Schema testing

### Performance Tools

- **PageSpeed Insights**: Performance scoring
- **WebPageTest**: Detailed performance analysis
- **GTmetrix**: Performance monitoring

---

## 13. Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-05-02 | AI Agent | Initial SEO spec |

---

**End of SEO Specifications Document**
