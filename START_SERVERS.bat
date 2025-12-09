@echo off
echo ========================================
echo   STARTING BOTH SERVERS
echo ========================================
echo.

REM Kill existing processes
echo Stopping existing servers...
taskkill /F /IM node.exe /T >nul 2>&1
taskkill /F /IM python.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul

REM Start Backend
echo Starting BACKEND server on port 8000...
start "Backend Server - Port 8000" cmd /k "cd /d c:\outsideonedrive\projects\idea && echo === BACKEND SERVER === && echo Port: http://localhost:8000 && echo. && python api.py"

REM Wait a moment
timeout /t 3 /nobreak >nul

REM Start Frontend
echo Starting FRONTEND server on port 5173...
start "Frontend Server - Port 5173" cmd /k "cd /d c:\outsideonedrive\projects\idea\frontend && echo === FRONTEND SERVER === && echo Port: http://localhost:5173 && echo. && npm run dev"

echo.
echo ========================================
echo   SERVERS STARTED
echo ========================================
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo.
echo Check the two CMD windows that opened!
echo.
pause

