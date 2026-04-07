import { parallelExecutor, Task, TaskResult } from './parallel-executor';
import { memoryPersistence } from './memory-persistence';

export interface Subagent {
  id: string;
  name: string;
  role: 'accounting' | 'tax' | 'reports' | 'validation' | 'general';
  capabilities: string[];
  model?: string;
  priority: number;
  status: 'idle' | 'busy' | 'offline';
  currentTask?: string;
  lastActive: number;
  stats: {
    tasksCompleted: number;
    tasksFailed: number;
    averageResponseTime: number;
  };
}

export interface OrchestrationPlan {
  id: string;
  goal: string;
  subagents: Subagent[];
  taskSequence: string[];
  estimatedDuration: number;
  createdAt: number;
}

export interface OrchestrationResult {
  planId: string;
  success: boolean;
  results: Map<string, any>;
  errors: Map<string, Error>;
  duration: number;
  completedAt: number;
}

export interface SubagentMessage {
  from: string;
  to: string;
  type: 'task' | 'result' | 'error' | 'status' | 'query';
  payload: any;
  timestamp: number;
  correlationId?: string;
}

export type SubagentTask = {
  type: string;
  payload: any;
  requires?: string[];
  provides?: string[];
  validation?: (result: any) => boolean;
};

export class SubagentOrchestrator {
  private subagents: Map<string, Subagent> = new Map();
  private messageQueue: SubagentMessage[] = [];
  private pendingTasks: Map<string, SubagentTask> = new Map();
  private taskResults: Map<string, any> = new Map();
  private listeners: Map<string, Set<(message: SubagentMessage) => void>> = new Map();

  constructor() {
    this.initializeDefaultSubagents();
  }

  private initializeDefaultSubagents(): void {
    this.registerSubagent({
      id: 'accounting-agent',
      name: 'Contabilidad',
      role: 'accounting',
      capabilities: ['balance_sheet', 'income_statement', 'journal_entry', 'closing', 'account_management'],
      priority: 10,
      stats: { tasksCompleted: 0, tasksFailed: 0, averageResponseTime: 0 }
    });

    this.registerSubagent({
      id: 'tax-agent',
      name: 'Impuestos',
      role: 'tax',
      capabilities: ['renta_declaration', 'exogenos', 'dian_integration', 'tax_calculation'],
      priority: 9,
      stats: { tasksCompleted: 0, tasksFailed: 0, averageResponseTime: 0 }
    });

    this.registerSubagent({
      id: 'reports-agent',
      name: 'Reportes',
      role: 'reports',
      capabilities: ['financial_reports', 'cash_flow', 'equity_statement', 'rues_data'],
      priority: 8,
      stats: { tasksCompleted: 0, tasksFailed: 0, averageResponseTime: 0 }
    });

    this.registerSubagent({
      id: 'validation-agent',
      name: 'Validación',
      role: 'validation',
      capabilities: ['transaction_verification', 'balance_verification', 'integrity_check'],
      priority: 10,
      stats: { tasksCompleted: 0, tasksFailed: 0, averageResponseTime: 0 }
    });

    this.registerSubagent({
      id: 'general-agent',
      name: 'General',
      role: 'general',
      capabilities: ['member_management', 'settings', 'general_query'],
      priority: 5,
      stats: { tasksCompleted: 0, tasksFailed: 0, averageResponseTime: 0 }
    });
  }

  registerSubagent(subagent: Omit<Subagent, 'status' | 'lastActive'>): void {
    this.subagents.set(subagent.id, {
      ...subagent,
      status: 'idle',
      lastActive: Date.now()
    });
  }

  unregisterSubagent(id: string): boolean {
    return this.subagents.delete(id);
  }

  getSubagent(id: string): Subagent | undefined {
    return this.subagents.get(id);
  }

  getSubagentsByRole(role: Subagent['role']): Subagent[] {
    return Array.from(this.subagents.values()).filter(s => s.role === role);
  }

  getAvailableSubagent(capability: string): Subagent | null {
    const candidates = Array.from(this.subagents.values())
      .filter(s => s.status === 'idle' && s.capabilities.includes(capability))
      .sort((a, b) => b.priority - a.priority);
    
    return candidates[0] || null;
  }

