@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo 🚀 Starting Transcript Generator Development Environment
echo.

REM Function to check if Ollama is running
:check_ollama
curl -f http://127.0.0.1:11434/api/tags >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Ollama is already running
    goto :start_vite
) else (
    echo ⚠️  Ollama is not running
    goto :start_ollama
)

REM Function to start Ollama
:start_ollama
echo 🔧 Starting Ollama...

REM Check if ollama command exists
where ollama >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Ollama is not installed or not in PATH
    echo Please install Ollama from: https://ollama.ai/download
    echo.
    echo Continuing with frontend only (AI features will not work)
    echo.
    goto :start_vite
)

REM Start Ollama in background
echo Starting Ollama server...
start /b ollama serve >nul 2>&1

REM Wait for Ollama to start
echo Waiting for Ollama to start...
for /l %%i in (1,1,30) do (
    curl -f http://127.0.0.1:11434/api/tags >nul 2>&1
    if !errorlevel! equ 0 (
        echo ✅ Ollama started successfully!
        echo.
        goto :start_vite
    )
    timeout /t 1 /nobreak >nul
    echo -n .
)

echo.
echo ❌ Ollama failed to start within 30 seconds
echo You may need to start it manually with: ollama serve
echo.

:start_vite
echo 🌐 Starting Vite development server...
echo 📱 Frontend will be available at: http://localhost:5173
echo 🤖 AI features will work if Ollama is running
echo.
echo 💡 Tips:
echo    • Press Ctrl+C to stop the server
echo    • Check Ollama status: npm run check-ollama
echo    • Manual Ollama start: ollama serve
echo.

REM Start Vite dev server
npm run dev
