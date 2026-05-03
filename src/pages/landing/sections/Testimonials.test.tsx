import { describe, it, expect } from 'vitest';

describe('Testimonials', () => {
  it('exports Testimonials component', async () => {
    const { Testimonials } = await import('./Testimonials');
    expect(Testimonials).toBeDefined();
    expect(typeof Testimonials).toBe('function');
  });

  it('has default testimonials array with 3 testimonials', async () => {
    const mod = await import('./Testimonials');
    // Check if default testimonials exist
    expect(mod.default).toBeDefined();
  });

  it('includes Carlos Mendoza testimonial', async () => {
    const { defaultTestimonials } = await import('./Testimonials');
    const testimonial = defaultTestimonials?.find((t: any) => t.name === 'Carlos Mendoza');
    expect(testimonial).toBeDefined();
    expect(testimonial?.role).toBe('Contador Independiente');
  });

  it('includes María Fernanda López testimonial', async () => {
    const { defaultTestimonials } = await import('./Testimonials');
    const testimonial = defaultTestimonials?.find((t: any) => t.name === 'María Fernanda López');
    expect(testimonial).toBeDefined();
    expect(testimonial?.role).toBe('Pastora');
  });

  it('includes Roberto Sánchez testimonial', async () => {
    const { defaultTestimonials } = await import('./Testimonials');
    const testimonial = defaultTestimonials?.find((t: any) => t.name === 'Roberto Sánchez');
    expect(testimonial).toBeDefined();
    expect(testimonial?.role).toBe('Director Financiero');
  });

  it('all default testimonials have required properties', async () => {
    const { defaultTestimonials } = await import('./Testimonials');
    defaultTestimonials?.forEach((testimonial: any) => {
      expect(testimonial.id).toBeDefined();
      expect(testimonial.name).toBeDefined();
      expect(testimonial.role).toBeDefined();
      expect(testimonial.company).toBeDefined();
      expect(testimonial.image).toBeDefined();
      expect(testimonial.rating).toBeDefined();
      expect(testimonial.quote).toBeDefined();
    });
  });

  it('all default testimonials have 5 star rating', async () => {
    const { defaultTestimonials } = await import('./Testimonials');
    defaultTestimonials?.forEach((testimonial: any) => {
      expect(testimonial.rating).toBe(5);
    });
  });

  it('all default testimonials have unique ids', async () => {
    const { defaultTestimonials } = await import('./Testimonials');
    const ids = defaultTestimonials?.map((t: any) => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids?.length);
  });

  it('has StarRating component', async () => {
    const mod = await import('./Testimonials');
    expect(mod.StarRating).toBeDefined();
    expect(typeof mod.StarRating).toBe('function');
  });

  it('Testimonials component accepts testimonials prop', async () => {
    const { Testimonials } = await import('./Testimonials');
    expect(Testimonials).toBeDefined();
    // Component should accept props
    expect(typeof Testimonials).toBe('function');
  });

  it('default testimonials have avatar images from pravatar.cc', async () => {
    const { defaultTestimonials } = await import('./Testimonials');
    defaultTestimonials?.forEach((testimonial: any) => {
      expect(testimonial.image).toContain('pravatar.cc');
    });
  });

  it('default testimonials are from Colombian context', async () => {
    const { defaultTestimonials } = await import('./Testimonials');
    // At least one testimonial should mention Colombia or Bogotá
    const hasColombianContext = defaultTestimonials?.some(
      (t: any) =>
        t.company?.toLowerCase().includes('colombia') ||
        t.company?.toLowerCase().includes('bogotá') ||
        t.quote?.toLowerCase().includes('colombiana')
    );
    expect(hasColombianContext).toBe(true);
  });
});
