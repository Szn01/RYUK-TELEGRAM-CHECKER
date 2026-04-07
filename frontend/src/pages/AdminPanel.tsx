import { useState } from 'react'
import { adminListKeys, adminCreateKey, adminRevokeKey, adminGetStats } from '../api'
import { KeysTable } from '../components/KeysTable'

export function AdminPanel() {
  const [secret, setSecret] = useState(sessionStorage.getItem('adminSecret') || '')
  const [authed, setAuthed] = useState(false)
  const [keys, setKeys] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [newKeyName, setNewKeyName] = useState('')
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  async function login() {
    setError('')
    const data = await adminListKeys(secret)
    if (data.error) return setError('Senha incorreta')
    sessionStorage.setItem('adminSecret', secret)
    setKeys(data.keys || [])
    setAuthed(true)
    const s = await adminGetStats(secret)
    setStats(s)
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Gerenciar API Keys</h1>
        {stats && (
          <div className="flex gap-6 text-sm text-gray-400">
            <span>Keys ativas: <b className="text-white">{stats.activeKeys}</b></span>
            <span>Requests totais: <b className="text-white">{stats.totalRequests}</b></span>
          </div>
        )}
      </div>

      <div className="flex gap-3 mb-2">
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
    </div>
  )
}
