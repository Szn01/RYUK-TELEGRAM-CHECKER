import { useState } from 'react'
import { verifyBatch } from '../api'
import { ResultsTable } from '../components/ResultsTable'

export function UserPanel() {
  const [apiKey, setApiKey] = useState(localStorage.getItem('apiKey') || '')
  const [linksText, setLinksText] = useState('')
  const [concurrency, setConcurrency] = useState(500)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [error, setError] = useState('')

  function saveApiKey(key: string) {
    setApiKey(key)
    localStorage.setItem('apiKey', key)
  }

  const lineCount = linksText.split('\n').filter(l => l.trim()).length

  async function handleVerify() {
    const links = linksText.split('\n').map(l => l.trim()).filter(Boolean)
    if (!links.length) return setError('Cole ao menos um link')
    if (!apiKey) return setError('Informe sua API Key')
    if (links.length > 2000) return setError('Máximo 2000 links por vez')

    setError('')
    setLoading(true)
    setResults([])
    setStats(null)

    try {
      const data = await verifyBatch(links, apiKey, concurrency)
      if (data.error) {
        setError(data.error)
      } else {
        setResults(data.results || [])
        setStats({ total: data.total, online: data.online, offline: data.offline, duration_ms: data.duration_ms })
      }
    } catch (e: any) {
      setError(e.message || 'Erro ao conectar com a API')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Verificador de Links</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="md:col-span-2">
          <label className="block text-sm text-gray-400 mb-1">API Key</label>
          <input
            type="text"
            value={apiKey}
            onChange={e => saveApiKey(e.target.value)}
            placeholder="tk_..."
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Concorrência (1-500)</label>
          <input
            type="number"
            value={concurrency}
            onChange={e => setConcurrency(Number(e.target.value))}
            min={1} max={500}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-1">
          Links — {lineCount > 0 ? `${lineCount} detectados` : '1 por linha, pode misturar bots, grupos e canais'}
        </label>
        <textarea
          value={linksText}
          onChange={e => setLinksText(e.target.value)}
          placeholder={'https://t.me/username\n@outro_username\nt.me/grupo\nhttps://t.me/+HASH\nhttps://t.me/bot?start=OP'}
          rows={12}
          className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none resize-y"
        />
      </div>

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      <button
        onClick={handleVerify}
        disabled={loading || !lineCount}
        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded font-semibold transition-colors"
      >
        {loading ? `Verificando ${lineCount} links...` : `Verificar ${lineCount || ''} links`.trim()}
      </button>

      <ResultsTable results={results} stats={stats} />
    </div>
  )
}
