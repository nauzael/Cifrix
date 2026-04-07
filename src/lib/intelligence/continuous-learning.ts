import { memoryPersistence, MemoryEntry } from './memory-persistence';

export interface LearningPattern {
  id: string;
  name: string;
  description: string;
  trigger: string;
  action: string;
  successRate: number;
  totalExecutions: number;
  lastUsed: number;
  confidence: number;
  context: Record<string, any>;
}

export interface LearningFeedback {
  patternId: string;
  success: boolean;
  context?: Record<string, any>;
  notes?: string;
}

export interface ContinuousLearningConfig {
  minConfidenceThreshold: number;
  learningRate: number;
  decayRate: number;
  explorationRate: number;
}

export class ContinuousLearning {
  private config: ContinuousLearningConfig;
  private patterns: Map<string, LearningPattern> = new Map();
  private feedbackBuffer: LearningFeedback[] = [];
  private bufferSize = 10;

  constructor(config: Partial<ContinuousLearningConfig> = {}) {
    this.config = {
      minConfidenceThreshold: 0.6,
      learningRate: 0.1,
      decayRate: 0.02,
      explorationRate: 0.1,
      ...config
    };
    this.loadPatterns();
  }

  private async loadPatterns(): Promise<void> {
    const stored = memoryPersistence.get('learning_patterns');
    if (stored && Array.isArray(stored)) {
      stored.forEach((p: LearningPattern) => this.patterns.set(p.id, p));
    }
    
    const storedFeedback = memoryPersistence.get('learning_feedback_buffer');
    if (storedFeedback && Array.isArray(storedFeedback)) {
      this.feedbackBuffer = storedFeedback;
    }
  }

  private persistPatterns(): void {
    const patternsArray = Array.from(this.patterns.values());
    memoryPersistence.set('learning_patterns', patternsArray, { type: 'learning' });
  }

  private persistFeedbackBuffer(): void {
    memoryPersistence.set('learning_feedback_buffer', this.feedbackBuffer, { type: 'learning' });
  }

  registerPattern(pattern: Omit<LearningPattern, 'successRate' | 'totalExecutions' | 'lastUsed' | 'confidence'>): string {
    const id = crypto.randomUUID();
    const newPattern: LearningPattern = {
      ...pattern,
      id,
      successRate: 0.5,
      totalExecutions: 0,
      lastUsed: Date.now(),
      confidence: 0.5
    };
    
    this.patterns.set(id, newPattern);
    this.persistPatterns();
    return id;
  }

  async recordExecution(patternId: string, context: Record<string, any>): Promise<void> {
    const pattern = this.patterns.get(patternId);
    if (!pattern) return;
    
    pattern.totalExecutions++;
    pattern.lastUsed = Date.now();
    pattern.context = context;
    
    if (this.feedbackBuffer.length >= this.bufferSize) {
      await this.processFeedbackBuffer();
    }
    
    this.persistPatterns();
  }

  async receiveFeedback(feedback: LearningFeedback): Promise<void> {
    this.feedbackBuffer.push(feedback);
    
    if (this.feedbackBuffer.length >= this.bufferSize) {
      await this.processFeedbackBuffer();
    }
  }

  private async processFeedbackBuffer(): Promise<void> {
    if (this.feedbackBuffer.length === 0) return;
    
    const patternUpdates = new Map<string, { success: number; total: number }>();
    
    for (const fb of this.feedbackBuffer) {
      const current = patternUpdates.get(fb.patternId) || { success: 0, total: 0 };
      current.total++;
      if (fb.success) current.success++;
      patternUpdates.set(fb.patternId, current);
    }
    
    for (const [patternId, stats] of patternUpdates) {
      const pattern = this.patterns.get(patternId);
      if (!pattern) continue;
      
      const oldRate = pattern.successRate;
      const newRate = stats.success / stats.total;
      
      pattern.successRate = oldRate * (1 - this.config.learningRate) + newRate * this.config.learningRate;
      pattern.confidence = Math.min(1, pattern.confidence + this.config.learningRate * 0.1);
    }
    
    this.feedbackBuffer = [];
    this.persistFeedbackBuffer();
    this.persistPatterns();
  }

  findMatchingPattern(trigger: string, context: Record<string, any>): LearningPattern | null {
    const matching = Array.from(this.patterns.values())
      .filter(p => {
        if (p.trigger !== trigger) return false;
        if (p.confidence < this.config.minConfidenceThreshold) return false;
        return true;
      })
      .sort((a, b) => b.confidence - a.confidence);
    
    if (matching.length === 0) return null;
    
    if (Math.random() < this.config.explorationRate) {
      return matching[Math.floor(Math.random() * matching.length)];
    }
    
    return matching[0];
  }

  applyDecay(): void {
    for (const pattern of this.patterns.values()) {
      if (pattern.totalExecutions > 5) {
        pattern.confidence = Math.max(
          this.config.minConfidenceThreshold,
          pattern.confidence - this.config.decayRate
        );
      }
    }
    this.persistPatterns();
  }

  getRecommendations(context: Record<string, any>, limit = 3): LearningPattern[] {
    return Array.from(this.patterns.values())
      .filter(p => p.confidence >= this.config.minConfidenceThreshold)
      .sort((a, b) => {
        const scoreA = a.confidence * a.successRate * Math.log(a.totalExecutions + 1);
        const scoreB = b.confidence * b.successRate * Math.log(b.totalExecutions + 1);
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  mergePatterns(sourceId: string, targetId: string): boolean {
    const source = this.patterns.get(sourceId);
    const target = this.patterns.get(targetId);
    
    if (!source || !target) return false;
    
    target.totalExecutions += source.totalExecutions;
    target.successRate = (target.successRate + source.successRate) / 2;
    target.confidence = Math.max(target.confidence, source.confidence);
    target.context = { ...target.context, ...source.context };
    
    this.patterns.delete(sourceId);
    this.persistPatterns();
    return true;
  }

  removePattern(id: string): boolean {
    const result = this.patterns.delete(id);
    if (result) this.persistPatterns();
    return result;
  }

  getStats(): {
    totalPatterns: number;
    averageConfidence: number;
    averageSuccessRate: number;
    patternsByTrigger: Record<string, number>;
  } {
    const patterns = Array.from(this.patterns.values());
    
    return {
      totalPatterns: patterns.length,
      averageConfidence: patterns.length > 0 
        ? patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length 
        : 0,
      averageSuccessRate: patterns.length > 0 
        ? patterns.reduce((sum, p) => sum + p.successRate, 0) / patterns.length 
        : 0,
      patternsByTrigger: patterns.reduce((acc, p) => {
        acc[p.trigger] = (acc[p.trigger] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  exportPatterns(): LearningPattern[] {
    return Array.from(this.patterns.values());
  }

  importPatterns(patterns: LearningPattern[]): number {
    let imported = 0;
    for (const p of patterns) {
      if (!this.patterns.has(p.id)) {
        this.patterns.set(p.id, p);
        imported++;
      }
    }
    if (imported > 0) this.persistPatterns();
    return imported;
  }
}

export const continuousLearning = new ContinuousLearning();
