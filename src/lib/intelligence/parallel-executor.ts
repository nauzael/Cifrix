export interface Task<T = any> {
  id: string;
  type: string;
  priority: number;
  execute: () => Promise<T>;
  dependencies?: string[];
  timeout?: number;
  retries?: number;
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  result?: T;
  error?: Error;
  startTime?: number;
  endTime?: number;
}

export interface TaskResult<T> {
  taskId: string;
  success: boolean;
  result?: T;
  error?: Error;
  duration: number;
}

export interface ParallelConfig {
  maxConcurrent: number;
  defaultTimeout: number;
  defaultRetries: number;
  onTaskStart?: (task: Task) => void;
  onTaskComplete?: (task: Task, result: TaskResult<any>) => void;
  onTaskError?: (task: Task, error: Error) => void;
}

export class ParallelExecutor {
  private config: ParallelConfig;
  private queue: Task[] = [];
  private running: Map<string, Task> = new Map();
  private completed: Map<string, TaskResult<any>> = new Map();
  private isProcessing = false;
  private taskCounter = 0;

  constructor(config: Partial<ParallelConfig> = {}) {
    this.config = {
      maxConcurrent: 5,
      defaultTimeout: 30000,
      defaultRetries: 3,
      ...config
    };
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${++this.taskCounter}`;
  }

  enqueue<T>(task: Omit<Task<T>, 'id' | 'status'>): string {
    const id = this.generateTaskId();
    const fullTask: Task<T> = {
      ...task,
      id,
      status: 'pending',
      retries: task.retries ?? this.config.defaultRetries,
      timeout: task.timeout ?? this.config.defaultTimeout
    };
    
    this.queue.push(fullTask);
    this.queue.sort((a, b) => b.priority - a.priority);
    
    this.processQueue();
    return id;
  }

  enqueueBatch<T>(tasks: Omit<Task<T>, 'id' | 'status'>[]): string[] {
    return tasks.map(t => this.enqueue(t));
  }

  cancel(taskId: string): boolean {
    const inQueue = this.queue.findIndex(t => t.id === taskId);
    if (inQueue !== -1) {
      this.queue.splice(inQueue, 1);
      return true;
    }
    
    const running = this.running.get(taskId);
    if (running) {
      running.status = 'cancelled';
      return true;
    }
    
    return false;
  }

  getTask(taskId: string): Task | undefined {
    const inQueue = this.queue.find(t => t.id === taskId);
    if (inQueue) return inQueue;
    return this.running.get(taskId);
  }

  getResult<T>(taskId: string): TaskResult<T> | undefined {
    return this.completed.get(taskId) as TaskResult<T> | undefined;
  }

  getStatus(): {
    queueLength: number;
    runningCount: number;
    completedCount: number;
    isProcessing: boolean;
  } {
    return {
      queueLength: this.queue.length,
      runningCount: this.running.size,
      completedCount: this.completed.size,
      isProcessing: this.isProcessing
    };
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0 && this.running.size < this.config.maxConcurrent) {
      const task = this.queue.shift();
      if (!task || task.status === 'cancelled') continue;
      
      this.running.set(task.id, task);
      this.executeTask(task);
    }

    this.isProcessing = false;
  }

  private async executeTask(task: Task): Promise<void> {
    task.status = 'running';
    task.startTime = Date.now();
    this.config.onTaskStart?.(task);

    try {
      const result = await this.executeWithTimeout(task);
      task.status = 'completed';
      task.result = result;
      task.endTime = Date.now();
      
      const taskResult: TaskResult<typeof result> = {
        taskId: task.id,
        success: true,
        result,
        duration: task.endTime - task.startTime
      };
      
      this.completed.set(task.id, taskResult);
      this.config.onTaskComplete?.(task, taskResult);
    } catch (error) {
      task.status = 'failed';
      task.error = error as Error;
      task.endTime = Date.now();
      
      const taskResult: TaskResult<any> = {
        taskId: task.id,
        success: false,
        error: error as Error,
        duration: task.endTime - task.startTime
      };
      
      this.completed.set(task.id, taskResult);
      this.config.onTaskError?.(task, error as Error);
      
      if ((task.retries ?? 0) > 0) {
        task.retries = (task.retries ?? 0) - 1;
        this.queue.unshift(task);
        this.queue.sort((a, b) => b.priority - a.priority);
      }
    } finally {
      this.running.delete(task.id);
      this.processQueue();
    }
  }

  private async executeWithTimeout<T>(task: Task<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Task ${task.id} timed out after ${task.timeout}ms`));
      }, task.timeout);

      task.execute()
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timer));
    });
  }

  async waitForTask(taskId: string, timeout?: number): Promise<TaskResult<any> | null> {
    const startTime = Date.now();
    const maxWait = timeout ?? this.config.defaultTimeout * 10;

    while (Date.now() - startTime < maxWait) {
      const completed = this.completed.get(taskId);
      if (completed) return completed;
      
      const running = this.running.get(taskId);
      if (running?.status === 'failed' || running?.status === 'cancelled') {
        return null;
      }
      
      await new Promise(r => setTimeout(r, 100));
    }
    
    return null;
  }

  async waitForAll(timeout?: number): Promise<TaskResult<any>[]> {
    const startTime = Date.now();
    const maxWait = timeout ?? this.config.defaultTimeout * 10;
    
    while (Date.now() - startTime < maxWait) {
      if (this.queue.length === 0 && this.running.size === 0) {
        return Array.from(this.completed.values());
      }
      await new Promise(r => setTimeout(r, 100));
    }
    
    return Array.from(this.completed.values());
  }

  clear(): void {
    this.queue = [];
    this.running.clear();
    this.completed.clear();
  }
}

