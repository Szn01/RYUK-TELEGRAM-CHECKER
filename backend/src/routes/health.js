export async function healthRoutes(fastify) {
  fastify.get('/health', {
    schema: {
      description: 'Status da API',
      tags: ['system'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            uptime: { type: 'number' },
          }
        }
      }
    }
  }, async () => ({
    status: 'ok',
    uptime: process.uptime(),
  }))
}
