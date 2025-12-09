Write-Host "=== Starting Frontend Dev Server ===" -ForegroundColor Green
Write-Host ""

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node -v
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js not found! Please install Node.js." -ForegroundColor Red
    exit 1
}

# Check npm
Write-Host "Checking npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm -v
    Write-Host "npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: npm not found!" -ForegroundColor Red
    exit 1
}

# Check if node_modules exists
Write-Host ""
Write-Host "Checking dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "node_modules not found. Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: npm install failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "Dependencies installed successfully!" -ForegroundColor Green
} else {
    Write-Host "Dependencies found." -ForegroundColor Green
}

# Start dev server
Write-Host ""
Write-Host "Starting Vite dev server on port 5173..." -ForegroundColor Cyan
Write-Host "Server will be available at: http://localhost:5173" -ForegroundColor White
Write-Host ""
npm run dev


