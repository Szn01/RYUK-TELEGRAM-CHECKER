export function DocsPage() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-10 text-sm">
      <div>
        <h1 className="text-3xl font-bold text-white mb-1">RyukChecker — Documentação da API</h1>
        <p className="text-gray-400">Verifique em massa se bots, grupos e canais do Telegram estão online ou offline via HTTP.</p>
      </div>

      {/* Autenticação */}
      <section>
        <h2 className="text-lg font-semibold text-blue-400 mb-3 border-b border-gray-800 pb-1">Autenticação</h2>
        <p className="text-gray-300 mb-3">Todas as requisições para <code className="text-blue-300 bg-gray-900 px-1 rounded">/verify/*</code> exigem o header:</p>
        <pre className="bg-gray-900 border border-gray-800 rounded p-4 text-green-300 overflow-x-auto">x-api-key: tk_sua_chave_aqui</pre>
        <p className="text-gray-400 mt-2">Obtenha sua API Key com o administrador do sistema.</p>
      </section>

      {/* POST /verify/single */}
      <section>
        <h2 className="text-lg font-semibold text-blue-400 mb-3 border-b border-gray-800 pb-1">POST /verify/single</h2>
        <p className="text-gray-300 mb-3">Verifica um único link do Telegram.</p>

        <h3 className="text-gray-400 font-medium mb-2">Formatos aceitos</h3>
        <pre className="bg-gray-900 border border-gray-800 rounded p-4 text-gray-300 overflow-x-auto text-xs">{`https://t.me/username
t.me/username
@username
https://t.me/+HASH          (links de convite)
https://t.me/bot?start=OP   (query params ignorados automaticamente)`}</pre>

        <h3 className="text-gray-400 font-medium mt-4 mb-2">Body</h3>
        <pre className="bg-gray-900 border border-gray-800 rounded p-4 text-yellow-300 overflow-x-auto text-xs">{`{ "link": "https://t.me/username" }`}</pre>

        <h3 className="text-gray-400 font-medium mt-4 mb-2">cURL</h3>
        <pre className="bg-gray-900 border border-gray-800 rounded p-4 text-green-300 overflow-x-auto text-xs">{`curl -X POST https://seu-servidor/verify/single \\
  -H "x-api-key: tk_sua_chave" \\
  -H "Content-Type: application/json" \\
  -d '{"link":"https://t.me/username"}'`}</pre>
      </section>

      {/* POST /verify/batch */}
      <section>
        <h2 className="text-lg font-semibold text-blue-400 mb-3 border-b border-gray-800 pb-1">POST /verify/batch</h2>
        <p className="text-gray-300 mb-3">Verifica múltiplos links em paralelo. Máximo de <b className="text-white">2000</b> links por requisição.</p>

        <h3 className="text-gray-400 font-medium mb-2">Body</h3>
        <pre className="bg-gray-900 border border-gray-800 rounded p-4 text-yellow-300 overflow-x-auto text-xs">{`{
  "links": ["https://t.me/a", "t.me/b", "@c"],
  "concurrency": 500
}`}</pre>

        <h3 className="text-gray-400 font-medium mt-4 mb-2">cURL</h3>
        <pre className="bg-gray-900 border border-gray-800 rounded p-4 text-green-300 overflow-x-auto text-xs">{`curl -X POST https://seu-servidor/verify/batch \\
  -H "x-api-key: tk_sua_chave" \\
  -H "Content-Type: application/json" \\
  -d '{"links":["https://t.me/bot1","https://t.me/grupo1"],"concurrency":500}'`}</pre>

        <h3 className="text-gray-400 font-medium mt-4 mb-2">Node.js</h3>
        <pre className="bg-gray-900 border border-gray-800 rounded p-4 text-blue-300 overflow-x-auto text-xs">{`const res = await fetch('https://seu-servidor/verify/batch', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'tk_...'
  },
  body: JSON.stringify({
    links: ['https://t.me/username'],
    concurrency: 500
  }),
})
const data = await res.json()
const online = data.results.filter(r => r.status === 'online')
const offline = data.results.filter(r => r.status === 'offline')`}</pre>

        <h3 className="text-gray-400 font-medium mt-4 mb-2">Python</h3>
        <pre className="bg-gray-900 border border-gray-800 rounded p-4 text-blue-300 overflow-x-auto text-xs">{`import requests

res = requests.post('https://seu-servidor/verify/batch',
  headers={'x-api-key': 'tk_...'},
  json={'links': ['https://t.me/username'], 'concurrency': 500}
)
data = res.json()
online = [r for r in data['results'] if r['status'] == 'online']`}</pre>
      </section>

      {/* Resposta */}
      <section>
        <h2 className="text-lg font-semibold text-blue-400 mb-3 border-b border-gray-800 pb-1">Formato da Resposta (batch)</h2>

        <pre className="bg-gray-900 border border-gray-800 rounded p-4 text-yellow-300 overflow-x-auto text-xs">{`{
  "total": 3,
  "online": 2,
  "offline": 1,
  "duration_ms": 640,
  "results": [
    {
      "link": "https://t.me/meubot_bot",
      "status": "online",
      "name": "Meu Bot",
      "type": "bot",
      "checkedAt": "2026-04-08T12:00:00.000Z",
      "error": null
    },
    {
      "link": "https://t.me/grupoVIP",
      "status": "offline",
      "name": null,
      "type": "group",
      "checkedAt": "2026-04-08T12:00:00.000Z",
      "error": "Página não encontrada (404)"
    }
  ]
}`}</pre>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs border border-gray-800 rounded-lg">
            <thead className="bg-gray-900 text-gray-400 uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Campo</th>
                <th className="px-4 py-2 text-left">Tipo</th>
                <th className="px-4 py-2 text-left">Descrição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {[
                ['link', 'string', 'Link original enviado'],
                ['status', '"online" | "offline"', 'Status do bot, grupo ou canal'],
                ['name', 'string | null', 'Nome real (null se offline)'],
                ['type', '"bot" | "group" | "channel" | null', 'Tipo detectado'],
                ['checkedAt', 'string', 'ISO 8601 timestamp da verificação'],
                ['error', 'string | null', 'Mensagem de erro se offline'],
              ].map(([campo, tipo, desc]) => (
                <tr key={campo} className="hover:bg-gray-900/50">
                  <td className="px-4 py-2 text-blue-300 font-mono">{campo}</td>
                  <td className="px-4 py-2 text-yellow-300 font-mono">{tipo}</td>
                  <td className="px-4 py-2 text-gray-300">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Erros */}
      <section>
        <h2 className="text-lg font-semibold text-blue-400 mb-3 border-b border-gray-800 pb-1">Códigos de Erro</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border border-gray-800 rounded-lg">
            <thead className="bg-gray-900 text-gray-400 uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Código</th>
                <th className="px-4 py-2 text-left">Significado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {[
                ['401', 'x-api-key ausente ou inválida'],
                ['422', 'Lista vazia, body inválido ou acima de 2000 links'],
                ['500', 'Erro interno do servidor'],
              ].map(([code, msg]) => (
                <tr key={code} className="hover:bg-gray-900/50">
                  <td className="px-4 py-2 text-red-400 font-mono font-bold">{code}</td>
                  <td className="px-4 py-2 text-gray-300">{msg}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Limites */}
      <section>
        <h2 className="text-lg font-semibold text-blue-400 mb-3 border-b border-gray-800 pb-1">Limites</h2>
        <ul className="space-y-1 text-gray-300">
          <li>Máximo de <b className="text-white">2000 links</b> por requisição batch</li>
          <li>Concorrência padrão: <b className="text-white">500</b> — máximo: <b className="text-white">500</b></li>
          <li>Timeout por link: <b className="text-white">8 segundos</b></li>
        </ul>
      </section>
    </div>
  )
}
