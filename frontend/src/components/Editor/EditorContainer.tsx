import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import Editor, { useMonaco, OnMount } from '@monaco-editor/react';
import Console from '../Console/Console';
import Chat from '../Chat/Chat';
import { useCodeExecution } from '../../hooks/useCodeExecution';
import socketService, { CodeUpdate, User, CursorPosition, ChatMessage } from '../../services/SocketService';
import { useParams } from 'react-router-dom';
import debounce from 'lodash/debounce';
import CursorDecorations from './CursorDecorations';
import UserList from './UserList';
import toast, { Toaster } from 'react-hot-toast';

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

const Tab = styled.button`
  padding: 6px 12px;
  margin-right: 4px;
  border: none;
  cursor: pointer;
  border-radius: 4px;
  
  &[data-active="true"] {
    background-color: #1e1e1e;
    color: #fff;
    
    &:hover {
      background-color: #1e1e1e;
    }
  }
  
  &[data-active="false"] {
    background-color: transparent;
    color: #888;
    
    &:hover {
      background-color: #333;
    }
  }

  &:disabled {
    background-color: #444;
    cursor: not-allowed;
  }
`;

const EditorWrapper = styled.div`
  position: relative;
  height: 100%;
`;

const ChatContainer = styled.div`
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 320px;
  height: 400px;
  background-color: #252526;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  overflow: hidden;
`;

interface EditorContainerProps {
  onChange?: (language: string, value: string) => void;
}

