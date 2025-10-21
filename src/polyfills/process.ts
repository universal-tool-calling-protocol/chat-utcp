/**
 * Browser polyfill for Node.js process global
 * Required for UTCP SDK which expects Node.js environment
 */

declare global {
  interface Window {
    process: NodeJS.Process;
  }
}

// Create a Proxy for env that always returns undefined but doesn't throw errors
const envProxy = new Proxy({} as Record<string, string | undefined>, {
  get: (target, prop: string) => {
    return target[prop];
  },
  set: (target, prop: string, value: any) => {
    target[prop] = value;
    return true;
  },
});

// Create a minimal process object for browser compatibility
const processPolyfill = {
  env: envProxy,
  cwd: () => '/',
  platform: 'browser' as NodeJS.Platform,
  version: 'v18.0.0',
  versions: {
    node: '18.0.0',
  },
  nextTick: (callback: (...args: any[]) => void, ...args: any[]) => {
    setTimeout(() => callback(...args), 0);
  },
  browser: true,
};

// Only define if process doesn't already exist
if (typeof window !== 'undefined' && typeof (window as any).process === 'undefined') {
  (window as any).process = processPolyfill;
}

// Also define globally
if (typeof global !== 'undefined' && typeof (global as any).process === 'undefined') {
  (global as any).process = processPolyfill;
}

export {};
