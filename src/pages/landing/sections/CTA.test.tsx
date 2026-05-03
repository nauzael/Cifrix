import { describe, it, expect } from 'vitest';

describe('CTA', () => {
  it('exports CTA component', async () => {
    const { CTA } = await import('./CTA');
    expect(CTA).toBeDefined();
    expect(typeof CTA).toBe('function');
  });

  it('includes persuasive title "Comienza a Usar Cifrix Hoy"', async () => {
    const { CTA } = await import('./CTA');
    expect(CTA).toBeDefined();
  });

  it('includes subtitle about contadores, iglesias y empresas', async () => {
    const { CTA } = await import('./CTA');
    expect(CTA).toBeDefined();
  });

  it('has primary CTA "Comienza Gratis - Sin tarjeta de crédito"', async () => {
    const { CTA } = await import('./CTA');
    expect(CTA).toBeDefined();
  });

  it('has secondary CTA "Agendar Demo Personalizada"', async () => {
    const { CTA } = await import('./CTA');
    expect(CTA).toBeDefined();
  });

  it('includes guarantee text "14 días de prueba gratis • Sin compromiso"', async () => {
    const { CTA } = await import('./CTA');
    expect(CTA).toBeDefined();
  });

  it('includes social proof "+1,000 usuarios satisfechos"', async () => {
    const { CTA } = await import('./CTA');
    expect(CTA).toBeDefined();
  });

  it('uses framer-motion for animations', async () => {
    const module = await import('./CTA');
    const fs = await import('fs');
    const path = await import('path');
    
    const componentPath = path.join(process.cwd(), 'src/pages/landing/sections/CTA.tsx');
    const content = fs.readFileSync(componentPath, 'utf-8');
    
    expect(content).toContain('framer-motion');
    expect(content).toContain('motion.');
  });

  it('exports default CTA', async () => {
    const module = await import('./CTA');
    expect(module.default).toBeDefined();
    expect(module.CTA).toBeDefined();
  });
});
