import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import {
  initApiKeys,
  listKeys,
  createKey,
  validateKey,
  revokeKey,
  getStats
} from '../src/services/apiKeys.js'

test('apiKeys service uses configured dataDir and persists keys across re-initialization', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ryuk-apikeys-test-'))
  try {
    initApiKeys(tmpDir)

    const keysFile = path.join(tmpDir, 'api_keys.json')
    assert.ok(fs.existsSync(keysFile), 'api_keys.json must exist in dataDir')

    // Create a key
    const created = createKey('Cliente Teste')
    assert.ok(created.key.startsWith('tk_'))
    assert.equal(created.name, 'Cliente Teste')
    assert.equal(created.active, true)

    // Validate key
    const validated = validateKey(created.key)
    assert.ok(validated)
    assert.equal(validated.id, created.id)
    assert.equal(validated.requestCount, 1)

    // Direct read from disk file
    const fileContent = JSON.parse(fs.readFileSync(keysFile, 'utf-8'))
    assert.equal(fileContent.length, 1)
    assert.equal(fileContent[0].id, created.id)

    // Simulate server restart: re-initialize from same tmpDir
    initApiKeys(tmpDir)
    const reloadedList = listKeys()
    assert.equal(reloadedList.length, 1)
    assert.equal(reloadedList[0].key, created.key)

    // Revoke key
    const revoked = revokeKey(created.id)
    assert.equal(revoked, true)
    assert.equal(listKeys().length, 0)

    // Verify revoked on disk
    const afterRevokeContent = JSON.parse(fs.readFileSync(keysFile, 'utf-8'))
    assert.equal(afterRevokeContent.length, 0)
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
})
