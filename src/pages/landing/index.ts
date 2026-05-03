/**
 * Landing Page Exports
 * 
 * Exporta el componente principal LandingPage y todos los componentes de secciones
 * para permitir importaciones flexibles desde cualquier parte de la aplicación.
 */

// Componente principal
export { LandingPage, default } from './LandingPage';

// Exportar todos los componentes de secciones para uso individual si es necesario
export { Navbar } from './sections/Navbar';
export { Hero } from './sections/Hero';
export { Features } from './sections/Features';
export { ChurchModule } from './sections/ChurchModule';
export { HowItWorks } from './sections/HowItWorks';
export { Testimonials } from './sections/Testimonials';
export { Pricing } from './sections/Pricing';
export { FAQ } from './sections/FAQ';
export { CTA } from './sections/CTA';
export { Footer } from './sections/Footer';

// Exportar datos y tipos reutilizables
export { features } from './sections/Features';
export { churchFeatures, testimonial, ctaData } from './sections/ChurchModule';
export { faqData } from './sections/FAQ';
export { plans } from './sections/Pricing';
export { defaultTestimonials } from './sections/Testimonials';

// Tipos exportados (solo los que están exportados en los módulos)
export type { PricingPlan } from './sections/Pricing';
