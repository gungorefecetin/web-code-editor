import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Editor from '@monaco-editor/react';
import Console from '../Console/Console';
import { useCodeExecution } from '../../hooks/useCodeExecution';

const Container = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 150px;
  gap: 8px;
  height: 100vh;
  padding: 16px;
  box-sizing: border-box;
  background-color: #1e1e1e;
`;

const EditorPanel = styled.div`
  background-color: #252526;
  border-radius: 4px;
  overflow: hidden;
`;

const PreviewContainer = styled.div`
  grid-row: span 2;
  display: flex;
  flex-direction: column;
  background-color: white;
  border-radius: 4px;
  overflow: hidden;
`;

const PreviewFrame = styled.iframe`
  flex: 1;
  width: 100%;
  border: none;
  background: white;
`;

const ConsoleContainer = styled.div`
  grid-column: 1;
  grid-row: 2;
  background-color: #252526;
  border-radius: 4px;
  overflow: hidden;
`;

const TabContainer = styled.div`
  display: flex;
  background-color: #2d2d2d;
  padding: 4px;
`;

const Tab = styled.button<{ active: boolean }>`
  padding: 6px 12px;
  margin-right: 4px;
  border: none;
  background-color: ${props => props.active ? '#1e1e1e' : 'transparent'};
  color: ${props => props.active ? '#fff' : '#888'};
  cursor: pointer;
  border-radius: 4px;
  
  &:hover {
    background-color: ${props => props.active ? '#1e1e1e' : '#333'};
  }
`;

interface EditorContainerProps {
  onChange?: (language: string, value: string) => void;
}

const EditorContainer: React.FC<EditorContainerProps> = ({ onChange }) => {
  const [htmlCode, setHtmlCode] = useState('<div>\n  <!-- Write your HTML here -->\n</div>');
  const [cssCode, setCssCode] = useState('/* Write your CSS here */\n');
  const [jsCode, setJsCode] = useState('// Write your JavaScript here\n');
  const [activeTab, setActiveTab] = useState<'html' | 'css' | 'js'>('html');
  const { executeCode, result } = useCodeExecution();

  // Debounce preview updates
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (activeTab === 'js') {
        executeCode(jsCode);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [jsCode, activeTab, executeCode]);

  const handleCodeChange = (language: 'html' | 'css' | 'js', value: string | undefined) => {
    if (!value) return;
    
    switch (language) {
      case 'html':
        setHtmlCode(value);
        break;
      case 'css':
        setCssCode(value);
        break;
      case 'js':
        setJsCode(value);
        break;
    }
    
    onChange?.(language, value);
  };

  const getEditorLanguage = () => {
    switch (activeTab) {
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      case 'js':
        return 'javascript';
      default:
        return 'html';
    }
  };

  const getCurrentCode = () => {
    switch (activeTab) {
      case 'html':
        return htmlCode;
      case 'css':
        return cssCode;
      case 'js':
        return jsCode;
      default:
        return '';
    }
  };

  const getPreviewContent = () => `
    <!DOCTYPE html>
    <html>
      <head>
        <style>${cssCode}</style>
      </head>
      <body>
        ${htmlCode}
        <script>
          // Create a secure console that communicates with the parent
          const secureConsole = {
            log: (...args) => window.parent.postMessage({ type: 'console', method: 'log', args }, '*'),
            error: (...args) => window.parent.postMessage({ type: 'console', method: 'error', args }, '*'),
            warn: (...args) => window.parent.postMessage({ type: 'console', method: 'warn', args }, '*'),
            info: (...args) => window.parent.postMessage({ type: 'console', method: 'info', args }, '*')
          };
          
          // Replace the default console
          window.console = secureConsole;

          try {
            ${jsCode}
          } catch (error) {
            console.error(error.message);
          }
        </script>
      </body>
    </html>
  `;

  return (
    <Container>
      <EditorPanel>
        <TabContainer>
          <Tab active={activeTab === 'html'} onClick={() => setActiveTab('html')}>HTML</Tab>
          <Tab active={activeTab === 'css'} onClick={() => setActiveTab('css')}>CSS</Tab>
          <Tab active={activeTab === 'js'} onClick={() => setActiveTab('js')}>JS</Tab>
        </TabContainer>
        <Editor
          height="calc(100% - 42px)"
          defaultLanguage={getEditorLanguage()}
          language={getEditorLanguage()}
          value={getCurrentCode()}
          onChange={(value) => handleCodeChange(activeTab, value)}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: 'on',
            automaticLayout: true,
            tabSize: 2,
            formatOnType: true,
            formatOnPaste: true,
            suggestOnTriggerCharacters: true,
          }}
        />
      </EditorPanel>
      <PreviewContainer>
        <PreviewFrame
          title="preview"
          srcDoc={getPreviewContent()}
          sandbox="allow-scripts"
        />
      </PreviewContainer>
      <ConsoleContainer>
        <Console logs={result.logs} error={result.error} />
      </ConsoleContainer>
    </Container>
  );
};

export default EditorContainer; 