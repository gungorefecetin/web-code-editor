import { useEffect, useRef, useState } from 'react';

interface ExecutionResult {
  logs: Array<[string, any[]]>;
  error: string | null;
}

export const useCodeExecution = () => {
  const workerRef = useRef<Worker | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<ExecutionResult>({ logs: [], error: null });

  useEffect(() => {
    // Create worker
    workerRef.current = new Worker(
      new URL('../workers/code-executor.worker.ts', import.meta.url),
      { type: 'module' }
    );

    // Set up message handler
    workerRef.current.onmessage = (event) => {
      const { type, logs, error } = event.data;
      setResult({ logs, error });
      setIsExecuting(false);
    };

    // Clean up
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const executeCode = (code: string) => {
    if (!workerRef.current) return;
    
    setIsExecuting(true);
    setResult({ logs: [], error: null });
    workerRef.current.postMessage({ code });
  };

  return {
    executeCode,
    isExecuting,
    result
  };
}; 