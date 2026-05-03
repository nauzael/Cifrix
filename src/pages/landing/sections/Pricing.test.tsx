import { describe, it, expect } from 'vitest';

describe('Pricing', () => {
  it('exports Pricing component', async () => {
    const { Pricing } = await import('./Pricing');
    expect(Pricing).toBeDefined();
    expect(typeof Pricing).toBe('function');
  });

  it('has 3 pricing plans', async () => {
    const { plans } = await import('./Pricing');
    expect(plans.length).toBe(3);
  });

  it('includes Gratis plan (free tier)', async () => {
    const { plans } = await import('./Pricing');
    const plan = plans.find(p => p.id === 'gratis');
    expect(plan).toBeDefined();
    expect(plan?.name).toBe('Gratis');
    expect(plan?.priceMonthly).toBe(0);
    expect(plan?.priceYearly).toBe(0);
  });

  it('includes Profesional plan (featured)', async () => {
    const { plans } = await import('./Pricing');
    const plan = plans.find(p => p.id === 'profesional');
    expect(plan).toBeDefined();
    expect(plan?.name).toBe('Profesional');
    expect(plan?.priceMonthly).toBe(49900);
    expect(plan?.featured).toBe(true);
  });

  it('includes Empresarial plan (premium tier)', async () => {
    const { plans } = await import('./Pricing');
    const plan = plans.find(p => p.id === 'empresarial');
    expect(plan).toBeDefined();
    expect(plan?.name).toBe('Empresarial');
    expect(plan?.priceMonthly).toBe(99900);
  });

  it('Gratis plan has basic features', async () => {
    const { plans } = await import('./Pricing');
    const plan = plans.find(p => p.id === 'gratis');
    expect(plan).toBeDefined();
    expect(plan?.features).toContainEqual(expect.stringContaining('1 usuario'));
    expect(plan?.features).toContainEqual(expect.stringContaining('50 transacciones'));
    expect(plan?.features).toContainEqual(expect.stringContaining('Contabilidad básica'));
    expect(plan?.features).toContainEqual(expect.stringContaining('1 organización'));
  });

  it('Profesional plan has complete features', async () => {
    const { plans } = await import('./Pricing');
    const plan = plans.find(p => p.id === 'profesional');
    expect(plan).toBeDefined();
    expect(plan?.features).toContainEqual(expect.stringContaining('5 usuarios'));
    expect(plan?.features).toContainEqual(expect.stringContaining('Transacciones ilimitadas'));
    expect(plan?.features).toContainEqual(expect.stringContaining('Facturación DIAN'));
    expect(plan?.features).toContainEqual(expect.stringContaining('Renta'));
    expect(plan?.features).toContainEqual(expect.stringContaining('3 organizaciones'));
    expect(plan?.features).toContainEqual(expect.stringContaining('Sync automático'));
  });

  it('Empresarial plan has unlimited features', async () => {
    const { plans } = await import('./Pricing');
    const plan = plans.find(p => p.id === 'empresarial');
    expect(plan).toBeDefined();
    expect(plan?.features).toContainEqual(expect.stringContaining('Usuarios ilimitados'));
    expect(plan?.features).toContainEqual(expect.stringContaining('Todo ilimitado'));
    expect(plan?.features).toContainEqual(expect.stringContaining('Módulo eclesiástico'));
    expect(plan?.features).toContainEqual(expect.stringContaining('Soporte premium'));
    expect(plan?.features).toContainEqual(expect.stringContaining('Organizaciones ilimitadas'));
  });

  it('all plans have required properties', async () => {
    const { plans } = await import('./Pricing');
    plans.forEach(plan => {
      expect(plan.id).toBeDefined();
      expect(plan.name).toBeDefined();
      expect(plan.priceMonthly).toBeDefined();
      expect(plan.priceYearly).toBeDefined();
      expect(plan.features).toBeDefined();
      expect(Array.isArray(plan.features)).toBe(true);
    });
  });

  it('all plans have unique ids', async () => {
    const { plans } = await import('./Pricing');
    const ids = plans.map(p => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('yearly price includes 20% discount', async () => {
    const { plans } = await import('./Pricing');
    
    // Check Profesional plan yearly price (20% discount)
    const profesional = plans.find(p => p.id === 'profesional');
    expect(profesional).toBeDefined();
    const expectedYearly = Math.round(profesional!.priceMonthly * 12 * 0.8);
    expect(profesional!.priceYearly).toBe(expectedYearly);

    // Check Empresarial plan yearly price (20% discount)
    const empresarial = plans.find(p => p.id === 'empresarial');
    expect(empresarial).toBeDefined();
    const expectedEmpresarialYearly = Math.round(empresarial!.priceMonthly * 12 * 0.8);
    expect(empresarial!.priceYearly).toBe(expectedEmpresarialYearly);
  });

  it('has exactly one featured plan', async () => {
    const { plans } = await import('./Pricing');
    const featuredPlans = plans.filter(p => p.featured);
    expect(featuredPlans.length).toBe(1);
    expect(featuredPlans[0].id).toBe('profesional');
  });
});
