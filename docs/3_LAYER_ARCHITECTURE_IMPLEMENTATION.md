# 3-Layer Discovery Architecture Implementation

## Overview

This document describes the implementation of the 3-layer discovery architecture to reduce discovery runtime from ~90s to under 40s while maintaining personalization quality.

## Architecture Layers

### Layer 1: Shared Facts (Cached/Pre-computed)
**Directory**: `app/data/domain_research/`

**Purpose**: Store objective, non-personalized data per interest_area that can be cached and reused across users.

**Files**: `<interest_area>.json` containing:
- `market_trends` - Market research data
- `competitor_overview` - Competitive analysis
- `market_size` - Market size estimates
- `opportunity_map` - Market opportunities
- `cost_templates` - Startup cost templates

**Implementation**:
- `app/utils/domain_research.py` - Manages reading/writing domain research JSON files
- Tools check domain_research JSON files FIRST before calling OpenAI
- Results are automatically saved to JSON files when generated
- Always cached (removed user_profile checks that disabled caching)

### Layer 2: Idea Themes (Semi-Shared, Parameter Based)
**Purpose**: Keep existing tool logic, but tools provide structured data rather than calling OpenAI during recommendation phase.

**Implementation**:
- Tools can still be called during idea_research_task
- Tools now check domain_research JSON first (Layer 1)
- Recommendation task uses pre-computed tool outputs

### Layer 3: Personalization (100% Unique Per User)
**Purpose**: Generate personalized recommendations using OpenAI every time.

**Implementation**:
- `recommendation_task` reads:
  - Domain research JSON (Layer 1)
  - Tool outputs (Layer 2)
  - Profile analysis output (user-specific)
  - Idea research output (idea themes)
  - User profile inputs
- Generates unique, personalized output for each user
- Always uses OpenAI (never cached)

## Key Changes

### 1. Domain Research Manager
**File**: `app/utils/domain_research.py`

**Features**:
- Load/save domain research data per interest_area
- Normalize interest_area to valid filenames
- Check for existing research data
- Update specific fields in research data

### 2. Tool Modifications
**Files**: `src/startup_idea_crew/tools/market_research_tool.py`

**Changes**:
- Import domain_research manager
- Check domain_research JSON files FIRST (Layer 1)
- Always allow caching (removed user_profile checks)
- Save results to domain_research JSON when generated
- Fallback to PostgreSQL cache if JSON not found
- Tools updated: `research_market_trends`, `analyze_competitors`, `estimate_market_size`

### 3. Parallelization Fix
**File**: `src/startup_idea_crew/crew.py`

**Changes**:
- Removed explicit `context` dependency from `idea_research_task`
- Removed explicit `context` dependency from `recommendation_task`
- Hierarchical process handles task coordination automatically
- `profile_analysis_task` and `idea_research_task` now run in complete parallel

### 4. Recommendation Task Update
**File**: `src/startup_idea_crew/config/tasks.yaml`

**Changes**:
- Updated description to reference Layer 1 (domain_research JSON)
- Updated description to reference Layer 2 (pre-computed tool outputs)
- Added Layer 3 instructions for personalization
- Instructs agent to synthesize all layers for unique output

### 5. Model Configuration
**File**: `src/startup_idea_crew/config/agents.yaml`

**Status**: Already using `gpt-4o-mini` for all agents (no changes needed)

## Expected Performance Improvements

### First Run (New Interest Area)
- Layer 1: Generate domain_research JSON (~10-15s)
- Layer 2: Generate idea themes (~20-25s)
- Layer 3: Generate personalized recommendations (~15-20s)
- **Total**: ~45-60s (reduced from ~90s)

### Subsequent Runs (Same Interest Area)
- Layer 1: Load from JSON (~0.01s)
- Layer 2: Use cached data (~5-10s)
- Layer 3: Generate personalized recommendations (~15-20s)
- **Total**: ~20-30s (reduced from ~90s)

## File Structure

```
app/
  data/
    domain_research/
      ai__automation.json
      e-commerce.json
      ...
  utils/
    domain_research.py

src/startup_idea_crew/
  tools/
    market_research_tool.py (modified)
    financial_tool.py (modified)
  crew.py (modified)
  config/
    tasks.yaml (modified)
    agents.yaml (no changes)
```

## Testing Checklist

- [ ] First discovery run for new interest_area completes in <40s
- [ ] Subsequent runs for same interest_area complete in <20s
- [ ] Domain research JSON files are created in `app/data/domain_research/`
- [ ] Tools check domain_research JSON before calling OpenAI
- [ ] Recommendation output remains personalized and unique
- [ ] No two users receive identical full outputs
- [ ] Output structure unchanged
- [ ] All lint/tests pass

## Notes

- Domain research JSON files are per interest_area, not per user
- Layer 1 data is shared across all users with same interest_area
- Layer 3 ensures personalization is maintained
- Parallelization enables profile_analysis and idea_research to run simultaneously
- Hierarchical process automatically coordinates task dependencies

