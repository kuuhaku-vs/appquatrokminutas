@echo off
setlocal
cd /d "%~dp0"
echo ==================================================
echo GERADOR DE MINUTA - INICIALIZACAO COM DIAGNOSTICO
echo ==================================================
echo Pasta: %CD%
echo.
if not exist "%~dp0GeradorMinuta.exe" (
  echo ERRO: GeradorMinuta.exe nao encontrado nesta pasta.
  pause
  exit /b 2
)
echo Iniciando aplicativo... mantenha esta janela aberta.
echo Log do Electron: "%~dp0dados\electron-startup.log"
if not exist "%~dp0dados" mkdir "%~dp0dados"
"%~dp0GeradorMinuta.exe" --enable-logging=stderr --v=1 1>>"%~dp0dados\electron-startup.log" 2>>&1
set APPERR=%ERRORLEVEL%
echo.
echo O aplicativo foi encerrado. Codigo de saida: %APPERR%
echo Consulte dados\electron-startup.log e dados\inicializacao.log, se existirem.
type "%~dp0dados\electron-startup.log" 2>nul
echo.
pause
exit /b %APPERR%
