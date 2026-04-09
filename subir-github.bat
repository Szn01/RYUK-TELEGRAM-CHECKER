@echo off
chcp 65001 >nul
title RYUK-Telegram-Checker - Push para GitHub

echo ========================================
echo   RYUK-Telegram-Checker - Subir GitHub
echo ========================================
echo.

cd /d "%~dp0"

REM Git instalado?
git --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Git nao encontrado. Instale: https://git-scm.com/
    pause
    exit /b 1
)

REM Inicializa se nao existir .git
if not exist ".git" (
    echo [INFO] Inicializando repositorio...
    git init
    echo.
)

REM Remote
echo [1/6] Remote origin...
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    git remote add origin https://github.com/Szn01/RYUK-TELEGRAM-CHECKER.git
    echo   OK - origin adicionado
) else (
    git remote set-url origin https://github.com/Szn01/RYUK-TELEGRAM-CHECKER.git
    echo   OK - origin atualizado
)
echo   https://github.com/Szn01/RYUK-TELEGRAM-CHECKER.git
echo.

REM Staging
echo [2/6] Adicionando arquivos (git add -A)...
git add -A
echo.

REM Essenciais
echo [3/6] Reforco de arquivos essenciais...
if exist "backend\package-lock.json" git add -f "backend\package-lock.json" 2>nul
if exist "frontend\package-lock.json" git add -f "frontend\package-lock.json" 2>nul
if exist "backend\.env.example" git add -f "backend\.env.example" 2>nul
if exist "backend\data\.gitkeep" git add -f "backend\data\.gitkeep" 2>nul
if exist "README.md" git add "README.md"
if exist "start.bat" git add "start.bat"
echo   Reforco concluido.
echo.

echo [4/6] Status:
git status --short
echo.

echo [5/6] Commit...
set /p MSG="Mensagem (Enter = Update): "
if "%MSG%"=="" set MSG=Update
git commit -m "%MSG%"
if errorlevel 1 (
    echo [AVISO] Nada para commitar ou commit falhou. Continuando com push...
)
echo.

REM Detecta branch atual
for /f "tokens=*" %%b in ('git branch --show-current 2^>nul') do set "CUR=%%b"
if "%CUR%"=="" (
    echo [INFO] Nenhuma branch detectada. Criando main...
    git checkout -b main
    set "CUR=main"
)
echo [INFO] Branch atual: %CUR%
echo.

echo [6/6] Push...
echo [INFO] Sincronizando com remoto antes de subir...
git pull --rebase origin %CUR%
if errorlevel 1 (
    echo [AVISO] Pull/rebase falhou (pode ser repo vazio no GitHub, tudo bem).
)
echo.

git push -u origin %CUR%
if errorlevel 1 (
    echo.
    echo [ERRO] Push falhou. Causas comuns:
    echo   1. Autenticacao: GitHub exige Personal Access Token.
    echo      Acesse: github.com/settings/tokens -^> Generate new token (classic)
    echo      Marque: repo (full). Use o token como senha no proximo pop-up.
    echo   2. Conflito: tente rodar "git pull --rebase origin %CUR%" manualmente.
    echo   3. Repo nao existe: crie em github.com/new e tente novamente.
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Concluido - Codigo subido com sucesso
echo ========================================
echo https://github.com/Szn01/RYUK-TELEGRAM-CHECKER
echo.
echo Lembrete: .env e secrets nunca vao pro Git (por .gitignore).
echo.
pause
