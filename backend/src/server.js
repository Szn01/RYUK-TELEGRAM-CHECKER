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

await fastify.register(cors, { origin: true })

await fastify.register(swagger, {
  openapi: {
    info: { title: 'Telegram Checker API', version: '1.0.0' },
    components: {
      securitySchemes: {
        apiKey: { type: 'apiKey', name: 'x-api-key', in: 'header' }
      }
    }
  }
})

await fastify.register(swaggerUi, {
  routePrefix: '/docs',
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
    decorateReply: false,
  })
  fastify.setNotFoundHandler((req, reply) => {
    if (!req.url.startsWith('/verify') && !req.url.startsWith('/admin') && !req.url.startsWith('/health') && !req.url.startsWith('/docs')) {
      reply.sendFile('index.html')
    } else {
      reply.code(404).send({ error: 'Not found' })
    }
  })
}

await fastify.listen({ port: config.port, host: '0.0.0.0' })
console.log(`\n🚀 API: http://localhost:${config.port}`)
console.log(`📚 Docs: http://localhost:${config.port}/docs`)
