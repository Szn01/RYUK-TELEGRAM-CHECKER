# RYUK-TELEGRAM-CHECKER Context

## Project Overview
This project is a Telegram group/community checker. It consists of a Fastify backend and a React/Vite frontend.

## Components
### Backend
- Framework: Fastify
- Key Dependencies: cheerio, undici, p-limit, dotenv
- Port: 3000 (default)
- Environment Variables:
  - `PORT`
  - `DATA_DIR` (Default: `../../data` locally, `/app/data` in Docker)
  - `DEFAULT_CONCURRENCY`
  - `MAX_CONCURRENCY`
  - `REQUEST_TIMEOUT_MS`
  - `ADMIN_SECRET`
- Data Persistence (`DATA_DIR`):
  - `api_keys.json`: API keys, request counters, timestamps.
  - `settings.json`: System settings (admin secret, concurrency, timeouts).
  - Admin Endpoints:
    - `GET /admin/settings` - Retrieve current system settings
    - `PUT /admin/settings` - Update & atomically persist settings to disk

### Frontend
- Framework: Vite + React + TailwindCSS
- Port: 5173 (dev) / 80 (prod) / 3000 (served statically by backend if built)
- Features:
  - Verificador de Links Telegram
  - Documentação da API com Swagger e guia interno
  - Painel Admin (`/ryuk-adm`): Gestão de API Keys e Configurações Persistentes do Sistema
- Environment Variables:
  - `VITE_API_URL`

## Deployment Strategy
- Containerization: Docker (Dockerfile with `VOLUME ["/app/data"]` and `ENV DATA_DIR=/app/data`)
- Orchestration: Docker Compose (`docker-compose.yml` with named volume `ryuk_data:/app/data`)
- Target: VPS / Easypanel (Requires Persistent Mount on `/app/data`)
