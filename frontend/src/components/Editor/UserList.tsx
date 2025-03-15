import React from 'react';
import styled from 'styled-components';
import { User } from '../../services/SocketService';

const UserListContainer = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  background-color: #2d2d2d;
  border-radius: 4px;
  padding: 8px;
  z-index: 10;
`;

const UserItem = styled.div<{ color: string }>`
  display: flex;
  align-items: center;
  margin-bottom: 4px;
  color: #fff;
  font-size: 12px;

  &:last-child {
    margin-bottom: 0;
  }

  &::before {
    content: '';
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: ${props => props.color};
    margin-right: 6px;
  }
`;

interface UserListProps {
  users: User[];
  currentUserId: string;
}

const UserList: React.FC<UserListProps> = ({ users, currentUserId }) => {
  // Generate consistent colors for users
  const getUserColor = (userId: string) => {
    const hue = Math.abs(hashCode(userId) % 360);
    return `hsl(${hue}, 70%, 50%)`;
  };

  return (
    <UserListContainer>
      {users.map(user => (
        <UserItem key={user.id} color={getUserColor(user.id)}>
          {user.id === currentUserId ? 'You' : user.name}
          {user.cursor && ` (${user.cursor.file})`}
        </UserItem>
      ))}
    </UserListContainer>
  );
};

// Helper function to generate consistent hash from string
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

export default UserList; 