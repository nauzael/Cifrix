import { describe, it, expect } from 'vitest';

describe('LazyLoadedComponents', () => {
  it('exports LazyTestimonials component', async () => {
    const { LazyTestimonials } = await import('./LandingPage');
    expect(LazyTestimonials).toBeDefined();
    // Lazy components are objects with _payload property
    expect(LazyTestimonials).toBeDefined();
  });

  it('exports LazyPricing component', async () => {
    const { LazyPricing } = await import('./LandingPage');
    expect(LazyPricing).toBeDefined();
  });

  it('exports LazyFAQ component', async () => {
    const { LazyFAQ } = await import('./LandingPage');
    expect(LazyFAQ).toBeDefined();
  });

  it('exports LazyChurchModule component', async () => {
    const { LazyChurchModule } = await import('./LandingPage');
    expect(LazyChurchModule).toBeDefined();
  });

  it('LazyTestimonials is a lazy component', async () => {
    const { LazyTestimonials } = await import('./LandingPage');
    // Lazy components have _payload property
    expect(LazyTestimonials).toHaveProperty('_payload');
  });

  it('LazyPricing is a lazy component', async () => {
    const { LazyPricing } = await import('./LandingPage');
    expect(LazyPricing).toHaveProperty('_payload');
  });

  it('LazyFAQ is a lazy component', async () => {
    const { LazyFAQ } = await import('./LandingPage');
    expect(LazyFAQ).toHaveProperty('_payload');
  });

  it('LazyChurchModule is a lazy component', async () => {
    const { LazyChurchModule } = await import('./LandingPage');
    expect(LazyChurchModule).toHaveProperty('_payload');
  });

  it('all lazy components have _payload property for code splitting', async () => {
    const { LazyTestimonials, LazyPricing, LazyFAQ, LazyChurchModule } = await import('./LandingPage');
    expect(LazyTestimonials).toHaveProperty('_payload');
    expect(LazyPricing).toHaveProperty('_payload');
    expect(LazyFAQ).toHaveProperty('_payload');
    expect(LazyChurchModule).toHaveProperty('_payload');
  });
});

describe('SectionSkeleton exports', () => {
  it('exports SectionSkeleton from components', async () => {
    const { SectionSkeleton } = await import('../../components/SectionSkeleton');
    expect(SectionSkeleton).toBeDefined();
    expect(typeof SectionSkeleton).toBe('function');
  });
});
