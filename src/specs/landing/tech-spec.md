# Technical Specifications - Cifrix Landing Page

## 1. Overview

This document defines the technical specifications for the Cifrix landing page using **Spec-Driven Development** methodology.

**Product**: Cifrix - Sistema de Contabilidad Integral  
**Target**: Contadores, Iglesias, PYMES en Colombia  
**Goal**: Modern, high-performance landing page optimized for conversions

---

## 2. Technology Stack

### Core Technologies
| Category | Technology | Version | Rationale |
|----------|-----------|---------|-----------|
| **Framework** | React | 18.x | Current project standard, excellent performance |
| **Language** | TypeScript | 5.8.x | Type safety, better DX |
| **Styling** | Tailwind CSS | 3.x | Utility-first, consistent design system |
| **Animations** | Framer Motion | Latest | Smooth, performant animations |
| **Icons** | Lucide React | Latest | Consistent, accessible icon set |
| **SEO** | React Helmet Async | Latest | Dynamic meta tags |

### Build & Performance
| Tool | Purpose |
|------|---------|
| **Vite** | Build tool, HMR, code splitting |
| **Rollup** | Bundle optimization |
| **esbuild** | Fast minification |

---

## 3. Component Architecture

### 3.1 Component Hierarchy

```
LandingPage (Main Container)
├── Navbar
│   ├── Logo
│   ├── NavLinks
│   └── CTAButton
├── Hero
│   ├── Badge
│   ├── Title
│   ├── Subtitle
│   └── CTAGroup (Primary + Secondary)
├── Features
│   ├── FeatureCard (x6)
│   │   ├── Icon
│   │   ├── Title
│   │   └── Description
├── ChurchModule (Highlighted)
│   ├── Title
│   ├── FeatureList
│   ├── Testimonial
│   └── CTA
├── HowItWorks
│   ├── Step (x3)
│   │   ├── Icon/Number
│   │   ├── Title
│   │   └── Description
├── Testimonials
│   ├── TestimonialCard (x3-5)
│   │   ├── Avatar
│   │   ├── Stars
│   │   ├── Quote
│   │   └── Author
├── Pricing
│   ├── Toggle (Monthly/Yearly)
│   ├── PricingCard (x3)
│   │   ├── PlanName
│   │   ├── Price
│   │   ├── Features
│   │   └── CTA
├── FAQ
│   ├── AccordionItem (x8-10)
│   │   ├── Question
│   │   └── Answer
├── CTA
│   ├── Title
│   ├── Subtitle
│   └── CTAButton
└── Footer
    ├── Logo
    ├── Links
    ├── SocialLinks
    └── Legal
```

### 3.2 Component Interfaces

```typescript
// Hero Component
interface HeroProps {
  title: string;
  subtitle: string;
  primaryCTA: {
    label: string;
    href: string;
  };
  secondaryCTA: {
    label: string;
    href: string;
  };
}

// Features Component
interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface FeaturesProps {
  features: Feature[];
}

// Pricing Component
interface PricingPlan {
  name: string;
  price: {
    monthly: number;
    yearly: number;
  };
  features: string[];
  cta: string;
  highlighted?: boolean;
}
```

---

## 4. Design System

### 4.1 Color Palette

```typescript
// Primary Colors - Brand
const colors = {
  brand: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6', // Primary
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },
  
  // Neutral
  neutral: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  
  // Semantic
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
}
```

### 4.2 Typography

- **Font Family**: Inter, system-ui, sans-serif
- **Scale**: xs (12px) to 6xl (60px)
- **Weights**: normal (400), medium (500), semibold (600), bold (700)

### 4.3 Breakpoints

- **sm**: 640px (Mobile landscape)
- **md**: 768px (Tablet)
- **lg**: 1024px (Laptop)
- **xl**: 1280px (Desktop)
- **2xl**: 1536px (Large desktop)

---

## 5. Animation Specifications

### 5.1 Principles
- **Purposeful**: Every animation serves a functional purpose
- **Performant**: Use CSS transforms and opacity only
- **Accessible**: Respect `prefers-reduced-motion`
- **Consistent**: Same easing curves throughout

### 5.2 Animation Variants

```typescript
const animationVariants = {
  fadeInUp: {
    hidden: { opacity: 0, y: 40 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }
    }
  },
  
  scaleIn: {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.4, ease: 'easeOut' }
    }
  },
}
```

---

## 6. Accessibility Requirements

### 6.1 WCAG 2.1 AA Compliance

