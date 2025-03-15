import React from 'react'
import EditorContainer from './components/Editor/EditorContainer'
import './App.css'

function App() {
  const handleEditorChange = (language: string, value: string) => {
    // Here we can implement real-time collaboration logic later
    console.log(`${language} code changed:`, value)
  }

  return (
    <div className="App">
      <EditorContainer onChange={handleEditorChange} />
    </div>
  )
}

export default App
