import { useState } from 'react'
import styled from 'styled-components'
import Editor from '@monaco-editor/react'
import { io } from 'socket.io-client'

const socket = io('http://localhost:3001')

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
`

const Header = styled.header`
  background-color: #1e1e1e;
  color: white;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const EditorContainer = styled.div`
  flex: 1;
  display: flex;
`

const App = () => {
  const [code, setCode] = useState('')

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value)
      socket.emit('code_change', {
        roomId: 'default',
        code: value
      })
    }
  }

  return (
    <AppContainer>
      <Header>
        <h1>Collaborative Code Editor</h1>
      </Header>
      <EditorContainer>
        <Editor
          height="100%"
          defaultLanguage="javascript"
          defaultValue="// Start coding here..."
          theme="vs-dark"
          onChange={handleEditorChange}
        />
      </EditorContainer>
    </AppContainer>
  )
}

export default App
