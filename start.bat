@echo off
echo ====================================
echo   Telegram Checker - Iniciando...
echo ====================================

cd /d "%~dp0backend"

if not exist .env (
  echo [AVISO] .env nao encontrado. Copiando .env.example...
  copy .env.example .env
  echo Configure o arquivo .env antes de continuar.
  pause
  exit /b 1
)

echo Iniciando backend em http://localhost:3000
echo Painel: http://localhost:3000
echo Docs:   http://localhost:3000/docs
echo.
npm start