**All components MUST meet:**
- ✅ Keyboard navigation (Tab, Enter, Escape)
- ✅ Focus indicators (visible, 2px minimum)
- ✅ ARIA labels where needed
- ✅ Color contrast ratio ≥ 4.5:1 (text), ≥ 3:1 (large text)
- ✅ Screen reader compatibility
- ✅ No motion for `prefers-reduced-motion`

### 6.2 Keyboard Navigation

- **Tab**: Move focus to next interactive element
- **Shift+Tab**: Move focus to previous interactive element
- **Enter**: Activate button/link
- **Escape**: Close modal/dropdown
- **Space**: Expand/collapse accordion item
- **Arrow keys**: Navigate carousel/accordion

---

## 7. Browser Support Matrix

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | Last 2 versions | ✅ Full |
| Firefox | Last 2 versions | ✅ Full |
| Safari | Last 2 versions | ✅ Full |
| Edge | Last 2 versions | ✅ Full |
| Chrome Mobile | Last 2 versions | ✅ Full |
| Safari Mobile (iOS) | Last 2 versions | ✅ Full |

**Not supported:**
- ❌ Internet Explorer (any version)

---

## 8. Performance Budgets

| Metric | Budget | Tool |
|--------|--------|------|
| **Bundle Size (JS)** | < 150 KB | Vite build |
| **Bundle Size (CSS)** | < 50 KB | Vite build |
| **Total Page Weight** | < 1 MB | Lighthouse |
| **LCP** | < 2.5 s | Web Vitals |
| **CLS** | < 0.1 | Web Vitals |
| **TBT** | < 200 ms | Lighthouse |
| **FCP** | < 1.8 s | Web Vitals |

---

## 9. Image Optimization

### 9.1 Image Formats
- **WebP**: All photos (Lossy, 75% quality)
- **PNG**: Logos, icons with transparency
- **SVG**: Icons, illustrations

### 9.2 Lazy Loading
- **Above the fold**: `loading="eager"` (Hero, Navbar)
- **Below the fold**: `loading="lazy"` (all other images)

---

## 10. Code Quality Standards

### 10.1 TypeScript Configuration
- Strict mode enabled
- noImplicitAny: true
- strictNullChecks: true
- noUnusedLocals: true

### 10.2 File Naming Conventions
- **Components**: `PascalCase.tsx` (e.g., `Hero.tsx`)
- **Utils**: `camelCase.ts` (e.g., `formatPrice.ts`)
- **Constants**: `SCREAMING_SNAKE_CASE.ts`

---

## 11. Component File Structure

```
src/pages/landing/
├── LandingPage.tsx           # Main container
├── index.ts                  # Exports
├── sections/
│   ├── Hero.tsx
│   ├── Features.tsx
│   ├── ChurchModule.tsx
│   ├── HowItWorks.tsx
│   ├── Testimonials.tsx
│   ├── Pricing.tsx
│   ├── FAQ.tsx
│   ├── CTA.tsx
│   ├── Navbar.tsx
│   └── Footer.tsx
├── components/
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Accordion.tsx
│   ├── Badge.tsx
│   └── Container.tsx
└── styles/
    ├── globals.css
    └── animations.css
```

---

## 12. Acceptance Criteria Checklist

### Functional Requirements
- [ ] All 10 sections implemented and functional
- [ ] Navbar with smooth scroll to sections
- [ ] Mobile hamburger menu working
- [ ] FAQ accordion expandable/collapsible
- [ ] Pricing toggle (monthly/yearly) working
- [ ] Testimonials carousel navigable
- [ ] All CTAs link to correct destinations
- [ ] Footer links functional

### Performance Requirements
- [ ] Lighthouse Performance ≥ 90
- [ ] LCP < 2.5s
- [ ] CLS < 0.1
- [ ] Bundle size < 200KB
- [ ] Images optimized (WebP, lazy loading)

### Accessibility Requirements
- [ ] Keyboard navigation working
- [ ] Focus indicators visible
- [ ] ARIA labels present
- [ ] Color contrast ≥ 4.5:1
- [ ] Screen reader tested
- [ ] `prefers-reduced-motion` respected

### SEO Requirements
- [ ] Meta tags present
- [ ] Schema.org JSON-LD valid
- [ ] Heading hierarchy correct (H1-H6)
- [ ] Alt text on all images
- [ ] Canonical URL set

### Responsive Requirements
- [ ] Mobile (320px) - fully functional
- [ ] Tablet (768px) - 2-column layout
- [ ] Desktop (1280px) - full layout
- [ ] All breakpoints tested

---

## 13. Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-05-02 | AI Agent | Initial spec document |

---

**End of Technical Specifications Document**
