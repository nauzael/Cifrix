import React, { useEffect, lazy, Suspense } from 'react';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import { Navbar } from './sections/Navbar';
import { Hero } from './sections/Hero';
import { Features } from './sections/Features';
import { HowItWorks } from './sections/HowItWorks';
import { CTA } from './sections/CTA';
import { Footer } from './sections/Footer';
import { SectionSkeleton } from '../../components/SectionSkeleton';

/**
 * SoftwareApplication Schema para SEO
 * Define la aplicación software Cifrix para Google Rich Results
 */
export const softwareApplicationSchema = {
  '@context': 'https://schema.org' as const,
  '@type': 'SoftwareApplication' as const,
  name: 'Cifrix',
  applicationCategory: 'AccountingApplication',
  operatingSystem: 'Web, PWA',
  description: 'Software contable colombiano que funciona sin internet. Facturación electrónica, declaración de renta y módulo para iglesias.',
  offers: {
    '@type': 'Offer' as const,
    price: '0',
    priceCurrency: 'COP',
  },
  aggregateRating: {
    '@type': 'AggregateRating' as const,
    ratingValue: '4.8',
    bestRating: '5',
    ratingCount: '150',
  },
  url: 'https://cifrix.com',
  author: {
    '@type': 'Organization' as const,
    name: 'Cifrix',
  },
};

/**
 * Organization Schema para SEO
 * Define la organización Cifrix para Google Knowledge Graph
 */
export const organizationSchema = {
  '@context': 'https://schema.org' as const,
  '@type': 'Organization' as const,
  name: 'Cifrix',
  url: 'https://cifrix.com',
  logo: 'https://cifrix.com/logo.png',
  description: 'Software contable colombiano que funciona sin internet',
  sameAs: [
    'https://twitter.com/cifrix',
    'https://facebook.com/cifrix',
    'https://linkedin.com/company/cifrix',
    'https://github.com/cifrix',
  ],
  contactPoint: {
    '@type': 'ContactPoint' as const,
    telephone: '+57-601-123-4567',
    contactType: 'customer service',
    areaServed: 'CO',
    availableLanguage: ['Spanish', 'English'],
  },
  address: {
    '@type': 'PostalAddress' as const,
    addressLocality: 'Bogotá',
    addressCountry: 'CO',
  },
};

/**
 * LandingPage - Componente principal que integra todas las secciones
 *
 * Orden de secciones:
 * 1. Navbar (sticky arriba)
 * 2. Hero
 * 3. Features
 * 4. ChurchModule (lazy)
 * 5. HowItWorks
 * 6. Testimonials (lazy)
 * 7. Pricing (lazy)
 * 8. FAQ (lazy)
 * 9. CTA
 * 10. Footer
 *
 * Code Splitting:
 * - Componentes no críticos cargan bajo demanda (lazy loading)
 * - Loading fallbacks con skeleton loaders
 * - Bundle inicial optimizado (< 200KB)
 */

// Lazy loading de componentes no críticos para reducir el bundle inicial
export const LazyTestimonials = lazy(
  () => import('./sections/Testimonials').then(module => ({ default: module.Testimonials }))
);

export const LazyPricing = lazy(
  () => import('./sections/Pricing').then(module => ({ default: module.Pricing }))
);

export const LazyFAQ = lazy(
  () => import('./sections/FAQ').then(module => ({ default: module.FAQ }))
);

export const LazyChurchModule = lazy(
  () => import('./sections/ChurchModule').then(module => ({ default: module.ChurchModule }))
);

// Loading fallback component para secciones lazy
const SectionLoader: React.FC<{ label?: string }> = ({ label = 'Cargando...' }) => (
  <div className="py-16 sm:py-20 lg:py-24 bg-slate-50 dark:bg-slate-900" role="status" aria-label={label}>
    <SectionSkeleton />
  </div>
);

