import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { initSettings, getSettings, updateSettings, config } from '../src/config.js'

test('settings service initializes from defaults and creates settings.json', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ryuk-settings-test-'))
  try {
    initSettings(tmpDir)

    const settingsFile = path.join(tmpDir, 'settings.json')
    assert.ok(fs.existsSync(settingsFile), 'settings.json must exist in dataDir')

    const current = getSettings()
    assert.equal(typeof current.port, 'number')
    assert.equal(typeof current.adminSecret, 'string')
    assert.equal(typeof current.defaultConcurrency, 'number')
    assert.equal(typeof current.maxConcurrency, 'number')
    assert.equal(typeof current.requestTimeoutMs, 'number')

    // Also assert config object mirrors it
    assert.equal(config.adminSecret, current.adminSecret)
    assert.equal(config.dataDir, tmpDir)
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
})

test('settings service updates settings and persists to disk', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ryuk-settings-test-'))
  try {
    initSettings(tmpDir)

    const updated = updateSettings({
      adminSecret: 'super-secret-123',
      defaultConcurrency: 250,
      maxConcurrency: 1000,
      requestTimeoutMs: 15000,
    })

    assert.equal(updated.adminSecret, 'super-secret-123')
    assert.equal(updated.defaultConcurrency, 250)
    assert.equal(updated.maxConcurrency, 1000)
    assert.equal(updated.requestTimeoutMs, 15000)

    // Direct check on config
    assert.equal(config.adminSecret, 'super-secret-123')
    assert.equal(config.defaultConcurrency, 250)

    // Check disk content
    const settingsFile = path.join(tmpDir, 'settings.json')
    const saved = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'))
    assert.equal(saved.adminSecret, 'super-secret-123')
    assert.equal(saved.defaultConcurrency, 250)
    assert.equal(saved.maxConcurrency, 1000)
    assert.equal(saved.requestTimeoutMs, 15000)

    // Re-init from same dir loads saved values
    initSettings(tmpDir)
    const reloaded = getSettings()
    assert.equal(reloaded.adminSecret, 'super-secret-123')
    assert.equal(reloaded.maxConcurrency, 1000)
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
})
