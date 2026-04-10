# VPS Troubleshooting and Health Checks

This guide addresses common issues like 502 errors and `SIGTERM` signals on VPS deployments (especially using Easypanel or Nginx).

## 1. CORS and 502 Errors
If you see a CORS error along with a 502 status, it usually means the backend process is not responding. Nginx cannot reach the backend and returns 502, which doesn't include the expected CORS headers, causing the browser to report a CORS failure.

### Fix Checklist:
- [x] Ensure `VITE_API_URL` does not have a trailing slash (prevent `//` path issues).
- [x] Backend must listen on `0.0.0.0` (not `127.0.0.1`).
- [x] CORS must be configured to allow the frontend domain.

## 2. Preventing SIGTERM (Easypanel)
Easypanel restarts containers if they fail health checks. If your app takes too long to start or the health check URL is wrong, it will be killed.

### Configuração no Easypanel:
1. Vá para os detalhes do seu serviço (backend).
2. Clique na aba **Deploy** ou **App**.
3. Verifique a seção **Health Check**:
   - **Port**: 3000
   - **Path**: `/` ou `/health` (Agora ambos funcionam no backend).
   - **Success Threshold**: 1
   - **Failure Threshold**: 3
   - **Initial Delay**: 10-20 seconds.

> [!IMPORTANT]
> Se o Easypanel estiver configurado para fazer health check na porta 80, ele nunca vai conseguir falar com o backend (que está na 3000), resultando no `SIGTERM`.

## 3. Logs
Avoid using `localhost` in logs when running in Docker/VPS. Use `0.0.0.0` to indicate it's listening on all interfaces.

```bash
# Verify if the backend is responding internally in the VPS:
curl http://localhost:3000/health
```
