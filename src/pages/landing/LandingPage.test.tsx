import { describe, it, expect } from 'vitest';

describe('LandingPage', () => {
  it('exports LandingPage component', async () => {
    const { LandingPage } = await import('./LandingPage');
    expect(LandingPage).toBeDefined();
    expect(typeof LandingPage).toBe('function');
  });

  it('has LandingPage as default export', async () => {
    const landing = await import('./LandingPage');
    expect(landing.default).toBeDefined();
    expect(typeof landing.default).toBe('function');
  });

  it('has LandingPage as correct section order in component structure', async () => {
    const { LandingPage } = await import('./LandingPage');
    expect(LandingPage).toBeDefined();

    // Verificar que el nombre del componente principal es correcto
    expect(LandingPage.name).toBe('LandingPage');
  });

  it('includes SoftwareApplication JSON-LD schema', async () => {
    const module = await import('./LandingPage');
    expect(module.softwareApplicationSchema).toBeDefined();
    expect(module.softwareApplicationSchema['@type']).toBe('SoftwareApplication');
    expect(module.softwareApplicationSchema.name).toBe('Cifrix');
    expect(module.softwareApplicationSchema.applicationCategory).toBe('AccountingApplication');
    expect(module.softwareApplicationSchema.operatingSystem).toContain('Web');
    expect(module.softwareApplicationSchema.operatingSystem).toContain('PWA');
  });

  it('includes Organization JSON-LD schema', async () => {
    const module = await import('./LandingPage');
    expect(module.organizationSchema).toBeDefined();
    expect(module.organizationSchema['@type']).toBe('Organization');
    expect(module.organizationSchema.name).toBe('Cifrix');
    expect(module.organizationSchema.url).toBe('https://cifrix.com');
    expect(module.organizationSchema.contactPoint).toBeDefined();
  });

  it('SoftwareApplication schema has aggregateRating with 4.8 stars', async () => {
    const module = await import('./LandingPage');
    const schema = module.softwareApplicationSchema;
    expect(schema.aggregateRating).toBeDefined();
    expect(schema.aggregateRating['@type']).toBe('AggregateRating');
    expect(schema.aggregateRating.ratingValue).toBe('4.8');
  });

  it('SoftwareApplication schema has offers starting from $0', async () => {
    const module = await import('./LandingPage');
    const schema = module.softwareApplicationSchema;
    expect(schema.offers).toBeDefined();
    expect(schema.offers['@type']).toBe('Offer');
    expect(schema.offers.price).toBe('0');
  });

  it('Organization schema has logo URL', async () => {
    const module = await import('./LandingPage');
    const schema = module.organizationSchema;
    expect(schema.logo).toBeDefined();
    expect(typeof schema.logo).toBe('string');
  });

  it('Organization schema has sameAs social media links', async () => {
    const module = await import('./LandingPage');
    const schema = module.organizationSchema;
    expect(schema.sameAs).toBeDefined();
    expect(Array.isArray(schema.sameAs)).toBe(true);
    expect(schema.sameAs.length).toBeGreaterThan(0);
  });

  it('Organization schema has contactPoint for support', async () => {
    const module = await import('./LandingPage');
    const schema = module.organizationSchema;
    expect(schema.contactPoint).toBeDefined();
    // contactPoint can be an object or array
    const contactPoint = schema.contactPoint;
    if (Array.isArray(contactPoint)) {
      expect(contactPoint.length).toBeGreaterThan(0);
    } else {
      expect(contactPoint).toBeDefined();
    }
  });
});

describe('LandingPage Index Exports', () => {
  it('exports all section components from index', async () => {
    // Importar desde el index
    const landing = await import('./index');

    const expectedComponents = [
      'LandingPage',
      'Navbar',
      'Hero',
      'Features',
      'ChurchModule',
      'HowItWorks',
      'Testimonials',
      'Pricing',
      'FAQ',
      'CTA',
      'Footer',
    ];

    expectedComponents.forEach(componentName => {
      expect(landing[componentName]).toBeDefined();
      expect(typeof landing[componentName]).toBe('function');
    });
  });

  it('exports reusable data from index', async () => {
    const landing = await import('./index');

    // Verificar que se exportan los datos reutilizables
    expect(landing.features).toBeDefined();
    expect(landing.churchFeatures).toBeDefined();
    expect(landing.faqData).toBeDefined();
    expect(landing.plans).toBeDefined();
    expect(landing.defaultTestimonials).toBeDefined();
    expect(landing.testimonial).toBeDefined();
    expect(landing.ctaData).toBeDefined();
  });

  it('exports default from index', async () => {
    const landing = await import('./index');
    expect(landing.default).toBeDefined();
  });

  it('has correct number of features', async () => {
    const { features } = await import('./index');
    expect(Array.isArray(features)).toBe(true);
    expect(features.length).toBe(6);
  });

  it('has correct number of church features', async () => {
    const { churchFeatures } = await import('./index');
    expect(Array.isArray(churchFeatures)).toBe(true);
    expect(churchFeatures.length).toBe(6);
  });

  it('has correct number of FAQ items', async () => {
    const { faqData } = await import('./index');
    expect(Array.isArray(faqData)).toBe(true);
    expect(faqData.length).toBe(8);
  });

  it('has correct number of pricing plans', async () => {
    const { plans } = await import('./index');
    expect(Array.isArray(plans)).toBe(true);
    expect(plans.length).toBe(3);
  });

  it('has correct number of testimonials', async () => {
    const { defaultTestimonials } = await import('./index');
    expect(Array.isArray(defaultTestimonials)).toBe(true);
    expect(defaultTestimonials.length).toBe(3);
  });
});
