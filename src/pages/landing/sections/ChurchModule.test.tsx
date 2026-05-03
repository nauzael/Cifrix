import { describe, it, expect } from 'vitest';

describe('ChurchModule', () => {
  it('exports ChurchModule component', async () => {
    const { ChurchModule } = await import('./ChurchModule');
    expect(ChurchModule).toBeDefined();
    expect(typeof ChurchModule).toBe('function');
  });

  it('has 6 specific features for churches', async () => {
    const { churchFeatures } = await import('./ChurchModule');
    expect(churchFeatures.length).toBe(6);
  });

  it('includes Gestión de Diezmos y Ofrendas feature', async () => {
    const { churchFeatures } = await import('./ChurchModule');
    const feature = churchFeatures.find(f => f.id === 'diezmos-ofrendas');
    expect(feature).toBeDefined();
    expect(feature?.title).toBe('Gestión de Diezmos y Ofrendas');
  });

  it('includes Trazabilidad de Donaciones feature', async () => {
    const { churchFeatures } = await import('./ChurchModule');
    const feature = churchFeatures.find(f => f.id === 'trazabilidad-donaciones');
    expect(feature).toBeDefined();
    expect(feature?.title).toBe('Trazabilidad de Donaciones');
  });

  it('includes Control de Miembros feature', async () => {
    const { churchFeatures } = await import('./ChurchModule');
    const feature = churchFeatures.find(f => f.id === 'control-miembros');
    expect(feature).toBeDefined();
    expect(feature?.title).toBe('Control de Miembros');
  });

  it('includes Reportes Personalizados feature', async () => {
    const { churchFeatures } = await import('./ChurchModule');
    const feature = churchFeatures.find(f => f.id === 'reportes-personalizados');
    expect(feature).toBeDefined();
    expect(feature?.title).toBe('Reportes Personalizados');
  });

  it('includes Certificados de Donación feature', async () => {
    const { churchFeatures } = await import('./ChurchModule');
    const feature = churchFeatures.find(f => f.id === 'certificados-donacion');
    expect(feature).toBeDefined();
    expect(feature?.title).toBe('Certificados de Donación');
  });

  it('includes Múltiples Sedes feature', async () => {
    const { churchFeatures } = await import('./ChurchModule');
    const feature = churchFeatures.find(f => f.id === 'multiples-sedes');
    expect(feature).toBeDefined();
    expect(feature?.title).toBe('Múltiples Sedes');
  });

  it('has testimonial from Pastor Juan Pérez', async () => {
    const { testimonial } = await import('./ChurchModule');
    expect(testimonial).toBeDefined();
    expect(testimonial.text).toContain('diezmos');
    expect(testimonial.author).toBe('Pastor Juan Pérez');
    expect(testimonial.church).toBe('Iglesia Vida Nueva');
  });

  it('has CTA with specific price', async () => {
    const { ctaData } = await import('./ChurchModule');
    expect(ctaData).toBeDefined();
    expect(ctaData.price).toBe('$29,900/mes');
    expect(ctaData.title).toContain('Plan para Iglesias');
  });

  it('all features have required properties', async () => {
    const { churchFeatures } = await import('./ChurchModule');
    churchFeatures.forEach(feature => {
      expect(feature.id).toBeDefined();
      expect(feature.title).toBeDefined();
      expect(feature.description).toBeDefined();
      expect('icon' in feature).toBe(true);
    });
  });

  it('all features have unique ids', async () => {
    const { churchFeatures } = await import('./ChurchModule');
    const ids = churchFeatures.map(f => f.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});
