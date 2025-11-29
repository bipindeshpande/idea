# Simple server startup script with visible logs
# Run this script to start both servers in separate windows

Write-Host "=== Starting Servers ===" -ForegroundColor Green
Write-Host ""

# Kill any existing processes
Write-Host "Stopping existing servers..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -like "*python*" -or $_.ProcessName -like "*node*"} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# Start backend in new window
Write-Host "Starting BACKEND server (port 8000)..." -ForegroundColor Cyan
$backendScript = @"
cd c:\outsideonedrive\projects\idea
`$env:PYTHONIOENCODING='utf-8'
`$env:PYTHONUNBUFFERED='1'
Write-Host 'BACKEND SERVER STARTING...' -ForegroundColor Green
python api.py
"@
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendScript

# Wait a bit
Start-Sleep -Seconds 3

# Start frontend in new window
Write-Host "Starting FRONTEND server (port 5173)..." -ForegroundColor Cyan
$frontendScript = @"
cd c:\outsideonedrive\projects\idea\frontend
Write-Host 'FRONTEND SERVER STARTING...' -ForegroundColor Green
npm run dev
"@
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendScript

Write-Host ""
Write-Host "=== Servers Started ===" -ForegroundColor Green
Write-Host "Backend: http://localhost:8000" -ForegroundColor White
Write-Host "Frontend: http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "Check the PowerShell windows that just opened for logs!" -ForegroundColor Yellow
Write-Host "You should see startup messages and heartbeat every 30 seconds." -ForegroundColor Yellow

