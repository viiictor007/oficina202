@echo off
chcp 65001 >nul
title Oficina 202 - Diagnostico do computador
rem Executa o script diagnostico.ps1 desta pasta (somente leitura, nada e enviado pela internet).
rem O "Bypass" vale apenas para esta execucao e nao muda nenhuma configuracao do Windows.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0diagnostico.ps1"
echo.
pause
