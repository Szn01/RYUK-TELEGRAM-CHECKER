import { useState, useEffect } from 'react'
import { UserPanel } from './pages/UserPanel'
import { AdminPanel } from './pages/AdminPanel'
import { DocsPage } from './pages/DocsPage'

type Page = 'user' | 'docs' | 'admin'

function getPage(): Page {
  const path = window.location.pathname
  if (path.startsWith('/ryuk-adm')) return 'admin'
  if (path.startsWith('/docs')) return 'docs'
  return 'user'
}

function navigate(path: string) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export default function App() {
  const [page, setPage] = useState<Page>(getPage)

  useEffect(() => {
    const handler = () => setPage(getPage())
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  function goTo(path: string, p: Page) {
    navigate(path)
    setPage(p)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center gap-6">
        <button
          onClick={() => goTo('/', 'user')}
          className="font-bold text-lg text-blue-400 hover:text-blue-300 transition-colors"
        >
          RyukChecker
        </button>
        <button
          onClick={() => goTo('/', 'user')}
          className={`text-sm px-3 py-1 rounded transition-colors ${page === 'user' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          Verificador
        </button>
        <button
          onClick={() => goTo('/docs', 'docs')}
          className={`text-sm px-3 py-1 rounded transition-colors ${page === 'docs' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          Documentação
        </button>
      </nav>

      {page === 'user' && <UserPanel />}
      {page === 'docs' && <DocsPage />}
      {page === 'admin' && <AdminPanel />}
    </div>
  )
}
