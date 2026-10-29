# Environment Variables Documentation

This document lists all environment variables used by the RYUK-TELEGRAM-CHECKER application.

## Backend Variables
These should be provided when running the backend container.

| Variable | Description | Default | Example |
| :--- | :--- | :--- | :--- |
| `PORT` | Port the backend server listens on | `3000` | `3000` |
| `DATA_DIR` | Directory where persistent data files (`api_keys.json`, `settings.json`) are stored | `/app/data` (Docker) or `../../data` (local) | `/app/data` |
| `DEFAULT_CONCURRENCY` | Default number of concurrent telegram checks | `500` | `500` |
| `MAX_CONCURRENCY` | Maximum allowed concurrent checks | `500` | `1000` |
| `REQUEST_TIMEOUT_MS` | Timeout for each telegram request in ms | `8000` | `10000` |
| `ADMIN_SECRET` | Secret key for admin routes and panel access | `admin123` | `your_secret_here` |

> [!NOTE]
> `ADMIN_SECRET`, `DEFAULT_CONCURRENCY`, `MAX_CONCURRENCY`, and `REQUEST_TIMEOUT_MS` can also be modified in real-time and persisted directly through the Admin Panel (`/ryuk-adm`) without restarting the server. Values stored in `settings.json` take precedence over environment defaults.

## Frontend Variables
These are primarily build-time variables (Vite prefix).

| Variable | Description | Default | Example |
| :--- | :--- | :--- | :--- |
| `VITE_API_URL` | Base URL for the API requests | `/` | `http://your-vps-ip:3000` |

> [!NOTE]
> Since we use Nginx with a proxy configuration or serve the frontend directly via Fastify static plugin, `VITE_API_URL` can often be left as an empty string or `/`.
