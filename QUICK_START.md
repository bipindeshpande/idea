# 🚀 Quick Start Guide - Testing Your Enhanced Platform

Follow these steps to test your Startup Idea Crew platform with all the new tools!

## Step 1: Install CrewAI (if not already installed)

Since you have UV installed, let's install CrewAI:

```bash
uv tool install crewai
```

Or if you already have it, upgrade to the latest:

```bash
uv tool upgrade crewai
```

## Step 2: Install Project Dependencies

Install all required dependencies:

```bash
crewai install
```

This will install all dependencies from `pyproject.toml`.

## Step 3: Verify Your .env File

Make sure your `.env` file has your OpenAI API key:

```bash
# Open .env file and verify it contains:
OPENAI_API_KEY=your-actual-api-key-here
```

## Step 4: Test the Platform

### Option A: Using CrewAI CLI (Recommended)

```bash
crewai run
```

This will:
1. Prompt you for your goals, time commitment, and interests
2. Run all three agents with the enhanced tools
3. Generate comprehensive reports in the `output/` folder

### Option B: Direct Python Execution

```bash
python -m startup_idea_crew.main
```

### Option C: Quick Test Run

For a quick test, you can also run:

```bash
crewai test --n_iterations 1 --model openai/gpt-4o-mini
```

## Step 5: Check the Outputs

After running, check the `output/` folder for:

1. **profile_analysis.md** - Your profile analysis (with customer personas)
2. **startup_ideas_research.md** - 5-8 startup ideas (with market research, competitive analysis, validation)
3. **personalized_recommendations.md** - Top 3 recommendations (with financial analysis, risk assessment, domain suggestions)

## 🎯 What to Look For

The enhanced platform should now include:

✅ **Market Research Data** - Trends, competition, market size
✅ **Validation Scores** - Feasibility assessment for each idea
✅ **Financial Analysis** - Cost estimates, revenue projections
✅ **Risk Assessment** - Risks and mitigation strategies
✅ **Domain Suggestions** - Domain name recommendations
✅ **Customer Personas** - Target customer profiles
✅ **Validation Questions** - Ready-to-use interview questions

## 🐛 Troubleshooting

### If you get "ModuleNotFoundError: No module named 'crewai'"

Run:
```bash
uv tool install crewai
crewai install
```

### If you get API key errors

Check your `.env` file:
```bash
# Windows PowerShell
Get-Content .env
```

Make sure it has:
```
OPENAI_API_KEY=sk-...
```

### If tools aren't being used

Check that:
1. Tools are imported in `src/startup_idea_crew/crew.py`
2. Tools are assigned to agents
3. Tasks mention using tools in `config/tasks.yaml`

### Windows Unicode Error

If you get a unicode error, run this first:
```powershell
$env:PYTHONUTF8 = "1"
```

## 🧪 Testing Tips

1. **Start Simple** - Use simple inputs first to verify everything works
2. **Check Logs** - Watch for tool usage in the verbose output
3. **Review Outputs** - Check that outputs include tool-generated data
4. **Test Different Scenarios** - Try different goals, time commitments, interests

## 📊 Expected Behavior

When running, you should see:

1. **Profile Analyzer** using:
   - `generate_customer_persona`
   - `generate_validation_questions`

2. **Idea Researcher** using:
   - `research_market_trends`
   - `analyze_competitors`
   - `estimate_market_size`
   - `validate_startup_idea`

3. **Recommendation Advisor** using:
   - `assess_startup_risks`
   - `estimate_startup_costs`
   - `project_revenue`
   - `check_financial_viability`
   - `check_domain_availability`

## 🎉 Success Indicators

Your platform is working correctly if:

✅ All agents complete their tasks
✅ Output files are generated in `output/` folder
✅ Outputs include tool-generated insights
✅ Reports are comprehensive and actionable
✅ No errors in the console

## 📝 Next Steps

Once testing is successful:

1. **Customize** - Adjust agent configurations in `config/agents.yaml`
2. **Enhance** - Add real API integrations to tools
3. **Extend** - Add more tools or features
4. **Deploy** - Consider deploying to production

---

**Ready to test?** Start with Step 1 above! 🚀

