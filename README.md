# CodeGuardianAI

Code analysis tool with GitHub OAuth integration.

## Project Structure

```
CodeGuardianAI/
├── frontend/     # React + Vite + TypeScript
├── backend/      # NestJS + TypeScript
├── turbo.json    # Turborepo configuration
└── package.json  # Root workspace config
```

## Setup Instructions

### Prerequisites
- Node.js 18+ 
- npm 10+

### Initial Setup

```bash
# Install root dependencies (Turborepo)
npm install

# Install all workspace dependencies
npm install
```

### Backend Setup

Create `backend/.env`:
```env
PORT=3000
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
JWT_SECRET=your_jwt_secret
DATABASE_URL=your_database_url
REDIS_URL=redis://localhost:6379
```

### Frontend Setup

Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:3000
```

## Development

### Run all projects in development mode
```bash
npm run dev
```

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

### Test all projects
```bash
npm run test
```

## Turborepo Benefits

- **Parallel execution**: Frontend and backend run simultaneously
- **Build caching**: Only rebuilds what changed
- **Task orchestration**: Single command to manage all projects
- **Shared dependencies**: Efficient dependency management

## Development Roadmap

### Phase 1: Auth Foundation
- [ ] GitHub OAuth endpoints
- [ ] JWT session management
- [ ] Frontend login flow

### Phase 2: Repo Listing
- [ ] GET /repos endpoint
- [ ] Frontend repo selection UI

### Phase 3: MVP Analyzer
- [ ] POST /analyze endpoint
- [ ] Job queue (BullMQ)
- [ ] Basic code analysis
- [ ] Frontend polling + results

### Phase 4: Enhancements
- [ ] PR support
- [ ] LLM enrichment
- [ ] Apply patch functionality
