/**
 * Background Processing Engine for handling heavy operations without blocking UI
 * Supports task queuing, prioritization, progress tracking, and cancellation
 */

export interface BackgroundProcessorConfig {
  maxConcurrentTasks: number;
  taskTimeout: number;
  enablePriority: boolean;
  enableProgress?: boolean;
}

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TaskState = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface BackgroundTask<T = any, R = any> {
  id: string;
  type: string;
  data: T;
  processor: (data: T, onProgress?: (progress: TaskProgress) => void) => Promise<R>;
  priority: TaskPriority;
  timeout?: number;
  onProgress?: (progress: TaskProgress) => void;
  onComplete?: (result: R) => void;
  onError?: (error: Error) => void;
}

export interface TaskProgress {
  current: number;
  total: number;
  percentage: number;
  message?: string;
  stage?: string;
}

export interface TaskStatus<R = any> {
  id: string;
  state: TaskState;
  progress?: TaskProgress;
  result?: R;
  error?: Error;
  startTime?: number;
  endTime?: number;
  duration?: number;
}

export interface QueuedTask<T = any, R = any> extends BackgroundTask<T, R> {
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  promise?: Promise<R>;
  resolve?: (result: R) => void;
  reject?: (error: Error) => void;
  abortController?: AbortController;
}

export class BackgroundProcessor {
  private config: Required<BackgroundProcessorConfig>;
  private taskQueue: QueuedTask[] = [];
  private runningTasks = new Map<string, QueuedTask>();
  private completedTasks = new Map<string, TaskStatus>();
  private taskCounter = 0;
  private isProcessing = false;

  constructor(config: BackgroundProcessorConfig) {
    this.config = {
      enableProgress: true,
      ...config
    };
  }

  /**
   * Add a task to the background processing queue
   */
  async addTask<T, R>(task: BackgroundTask<T, R>): Promise<string> {
    const taskId = task.id || `task-${++this.taskCounter}`;

    const queuedTask: QueuedTask<T, R> = {
      ...task,
      id: taskId,
      createdAt: Date.now(),
      abortController: new AbortController()
    };

    // Create promise for task completion
    queuedTask.promise = new Promise<R>((resolve, reject) => {
      queuedTask.resolve = resolve;
      queuedTask.reject = reject;
    });

    // Insert task based on priority
    this.insertTaskByPriority(queuedTask);

    // Start processing if not already running (with small delay to allow batching)
    if (!this.isProcessing) {
      setTimeout(() => this.startProcessing(), 1);
    }

    return taskId;
  }

  /**
   * Get the current status of a task
   */
  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    // Check running tasks
    const runningTask = this.runningTasks.get(taskId);
    if (runningTask) {
      return {
        id: taskId,
        state: 'running',
        startTime: runningTask.startedAt,
        duration: runningTask.startedAt ? Date.now() - runningTask.startedAt : undefined
      };
    }

    // Check completed tasks
    const completedTask = this.completedTasks.get(taskId);
    if (completedTask) {
      return completedTask;
    }

    // Check queued tasks
    const queuedTask = this.taskQueue.find(task => task.id === taskId);
    if (queuedTask) {
      return {
        id: taskId,
        state: 'queued'
      };
    }

