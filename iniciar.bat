@echo off
chcp 65001 >nul
title Oficina 202 - Servidor do site
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo O Node.js nao foi encontrado. Instale a versao LTS em https://nodejs.org e rode este arquivo de novo.
  pause
  exit /b
)

if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo.
  echo Vai abrir o arquivo .env no Bloco de Notas.
  echo Troque "cole_sua_chave_aqui" pela sua chave da Anthropic, salve e feche.
  echo.
  pause
  notepad ".env"
)

rem Abre o navegador depois de 2 segundos, com o servidor ja no ar
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"

echo Site rodando em http://localhost:3000  (feche esta janela para parar)
echo.
node server.js
pause
