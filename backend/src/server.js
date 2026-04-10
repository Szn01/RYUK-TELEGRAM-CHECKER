import 'dotenv/config'
import Fastify from 'fastify'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import cors from '@fastify/cors'
import staticPlugin from '@fastify/static'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'
import { config } from './config.js'
import { healthRoutes } from './routes/health.js'
import { verifyRoutes } from './routes/verify.js'
import { adminRoutes } from './routes/admin.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const fastify = Fastify({ logger: true })

await fastify.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key', 'x-admin-secret'],
  credentials: true
})

await fastify.register(swagger, {
  openapi: {
    info: { title: 'RyukChecker API', version: '1.0.0' },
    components: {
      securitySchemes: {
        apiKey: { type: 'apiKey', name: 'x-api-key', in: 'header' }
      }
    }
  }
})

await fastify.register(swaggerUi, {
  routePrefix: '/api-docs',
  uiConfig: { docExpansion: 'list' }
})

await fastify.register(healthRoutes)
await fastify.register(verifyRoutes)
await fastify.register(adminRoutes)

const frontendDist = join(__dirname, '../../frontend/dist')
if (existsSync(frontendDist)) {
  await fastify.register(staticPlugin, {
    root: frontendDist,
    prefix: '/',
  })
  fastify.setNotFoundHandler((req, reply) => {
    const api = ['/verify', '/admin', '/health', '/api-docs']
    if (!api.some(p => req.url.startsWith(p))) {
      reply.sendFile('index.html')
    } else {
      reply.code(404).send({ error: 'Not found' })
    }
  })
} else {
  // Fallback root handler for health checks when running in standalone mode
  fastify.get('/', async () => ({ status: 'ok', message: 'RyukChecker API is running' }))
}

try {
  await fastify.listen({ port: config.port, host: '0.0.0.0' })
  const address = fastify.server.address()
  const port = typeof address === 'string' ? config.port : address.port

  console.log(`\n RyukChecker API: http://0.0.0.0:${port}`)
  console.log(` Swagger: http://0.0.0.0:${port}/api-docs`)
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
