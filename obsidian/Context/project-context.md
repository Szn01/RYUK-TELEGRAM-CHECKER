# RYUK-TELEGRAM-CHECKER Context

## Project Overview
This project is a Telegram group/community checker. It consists of a Fastify backend and a React/Vite frontend.

## Components
### Backend
- Framework: Fastify
- Key Dependencies: cheerio, undici, p-limit
- Port: 3000 (default)
- Environment Variables:
  - `PORT`
  - `DEFAULT_CONCURRENCY`
  - `MAX_CONCURRENCY`
  - `REQUEST_TIMEOUT_MS`
  - `ADMIN_SECRET`

### Frontend
- Framework: Vite + React + TailwindCSS
- Port: 5173 (dev) / 80 (prod)
- Environment Variables:
  - `VITE_API_URL`

## Deployment Strategy
- Containerization: Docker
- Orchestration: Docker Compose
- Target: VPS
