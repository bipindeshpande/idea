# Static Blocks Guide

## What are Static Blocks?

**Static blocks** are pre-computed knowledge blocks for specific interest areas (e.g., "AI / Automation", "E-commerce"). They contain curated information about market trends, competitors, risks, market size, opportunity spaces, and successful idea patterns.

## Purpose

Static blocks serve as **knowledge inputs to the LLM** in Stage 2 (Idea Research). They:
- **Replace expensive tool calls** - If a static block exists for an interest area, the corresponding tool is skipped (saving time and API costs)
- **Provide consistent knowledge** - Pre-computed content ensures reliable, high-quality information
- **Speed up pipeline** - No need to wait for tool execution when static blocks are available
- **Not shown to users** - They're inputs to the LLM, not displayed directly in the UI

## File Location

Static blocks are stored as JSON files in:
```
src/startup_idea_crew/static_blocks/{normalized_interest_area}.json
```

**Example:**
- Interest area: `"AI / Automation"` 
- Normalized filename: `ai_automation.json`
- Full path: `src/startup_idea_crew/static_blocks/ai_automation.json`

## JSON Structure

Each static block file must contain these 6 string fields:

```json
{
  "market_trends": "Text about current market trends...",
  "competitors": "Text about competitive landscape...",
  "risks": "Text about industry risks...",
  "market_size": "Text about market size and opportunity...",
  "opportunity_space": "Text about opportunities...",
  "idea_patterns": "Text about successful startup patterns..."
}
```

### Field Descriptions

| Field | Description | Used By Tool |
|-------|-------------|--------------|
| `market_trends` | Current trends, growth drivers, market shifts | `research_market_trends` |
| `competitors` | Competitive landscape, key players, differentiation | `analyze_competitors` |
| `risks` | Industry risks, challenges, mitigation strategies | `assess_startup_risks` |
| `market_size` | Market size estimates (TAM, SAM, SOM), growth rates | `estimate_market_size` |
| `opportunity_space` | Underserved niches, gaps, opportunities | General knowledge |
| `idea_patterns` | Successful startup patterns, proven models | `validate_startup_idea` (as validation questions) |

## How They're Used

### 1. Loading
When `precompute_all_tools()` runs in `unified_discovery_service.py`:

```python
# Load static blocks for the interest area
static_blocks = load_static_blocks(interest_area)

# Map static block keys to tool names
STATIC_TOOL_MAPPING = {
    "market_trends": "market_trends",
    "competitors": "competitors", 
    "market_size": "market_size",
    "risks": "risks",
    "validation_questions": "idea_patterns"
}

# If static block exists, skip the corresponding tool
for tool_name, static_key in STATIC_TOOL_MAPPING.items():
    if static_key in static_blocks and static_blocks[static_key]:
        # Skip tool execution, use static block content instead
        results[tool_name] = static_blocks[static_key]
```

### 2. Caching
Static blocks are cached in the database (`ToolCacheEntry`) for **30 days**:
- **Cache key format:** `static_blocks_{normalized_interest_area}`
- **TTL:** 30 days
- **Purpose:** Avoid file I/O on every request

### 3. Stage 2 Prompt
Static blocks are included in the Stage 2 (Idea Research) prompt as compressed JSON:

```python
# Compressed to <300 chars per field to save tokens
static_blocks_json = json.dumps(compressed_tools, separators=(',', ':'))

# Included in prompt
prompt = f"""
USER PROFILE: {profile_analysis_json}

RESEARCH DATA (summaries only):
{static_blocks_json}

Generate idea research and recommendations...
"""
```

## Creating New Static Blocks

### Step 1: Normalize Interest Area Name
Use the normalization function to get the filename:

```python
from app.services.static_loader import normalize_interest_area

interest_area = "E-commerce / Retail"
normalized = normalize_interest_area(interest_area)  # Returns: "e_commerce_retail"
```

**Normalization rules:**
- Convert to lowercase
- Replace `/`, `&`, spaces with underscores
- Remove special characters
- Collapse multiple underscores

### Step 2: Create JSON File
Create a file at:
```
src/startup_idea_crew/static_blocks/{normalized}.json
```

### Step 3: Fill in All 6 Fields
Each field should be a **string** (not an array or object). Use markdown formatting within strings for readability.

**Example structure:**
```json
{
  "market_trends": "The e-commerce market is experiencing... (1) Trend A... (2) Trend B...",
  "competitors": "Key competitors include: (1) Amazon... (2) Shopify...",
  "risks": "Major risks include: (1) Market saturation... (2) High customer acquisition costs...",
  "market_size": "Global e-commerce market is $5.7T in 2024, projected to reach $8.1T by 2028...",
  "opportunity_space": "Opportunities exist in: (1) Niche verticals... (2) B2B e-commerce...",
  "idea_patterns": "Successful patterns include: (1) Subscription models... (2) D2C brands..."
}
```

### Step 4: Validate
The file will be validated automatically:
- Must be valid JSON
- Must be a dictionary
- All values must be strings (or convert to strings)
- Missing fields are OK (empty dict returned if file not found)

## Current Static Blocks

Currently, only one static block exists:
- ✅ `ai_automation.json` (for interest area "AI / Automation")

## Tool Replacement Logic

When a static block exists, the corresponding tool is **completely skipped**:

| Static Block Field | Tool Skipped | Savings |
|-------------------|--------------|---------|
| `market_trends` | `research_market_trends()` | ~5-10s, API costs |
| `competitors` | `analyze_competitors()` | ~5-10s, API costs |
| `market_size` | `estimate_market_size()` | ~5-10s, API costs |
| `risks` | `assess_startup_risks()` | ~5-10s, API costs |
| `idea_patterns` | Used by `validate_startup_idea()` | Partial savings |

**Note:** Other tools (e.g., `estimate_startup_costs`, `project_revenue`, `check_financial_viability`) are **not** replaced by static blocks and will always run.

## Benefits

1. **Performance:** Reduces pipeline execution time by skipping 4-5 tool calls (~20-50 seconds)
2. **Cost:** Saves OpenAI API costs (fewer tool executions)
3. **Consistency:** Provides curated, high-quality knowledge vs. variable LLM-generated content
4. **Reliability:** No dependency on external API availability for cached knowledge

## Limitations

1. **Static content:** Information may become outdated (30-day cache helps, but manual updates needed)
2. **Coverage:** Only works for interest areas that have static block files
3. **Maintenance:** New interest areas require manual creation of static block files

## Example: Complete Static Block

See `src/startup_idea_crew/static_blocks/ai_automation.json` for a complete example.

## Code References

- **Loader:** `app/services/static_loader.py`
- **Usage:** `app/services/unified_discovery_service.py` (line ~555)
- **Normalization:** `normalize_interest_area()` function
- **Cache:** Database table `ToolCacheEntry` with `cache_key` prefix `static_blocks_`