  subscribe(agentId: string, callback: (message: SubagentMessage) => void): () => void {
    if (!this.listeners.has(agentId)) {
      this.listeners.set(agentId, new Set());
    }
    this.listeners.get(agentId)!.add(callback);
    
    return () => {
      this.listeners.get(agentId)?.delete(callback);
    };
  }

  private sendMessage(message: SubagentMessage): void {
    this.messageQueue.push(message);
    
    const targetListeners = this.listeners.get(message.to);
    if (targetListeners) {
      targetListeners.forEach(cb => cb(message));
    }
    
    const allListeners = this.listeners.get('*');
    if (allListeners) {
      allListeners.forEach(cb => cb(message));
    }
  }

  async dispatchTask(
    taskType: string,
    payload: any,
    options: { targetAgent?: string; timeout?: number; retry?: boolean } = {}
  ): Promise<{ success: boolean; result?: any; error?: Error; agentId?: string }> {
    let targetAgent: Subagent | null = null;

    if (options.targetAgent) {
      targetAgent = this.subagents.get(options.targetAgent) || null;
    } else {
      targetAgent = this.getAvailableSubagent(taskType);
      
      if (!targetAgent) {
        const taskMap: Record<string, string> = {
          balance_sheet: 'accounting-agent',
          income_statement: 'accounting-agent',
          journal_entry: 'accounting-agent',
          closing: 'accounting-agent',
          renta_declaration: 'tax-agent',
          exogenos: 'tax-agent',
          financial_reports: 'reports-agent',
          transaction_verification: 'validation-agent'
        };
        
        const fallbackId = taskMap[taskType];
        if (fallbackId) {
          targetAgent = this.subagents.get(fallbackId) || null;
        }
      }
    }

    if (!targetAgent) {
      return { success: false, error: new Error(`No available agent for task: ${taskType}`) };
    }

    const taskId = crypto.randomUUID();
    const correlationId = crypto.randomUUID();
    
    targetAgent.status = 'busy';
    targetAgent.currentTask = taskId;
    targetAgent.lastActive = Date.now();

    parallelExecutor.enqueue({
      type: taskType,
      priority: targetAgent.priority,
      timeout: options.timeout,
      retries: options.retry ? 2 : 0,
      execute: async () => {
        this.sendMessage({
          from: 'orchestrator',
          to: targetAgent!.id,
          type: 'task',
          payload: { taskId, taskType, payload },
          timestamp: Date.now(),
          correlationId
        });

        return new Promise((resolve, reject) => {
          const unsubscribe = this.subscribe(targetAgent!.id, async (message) => {
            if (message.type === 'result' && message.correlationId === correlationId) {
              unsubscribe();
              resolve(message.payload);
            }
            if (message.type === 'error' && message.correlationId === correlationId) {
              unsubscribe();
              reject(message.payload);
            }
          });

          setTimeout(() => {
            unsubscribe();
            reject(new Error(`Task ${taskId} timed out`));
          }, options.timeout || 30000);
        });
      }
    });

    const taskResult = await parallelExecutor.waitForTask(taskId, options.timeout);

    targetAgent.status = 'idle';
    targetAgent.currentTask = undefined;
    targetAgent.lastActive = Date.now();

    const success = taskResult?.success ?? false;
    if (success) {
      targetAgent.stats.tasksCompleted++;
      this.sendMessage({
        from: targetAgent.id,
        to: 'orchestrator',
        type: 'result',
        payload: taskResult?.result,
        timestamp: Date.now(),
        correlationId
      });
    } else {
      targetAgent.stats.tasksFailed++;
      this.sendMessage({
        from: targetAgent.id,
        to: 'orchestrator',
        type: 'error',
        payload: taskResult?.error ?? new Error('Task failed'),
        timestamp: Date.now(),
        correlationId
      });
    }

    return {
      success,
      result: taskResult?.result,
      error: taskResult?.error,
      agentId: targetAgent.id
    };
  }

