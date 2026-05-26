const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

// Obter caminhos absolutos das pastas principais
const raizDir = __dirname;
const backendDir = path.join(raizDir, 'backend');
const frontendDir = path.join(raizDir, 'frontend');
const logsDir = path.join(raizDir, 'Logs');

// Criar pasta de Logs se não existir
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Formatar data e hora local para o arquivo de log
function obterTimestamp() {
  const agora = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  
  const ano = agora.getFullYear();
  const mes = pad(agora.getMonth() + 1);
  const dia = pad(agora.getDate());
  const horas = pad(agora.getHours());
  const minutos = pad(agora.getMinutes());
  const segundos = pad(agora.getSeconds());
  
  return `${ano}-${mes}-${dia}_${horas}-${minutos}-${segundos}`;
}

const nomeArquivoLog = `sessao_${obterTimestamp()}.log`;
const logPath = path.join(logsDir, nomeArquivoLog);

// Criar write stream para gravação contínua no arquivo de log
const logStream = fs.createWriteStream(logPath, { flags: 'a', encoding: 'utf-8' });

function registrarLog(texto, exibirNoConsole = true) {
  const agora = new Date().toISOString();
  const linha = `[${agora}] ${texto}\n`;
  logStream.write(linha);
  if (exibirNoConsole) {
    process.stdout.write(texto + '\n');
  }
}

registrarLog('==================================================', true);
registrarLog('      INICIALIZADOR INTELIGENTE TELEGRAM CHECKER', true);
registrarLog('==================================================', true);
registrarLog(`Data/Hora de início: ${new Date().toLocaleString('pt-BR')}`, true);
registrarLog(`Pasta de Logs: ${logsDir}`, true);
registrarLog(`Log desta sessão: ${nomeArquivoLog}`, true);
registrarLog(`Versão do Node: ${process.version}`, true);
registrarLog(`Plataforma: ${process.platform}`, true);
registrarLog('==================================================\n', true);

// 1. Verificar/Configurar arquivo .env no backend
const envBackendPath = path.join(backendDir, '.env');
const envExampleBackendPath = path.join(backendDir, '.env.example');

if (!fs.existsSync(envBackendPath)) {
  registrarLog('[AVISO] Arquivo .env do backend não encontrado.', true);
  if (fs.existsSync(envExampleBackendPath)) {
    registrarLog('Copiando .env.example para .env...', true);
    fs.copyFileSync(envExampleBackendPath, envBackendPath);
    registrarLog('Arquivo .env criado com sucesso!', true);
  } else {
    registrarLog('[ERRO] .env.example não foi encontrado no backend. Por favor, crie o arquivo .env manualmente.', true);
    process.exit(1);
  }
}

// Ler as configurações do .env do backend para obter a porta
let portaBackend = '3002'; // Padrão
try {
  const envContent = fs.readFileSync(envBackendPath, 'utf8');
  const match = envContent.match(/^PORT\s*=\s*(\d+)/m);
  if (match && match[1]) {
    portaBackend = match[1];
  }
} catch (e) {
  registrarLog(`[Aviso] Não foi possível ler a porta do arquivo .env. Usando porta padrão ${portaBackend}. Detalhe: ${e.message}`, true);
}

// 2. Verificar se o frontend precisa de build (se a pasta dist existe)
const frontendDistDir = path.join(frontendDir, 'dist');
if (!fs.existsSync(frontendDistDir)) {
  registrarLog('[SISTEMA] Pasta frontend/dist não encontrada. Realizando build do frontend...', true);
  try {
    registrarLog('Executando: npm run build na pasta frontend...', true);
    const buildOutput = execSync('npm run build', { cwd: frontendDir, encoding: 'utf-8' });
    registrarLog('--- SAÍDA DO BUILD ---', false);
    registrarLog(buildOutput, false);
    registrarLog('--- FIM DO BUILD ---', false);
    registrarLog('[SUCESSO] Build do frontend realizado com sucesso!', true);
  } catch (error) {
    registrarLog(`[ERRO CRÍTICO] Falha ao realizar build do frontend: ${error.message}`, true);
    if (error.stdout) registrarLog(`Saída do erro:\n${error.stdout}`, true);
    if (error.stderr) registrarLog(`Erro detalhado:\n${error.stderr}`, true);
    process.exit(1);
  }
} else {
  registrarLog('[INFO] Pasta frontend/dist existente. Ignorando build automático (caso queira atualizar o frontend, exclua a pasta "dist" e inicie o sistema novamente).', true);
}

// 3. Iniciar o servidor Backend
registrarLog('[SISTEMA] Iniciando servidor do backend...', true);

// Executa o backend com node src/server.js
const backendProcess = spawn('node', ['src/server.js'], {
  cwd: backendDir,
  shell: true,
  env: { ...process.env }
});

// Captura stdout
backendProcess.stdout.on('data', (data) => {
  const texto = data.toString();
  // Gravar no log sem poluir com códigos de formatação ANSI se preferir,
  // mas vamos gravar o texto limpo no arquivo de log e mostrar com cores no console
  const textoLimpo = texto.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
  registrarLog(textoLimpo, false);
  process.stdout.write(texto);
});

// Captura stderr
backendProcess.stderr.on('data', (data) => {
  const texto = data.toString();
  const textoLimpo = texto.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
  registrarLog(`[ERRO BACKEND] ${textoLimpo}`, false);
  process.stderr.write(texto);
});

backendProcess.on('close', (code) => {
  registrarLog(`[SISTEMA] O backend encerrou com o código de saída: ${code}`, true);
  process.exit(code);
});

backendProcess.on('error', (err) => {
  registrarLog(`[SISTEMA - ERRO CRÍTICO] Falha ao iniciar processo do backend: ${err.message}`, true);
  process.exit(1);
});

// Mensagem bonita para o usuário
setTimeout(() => {
  console.log('\n\x1b[32m==================================================');
  console.log('         SISTEMA INICIADO COM SUCESSO! 🚀');
  console.log('==================================================\x1b[0m');
  console.log(`\x1b[36mPainel Web:\x1b[0m      http://localhost:${portaBackend}`);
  console.log(`\x1b[36mDocumentação API:\x1b[0m http://localhost:${portaBackend}/api-docs`);
  console.log(`\x1b[36mLogs Gravados em:\x1b[0m ${logPath}`);
  console.log('\x1b[32m==================================================\n\x1b[0m');
  console.log('Mantenha esta janela aberta para o sistema continuar funcionando.');
  console.log('Pressione Ctrl+C para encerrar o sistema.\n');
}, 2000);
