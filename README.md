# Collaborative Code Editor

A real-time collaborative code editor built with React, Node.js, and Socket.io.

## Features

- Real-time code synchronization
- Monaco Editor integration
- Multiple user support
- Room-based collaboration

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

## Setup

### Backend

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a .env file with the following variables:
```
PORT=3001
MONGODB_URI=mongodb://localhost:27017/code-collab
NODE_ENV=development
```

4. Start the development server:
```bash
npm run dev
```

### Frontend

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Tech Stack

- Frontend:
  - React with TypeScript
  - Vite
  - Monaco Editor
  - Socket.io Client
  - Styled Components

- Backend:
  - Node.js
  - Express
  - Socket.io
  - MongoDB
  - Mongoose 