import test from 'node:test'
import assert from 'node:assert/strict'
import { verifyRoutes } from '../src/routes/verify.js'

test('batch route allows 2000 links and concurrency 500', async () => {
  const routes = []
  const fakeFastify = {
    post(path, options) {
      routes.push({ path, options })
    },
  }

  await verifyRoutes(fakeFastify)

  const batchRoute = routes.find(route => route.path === '/verify/batch')

  assert.ok(batchRoute, 'batch route should be registered')
  assert.equal(batchRoute.options.schema.body.properties.links.maxItems, 2000)
  assert.equal(batchRoute.options.schema.body.properties.concurrency.maximum, 500)
  assert.equal(batchRoute.options.schema.body.properties.concurrency.default, 500)
})
