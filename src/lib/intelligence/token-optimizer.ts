export interface TokenBudget {
  maxTokens: number;
  currentUsage: number;
  reservedForResponse: number;
  compressionRatio: number;
}

export interface CompressedContext {
  originalLength: number;
  compressedLength: number;
  sections: ContextSection[];
  checksum: string;
}

export interface ContextSection {
  key: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  tokens: number;
  content: string;
  hash: string;
}

export interface TokenOptimizerConfig {
  maxContextTokens: number;
  reservedResponseTokens: number;
  compressionThreshold: number;
  priorityRules: PriorityRule[];
}

export interface PriorityRule {
  pattern: RegExp;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export class TokenOptimizer {
  private config: TokenOptimizerConfig;
  private budget: TokenBudget;
  private contextHistory: CompressedContext[] = [];
  private maxHistorySize = 5;

  constructor(config: Partial<TokenOptimizerConfig> = {}) {
    this.config = {
      maxContextTokens: 120000,
      reservedResponseTokens: 4000,
      compressionThreshold: 0.7,
      priorityRules: [
        { pattern: /error|exception|failed/i, priority: 'critical' },
        { pattern: /accounting|transaction|balance|sheet/i, priority: 'high' },
        { pattern: /report|statement|closing/i, priority: 'high' },
        { pattern: /user|settings|preferences/i, priority: 'medium' },
        { pattern: /log|debug|trace/i, priority: 'low' }
      ],
      ...config
    };
    
    this.budget = {
      maxTokens: this.config.maxContextTokens,
      currentUsage: 0,
      reservedForResponse: this.config.reservedResponseTokens,
      compressionRatio: 1
    };
  }

  analyze(content: string): { tokens: number; words: number; lines: number } {
    const words = content.trim().split(/\s+/).length;
    const lines = content.split('\n').length;
    const tokens = Math.ceil(words * 1.3);
    return { tokens, words, lines };
  }

  prioritize(sections: ContextSection[]): ContextSection[] {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return sections.sort((a, b) => order[a.priority] - order[b.priority]);
  }

  compress(context: string, availableTokens: number): CompressedContext {
    const sections = this.extractSections(context);
    const prioritized = this.prioritize(sections);
    
    let selectedSections: ContextSection[] = [];
    let usedTokens = 0;
    
    for (const section of prioritized) {
      if (usedTokens + section.tokens <= availableTokens) {
        selectedSections.push(section);
        usedTokens += section.tokens;
      } else if (section.priority === 'critical') {
        selectedSections.push(this.truncateSection(section, availableTokens - usedTokens));
        usedTokens = availableTokens;
        break;
      }
    }

    const compressedContent = selectedSections
      .sort((a, b) => { const o = { critical: 0, high: 1, medium: 2, low: 3 }; return o[a.priority] - o[b.priority]; })
      .map(s => s.content)
      .join('\n---\n');

    const originalTokens = this.analyze(context).tokens;
    const result: CompressedContext = {
      originalLength: originalTokens,
      compressedLength: usedTokens,
      sections: selectedSections,
      checksum: this.hash(compressedContent)
    };

    this.budget.currentUsage = usedTokens;
    this.budget.compressionRatio = originalTokens > 0 ? usedTokens / originalTokens : 1;

    this.addToHistory(result);
    return result;
  }

  private extractSections(context: string): ContextSection[] {
    const sections: ContextSection[] = [];
    const parts = context.split(/\n(?=#|\[|\/\*\*|\/\/)/);
    
    for (const part of parts) {
      if (part.trim().length < 10) continue;
      
      const priority = this.detectPriority(part);
      const analysis = this.analyze(part);
      
      sections.push({
        key: this.generateKey(part),
        priority,
        tokens: analysis.tokens,
        content: part.trim(),
        hash: this.hash(part)
      });
    }

    if (sections.length === 0) {
      sections.push({
        key: 'default',
        priority: 'medium',
        tokens: this.analyze(context).tokens,
        content: context,
        hash: this.hash(context)
      });
    }

    return sections;
  }

  private detectPriority(text: string): 'critical' | 'high' | 'medium' | 'low' {
    for (const rule of this.config.priorityRules) {
      if (rule.pattern.test(text)) return rule.priority;
    }
    return 'medium';
  }

  private truncateSection(section: ContextSection, maxTokens: number): ContextSection {
    const words = section.content.split(/\s+/);
    const avgTokensPerWord = section.tokens / words.length;
    const maxWords = Math.floor(maxTokens / avgTokensPerWord);
    const truncated = words.slice(0, maxWords).join(' ');
    
    return {
      ...section,
      content: truncated + '...[truncated]',
      tokens: maxTokens
    };
  }

  private generateKey(text: string): string {
    const match = text.match(/^#+\s*(.+)$|^(const|function|class|interface)\s+(\w+)/m);
    return match ? match[1] || match[2] + ':' + match[3] : text.slice(0, 20).replace(/\s+/g, '_');
  }

  private hash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  private addToHistory(context: CompressedContext) {
    this.contextHistory.push(context);
    if (this.contextHistory.length > this.maxHistorySize) {
      this.contextHistory.shift();
    }
  }

  getBudget(): TokenBudget {
    return { ...this.budget };
  }

  getAvailableForContext(): number {
    return this.budget.maxTokens - this.budget.currentUsage - this.budget.reservedForResponse;
  }

  estimateResponseTokens(prompt: string): number {
    return Math.ceil(this.analyze(prompt).tokens * 1.2);
  }

  shouldCompress(): boolean {
    return this.budget.compressionRatio > this.config.compressionThreshold;
  }
}

export const tokenOptimizer = new TokenOptimizer();
