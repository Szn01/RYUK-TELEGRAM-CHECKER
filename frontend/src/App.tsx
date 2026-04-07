import { useState } from 'react'
import { UserPanel } from './pages/UserPanel'
import { AdminPanel } from './pages/AdminPanel'

export default function App() {
  const [page, setPage] = useState<'user' | 'admin'>(
    window.location.pathname.startsWith('/admin') ? 'admin' : 'user'
  )

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center gap-6">
        <span className="font-bold text-lg text-blue-400">Telegram Checker</span>
        <button
          onClick={() => setPage('user')}
          className={`text-sm px-3 py-1 rounded transition-colors ${page === 'user' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          Verificador
        </button>
        <button
          onClick={() => setPage('admin')}
          className={`text-sm px-3 py-1 rounded transition-colors ${page === 'admin' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          Admin
        </button>
      </nav>
      {page === 'user' ? <UserPanel /> : <AdminPanel />}
    </div>
  )
}
