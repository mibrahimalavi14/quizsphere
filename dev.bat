@echo off
title QuizSphere Dev Launcher
echo Starting QuizSphere (development, hot reload)...
echo.

cd /d "%~dp0server"
start "QuizSphere API" cmd /c "npm start"

cd /d "%~dp0client"
start "QuizSphere Website" cmd /c "npm run dev -- --host"

cd /d "%~dp0admin"
start "QuizSphere Admin" cmd /c "npm run dev -- --host"

timeout /t 3 /nobreak >nul
echo.
echo ============================================================
echo   QuizSphere dev servers starting...
echo.
echo   Website  : http://localhost:5173
echo   Admin    : http://localhost:5174
echo   API      : http://localhost:5000
echo.
echo   Admin login: admin@quizsphere.com / admin123
echo ============================================================
echo.
pause
