@echo off
title QuizSphere - Vercel Deploy
echo ============================================================
echo   QuizSphere - Deploy to Vercel (public link)
echo ============================================================
echo.

cd /d "%~dp0"

echo [1/3] Building website (client)...
cd client
call npm.cmd run build
if errorlevel 1 ( echo BUILD FAILED & pause & exit /b 1 )

echo [2/3] Building admin panel...
cd ..\admin
set "VITE_BASE=/admin/"
call npm.cmd run build
set "VITE_BASE="
if errorlevel 1 ( echo BUILD FAILED & pause & exit /b 1 )

echo [3/3] Staging builds for Vercel...
cd ..
if exist server\deploy rmdir /s /q server\deploy
mkdir server\deploy\website
mkdir server\deploy\admin
xcopy client\dist server\deploy\website /e /i /y /q >nul
xcopy admin\dist server\deploy\admin /e /i /y /q >nul

echo.
echo Deploying to Vercel... (first time will ask you to login)
call npx vercel --prod

echo.
echo ============================================================
echo   Done! Vercel aapko public link dega (jese quizsphere.vercel.app).
echo   Env vars (TURSO_URL, TURSO_AUTH_TOKEN, JWT_SECRET) Vercel
echo   dashboard: Project Settings - Environment Variables se set
echo   karne honge. Details README mein hain.
echo ============================================================
pause