export class TaskGraph {
  private nodes: Map<string, Task> = new Map();
  private edges: Map<string, string[]> = new Map();

  addNode<T>(task: Omit<Task<T>, 'id' | 'status'>): string {
    const id = crypto.randomUUID();
    const fullTask: Task<T> = { ...task, id, status: 'pending' };
    this.nodes.set(id, fullTask);
    this.edges.set(id, task.dependencies ?? []);
    return id;
  }

  addEdge(fromId: string, toId: string): void {
    const edges = this.edges.get(fromId) ?? [];
    if (!edges.includes(toId)) {
      edges.push(toId);
      this.edges.set(fromId, edges);
    }
  }

  getExecutionOrder(): string[][] {
    const visited = new Set<string>();
    const result: string[][] = [];
    const tempStack: string[] = [];

    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      tempStack.push(nodeId);
      
      const dependents = Array.from(this.edges.entries())
        .filter(([_, deps]) => deps.includes(nodeId))
        .map(([id, _]) => id);
      
      for (const dep of dependents) {
        visit(dep);
      }
      
      result.unshift([...tempStack]);
      tempStack.pop();
    };

    for (const nodeId of this.nodes.keys()) {
      visit(nodeId);
    }

    return result.reduce((acc, level) => {
      acc.push(...level.map(id => id));
      return acc;
    }, []).reduce((acc: string[][], id) => {
      const deps = this.edges.get(id) ?? [];
      const maxDepLevel = deps.length > 0 
        ? Math.max(...deps.map(d => acc.findIndex(a => a.includes(d))))
        : -1;
      
      if (!acc[maxDepLevel + 1]) {
        acc[maxDepLevel + 1] = [];
      }
      acc[maxDepLevel + 1].push(id);
      return acc;
    }, []);
  }

  getNodes(): Task[] {
    return Array.from(this.nodes.values());
  }
}

export const parallelExecutor = new ParallelExecutor({
  maxConcurrent: 5,
  defaultTimeout: 30000,
  defaultRetries: 2
});