const EditorContainer: React.FC<EditorContainerProps> = ({ onChange }) => {
  const { roomId } = useParams<{ roomId: string }>();
  const monaco = useMonaco();
  const editorRef = useRef<any>(null);
  const [htmlCode, setHtmlCode] = useState('<div>\n  <!-- Write your HTML here -->\n</div>');
  const [cssCode, setCssCode] = useState('/* Write your CSS here */\n');
  const [jsCode, setJsCode] = useState('// Write your JavaScript here\n');
  const [activeTab, setActiveTab] = useState<'html' | 'css' | 'js'>('html');
  const [users, setUsers] = useState<User[]>([]);
  const { executeCode, result } = useCodeExecution();
  const isLocalUpdate = useRef(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Join room on mount
  useEffect(() => {
    if (roomId) {
      socketService.joinRoom(roomId);
      return () => {
        socketService.leaveRoom();
      };
    }
  }, [roomId]);

  // Handle room state updates
  useEffect(() => {
    const handleRoomState = (state: { code: { html: string; css: string; js: string }; users: User[]; messages: ChatMessage[] }) => {
      isLocalUpdate.current = true;
      setHtmlCode(state.code.html);
      setCssCode(state.code.css);
      setJsCode(state.code.js);
      setUsers(state.users);
      setMessages(state.messages);
      isLocalUpdate.current = false;
    };

    const handleCodeUpdate = (update: CodeUpdate) => {
      if (update.userId === socketService.getUserId()) return;
      
      isLocalUpdate.current = true;
      switch (update.language) {
        case 'html':
          setHtmlCode(update.content);
          break;
        case 'css':
          setCssCode(update.content);
          break;
        case 'js':
          setJsCode(update.content);
          break;
      }
      isLocalUpdate.current = false;
    };

    const handleUserJoined = (user: User) => {
      setUsers(prev => [...prev, user]);
      toast.success(`${user.name} joined the room`, {
        icon: '👋',
        duration: 3000,
        position: 'bottom-right',
      });
    };

    const handleUserLeft = (userId: string) => {
      setUsers(prev => {
        const user = prev.find(u => u.id === userId);
        if (user) {
          toast.error(`${user.name} left the room`, {
            icon: '👋',
            duration: 3000,
            position: 'bottom-right',
          });
        }
        return prev.filter(u => u.id !== userId);
      });
    };

    const handleCursorUpdate = (update: { userId: string; cursor: CursorPosition }) => {
      setUsers(prev => prev.map(user => 
        user.id === update.userId 
          ? { ...user, cursor: update.cursor, lastActivity: Date.now() }
          : user
      ));
    };

    const handleChatMessage = (message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
    };

    socketService.on('room_state', handleRoomState);
    socketService.on('code_updated', handleCodeUpdate);
    socketService.on('user_joined', handleUserJoined);
    socketService.on('user_left', handleUserLeft);
    socketService.on('cursor_updated', handleCursorUpdate);
    socketService.on('chat_message', handleChatMessage);

    // Cleanup inactive users every minute
    const cleanupInterval = setInterval(() => {
      setUsers(prev => prev.filter(user => {
        const isInactive = user.lastActivity && Date.now() - user.lastActivity > 5 * 60 * 1000; // 5 minutes
        if (isInactive) {
          toast.error(`${user.name} timed out due to inactivity`, {
            icon: '⏰',
            duration: 3000,
            position: 'bottom-right',
          });
          return false;
        }
        return true;
      }));
    }, 60 * 1000);

    return () => {
      socketService.off('room_state', handleRoomState);
      socketService.off('code_updated', handleCodeUpdate);
      socketService.off('user_joined', handleUserJoined);
      socketService.off('user_left', handleUserLeft);
      socketService.off('cursor_updated', handleCursorUpdate);
      socketService.off('chat_message', handleChatMessage);
      clearInterval(cleanupInterval);
    };
  }, []);

  // Debounced code update function
  const debouncedCodeUpdate = useCallback(
    debounce((language: 'html' | 'css' | 'js', content: string) => {
      socketService.updateCode(language, content);
    }, 500),
    []
  );

  const handleCodeChange = (language: 'html' | 'css' | 'js', value: string | undefined) => {
    if (!value || isLocalUpdate.current) return;
    
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
    debouncedCodeUpdate(language, value);
  };

  // Handle cursor updates
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    editor.onDidChangeCursorPosition(
      debounce((e: any) => {
        const position = editor.getPosition();
        if (position) {
          socketService.updateCursor({
            line: position.lineNumber,
            column: position.column,
            file: activeTab
          });
        }
      }, 100)
    );
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

  const handleSendMessage = (content: string) => {
    socketService.sendMessage(content);
  };

  return (
    <Container>
      <Toaster />
      <EditorPanel>
        <EditorWrapper>
          <TabContainer>
            <Tab data-active={(activeTab === 'html').toString()} onClick={() => setActiveTab('html')}>
              HTML {users.filter(u => u.cursor?.file === 'html').length > 0 && '👥'}
            </Tab>
            <Tab data-active={(activeTab === 'css').toString()} onClick={() => setActiveTab('css')}>
              CSS {users.filter(u => u.cursor?.file === 'css').length > 0 && '👥'}
            </Tab>
            <Tab data-active={(activeTab === 'js').toString()} onClick={() => setActiveTab('js')}>
              JS {users.filter(u => u.cursor?.file === 'js').length > 0 && '👥'}
            </Tab>
          </TabContainer>
          <Editor
            height="calc(100% - 42px)"
            defaultLanguage={getEditorLanguage()}
            language={getEditorLanguage()}
            value={getCurrentCode()}
            onChange={(value) => handleCodeChange(activeTab, value)}
            theme="vs-dark"
            onMount={handleEditorDidMount}
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
          {editorRef.current && (
            <CursorDecorations
              editor={editorRef.current}
              users={users}
              currentFile={activeTab}
              currentUserId={socketService.getUserId()}
            />
          )}
          <UserList users={users} currentUserId={socketService.getUserId()} />
        </EditorWrapper>
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
      <ChatContainer>
        <Chat
          messages={messages}
          onSendMessage={handleSendMessage}
          currentUserId={socketService.getUserId()}
        />
      </ChatContainer>
    </Container>
  );
};

export default EditorContainer; 