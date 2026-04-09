# Environment Variables Documentation

This document lists all environment variables used by the RYUK-TELEGRAM-CHECKER application.

## Backend Variables
These should be provided when running the backend container.

| Variable | Description | Default | Example |
| :--- | :--- | :--- | :--- |
| `PORT` | Port the backend server listens on | `3000` | `3000` |
| `DEFAULT_CONCURRENCY` | Default number of concurrent telegram checks | `50` | `50` |
| `MAX_CONCURRENCY` | Maximum allowed concurrent checks | `100` | `100` |
| `REQUEST_TIMEOUT_MS` | Timeout for each telegram request in ms | `8000` | `10000` |
| `ADMIN_SECRET` | Secret key for admin routes | `admin123` | `your_secret_here` |

## Frontend Variables
These are primarily build-time variables (Vite prefix).

| Variable | Description | Default | Example |
| :--- | :--- | :--- | :--- |
| `VITE_API_URL` | Base URL for the API requests | `/` | `http://your-vps-ip:3000` |

> [!NOTE]
> Since we use Nginx with a proxy configuration, `VITE_API_URL` can often be left as an empty string or `/` if the API is served from the same domain under `/verify`, `/admin`, etc.
