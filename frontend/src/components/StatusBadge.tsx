export function StatusBadge({ status }: { status: 'online' | 'offline' }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold
      ${status === 'online'
        ? 'bg-green-900 text-green-300 border border-green-700'
        : 'bg-red-900 text-red-300 border border-red-700'
      }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'online' ? 'bg-green-400' : 'bg-red-400'}`} />
      {status === 'online' ? 'ONLINE' : 'OFFLINE'}
    </span>
  )
}
