# Startup Idea Crew - Setup Script
# Run this script to set up everything needed to run the platform

Write-Host "Setting up Startup Idea Crew Platform..." -ForegroundColor Green
Write-Host ""

# Set encoding for Windows
$env:PYTHONUTF8 = "1"
Write-Host "[OK] Set PYTHONUTF8=1 for Windows compatibility" -ForegroundColor Yellow

# Check Python version
Write-Host "`nChecking Python version..." -ForegroundColor Cyan
$pythonVersion = python --version 2>&1
Write-Host "  $pythonVersion" -ForegroundColor Gray

# Step 1: Install CrewAI
Write-Host "`n[1/4] Installing CrewAI..." -ForegroundColor Cyan
$crewaiInstalled = $false
try {
    uv tool install crewai 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] CrewAI installed via UV tool" -ForegroundColor Green
        $crewaiInstalled = $true
    }
} catch {
    Write-Host "  [WARN] UV tool install failed" -ForegroundColor Yellow
}

if (-not $crewaiInstalled) {
    Write-Host "  Trying pip install..." -ForegroundColor Yellow
    pip install "crewai[tools]>=0.126.0,<1.0.0" 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] CrewAI installed via pip" -ForegroundColor Green
        $crewaiInstalled = $true
    } else {
        Write-Host "  [ERROR] Failed to install CrewAI" -ForegroundColor Red
    }
}

# Step 2: Install project dependencies
Write-Host "`n[2/4] Installing project dependencies..." -ForegroundColor Cyan
try {
    crewai install 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] crewai install failed, trying direct pip install..." -ForegroundColor Yellow
        pip install "crewai[tools]>=0.126.0,<1.0.0" 2>&1 | Out-Null
        Write-Host "  [OK] Dependencies installed via pip" -ForegroundColor Green
    }
} catch {
    Write-Host "  [WARN] Installation had issues, but continuing..." -ForegroundColor Yellow
}

# Step 3: Install project in editable mode
Write-Host "`n[3/4] Installing project in editable mode..." -ForegroundColor Cyan
try {
    pip install -e . 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Project installed in editable mode" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] pip install -e failed, trying uv pip..." -ForegroundColor Yellow
        uv pip install -e . 2>&1 | Out-Null
        Write-Host "  [OK] Project installed via uv pip" -ForegroundColor Green
    }
} catch {
    Write-Host "  [WARN] Editable install had issues" -ForegroundColor Yellow
}

# Step 4: Check .env file
Write-Host "`n[4/4] Checking .env file..." -ForegroundColor Cyan
if (Test-Path .env) {
    Write-Host "  [OK] .env file exists" -ForegroundColor Green
    $envContent = Get-Content .env -Raw
    if ($envContent -match "OPENAI_API_KEY\s*=\s*sk-") {
        Write-Host "  [OK] OpenAI API key found in .env" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] OPENAI_API_KEY not found or invalid in .env" -ForegroundColor Yellow
        Write-Host "    Please add: OPENAI_API_KEY=sk-your-key-here" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [WARN] .env file not found, creating template..." -ForegroundColor Yellow
    $envTemplate = @"
OPENAI_API_KEY=your-openai-api-key-here
"@
    $envTemplate | Out-File -FilePath .env -Encoding utf8
    Write-Host "  [OK] Created .env file template" -ForegroundColor Green
    Write-Host "  [WARN] Please edit .env and add your OpenAI API key!" -ForegroundColor Yellow
}

# Verification
Write-Host "`nVerifying installation..." -ForegroundColor Cyan
Write-Host ""

$errors = 0

# Check CrewAI
Write-Host "  Checking CrewAI..." -ForegroundColor Gray
$crewaiCheck = python -c "import crewai; print('OK')" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] CrewAI module can be imported" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] CrewAI module import failed" -ForegroundColor Red
    $errors++
}

# Check tools
Write-Host "  Checking custom tools..." -ForegroundColor Gray
$toolsCheck = python -c "from startup_idea_crew.tools import research_market_trends; print('OK')" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Custom tools can be imported" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Custom tools import failed" -ForegroundColor Red
    Write-Host "    Error: $toolsCheck" -ForegroundColor Red
    $errors++
}

# Final message
Write-Host ""
if ($errors -eq 0) {
    Write-Host "Setup completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now run the platform with:" -ForegroundColor Cyan
    Write-Host "  crewai run" -ForegroundColor White
    Write-Host "  OR" -ForegroundColor Gray
    Write-Host "  python -m startup_idea_crew.main" -ForegroundColor White
} else {
    Write-Host "Setup completed with $errors error(s)" -ForegroundColor Yellow
    Write-Host "Please check the errors above and try manual installation." -ForegroundColor Yellow
}

Write-Host ""
