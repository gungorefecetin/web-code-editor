import React from 'react';
import styled from 'styled-components';

const ConsoleContainer = styled.div`
  background-color: #1e1e1e;
  color: #fff;
  font-family: 'Consolas', 'Monaco', monospace;
  padding: 8px;
  height: 150px;
  overflow-y: auto;
  border-top: 1px solid #333;
`;

const ConsoleEntry = styled.div<{ type: string }>`
  margin: 4px 0;
  color: ${props => {
    switch (props.type) {
      case 'error':
        return '#ff6b6b';
      case 'warn':
        return '#ffd93d';
      case 'info':
        return '#4dabf7';
      default:
        return '#fff';
    }
  }};
`;

interface ConsoleProps {
  logs: Array<[string, any[]]>;
  error: string | null;
}

const Console: React.FC<ConsoleProps> = ({ logs, error }) => {
  return (
    <ConsoleContainer>
      {logs.map((log, index) => (
        <ConsoleEntry key={index} type={log[0]}>
          {log[1].map(item => 
            typeof item === 'object' 
              ? JSON.stringify(item, null, 2) 
              : String(item)
          ).join(' ')}
        </ConsoleEntry>
      ))}
      {error && (
        <ConsoleEntry type="error">
          Error: {error}
        </ConsoleEntry>
      )}
    </ConsoleContainer>
  );
};

export default Console; 