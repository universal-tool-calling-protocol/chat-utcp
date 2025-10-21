/**
 * Browser polyfill for Node.js async_hooks module
 * LangGraph uses AsyncLocalStorage which is not available in browsers
 */

// Simple implementation that works in browser context
class AsyncLocalStorage<T = any> {
  private store: Map<string, T> = new Map();
  private currentId: string | null = null;

  run<R>(store: T, callback: (...args: any[]) => R, ...args: any[]): R {
    const id = Math.random().toString(36);
    this.currentId = id;
    this.store.set(id, store);
    try {
      return callback(...args);
    } finally {
      this.store.delete(id);
      this.currentId = null;
    }
  }

  getStore(): T | undefined {
    if (this.currentId) {
      return this.store.get(this.currentId);
    }
    return undefined;
  }

  enterWith(store: T): void {
    const id = Math.random().toString(36);
    this.currentId = id;
    this.store.set(id, store);
  }

  exit(callback: (...args: any[]) => void, ...args: any[]): void {
    if (this.currentId) {
      this.store.delete(this.currentId);
      this.currentId = null;
    }
    callback(...args);
  }

  disable(): void {
    this.store.clear();
    this.currentId = null;
  }
}

export { AsyncLocalStorage };