  async orchestrate(goal: string, tasks: SubagentTask[]): Promise<OrchestrationResult> {
    const planId = crypto.randomUUID();
    const startTime = Date.now();
    const results = new Map<string, any>();
    const errors = new Map<string, Error>();

    const taskMap = new Map(tasks.map(t => [t.type, t]));
    
    for (const task of tasks) {
      const deps = task.requires || [];
      const pendingDeps = deps.filter(d => !results.has(d));
      
      if (pendingDeps.length > 0) {
        errors.set(task.type, new Error(`Missing dependencies: ${pendingDeps.join(', ')}`));
        continue;
      }

      const depResults = deps.map(d => results.get(d));
      const enrichedPayload = { ...task.payload, dependencies: depResults };

      const result = await this.dispatchTask(task.type, enrichedPayload);
      
      if (result.success) {
        results.set(task.type, result.result);
        
        if (task.validation && !task.validation(result.result)) {
          errors.set(task.type, new Error(`Validation failed for task: ${task.type}`));
        }
      } else {
        errors.set(task.type, result.error || new Error('Unknown error'));
      }
    }

    const duration = Date.now() - startTime;
    
    memoryPersistence.set(`orchestration_${planId}`, {
      goal,
      tasksCount: tasks.length,
      successCount: results.size,
      errorCount: errors.size,
      duration
    }, { type: 'learning' });

    return {
      planId,
      success: errors.size === 0,
      results,
      errors,
      duration,
      completedAt: Date.now()
    };
  }

  async orchestrateParallel(goal: string, tasks: SubagentTask[]): Promise<OrchestrationResult> {
    const planId = crypto.randomUUID();
    const startTime = Date.now();
    const results = new Map<string, any>();
    const errors = new Map<string, Error>();

    const independentTasks = tasks.filter(t => !t.requires || t.requires.length === 0);
    const dependentTasks = tasks.filter(t => t.requires && t.requires.length > 0);

    const taskPromises = independentTasks.map(task => 
      this.dispatchTask(task.type, task.payload).then(r => ({ task, result: r }))
    );

    const parallelResults = await Promise.all(taskPromises);
    
    for (const { task, result } of parallelResults) {
      if (result.success) {
        results.set(task.type, result.result);
      } else {
        errors.set(task.type, result.error || new Error('Unknown error'));
      }
    }

    for (const task of dependentTasks) {
      const deps = task.requires || [];
      const pendingDeps = deps.filter(d => !results.has(d));
      
      if (pendingDeps.length > 0) {
        errors.set(task.type, new Error(`Missing dependencies: ${pendingDeps.join(', ')}`));
        continue;
      }

      const depResults = deps.map(d => results.get(d));
      const enrichedPayload = { ...task.payload, dependencies: depResults };

      const result = await this.dispatchTask(task.type, enrichedPayload);
      
      if (result.success) {
        results.set(task.type, result.result);
      } else {
        errors.set(task.type, result.error || new Error('Unknown error'));
      }
    }

    const duration = Date.now() - startTime;

    return {
      planId,
      success: errors.size === 0,
      results,
      errors,
      duration,
      completedAt: Date.now()
    };
  }

  createPlan(goal: string, tasks: SubagentTask[]): OrchestrationPlan {
    const taskSequence = tasks.map(t => t.type);
    const involvedAgents = new Set<string>();

    for (const task of tasks) {
      const agent = this.getAvailableSubagent(task.type);
      if (agent) involvedAgents.add(agent.id);
    }

    return {
      id: crypto.randomUUID(),
      goal,
      subagents: Array.from(involvedAgents).map(id => this.subagents.get(id)!),
      taskSequence,
      estimatedDuration: tasks.length * 5000,
      createdAt: Date.now()
    };
  }

  getStatus(): {
    totalSubagents: number;
    idleCount: number;
    busyCount: number;
    offlineCount: number;
    pendingMessages: number;
  } {
    const subagents = Array.from(this.subagents.values());
    
    return {
      totalSubagents: subagents.length,
      idleCount: subagents.filter(s => s.status === 'idle').length,
      busyCount: subagents.filter(s => s.status === 'busy').length,
      offlineCount: subagents.filter(s => s.status === 'offline').length,
      pendingMessages: this.messageQueue.length
    };
  }
}

export const subagentOrchestrator = new SubagentOrchestrator();
