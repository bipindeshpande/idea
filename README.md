# Startup Idea Crew 🚀

Welcome to the Startup Idea Crew project, powered by [crewAI](https://crewai.com). This project provides AI-powered startup idea recommendations tailored to your goals, time commitment, and interests.

## 🎯 What This Project Does

This CrewAI project uses a multi-agent system to:

1. **Analyze Your Profile** - Understand your goals, skills, time availability, and interests
2. **Research Startup Ideas** - Generate innovative startup ideas aligned with your profile
3. **Provide Recommendations** - Deliver personalized top 3 recommendations with actionable next steps

The team consists of specialized AI agents:
- **Profile Analyst**: Analyzes your professional profile and constraints
- **Idea Researcher**: Researches and generates relevant startup ideas
- **Recommendation Advisor**: Creates personalized recommendations with roadmaps

## 📋 Prerequisites

- Python >=3.10,<3.14
- [UV](https://docs.astral.sh/uv/) package manager (recommended) or pip
- OpenAI API key

## 🚀 Installation

### Step 1: Install UV (if not already installed)

```bash
pip install uv
```

### Step 2: Install CrewAI

```bash
uv tool install crewai
```

Or if you want the latest version:
```bash
uv tool upgrade crewai
```

### Step 3: Install Project Dependencies

Navigate to the project directory and install dependencies:

```bash
crewai install
```

### Step 4: Set Up Environment Variables

1. Copy the example environment file:
   ```bash
   copy .env.example .env
   ```

2. Edit `.env` and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your-actual-api-key-here
   ```

## 🏃 Running the Project

### Option 1: Interactive Mode (Recommended)

Run the crew with interactive prompts:

```bash
crewai run
```

This will prompt you for:
- Your goals
- Time commitment
- Your interests

### Option 2: Direct Python Execution

```bash
python -m startup_idea_crew.main
```

### Option 3: REST API (Flask)

Run the Flask API to trigger the crew programmatically:

```bash
pip install -e .
python api.py
```

Then send a request (with `curl`, Postman, or your React frontend):

```bash
curl -X POST http://localhost:8000/run \
  -H "Content-Type: application/json" \
  -d '{
        "goals": "Build a side business",
        "time_commitment": "10-15 hours per week",
        "interests": "AI, SaaS, automation"
      }'
```

The API responds with JSON containing the generated reports (profile analysis, startup ideas research, and personalized recommendations).

## 📁 Project Structure

```
startup_idea_crew/
├── src/
│   └── startup_idea_crew/
│       ├── __init__.py
│       ├── crew.py              # Main crew definition
│       ├── main.py              # Entry point
│       ├── config/
│       │   ├── agents.yaml      # Agent configurations
│       │   └── tasks.yaml       # Task definitions
│       └── tools/               # Custom tools
│           ├── __init__.py
│           ├── market_research_tool.py   # Market research tools
│           ├── validation_tool.py        # Validation tools
│           ├── financial_tool.py         # Financial analysis tools
│           └── customer_tool.py          # Customer analysis tools
├── output/                      # Generated reports
├── pyproject.toml              # Project configuration
├── .env                        # Environment variables (create from .env.example)
├── README.md                   # This file
└── TOOLS_GUIDE.md             # Detailed tools documentation
```

## 📊 Output Files

After running, you'll find these files in the `output/` directory:

- **profile_analysis.md** - Detailed analysis of your professional profile
- **startup_ideas_research.md** - Research on 5-8 startup ideas
- **personalized_recommendations.md** - Top 3 recommendations with actionable steps

## 🧪 Testing

To test the crew with sample inputs:

```bash
crewai test --n_iterations 1 --model openai/gpt-4o-mini
```

## 🛠️ Customization

### Modify Agents

Edit `src/startup_idea_crew/config/agents.yaml` to:
- Change agent roles and goals
- Adjust agent backstories
- Switch LLM models

### Modify Tasks

Edit `src/startup_idea_crew/config/tasks.yaml` to:
- Change task descriptions
- Modify expected outputs
- Adjust task dependencies

### Add Custom Tools

1. Create tools in `src/startup_idea_crew/tools/`
2. Import and add them to agents in `crew.py`

**Available Custom Tools:**
- **Market Research Tools**: `research_market_trends`, `analyze_competitors`, `estimate_market_size`
- **Validation Tools**: `validate_startup_idea`, `check_domain_availability`, `assess_startup_risks`
- **Financial Tools**: `estimate_startup_costs`, `project_revenue`, `check_financial_viability`
- **Customer Tools**: `generate_customer_persona`, `generate_validation_questions`

See [TOOLS_GUIDE.md](TOOLS_GUIDE.md) for detailed documentation on all tools.

### Modify Crew Logic

Edit `src/startup_idea_crew/crew.py` to:
- Change task execution order
- Switch between sequential/hierarchical processes
- Add custom logic

## 💡 Example Usage

```bash
$ crewai run

🚀 Welcome to Startup Idea Crew!
==================================================

What are your main goals? > Build a side business
How much time can you commit per week? > 10-15 hours
What are your main interests? > AI, SaaS, automation

Processing your information...
[Agent conversations and analysis...]

✅ Analysis Complete!
Check the 'output' folder for your personalized reports.
```

## 🤝 Contributing

Feel free to customize this project for your needs! Some ideas:
- Add more sophisticated market research tools
- Integrate with external APIs for trend analysis
- Add validation tools for startup ideas
- Create a web interface

## 📝 Notes

- Make sure you have sufficient API credits
- Monitor your API usage at [OpenAI Dashboard](https://platform.openai.com/usage)
- The analysis may take a few minutes depending on API response times

## 🆘 Troubleshooting

### Windows Users

If you get a "unicode" error when running `crewai create crew`, run this first:
```powershell
$env:PYTHONUTF8 = "1"
```

### API Key Issues

Make sure your `.env` file is in the project root and contains a valid `OPENAI_API_KEY`.

### Import Errors

Make sure you've run `crewai install` to install all dependencies.

## 📄 License

This project is part of a learning journey. Feel free to use and modify as needed.

---

Built with 💜 using [crewAI](https://crewai.com)

## 🖥️ React Frontend

A React frontend lives under `frontend/` and communicates with the Flask API.

### Setup & Development

```bash
cd frontend
npm install
npm run dev
```

With both the Flask API (`python api.py`) and the React dev server running, open the UI at [http://localhost:5173](http://localhost:5173). The app proxies API requests to `http://localhost:8000/run`.

## 📈 Analytics & SEO

- Set `VITE_GA_ID` in `frontend/.env` to enable Google Analytics (e.g. `VITE_GA_ID=G-XXXXXXXXXX`).
- Static SEO assets live in `frontend/public/robots.txt` and `frontend/public/sitemap.xml`.
- Page-level metadata is managed via `react-helmet-async` in each page component.
- Blog posts under `/blog` help with long-tail keywords and provide shareable content.