    throw new Error(`Task ${taskId} not found`);
  }

  /**
   * Wait for a task to complete and return its result
   */
  async waitForTask<R = any>(taskId: string): Promise<R> {
    const runningTask = this.runningTasks.get(taskId);
    if (runningTask?.promise) {
      return runningTask.promise;
    }

    const queuedTask = this.taskQueue.find(task => task.id === taskId);
    if (queuedTask?.promise) {
      return queuedTask.promise;
    }

    const completedTask = this.completedTasks.get(taskId);
    if (completedTask) {
      if (completedTask.state === 'completed') {
        return completedTask.result as R;
      } else if (completedTask.state === 'failed') {
        throw completedTask.error || new Error('Task failed');
      } else if (completedTask.state === 'cancelled') {
        throw new Error('Task was cancelled');
      }
    }

    throw new Error(`Task ${taskId} not found`);
  }

  /**
   * Cancel a task
   */
  async cancelTask(taskId: string): Promise<boolean> {
    // Cancel running task
    const runningTask = this.runningTasks.get(taskId);
    if (runningTask) {
      runningTask.abortController?.abort();
      this.runningTasks.delete(taskId);
      this.completedTasks.set(taskId, {
        id: taskId,
        state: 'cancelled',
        startTime: runningTask.startedAt,
        endTime: Date.now(),
        duration: runningTask.startedAt ? Date.now() - runningTask.startedAt : undefined
      });
      // Don't reject immediately to avoid unhandled rejections
      // The waitForTask method will handle the cancellation properly
      return true;
    }

    // Cancel queued task
    const queueIndex = this.taskQueue.findIndex(task => task.id === taskId);
    if (queueIndex >= 0) {
      const task = this.taskQueue.splice(queueIndex, 1)[0];
      this.completedTasks.set(taskId, {
        id: taskId,
        state: 'cancelled'
      });
      // Don't reject immediately to avoid unhandled rejections
      // The waitForTask method will handle the cancellation properly
      return true;
    }

    return false;
  }

  /**
   * Get queue statistics
   */
  getQueueStats() {
    return {
      queued: this.taskQueue.length,
      running: this.runningTasks.size,
      completed: this.completedTasks.size,
      maxConcurrent: this.config.maxConcurrentTasks
    };
  }

  /**
   * Destroy the processor and cancel all tasks
   */
  async destroy(): Promise<void> {
    // Cancel all running tasks
    for (const [taskId] of this.runningTasks) {
      await this.cancelTask(taskId);
    }

    // Cancel all queued tasks
    const queuedTaskIds = this.taskQueue.map(task => task.id);
    for (const taskId of queuedTaskIds) {
      await this.cancelTask(taskId);
    }

    this.isProcessing = false;
  }

  /**
   * Insert task into queue based on priority
   */
  private insertTaskByPriority(task: QueuedTask): void {
    if (!this.config.enablePriority) {
      this.taskQueue.push(task);
      return;
    }

    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    const taskPriority = priorityOrder[task.priority];

    let insertIndex = this.taskQueue.length;
    for (let i = 0; i < this.taskQueue.length; i++) {
      const queuedPriority = priorityOrder[this.taskQueue[i].priority];
      if (taskPriority < queuedPriority) {
        insertIndex = i;
        break;
      }
    }

    this.taskQueue.splice(insertIndex, 0, task);
  }

  /**
   * Start processing tasks from the queue
   */
  private async startProcessing(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.taskQueue.length > 0 || this.runningTasks.size > 0) {
      // Start new tasks if we have capacity
      while (
        this.taskQueue.length > 0 &&
        this.runningTasks.size < this.config.maxConcurrentTasks
      ) {
        const task = this.taskQueue.shift()!;
        this.executeTask(task);
      }

      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    this.isProcessing = false;
  }

  /**
   * Execute a single task
   */
  private async executeTask<T, R>(task: QueuedTask<T, R>): Promise<void> {
    task.startedAt = Date.now();
    this.runningTasks.set(task.id, task);

    try {
      // Set up progress tracking
      const onProgress = this.config.enableProgress && task.onProgress
        ? task.onProgress
        : undefined;

      // Execute the task with timeout
      const timeoutMs = task.timeout || this.config.taskTimeout;
      const result = await Promise.race([
        task.processor(task.data, onProgress),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Task timeout')), timeoutMs);
        })
      ]);

      // Task completed successfully
      task.completedAt = Date.now();
      const status: TaskStatus<R> = {
        id: task.id,
        state: 'completed',
        result,
        startTime: task.startedAt,
        endTime: task.completedAt,
        duration: task.completedAt - task.startedAt
      };

      this.completedTasks.set(task.id, status);
      this.runningTasks.delete(task.id);

      task.resolve?.(result);
      task.onComplete?.(result);

    } catch (error) {
      // Task failed
      task.completedAt = Date.now();
      const taskError = error instanceof Error ? error : new Error(String(error));

      const status: TaskStatus = {
        id: task.id,
        state: 'failed',
        error: taskError,
        startTime: task.startedAt,
        endTime: task.completedAt,
        duration: task.startedAt ? task.completedAt! - task.startedAt : undefined
      };

      this.completedTasks.set(task.id, status);
      this.runningTasks.delete(task.id);

      task.reject?.(taskError);
      task.onError?.(taskError);
    }
  }
}
