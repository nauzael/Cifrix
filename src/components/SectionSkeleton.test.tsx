import { describe, it, expect } from 'vitest';

describe('SectionSkeleton', () => {
  it('exports SectionSkeleton component', async () => {
    const { SectionSkeleton } = await import('./SectionSkeleton');
    expect(SectionSkeleton).toBeDefined();
    expect(typeof SectionSkeleton).toBe('function');
  });

  it('exports CardSkeleton component', async () => {
    const { CardSkeleton } = await import('./SectionSkeleton');
    expect(CardSkeleton).toBeDefined();
    expect(typeof CardSkeleton).toBe('function');
  });

  it('exports Spinner component', async () => {
    const { Spinner } = await import('./SectionSkeleton');
    expect(Spinner).toBeDefined();
    expect(typeof Spinner).toBe('function');
  });

  it('exports default as SectionSkeleton', async () => {
    const mod = await import('./SectionSkeleton');
    expect(mod.default).toBeDefined();
    expect(mod.default).toBe(mod.SectionSkeleton);
  });
});
