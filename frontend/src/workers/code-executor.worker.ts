/// <reference lib="webworker" />

declare const self: Worker;
type ConsoleMethod = 'log' | 'error' | 'warn' | 'info';
type LogEntry = [ConsoleMethod, any[]];

// Web Worker for secure JavaScript execution
self.onmessage = (event) => {
  const { code } = event.data;
  
  try {
    // Create a secure context for evaluation
    const secureEval = new Function('console', `
      let logs: Array<[string, any[]]> = [];
      const secureConsole = {
        log: (...args) => logs.push(['log', args]),
        error: (...args) => logs.push(['error', args]),
        warn: (...args) => logs.push(['warn', args]),
        info: (...args) => logs.push(['info', args])
      };
      
      try {
        ${code}
        return { logs, error: null };
      } catch (error: any) {
        return { logs, error: error.message };
      }
    `);

    // Execute the code in the secure context
    const result = secureEval(console);
    self.postMessage({ type: 'result', ...result });
  } catch (error) {
    if (error instanceof Error) {
      self.postMessage({ 
        type: 'error',
        error: error.message,
        logs: []
      });
    } else {
      self.postMessage({ 
        type: 'error',
        error: 'An unknown error occurred',
        logs: []
      });
    }
  }
};

// Disable potentially dangerous APIs
(self as any).fetch = undefined;
(self as any).XMLHttpRequest = undefined;
(self as any).WebSocket = undefined;
(self as any).importScripts = undefined; 