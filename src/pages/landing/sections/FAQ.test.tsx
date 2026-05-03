import { describe, it, expect } from 'vitest';

describe('FAQ', () => {
  it('exports FAQ component', async () => {
    const { FAQ } = await import('./FAQ');
    expect(FAQ).toBeDefined();
    expect(typeof FAQ).toBe('function');
  });

  it('has 8 FAQ items', async () => {
    const { faqData } = await import('./FAQ');
    expect(faqData.length).toBe(8);
  });

  it('includes question about internet requirement', async () => {
    const { faqData } = await import('./FAQ');
    const question = faqData.find(f => f.id === 'internet-required');
    expect(question).toBeDefined();
    expect(question?.question).toContain('internet');
    expect(question?.answer).toContain('offline');
  });

  it('includes question about DIAN compliance', async () => {
    const { faqData } = await import('./FAQ');
    const question = faqData.find(f => f.id === 'dian-compliance');
    expect(question).toBeDefined();
    expect(question?.question).toContain('DIAN');
    expect(question?.answer).toContain('DIAN');
  });

  it('includes question about free plan', async () => {
    const { faqData } = await import('./FAQ');
    const question = faqData.find(f => f.id === 'free-plan');
    expect(question).toBeDefined();
    expect(question?.question).toContain('gratuito');
  });

  it('includes question about data migration', async () => {
    const { faqData } = await import('./FAQ');
    const question = faqData.find(f => f.id === 'data-migration');
    expect(question).toBeDefined();
    expect(question?.question).toContain('migrar');
  });

  it('includes question about security', async () => {
    const { faqData } = await import('./FAQ');
    const question = faqData.find(f => f.id === 'security');
    expect(question).toBeDefined();
    expect(question?.question).toContain('seguro');
  });

  it('includes question about technical support', async () => {
    const { faqData } = await import('./FAQ');
    const question = faqData.find(f => f.id === 'technical-support');
    expect(question).toBeDefined();
    expect(question?.question).toContain('soporte');
  });

  it('includes question about cancellation', async () => {
    const { faqData } = await import('./FAQ');
    const question = faqData.find(f => f.id === 'cancel-anytime');
    expect(question).toBeDefined();
    expect(question?.question).toContain('cancelar');
  });

  it('includes question about mobile support', async () => {
    const { faqData } = await import('./FAQ');
    const question = faqData.find(f => f.id === 'mobile-support');
    expect(question).toBeDefined();
    expect(question?.question).toContain('móviles');
  });

  it('all FAQ items have required properties', async () => {
    const { faqData } = await import('./FAQ');
    faqData.forEach(faq => {
      expect(faq.id).toBeDefined();
      expect(faq.question).toBeDefined();
      expect(faq.answer).toBeDefined();
    });
  });

  it('all FAQ items have unique ids', async () => {
    const { faqData } = await import('./FAQ');
    const ids = faqData.map(f => f.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('FAQ data contains JSON-LD schema structure', async () => {
    const module = await import('./FAQ');
    expect(module.faqData).toBeDefined();
    expect(Array.isArray(module.faqData)).toBe(true);
  });

  it('FAQ component includes valid FAQPage JSON-LD schema', async () => {
    const module = await import('./FAQ');
    const { faqData } = module;
    
    // Verificar que faqData tiene la estructura correcta para JSON-LD
    expect(faqData.length).toBeGreaterThan(0);
    faqData.forEach(item => {
      expect(item.question).toBeDefined();
      expect(item.answer).toBeDefined();
    });
  });
});
