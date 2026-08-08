@echo off
title QuizSphere Build
echo ============================================================
echo   QuizSphere - Install & Production Build
echo ============================================================
echo.

cd /d "%~dp0server"
if not exist node_modules (
  echo [1/4] Installing server dependencies...
  call npm install
) else echo [1/4] Server dependencies already installed.

cd /d "%~dp0client"
if not exist node_modules (
  echo [2/4] Installing client dependencies...
  call npm install
) else echo [2/4] Client dependencies already installed.

cd /d "%~dp0admin"
if not exist node_modules (
  echo [3/4] Installing admin dependencies...
  call npm install
) else echo [3/4] Admin dependencies already installed.

cd /d "%~dp0server"
echo [4/4] Seeding database + building client & admin...
call npm run seed
cd /d "%~dp0client"
call npm run build
cd /d "%~dp0admin"
set "VITE_BASE=/admin/"
call npm run build
set "VITE_BASE="

echo.
echo ============================================================
echo   Build complete!
echo   Run start.bat to launch in production mode.
echo ============================================================
echo.
pause
