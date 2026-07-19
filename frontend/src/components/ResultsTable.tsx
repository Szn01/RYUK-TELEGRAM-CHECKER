import { StatusBadge } from './StatusBadge'

type Result = {
  link: string
  status: 'online' | 'offline'
  name: string | null
  type: 'bot' | 'group' | 'channel' | null
  members: number | null
  membersOnline: number | null
  checkedAt: string
  error: string | null
}

export function ResultsTable({ results, stats }: {
  results: Result[]
  stats?: { total: number; online: number; offline: number; duration_ms: number; totalMembers?: number; totalMembersOnline?: number }
}) {
  if (!results.length) return null

  const onlineResults = results.filter(r => r.status === 'online')
  const offlineResults = results.filter(r => r.status === 'offline')
  const sorted = [...onlineResults, ...offlineResults]

  function copyOnlineLinks() {
    const links = onlineResults.map(r => r.link).join('\n')
    navigator.clipboard.writeText(links)
  }

  return (
    <div className="mt-4">
      {stats && (
        <div className="flex flex-wrap gap-4 mb-3 text-sm items-center">
          <span className="text-gray-400">Total: <b className="text-white">{stats.total}</b></span>
          <span className="text-green-400">Online: <b>{stats.online}</b></span>
          <span className="text-red-400">Offline: <b>{stats.offline}</b></span>
          {stats.totalMembers != null && (
            <span className="text-blue-300">Membros: <b>{stats.totalMembers.toLocaleString('pt-BR')}</b></span>
          )}
          {stats.totalMembersOnline != null && (
            <span className="text-blue-300/70">Ativos: <b>{stats.totalMembersOnline.toLocaleString('pt-BR')}</b></span>
          )}
          <span className="text-gray-500">{(stats.duration_ms / 1000).toFixed(1)}s</span>
          {stats.online > 0 && (
            <button
              onClick={copyOnlineLinks}
              className="ml-auto text-xs px-3 py-1 bg-green-900 hover:bg-green-800 text-green-300 rounded border border-green-700"
            >
              Copiar links online
            </button>
          )}
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 text-gray-400 text-xs uppercase">
            <tr>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Tipo</th>
              <th className="px-4 py-2 text-left">Membros</th>
              <th className="px-4 py-2 text-left">Ativos</th>
              <th className="px-4 py-2 text-left">Nome</th>
              <th className="px-4 py-2 text-left">Link</th>
              <th className="px-4 py-2 text-left">Erro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {sorted.map((r, i) => (
              <tr key={i} className="hover:bg-gray-900/50">
                <td className="px-4 py-2"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-2 text-gray-400 capitalize">{r.type || '—'}</td>
                <td className="px-4 py-2 text-gray-300 tabular-nums">{r.members != null ? r.members.toLocaleString('pt-BR') : '—'}</td>
                <td className="px-4 py-2 text-gray-400 tabular-nums">{r.membersOnline != null ? r.membersOnline.toLocaleString('pt-BR') : '—'}</td>
                <td className="px-4 py-2 text-white max-w-xs truncate">{r.name || '—'}</td>
                <td className="px-4 py-2">
                  <a href={r.link} target="_blank" rel="noreferrer"
                    className="text-blue-400 hover:underline truncate block max-w-xs">
                    {r.link}
                  </a>
                </td>
                <td className="px-4 py-2 text-red-400 text-xs max-w-xs truncate">{r.error || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
