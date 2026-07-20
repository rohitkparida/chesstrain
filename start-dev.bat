@echo off
setlocal

cd /d "%~dp0"
echo Starting Magnus Engine at http://localhost:5173
call npm run dev -- --host 127.0.0.1

pause
