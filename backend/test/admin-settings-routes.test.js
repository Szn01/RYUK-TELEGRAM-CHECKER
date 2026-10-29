import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import Fastify from 'fastify'
import { initSettings, config } from '../src/config.js'
import { adminRoutes } from '../src/routes/admin.js'

test('admin settings routes allow reading and updating settings', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ryuk-admin-test-'))
  try {
    initSettings(tmpDir)

    const app = Fastify()
    await app.register(adminRoutes)
    await app.ready()

    // 1. GET /admin/settings without secret -> 401
    const resUnauthorized = await app.inject({
      method: 'GET',
      url: '/admin/settings',
    })
    assert.equal(resUnauthorized.statusCode, 401)

    // 2. GET /admin/settings with secret -> 200
    const resGet = await app.inject({
      method: 'GET',
      url: '/admin/settings',
      headers: {
        'x-admin-secret': config.adminSecret,
      },
    })
    assert.equal(resGet.statusCode, 200)
    const settings = resGet.json()
    assert.equal(settings.adminSecret, config.adminSecret)
    assert.equal(settings.defaultConcurrency, config.defaultConcurrency)

    // 3. PUT /admin/settings with updated values -> 200
    const resPut = await app.inject({
      method: 'PUT',
      url: '/admin/settings',
      headers: {
        'x-admin-secret': config.adminSecret,
      },
      payload: {
        adminSecret: 'new-secret-456',
        defaultConcurrency: 300,
        maxConcurrency: 800,
        requestTimeoutMs: 12000,
      },
    })
    assert.equal(resPut.statusCode, 200)
    const updated = resPut.json()
    assert.equal(updated.adminSecret, 'new-secret-456')
    assert.equal(updated.defaultConcurrency, 300)
    assert.equal(config.adminSecret, 'new-secret-456')

    // 4. Verify that old secret now fails and new secret works
    const resOldSecret = await app.inject({
      method: 'GET',
      url: '/admin/settings',
      headers: {
        'x-admin-secret': 'admin123',
      },
    })
    assert.equal(resOldSecret.statusCode, 401)

    const resNewSecret = await app.inject({
      method: 'GET',
      url: '/admin/settings',
      headers: {
        'x-admin-secret': 'new-secret-456',
      },
    })
    assert.equal(resNewSecret.statusCode, 200)

    await app.close()
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
})
