import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { ChatMessage } from '../../services/SocketService';

const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #1e1e1e;
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`;

const MessageList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const MessageItem = styled.div<{ isSystem?: boolean }>`
  padding: 8px;
  border-radius: 4px;
  background-color: ${props => props.isSystem ? '#2d2d2d' : '#333'};
  font-size: 14px;
`;

const MessageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  font-size: 12px;
`;

const UserName = styled.span`
  color: #4dabf7;
  font-weight: 500;
`;

const Timestamp = styled.span`
  color: #666;
`;

const MessageContent = styled.div`
  word-break: break-word;
`;

const InputContainer = styled.div`
  padding: 12px;
  background-color: #2d2d2d;
  display: flex;
  gap: 8px;
`;

const Input = styled.input`
  flex: 1;
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid #444;
  background-color: #1e1e1e;
  color: #fff;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #4dabf7;
  }
`;

const SendButton = styled.button`
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  background-color: #4dabf7;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #3c99e6;
  }

  &:disabled {
    background-color: #444;
    cursor: not-allowed;
  }
`;

interface ChatProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  currentUserId: string;
}

const Chat: React.FC<ChatProps> = ({ messages, onSendMessage, currentUserId }) => {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  return (
    <ChatContainer>
      <MessageList>
        {messages.map(message => (
          <MessageItem key={message.id} isSystem={message.userId === 'system'}>
            <MessageHeader>
              <UserName>
                {message.userId === currentUserId ? 'You' : message.userName}
              </UserName>
              <Timestamp>{formatTimestamp(message.timestamp)}</Timestamp>
            </MessageHeader>
            <MessageContent>{message.content}</MessageContent>
          </MessageItem>
        ))}
        <div ref={messagesEndRef} />
      </MessageList>
      <form onSubmit={handleSubmit}>
        <InputContainer>
          <Input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            maxLength={500}
          />
          <SendButton type="submit" disabled={!newMessage.trim()}>
            Send
          </SendButton>
        </InputContainer>
      </form>
    </ChatContainer>
  );
};

export default Chat; 