const LandingPageContent: React.FC = () => {
  // Smooth scroll para navegación entre secciones
  useEffect(() => {
    const handleSmoothScroll = () => {
      const links = document.querySelectorAll('a[href^="#"]');

      links.forEach((link) => {
        link.addEventListener('click', (e: Event) => {
          const target = link.getAttribute('href');
          if (target && target.startsWith('#') && target !== '#') {
            e.preventDefault();
            const element = document.querySelector(target);
            if (element) {
              const navHeight = 80; // Aproximado height del navbar
              const elementPosition = element.getBoundingClientRect().top + window.scrollY;
              const offsetPosition = elementPosition - navHeight;

              window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth',
              });
            }
          }
        });
      });
    };

    handleSmoothScroll();

    // Cleanup
    return () => {
      const links = document.querySelectorAll('a[href^="#"]');
      links.forEach((link) => {
        link.removeEventListener('click', () => {});
      });
    };
  }, []);

  return (
    <>
      {/* JSON-LD Schema for SoftwareApplication */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema) }}
        aria-hidden="true"
      />

      {/* JSON-LD Schema for Organization */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        aria-hidden="true"
      />

      {/* Meta tags de SEO con React Helmet */}
      <Helmet>
        <title>Cifrix - Software Contable Colombiano que Funciona Sin Internet</title>
        <meta
          name="description"
          content="Plataforma contable offline-first para Colombia. Facturación electrónica, declaración de renta y módulo para iglesias. ¡Trabaja sin internet y sincroniza automáticamente!"
        />
        <meta
          name="keywords"
          content="software contable, contabilidad Colombia, facturación electrónica, DIAN, módulo eclesiástico, offline-first, sincronización automática"
        />
        <meta name="author" content="Cifrix" />
        <meta name="robots" content="index, follow" />

        {/* Geo Meta Tags for Colombia */}
        <meta name="geo-region" content="CO" />
        <meta name="geo-placename" content="Bogotá" />
        <meta name="geo-position" content="4.7110;-74.0721" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://cifrix.com/" />
        <meta property="og:title" content="Cifrix - Software Contable Colombiano" />
        <meta property="og:description" content="Plataforma contable offline-first para Colombia. Facturación electrónica y módulo para iglesias." />
        <meta property="og:image" content="https://cifrix.com/og-image.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="Cifrix" />
        <meta property="og:locale" content="es_CO" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://cifrix.com/" />
        <meta property="twitter:title" content="Cifrix - Software Contable Colombiano" />
        <meta property="twitter:description" content="Plataforma contable offline-first para Colombia. Facturación electrónica y módulo para iglesias." />
        <meta property="twitter:image" content="https://cifrix.com/twitter-image.jpg" />
        <meta property="twitter:creator" content="@cifrix" />

        {/* Canonical URL */}
        <link rel="canonical" href="https://cifrix.com/" />

        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </Helmet>

      {/* Skip link para accesibilidad */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Saltar al contenido principal
      </a>

      {/* Navbar (sticky arriba) */}
      <Navbar />

      {/* Main container semántico */}
      <main id="main-content" role="main" className="min-h-screen">
        {/* Hero Section */}
        <section id="hero" aria-label="Sección principal">
          <Hero />
        </section>

        {/* Features Section */}
        <section id="features" aria-label="Características principales">
          <Features />
        </section>

        {/* Church Module Section - Lazy loaded con skeleton fallback */}
        <section id="church-module" aria-label="Módulo para iglesias">
          <Suspense fallback={<SectionLoader label="Cargando módulo para iglesias..." />}>
            <LazyChurchModule />
          </Suspense>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" aria-label="Cómo funciona">
          <HowItWorks />
        </section>

        {/* Testimonials Section - Lazy loaded con skeleton fallback */}
        <section id="testimonials" aria-label="Testimonios de clientes">
          <Suspense fallback={<SectionLoader label="Cargando testimonios..." />}>
            <LazyTestimonials />
          </Suspense>
        </section>

        {/* Pricing Section - Lazy loaded con skeleton fallback */}
        <section id="pricing" aria-label="Planes y precios">
          <Suspense fallback={<SectionLoader label="Cargando planes y precios..." />}>
            <LazyPricing />
          </Suspense>
        </section>

        {/* FAQ Section - Lazy loaded con skeleton fallback */}
        <section id="faq" aria-label="Preguntas frecuentes">
          <Suspense fallback={<SectionLoader label="Cargando preguntas frecuentes..." />}>
            <LazyFAQ />
          </Suspense>
        </section>

        {/* CTA Section */}
        <section id="cta" aria-label="Llamado a la acción">
          <CTA />
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </>
  );
};

/**
 * LandingPage - Componente principal con HelmetProvider
 */
export const LandingPage: React.FC = () => {
  return (
    <HelmetProvider>
      <LandingPageContent />
    </HelmetProvider>
  );
};

export default LandingPage;
