# VPS Deployment Setup Guide

This guide explains how to build and run the RYUK-TELEGRAM-CHECKER containers manually on a VPS.

## Prerequisites
- Docker installed on the VPS
- Access to the source code

## 1. Backend Setup

### Build the Backend Image
Run this from the project root:
```bash
docker build -t ryuk-backend ./backend
```

### Run the Backend Container
```bash
docker run -d \
  --name ryuk-backend \
  -p 3000:3000 \
  -e ADMIN_SECRET=your_secret_key \
  -e MAX_CONCURRENCY=100 \
  ryuk-backend
```

## 2. Frontend Setup

### Build the Frontend Image
Run this from the project root:
```bash
docker build -t ryuk-frontend ./frontend
```

### Run the Frontend Container
We link the frontend to the backend or ensure they share the same host network if needed.
```bash
docker run -d \
  --name ryuk-frontend \
  -p 80:80 \
  ryuk-frontend
```

> [!IMPORTANT]
> Since we are not using `docker-compose`, the Nginx `proxy_pass` in the Frontend `nginx.conf` needs to point to the correct Backend IP. If both are on the same machine, you can use the host's IP or create a docker network:
>
> 1. `docker network create ryuk-network`
> 2. `docker run ... --network ryuk-network --name backend ...`
> 3. `docker run ... --network ryuk-network --name frontend ...`
>
> The Nginx config is already set to `proxy_pass http://backend:3000;`. Using a docker network and naming the backend container `backend` will make this work automatically.

## Summary Checklist
1. Build images.
2. Create network.
3. Run backend first.
4. Run frontend.
