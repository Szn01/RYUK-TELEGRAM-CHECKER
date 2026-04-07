type Key = {
  id: string
  key: string
  name: string
  active: boolean
  createdAt: string
  requestCount: number
  lastUsed: string | null
}

export function KeysTable({ keys, onRevoke }: {
  keys: Key[]
  onRevoke: (id: string) => void
}) {
  if (!keys.length) {
    return <p className="text-gray-500 text-sm mt-4">Nenhuma key criada ainda.</p>
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-800 mt-4">
      <table className="w-full text-sm">
        <thead className="bg-gray-900 text-gray-400 text-xs uppercase">
          <tr>
            <th className="px-4 py-2 text-left">Nome</th>
            <th className="px-4 py-2 text-left">Key</th>
            <th className="px-4 py-2 text-left">Requests</th>
            <th className="px-4 py-2 text-left">Último uso</th>
            <th className="px-4 py-2 text-left">Criada em</th>
            <th className="px-4 py-2 text-left">Ação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {keys.map(k => (
            <tr key={k.id} className="hover:bg-gray-900/50">
              <td className="px-4 py-2 font-medium">{k.name}</td>
              <td className="px-4 py-2 font-mono text-xs text-blue-400">
                {k.key.slice(0, 16)}...
                <button
                  onClick={() => navigator.clipboard.writeText(k.key)}
                  className="ml-2 text-gray-500 hover:text-white"
                  title="Copiar key completa"
                >⎘</button>
              </td>
              <td className="px-4 py-2 text-gray-300">{k.requestCount}</td>
              <td className="px-4 py-2 text-gray-400 text-xs">
                {k.lastUsed ? new Date(k.lastUsed).toLocaleString('pt-BR') : '—'}
              </td>
              <td className="px-4 py-2 text-gray-400 text-xs">
                {new Date(k.createdAt).toLocaleString('pt-BR')}
              </td>
              <td className="px-4 py-2">
                <button
                  onClick={() => onRevoke(k.id)}
                  className="text-red-400 hover:text-red-300 text-xs hover:underline"
                >
                  Revogar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
