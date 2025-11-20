# 🔧 Setup and Run Guide - Step by Step

## The Issue
You're getting errors because CrewAI and dependencies aren't installed yet. Let's fix this step by step.

## ✅ Step-by-Step Setup

### Step 1: Install CrewAI using UV (Recommended)

```powershell
uv tool install crewai
```

This installs CrewAI as a UV tool, which is the recommended way.

### Step 2: Install Project Dependencies

From your project root directory (`C:\outsideonedrive\projects\idea`), run:

```powershell
crewai install
```

This will install all dependencies defined in `pyproject.toml`.

**Alternative if `crewai install` doesn't work:**

```powershell
# Install using pip
pip install crewai[tools]>=0.126.0,<1.0.0

# Or install using UV
uv pip install crewai[tools]>=0.126.0,<1.0.0
```

### Step 3: Install the Project in Editable Mode

To make the `startup_idea_crew` module importable, install it:

```powershell
# Using pip
pip install -e .

# Or using UV
uv pip install -e .
```

### Step 4: Verify Installation

Test that everything is installed:

```powershell
python -c "import crewai; print('CrewAI installed:', crewai.__version__)"
python -c "from startup_idea_crew.tools import research_market_trends; print('Tools import OK')"
```

### Step 5: Verify .env File

Make sure your `.env` file exists and has your API key:

```powershell
# Check if .env exists
if (Test-Path .env) { Write-Host ".env exists" } else { Write-Host ".env missing!" }

# View .env (be careful - don't share your key!)
Get-Content .env
```

Your `.env` should contain:
```
OPENAI_API_KEY=sk-your-actual-key-here
```

### Step 6: Run the Platform

Now you can run it:

```powershell
# Option 1: Using CrewAI CLI
crewai run

# Option 2: Direct Python execution
python -m startup_idea_crew.main
```

## 🐛 Common Errors and Fixes

### Error: "ModuleNotFoundError: No module named 'crewai'"

**Fix:**
```powershell
uv tool install crewai
# OR
pip install crewai[tools]
```

### Error: "ModuleNotFoundError: No module named 'startup_idea_crew'"

**Fix:**
```powershell
# Install the project in editable mode
pip install -e .
# OR
uv pip install -e .
```

### Error: "No such file or directory: '.env'"

**Fix:**
Create a `.env` file in the project root:
```powershell
# Create .env file
@"
OPENAI_API_KEY=your-actual-key-here
"@ | Out-File -FilePath .env -Encoding utf8
```

### Error: Unicode/Encoding Errors on Windows

**Fix:**
```powershell
$env:PYTHONUTF8 = "1"
```

### Error: "crewai: command not found"

**Fix:**
```powershell
# Install CrewAI as a UV tool
uv tool install crewai

# Or add to PATH if using pip install
```

## 📝 Complete Setup Script

Copy and run this complete setup script:

```powershell
# Set encoding for Windows
$env:PYTHONUTF8 = "1"

# Install CrewAI
Write-Host "Installing CrewAI..."
uv tool install crewai

# Install project dependencies
Write-Host "Installing project dependencies..."
crewai install

# Install project in editable mode
Write-Host "Installing project in editable mode..."
pip install -e .

# Verify .env exists
if (-not (Test-Path .env)) {
    Write-Host "Creating .env file template..."
    @"
OPENAI_API_KEY=your-openai-api-key-here
"@ | Out-File -FilePath .env -Encoding utf8
    Write-Host "Please edit .env and add your OpenAI API key!"
}

# Verify installation
Write-Host "Verifying installation..."
python -c "import crewai; print('✓ CrewAI installed')"
python -c "from startup_idea_crew.tools import research_market_trends; print('✓ Tools import OK')"

Write-Host "`nSetup complete! Run 'crewai run' to start."
```

## 🚀 Quick Test

After setup, test with:

```powershell
python -m startup_idea_crew.main
```

This will prompt you for:
- Your goals
- Time commitment  
- Your interests

Then it will generate comprehensive reports in the `output/` folder.

## 📊 Expected Output

After running, you should see:
- ✅ Profile analysis with customer personas
- ✅ Startup ideas with market research
- ✅ Recommendations with financial analysis

Check the `output/` folder for:
- `profile_analysis.md`
- `startup_ideas_research.md`
- `personalized_recommendations.md`

## 🆘 Still Having Issues?

1. **Check Python version:**
   ```powershell
   python --version
   # Should be >= 3.10, < 3.14
   ```

2. **Check if in correct directory:**
   ```powershell
   pwd
   # Should be: C:\outsideonedrive\projects\idea
   ```

3. **Verify file structure:**
   ```powershell
   ls src/startup_idea_crew/
   # Should show: __init__.py, crew.py, main.py, config/, tools/
   ```

4. **Check for syntax errors:**
   ```powershell
   python -m py_compile src/startup_idea_crew/crew.py
   ```

## 📞 Next Steps

Once setup is complete:
1. Run the platform: `crewai run`
2. Test with different inputs
3. Review the enhanced outputs
4. Customize agents/tasks as needed

Good luck! 🎉

