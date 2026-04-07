export { TokenOptimizer, tokenOptimizer, TokenBudget, CompressedContext, ContextSection } from './token-optimizer';
export { MemoryPersistence, memoryPersistence, MemoryEntry, MemoryQuery, MemoryStats } from './memory-persistence';
export { ContinuousLearning, continuousLearning, LearningPattern, LearningFeedback } from './continuous-learning';
export { VerificationLoop, verificationLoop, VerificationResult, VerificationError, VerificationWarning } from './verification-loop';
export { ParallelExecutor, parallelExecutor, TaskGraph, Task, TaskResult, ParallelConfig } from './parallel-executor';
export { SubagentOrchestrator, subagentOrchestrator, Subagent, OrchestrationPlan, OrchestrationResult, SubagentTask } from './subagent-orchestrator';

import { tokenOptimizer } from './token-optimizer';
import { memoryPersistence } from './memory-persistence';
import { continuousLearning } from './continuous-learning';
import { verificationLoop } from './verification-loop';
import { parallelExecutor } from './parallel-executor';
import { subagentOrchestrator } from './subagent-orchestrator';

export interface IntelligenceConfig {
  tokenOptimization: {
    enabled: boolean;
    maxContextTokens: number;
  };
  memoryPersistence: {
    enabled: boolean;
    ttlDays: number;
  };
  continuousLearning: {
    enabled: boolean;
    minConfidenceThreshold: number;
  };
  verification: {
    enabled: boolean;
    maxIterations: number;
  };
  parallelization: {
    enabled: boolean;
    maxConcurrent: number;
  };
  subagentOrchestration: {
    enabled: boolean;
  };
}

export const defaultIntelligenceConfig: IntelligenceConfig = {
  tokenOptimization: {
    enabled: true,
    maxContextTokens: 120000
  },
  memoryPersistence: {
    enabled: true,
    ttlDays: 30
  },
  continuousLearning: {
    enabled: true,
    minConfidenceThreshold: 0.6
  },
  verification: {
    enabled: true,
    maxIterations: 3
  },
  parallelization: {
    enabled: true,
    maxConcurrent: 5
  },
  subagentOrchestration: {
    enabled: true
  }
};

export class IntelligenceOrchestrator {
  private config: IntelligenceConfig;
  private isInitialized = false;

  constructor(config: Partial<IntelligenceConfig> = {}) {
    this.config = { ...defaultIntelligenceConfig, ...config };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    if (this.config.memoryPersistence.enabled) {
      memoryPersistence.clearExpired();
    }

    if (this.config.verification.enabled) {
      await verificationLoop.verifyAll();
    }

    this.isInitialized = true;
  }

  getConfig(): IntelligenceConfig {
    return { ...this.config };
  }

  updateConfig(partial: Partial<IntelligenceConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  getStatus(): {
    initialized: boolean;
    memory: { entries: number; avgConfidence: number };
    learning: { patterns: number; avgSuccess: number };
    verification: { checks: number };
    parallel: { queue: number; running: number };
    agents: { total: number; idle: number; busy: number };
  } {
    const memStats = memoryPersistence.getStats();
    const learnStats = continuousLearning.getStats();
    const verStatus = { checks: verificationLoop['checks']?.size ?? 0 };
    const parStatus = parallelExecutor.getStatus();
    const agentStatus = subagentOrchestrator.getStatus();

    return {
      initialized: this.isInitialized,
      memory: { 
        entries: memStats.totalEntries, 
        avgConfidence: memStats.averageConfidence 
      },
      learning: { 
        patterns: learnStats.totalPatterns, 
        avgSuccess: learnStats.averageSuccessRate 
      },
      verification: verStatus,
      parallel: { 
        queue: parStatus.queueLength, 
        running: parStatus.runningCount 
      },
      agents: {
        total: agentStatus.totalSubagents,
        idle: agentStatus.idleCount,
        busy: agentStatus.busyCount
      }
    };
  }

  async runMaintenance(): Promise<{
    expiredCleared: number;
    decayApplied: boolean;
    verificationPassed: boolean;
  }> {
    const expiredCleared = memoryPersistence.clearExpired();
    continuousLearning.applyDecay();
    
    const verResult = await verificationLoop.verifyAll();

    return {
      expiredCleared,
      decayApplied: true,
      verificationPassed: verResult.verified
    };
  }
}

export const intelligenceOrchestrator = new IntelligenceOrchestrator();
