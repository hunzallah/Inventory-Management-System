@echo off
echo ============================================
echo   Inventory Management System - Setup
echo ============================================
echo.

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
  echo [ERROR] Node.js is not installed.
  echo Please install Node.js from https://nodejs.org
  pause
  exit /b 1
)

echo [1/3] Installing dependencies...
npm install --legacy-peer-deps
if %errorlevel% neq 0 (
  echo [ERROR] Failed to install dependencies
  pause
  exit /b 1
)

echo.
echo [2/3] Creating database directory...
if not exist "database" mkdir database
if not exist "database\uploads" mkdir database\uploads

echo.
echo [3/3] Setup complete!
echo.
echo To START the application, run:  npm run dev
echo To BUILD an installer, run:     npm run build
echo.
pause
