@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo  BA - Vocal Coach
echo  ----------------
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\armar-env.ps1"
if errorlevel 1 goto fin
if not exist node_modules (
  echo  Instalando dependencias, tarda unos minutos la primera vez...
  call npm install
)
echo.
echo  Abriendo la pagina en http://localhost:3000  (deja esta ventana abierta)
echo.
call npm run dev
:fin
pause
