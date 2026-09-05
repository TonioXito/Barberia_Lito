@echo off
chcp 65001 >nul
title Carniceria - App Local
cd /d "%~dp0"

echo.
echo  ==========================================
echo    APP CARNICERIA - INICIO
echo  ==========================================
echo.

if not exist node_modules (
  echo  Instalando dependencias (solo la primera vez)...
  call pnpm install
  if errorlevel 1 (
    echo.
    echo  ERROR: no se pudieron instalar las dependencias.
    echo  Asegurate de tener Node.js instalado.
    pause
    exit /b 1
  )
)

echo.
echo  Abriendo la aplicacion en tu navegador...
echo  (No cierres esta ventana mientras uses la app)
echo.
call pnpm iniciar

pause