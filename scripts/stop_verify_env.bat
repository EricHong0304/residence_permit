@echo off
setlocal EnableDelayedExpansion

echo [stop] Stopping services on ports 3000, 8080, 8081 ...

call :killByPort 3000
call :killByPort 8080
call :killByPort 8081

echo [stop] Done.
exit /b 0

:killByPort
set PORT=%~1
for /f "tokens=5" %%P in ('netstat -ano ^| findstr LISTENING ^| findstr :%PORT%') do (
  echo [stop] Killing PID %%P on port %PORT%
  taskkill /F /PID %%P >nul 2>nul
)
REM Also try connections in TIME_WAIT/ESTABLISHED that may indicate server
for /f "tokens=5" %%P in ('netstat -ano ^| findstr :%PORT%') do (
  taskkill /F /PID %%P >nul 2>nul
)
exit /b 0
