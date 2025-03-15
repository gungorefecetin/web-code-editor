import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import EditorContainer from './components/Editor/EditorContainer'
import './App.css'

function App() {
  const handleEditorChange = (language: string, value: string) => {
    // This is now handled by the EditorContainer component
    console.log(`${language} code changed:`, value)
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/room/:roomId" element={<EditorContainer onChange={handleEditorChange} />} />
          <Route path="/" element={<Navigate to={`/room/${Date.now().toString(36)}`} replace />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
