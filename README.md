# Telegram Checker

API HTTP + painel web para verificar em massa se bots e grupos do Telegram estão online ou offline.

## Requisitos

- Node.js 20+
- npm 10+

## Instalação

```bash
# Backend
cd backend
npm install

# Frontend (se quiser rodar dev)
cd ../frontend
npm install
```

## Configuração

```bash
cd backend
cp .env.example .env
# Editar ADMIN_SECRET no .env
```

## Rodar (produção)

```bash
# 1. Build do frontend
cd frontend && npm run build

# 2. Iniciar (serve API + painel)
cd ../backend && npm start
```

Ou usar `start.bat` na raiz.

Abrir: http://localhost:3000

## Rodar (desenvolvimento)

Terminal 1:
```bash
cd backend && npm run dev
```

Terminal 2:
```bash
cd frontend && npm run dev
```

Frontend dev: http://localhost:5173

## Endpoints

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | /health | — | Status |
| POST | /verify/single | x-api-key | Verificar 1 link |
| POST | /verify/batch | x-api-key | Verificar até 500 links |
| GET | /admin/keys | x-admin-secret | Listar keys |
| POST | /admin/keys | x-admin-secret | Criar key |
| DELETE | /admin/keys/:id | x-admin-secret | Revogar key |
| GET | /docs | — | Swagger UI |

## Formatos de link aceitos

- `https://t.me/username`
- `t.me/username`
- `@username`
- `https://t.me/+HASH` (convite)
- Com query params: `?start=OP` é ignorado automaticamente
