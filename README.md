# CodeGuardian AI

Code analysis tool with GitHub OAuth integration.

## 🚀 Project Overview

CodeGuardian AI is a modern web application that provides AI-powered code analysis for GitHub repositories. Built with a monorepo architecture using Turborepo, featuring a React frontend and NestJS backend.

## 📁 Project Structure

```
CodeGuardianAI/
├── frontend/          # React + Vite + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/        # Page components (Login, Dashboard)
│   │   ├── routes/        # React Router configuration
│   │   ├── utils/         # Utility functions (auth, API)
│   │   └── constants/     # Color constants and theme
│   └── package.json
├── backend/           # NestJS + TypeScript
│   ├── src/
│   │   ├── auth/         # Authentication module
│   │   │   ├── strategies/    # Passport strategies (GitHub, JWT)
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.module.ts
│   │   └── main.ts
│   └── package.json
├── turbo.json         # Turborepo configuration
└── package.json       # Root workspace config
```

## 🛠️ Tech Stack

### Frontend
- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS v4** - Styling
- **React Router** - Client-side routing

### Backend
- **NestJS** - Node.js framework
- **TypeScript** - Type safety
- **Passport.js** - Authentication
  - `passport-github2` - GitHub OAuth strategy
  - `passport-jwt` - JWT strategy
- **@nestjs/jwt** - JWT token management
- **@nestjs/config** - Environment configuration

## 📋 Prerequisites

- Node.js 18+
- npm 10+
- GitHub OAuth App (see setup instructions)

## ⚙️ Setup Instructions

### 1. Clone and Install

```bash
# Install root dependencies (Turborepo)
npm install

# Install all workspace dependencies
npm install
```

### 2. Backend Setup

Create `backend/.env`:

```env
# Server Configuration
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# GitHub OAuth Configuration
# Get these from: https://github.com/settings/developers
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback

# JWT Configuration
# Generate a strong secret: openssl rand -base64 32
JWT_SECRET=your_jwt_secret_here_change_in_production
```

**Creating GitHub OAuth App:**
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Set:
   - **Application name**: `CodeGuardian AI`
   - **Homepage URL**: `http://localhost:5173`
   - **Authorization callback URL**: `http://localhost:3000/auth/github/callback`
4. Copy Client ID and generate Client Secret

### 3. Frontend Setup

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:3000
```

### 4. Install Frontend Dependencies

```bash
cd frontend
npm install react-router-dom
```

## 🚀 Development

### Run all projects (recommended)

```bash
npm run dev
```

This starts both frontend (port 5173) and backend (port 3000) simultaneously.

### Run specific project

```bash
# Frontend only
npm run dev --workspace=@codeguardianai/frontend

# Backend only
npm run dev --workspace=@codeguardianai/backend
```

### Build all projects

```bash
npm run build
```

### Lint all projects

```bash
npm run lint
```

## 🎨 Features

### ✅ Completed (Phase 1: Auth Foundation)

- [x] **GitHub OAuth Integration**
  - OAuth flow with GitHub
  - Secure token generation and storage
  - User profile retrieval

- [x] **JWT Session Management**
  - Token-based authentication
  - Protected routes
  - Token validation

- [x] **Frontend Authentication Flow**
  - Beautiful login page with animations
  - OAuth callback handling
  - Automatic redirects

- [x] **User Dashboard**
  - Display GitHub user profile
  - Show user details (avatar, name, email, ID)
  - Link to GitHub profile
  - Logout functionality

- [x] **Routing System**
  - React Router setup
  - Protected routes
  - Route-based navigation

- [x] **UI/UX**
  - Modern glassmorphism design
  - Animated gradient backgrounds
  - Responsive layout
  - Consistent color theme
  - Tailwind CSS v4 styling

### ✅ Completed (Phase 2: Repo Listing)

- [x] **Repository Listing**
  - GET /repos endpoint with pagination
  - Fetch user repositories from GitHub
  - Display repositories in beautiful grid layout
  - Repository details (name, description, language, stars, forks)

- [x] **Search & Filter**
  - Search repositories by name or description
  - Filter by programming language
  - Real-time filtering

- [x] **Infinite Scrolling**
  - Automatic loading as user scrolls
  - Handles unlimited repositories
  - Efficient pagination (30 per page)
  - Loading indicators

- [x] **Navigation**
  - Route to /repositories page
  - Navigation from dashboard
  - Protected route with authentication

## 📡 API Endpoints

### Authentication

- `GET /auth/github/login` - Initiate GitHub OAuth flow
- `GET /auth/github/callback` - GitHub OAuth callback (handles token generation)
- `GET /auth/me` - Get current user info (requires JWT token)
- `GET /auth/logout` - Logout endpoint

### Repositories

- `GET /repos?page=1&per_page=30` - Get user repositories with pagination (requires JWT token)
- `GET /repos/:owner/:repo` - Get specific repository details (requires JWT token)

### Example Usage

```typescript
// Get current user
const response = await fetch('http://localhost:3000/auth/me', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});
const data = await response.json();
```

## 🗺️ Development Roadmap

### ✅ Phase 1: Auth Foundation (COMPLETED)
- [x] GitHub OAuth endpoints
- [x] JWT session management
- [x] Frontend login flow
- [x] User dashboard
- [x] Routing system
- [x] UI/UX design

### ✅ Phase 2: Repo Listing (COMPLETED)
- [x] GET /repos endpoint (with pagination)
- [x] Frontend repo selection UI
- [x] Repository list display (grid layout)
- [x] Repo search and filtering
- [x] Infinite scrolling for large repository lists

### 📋 Phase 3: MVP Analyzer
- [ ] POST /analyze endpoint
- [ ] Job queue (BullMQ)
- [ ] Basic code analysis
- [ ] Frontend polling + results display
- [ ] Analysis report UI

### 🚀 Phase 4: Enhancements
- [ ] PR support
- [ ] LLM enrichment
- [ ] Apply patch functionality
- [ ] Advanced analytics
- [ ] Export reports

## 🎨 Design System

The application uses a consistent color theme defined in `frontend/src/constants/colors.ts`:

- **Gradient Background**: Indigo → Purple → Pink
- **Glass Morphism**: Translucent cards with backdrop blur
- **Color Palette**: Purple, Pink, Indigo, Green (for success states)
- **Animations**: Fade-in, slide-up, pulse effects

## 🔒 Security

- JWT tokens stored in localStorage
- Protected API routes with JWT validation
- Secure OAuth flow with GitHub
- Environment variables for sensitive data
- CORS configured for frontend origin

## 📝 Environment Variables

### Backend Required
- `GITHUB_CLIENT_ID` - GitHub OAuth Client ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth Client Secret
- `JWT_SECRET` - Secret for JWT token signing
- `FRONTEND_URL` - Frontend URL for CORS and redirects

### Frontend Required
- `VITE_API_URL` - Backend API URL

## 🐛 Troubleshooting

### OAuth Issues
- Verify GitHub OAuth app callback URL matches exactly
- Check that `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are set
- Ensure `.env` file is in the `backend/` directory

### CORS Errors
- Verify `FRONTEND_URL` in backend `.env` matches frontend URL
- Check that backend CORS is enabled (it is by default)

### Token Issues
- Clear localStorage if token is invalid
- Check browser console for authentication errors
- Verify JWT_SECRET is set in backend `.env`

## 🤝 Contributing

This is a private project. For questions or issues, please contact the project maintainer.

## 📄 License

Private - All rights reserved

---

**Current Status**: Phase 1 Complete ✅ | Phase 2 Complete ✅ | Phase 3 Next 🚧
