export interface QueuedRequest<T> {
  id: string;
  priority: number;
  request: () => Promise<T>;
}

export class ResourceQueue {
  private maxConcurrent: number;
  private activeRequests: Map<string, Promise<any>>;
  private queuedRequests: Array<QueuedRequest<any>>;

  constructor(maxConcurrent: number = 3) {
    this.maxConcurrent = maxConcurrent;
    this.activeRequests = new Map();
    this.queuedRequests = [];
  }

  async enqueue<T>(
    id: string,
    priority: number,
    request: () => Promise<T>
  ): Promise<T> {
    // If there's capacity, execute immediately
    if (this.activeRequests.size < this.maxConcurrent) {
      return this.executeRequest({ id, priority, request });
    }

    // Otherwise, queue the request
    return new Promise((resolve, reject) => {
      const queuedRequest: QueuedRequest<T> = {
        id,
        priority,
        request: async () => {
          try {
            const result = await request();
            resolve(result);
            return result;
          } catch (error) {
            reject(error);
            throw error;
          }
        },
      };

      // Insert into queue based on priority
      const insertIndex = this.queuedRequests.findIndex(
        (r) => r.priority < priority
      );
      if (insertIndex === -1) {
        this.queuedRequests.push(queuedRequest);
      } else {
        this.queuedRequests.splice(insertIndex, 0, queuedRequest);
      }
    });
  }

  private async executeRequest<T>(request: QueuedRequest<T>): Promise<T> {
    const execution = request.request().finally(() => {
      this.activeRequests.delete(request.id);
      this.processQueue();
    });

    this.activeRequests.set(request.id, execution);
    return execution;
  }

  private async processQueue(): Promise<void> {
    while (
      this.activeRequests.size < this.maxConcurrent &&
      this.queuedRequests.length > 0
    ) {
      const nextRequest = this.queuedRequests.shift();
      if (nextRequest) {
        await this.executeRequest(nextRequest);
      }
    }
  }

  public getQueueLength(): number {
    return this.queuedRequests.length;
  }

  public getActiveRequestCount(): number {
    return this.activeRequests.size;
  }

  public clearQueue(): void {
    this.queuedRequests = [];
  }
}
