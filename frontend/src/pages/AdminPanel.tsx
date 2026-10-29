import { useState } from 'react'
import {
  adminListKeys,
  adminCreateKey,
  adminRevokeKey,
  adminGetStats,
  adminGetSettings,
  adminUpdateSettings
} from '../api'
import { KeysTable } from '../components/KeysTable'

export function AdminPanel() {
  const [secret, setSecret] = useState(sessionStorage.getItem('adminSecret') || '')
  const [authed, setAuthed] = useState(false)
  const [tab, setTab] = useState<'keys' | 'settings'>('keys')
  const [keys, setKeys] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [newKeyName, setNewKeyName] = useState('')
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  // Configurações
  const [settings, setSettings] = useState<any>({
    adminSecret: '',
    defaultConcurrency: 500,
    maxConcurrency: 500,
    requestTimeoutMs: 8000,
    dataDir: '',
  })
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsMsg, setSettingsMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  async function login() {
    setError('')
    const data = await adminListKeys(secret)
    if (data.error) return setError('Senha incorreta')
    sessionStorage.setItem('adminSecret', secret)
    setKeys(data.keys || [])
    setAuthed(true)

    const s = await adminGetStats(secret)
    setStats(s)

    const cfg = await adminGetSettings(secret)
    if (cfg && !cfg.error) {
      setSettings(cfg)
    }
  }

  async function createKey() {
    if (!newKeyName.trim()) return
    setCreating(true)
    const key = await adminCreateKey(newKeyName, secret)
    setKeys(prev => [...prev, key])
    setNewKeyName('')
    setCreating(false)
    const s = await adminGetStats(secret)
    setStats(s)
  }

  async function revokeKey(id: string) {
    if (!confirm('Revogar esta key permanentemente?')) return
    await adminRevokeKey(id, secret)
    setKeys(prev => prev.filter(k => k.id !== id))
    const s = await adminGetStats(secret)
    setStats(s)
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault()
    setSavingSettings(true)
    setSettingsMsg(null)

    try {
      const payload = {
        adminSecret: settings.adminSecret,
        defaultConcurrency: Number(settings.defaultConcurrency),
        maxConcurrency: Number(settings.maxConcurrency),
        requestTimeoutMs: Number(settings.requestTimeoutMs),
      }

      const res = await adminUpdateSettings(payload, secret)
      if (res.error) {
        setSettingsMsg({ type: 'error', text: res.error })
      } else {
        setSettings(res)
        if (settings.adminSecret !== secret) {
          setSecret(settings.adminSecret)
          sessionStorage.setItem('adminSecret', settings.adminSecret)
        }
        setSettingsMsg({ type: 'success', text: 'Configurações salvas e persistidas com sucesso!' })
      }
    } catch (err: any) {
      setSettingsMsg({ type: 'error', text: err.message || 'Erro ao salvar configurações' })
    } finally {
      setSavingSettings(false)
    }
  }

  if (!authed) {
    return (
      <div className="max-w-md mx-auto p-6 mt-20">
        <h1 className="text-2xl font-bold mb-2">Admin</h1>
        <p className="text-gray-400 text-sm mb-6">Entre com o ADMIN_SECRET configurado no backend.</p>
        <input
          type="password"
          value={secret}
          onChange={e => setSecret(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()}
          placeholder="Admin secret..."
          className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 mb-3 focus:border-blue-500 focus:outline-none"
        />
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        <button
          onClick={login}
          className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded font-semibold transition-colors"
        >
          Entrar
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Painel Administrativo</h1>
          <p className="text-sm text-gray-400 mt-1">Gerenciamento de API keys e configurações persistentes</p>
        </div>
        {stats && (
          <div className="flex gap-6 text-sm text-gray-400 bg-gray-900 px-4 py-2 rounded-lg border border-gray-800">
            <span>Keys ativas: <b className="text-white">{stats.activeKeys}</b></span>
            <span>Requests totais: <b className="text-white">{stats.totalRequests}</b></span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 mb-6 gap-2">
        <button
          onClick={() => setTab('keys')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            tab === 'keys'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          API Keys ({keys.length})
        </button>
        <button
          onClick={() => setTab('settings')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            tab === 'settings'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Configurações do Sistema
        </button>
      </div>

      {tab === 'keys' ? (
        <>
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              value={newKeyName}
              onChange={e => setNewKeyName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createKey()}
              placeholder="Nome do cliente (ex: Cliente 1)"
              className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={createKey}
              disabled={creating || !newKeyName.trim()}
              className="px-4 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 rounded font-semibold text-sm transition-colors"
            >
              + Criar Key
            </button>
          </div>

          <KeysTable keys={keys} onRevoke={revokeKey} />
        </>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-2xl">
          <h2 className="text-lg font-bold mb-4 text-white">Configurações Persistentes</h2>
          <p className="text-sm text-gray-400 mb-6">
            As alterações feitas aqui são gravadas no disco e permanecem ativas mesmo após reinicializações e atualizações do sistema.
          </p>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Admin Secret (Chave Mestra)</label>
              <input
                type="text"
                value={settings.adminSecret || ''}
                onChange={e => setSettings({ ...settings, adminSecret: e.target.value })}
                className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                required
              />
              <span className="text-xs text-gray-500">Senha usada para acessar este painel e as rotas administrativas.</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Concorrência Padrão</label>
                <input
                  type="number"
                  min="1"
                  max={settings.maxConcurrency || 1000}
                  value={settings.defaultConcurrency}
                  onChange={e => setSettings({ ...settings, defaultConcurrency: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Concorrência Máxima</label>
                <input
                  type="number"
                  min="1"
                  max="5000"
                  value={settings.maxConcurrency}
                  onChange={e => setSettings({ ...settings, maxConcurrency: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Timeout de Requisição (ms)</label>
              <input
                type="number"
                min="500"
                step="500"
                value={settings.requestTimeoutMs}
                onChange={e => setSettings({ ...settings, requestTimeoutMs: e.target.value })}
                className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                required
              />
              <span className="text-xs text-gray-500">Tempo limite para cada consulta aos links do Telegram (padrão: 8000ms).</span>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Diretório de Armazenamento Persistente</label>
              <input
                type="text"
                disabled
                value={settings.dataDir || ''}
                className="w-full bg-gray-950/50 border border-gray-800 text-gray-500 rounded px-3 py-2 text-sm cursor-not-allowed font-mono"
              />
              <span className="text-xs text-gray-500">
                Controlado pela variável de ambiente DATA_DIR ou montagem de volume (ex: /app/data).
              </span>
            </div>

            {settingsMsg && (
              <div
                className={`p-3 rounded text-sm ${
                  settingsMsg.type === 'success'
                    ? 'bg-green-900/40 text-green-300 border border-green-800'
                    : 'bg-red-900/40 text-red-300 border border-red-800'
                }`}
              >
                {settingsMsg.text}
              </div>
            )}

            <button
              type="submit"
              disabled={savingSettings}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded font-semibold text-sm transition-colors"
            >
              {savingSettings ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
