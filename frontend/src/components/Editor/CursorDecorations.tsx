import React, { useEffect, useRef } from 'react';
import { editor, Range } from 'monaco-editor';
import { User } from '../../services/SocketService';

interface CursorDecorationsProps {
  editor: editor.IStandaloneCodeEditor;
  users: User[];
  currentFile: string;
  currentUserId: string;
}

const CursorDecorations: React.FC<CursorDecorationsProps> = ({
  editor,
  users,
  currentFile,
  currentUserId
}) => {
  const decorationsRef = useRef<string[]>([]);

  useEffect(() => {
    // Remove old decorations
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);

    // Create new decorations for each user's cursor
    const decorations = users
      .filter(user => user.id !== currentUserId && user.cursor?.file === currentFile)
      .map(user => {
        const position = {
          lineNumber: user.cursor!.line,
          column: user.cursor!.column
        };

        // Generate a random color based on user ID for consistency
        const hue = Math.abs(hashCode(user.id) % 360);
        const color = `hsl(${hue}, 70%, 50%)`;

        return [
          // Cursor line decoration
          {
            range: new Range(
              position.lineNumber,
              position.column,
              position.lineNumber,
              position.column + 1
            ),
            options: {
              className: 'cursor-decoration',
              hoverMessage: { value: `${user.name}'s cursor` },
              beforeContentClassName: `cursor-decoration-before-${user.id}`,
              afterContentClassName: `cursor-decoration-after-${user.id}`,
              marginClassName: `cursor-decoration-margin-${user.id}`
            }
          },
          // Add a style element for this user's cursor
          {
            range: new Range(1, 1, 1, 1),
            options: {
              inlineClassName: `cursor-${user.id}`,
              after: {
                content: '',
                inlineClassName: `cursor-style-${user.id}`
              }
            }
          }
        ];
      })
      .flat();

    // Apply new decorations
    decorationsRef.current = editor.deltaDecorations([], decorations);

    // Add dynamic styles for cursors
    users
      .filter(user => user.id !== currentUserId)
      .forEach(user => {
        const hue = Math.abs(hashCode(user.id) % 360);
        const color = `hsl(${hue}, 70%, 50%)`;
        const styleId = `cursor-style-${user.id}`;

        let style = document.getElementById(styleId);
        if (!style) {
          style = document.createElement('style');
          style.id = styleId;
          document.head.appendChild(style);
        }

        style.textContent = `
          .cursor-decoration-before-${user.id} {
            content: '';
            position: absolute;
            width: 2px;
            height: 18px;
            background: ${color};
            z-index: 1;
          }
          
          .cursor-decoration-margin-${user.id}::after {
            content: '${user.name}';
            position: absolute;
            right: 100%;
            padding: 0 4px;
            font-size: 12px;
            line-height: 18px;
            color: ${color};
            white-space: nowrap;
            pointer-events: none;
          }
        `;
      });

    // Cleanup function
    return () => {
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
      users.forEach(user => {
        const styleId = `cursor-style-${user.id}`;
        const style = document.getElementById(styleId);
        if (style) {
          document.head.removeChild(style);
        }
      });
    };
  }, [editor, users, currentFile, currentUserId]);

  return null;
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

export default CursorDecorations; 