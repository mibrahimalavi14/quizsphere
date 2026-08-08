@echo off
title QuizSphere Launcher
echo Starting QuizSphere (production)...
echo.

cd /d "%~dp0server"
start "QuizSphere Server" cmd /c "npm start"

timeout /t 4 /nobreak >nul
echo.
echo ============================================================
echo   QuizSphere is running!
echo.
echo   Website  : http://localhost:5000
echo   Admin    : http://localhost:5000/admin
echo   API      : http://localhost:5000/api
echo.
echo   Admin login: admin@quizsphere.com / admin123
echo.
echo   Close this window to keep servers running in the background.
echo ============================================================
echo.
pause
