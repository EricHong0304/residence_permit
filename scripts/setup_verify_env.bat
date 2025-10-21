@echo off
setlocal EnableDelayedExpansion

REM Check Node.js
where node >nul 2>nul
if errorlevel 1 (
  echo [setup] Node.js not found. Please install Node.js >= 18 and ensure it's in PATH.
  exit /b 1
)
for /f "tokens=1* delims=v" %%A in ('node -v') do set NODE_VER=%%B
for /f "tokens=1 delims=." %%A in ("%NODE_VER%") do set NODE_MAJOR=%%A
if %NODE_MAJOR% LSS 18 (
  echo [setup] Node.js version %NODE_VER% detected. Please install Node.js >= 18.
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [setup] npm not found. Please install Node.js >= 18.
  exit /b 1
)

echo [setup] Initializing SQLite database (WAL, tables, views)...
call "%~dp0init_db.bat"
if errorlevel 1 (
  echo [setup] Database initialization failed.
  exit /b 1
)

echo [setup] Installing dependencies and building projects...

pushd "%~dp0..\server"
  call npm ci || call npm install
  if errorlevel 1 (
    echo [setup] Failed to install server dependencies.
    popd & exit /b 1
  )
  call npm run build
  if errorlevel 1 (
    echo [setup] Server build failed.
    popd & exit /b 1
  )
popd

pushd "%~dp0..\app"
  call npm ci || call npm install
  if errorlevel 1 (
    echo [setup] Failed to install app dependencies.
    popd & exit /b 1
  )
  call npm run build
  if errorlevel 1 (
    echo [setup] App build failed.
    popd & exit /b 1
  )
popd

pushd "%~dp0..\admin"
  call npm ci || call npm install
  if errorlevel 1 (
    echo [setup] Failed to install admin dependencies.
    popd & exit /b 1
  )
  call npm run build
  if errorlevel 1 (
    echo [setup] Admin build failed.
    popd & exit /b 1
  )
popd

echo [setup] Starting backend (staging)...
start "server" cmd /c "cd /d %~dp0..\server && set NODE_ENV=staging&& node dist\index.js"

echo [setup] Starting static servers for app/admin...
start "app-serve" cmd /c "cd /d %~dp0..\app && npx --yes serve -s dist -l 8080"
start "admin-serve" cmd /c "cd /d %~dp0..\admin && npx --yes serve -s dist -l 8081"

REM Wait a moment for services to be ready
ping -n 4 127.0.0.1 >nul 2>nul

call "%~dp0verify_health.bat"
if errorlevel 1 (
  echo [setup] Some health checks failed, but services may still be starting. Try again shortly.
) else (
  echo [setup] All services are up.
)

echo.
echo Access URLs:
echo   API:   http://localhost:3000/api/health
echo   App:   http://localhost:8080
echo   Admin: http://localhost:8081

echo Default admin account: admin / admin

echo [setup] Done.
exit /b 0
