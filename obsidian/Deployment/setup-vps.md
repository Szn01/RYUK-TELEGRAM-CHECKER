# VPS Deployment Setup Guide

This guide explains how to build and run the RYUK-TELEGRAM-CHECKER containers on a VPS with full data persistence.

## Prerequisites
- Docker & Docker Compose installed on the VPS
- Access to the source code

---

## 0. Serviços Necessários na VPS
- **Nenhum banco de dados extra é necessário** (nada de MySQL, Postgres, Redis, etc.).
- **Nenhum microserviço adicional é necessário**.
- Você continua gerenciando **apenas os mesmos 2 serviços**:
  1. **Backend API** (Fastify)
  2. **Frontend** (Nginx / React)

A única mudança é que o serviço do **Backend** agora precisa ter um volume/pasta persistente montado no caminho `/app/data`.

---

## Método Recomendado para Easypanel / Painéis Web

1. Mantenha os seus 2 serviços normais (Backend e Frontend).
2. No serviço do **Backend**, vá na aba **Mounts / Volumes**:
   - Adicione um volume montado no destino: `/app/data`
3. Não precisa alterar nada no serviço do Frontend.

---

## Método Manual: Docker CLI (Sem Compose)

### 1. Criar Volume e Rede
```bash
docker volume create ryuk_data
docker network create ryuk-network
```

### 2. Backend Setup
```bash
docker build -t ryuk-backend ./backend

docker run -d \
  --name backend \
  --network ryuk-network \
  -p 3000:3000 \
  -v ryuk_data:/app/data \
  -e ADMIN_SECRET=your_secret_key \
  -e MAX_CONCURRENCY=500 \
  ryuk-backend
```

> [!IMPORTANT]
> A flag `-v ryuk_data:/app/data` garante que todas as API Keys criadas e as configurações persistam mesmo quando o container for destruído, reconstruído ou atualizado.

### 3. Frontend Setup
```bash
docker build -t ryuk-frontend ./frontend

docker run -d \
  --name frontend \
  --network ryuk-network \
  -p 80:80 \
  ryuk-frontend
```

---

## Deploy no Easypanel
Se você utiliza Easypanel, consulte o guia detalhado em [persistence-and-volumes.md](file:///Users/miguelfigueiredo/Dev/RYUK-TELEGRAM-CHECKER/obsidian/Deployment/persistence-and-volumes.md) para adicionar o Mount no caminho `/app/data`.
