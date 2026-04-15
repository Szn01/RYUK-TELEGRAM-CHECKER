import 'dotenv/config'

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  defaultConcurrency: parseInt(process.env.DEFAULT_CONCURRENCY || '500', 10),
  maxConcurrency: parseInt(process.env.MAX_CONCURRENCY || '500', 10),
  requestTimeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS || '8000', 10),
  adminSecret: process.env.ADMIN_SECRET || 'admin123',
}
