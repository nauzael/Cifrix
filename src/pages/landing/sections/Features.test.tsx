import { describe, it, expect } from 'vitest';

describe('Features', () => {
  it('exports Features component', async () => {
    const { Features } = await import('./Features');
    expect(Features).toBeDefined();
    expect(typeof Features).toBe('function');
  });

  it('has 6 features', async () => {
    const { features } = await import('./Features');
    expect(features.length).toBe(6);
  });

  it('includes Contabilidad Completa feature', async () => {
    const { features } = await import('./Features');
    const feature = features.find(f => f.id === 'contabilidad-completa');
    expect(feature).toBeDefined();
    expect(feature?.title).toBe('Contabilidad Completa');
    expect(feature?.description).toContain('PUC');
  });

  it('includes Facturación Electrónica DIAN feature', async () => {
    const { features } = await import('./Features');
    const feature = features.find(f => f.id === 'facturacion-electronica');
    expect(feature).toBeDefined();
    expect(feature?.title).toBe('Facturación Electrónica DIAN');
    expect(feature?.description).toContain('resoluciones');
  });

  it('includes Declaración de Renta feature', async () => {
    const { features } = await import('./Features');
    const feature = features.find(f => f.id === 'declaracion-renta');
    expect(feature).toBeDefined();
    expect(feature?.title).toBe('Declaración de Renta');
    expect(feature?.description).toContain('impuestos');
  });

  it('includes Reportes Exógenos feature', async () => {
    const { features } = await import('./Features');
    const feature = features.find(f => f.id === 'reportes-exogenos');
    expect(feature).toBeDefined();
    expect(feature?.title).toBe('Reportes Exógenos');
    expect(feature?.description).toContain('Información');
  });

  it('includes Módulo Eclesiástico feature', async () => {
    const { features } = await import('./Features');
    const feature = features.find(f => f.id === 'modulo-eclesiastico');
    expect(feature).toBeDefined();
    expect(feature?.title).toBe('Módulo Eclesiástico');
    expect(feature?.description).toContain('diezmos');
  });

  it('includes Offline-First + Sync Automático feature', async () => {
    const { features } = await import('./Features');
    const feature = features.find(f => f.id === 'offline-sync');
    expect(feature).toBeDefined();
    expect(feature?.title).toBe('Offline-First + Sync Automático');
    expect(feature?.description).toContain('sin internet');
  });

  it('all features have required properties', async () => {
    const { features } = await import('./Features');
    features.forEach(feature => {
      expect(feature.id).toBeDefined();
      expect(feature.title).toBeDefined();
      expect(feature.description).toBeDefined();
      // Icon property exists (Lucide component reference)
      expect('icon' in feature).toBe(true);
    });
  });

  it('all features have unique ids', async () => {
    const { features } = await import('./Features');
    const ids = features.map(f => f.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});
