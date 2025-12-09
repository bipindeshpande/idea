"""
Unified prompt template for single-shot Discovery pipeline.
Replaces hierarchical CrewAI structure with one LLM call.
"""
import re
from typing import Dict, Any


def _sanitize_tool_result(text: str) -> str:
    """
    Sanitize tool result for prompt inclusion.
    
    - Removes excessive whitespace
    - Cleans invalid markdown
    - Truncates if too long
    - Preserves key information
    
    Args:
        text: Raw tool result text
    
    Returns:
        Sanitized text
    """
    if not text:
        return ""
    
    # Remove excessive whitespace (multiple newlines → single newline)
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    # Remove leading/trailing whitespace from each line
    lines = [line.strip() for line in text.split('\n')]
    text = '\n'.join(lines)
    
    # Remove invalid markdown patterns (e.g., unclosed brackets)
    # Keep valid markdown but clean up common issues
    text = re.sub(r'\[([^\]]+)\]\(\)', r'\1', text)  # Remove empty links
    
    # Collapse multiple spaces to single space (but preserve intentional spacing)
    text = re.sub(r' {2,}', ' ', text)
    
    return text.strip()


def build_unified_prompt(
    goal_type: str,
    time_commitment: str,
    budget_range: str,
    interest_area: str,
    sub_interest_area: str,
    work_style: str,
    skill_strength: str,
    experience_summary: str,
    founder_psychology: Dict[str, Any],
    tool_results: Dict[str, str],
    domain_research: Dict[str, Any] = None,
    archetype_blocks: Dict[str, str] = None,
    static_blocks: Dict[str, str] = None,
) -> str:
    """
    Build unified prompt that generates all three outputs in one LLM call.
    
    Args:
        goal_type: User's goal type
        time_commitment: Time availability
        budget_range: Budget constraints
        interest_area: Primary interest area
        sub_interest_area: Sub-interest focus
        work_style: Preferred work style
        skill_strength: Primary skill strength
        experience_summary: User experience summary
        founder_psychology: Founder psychology dict
        tool_results: Pre-computed tool results dict
        domain_research: Domain research data (Layer 1)
        archetype_blocks: Optional cached archetype blocks (sections 2-5)
        static_blocks: Optional static knowledge blocks (market_trends, competitors, etc.)
    
    Returns:
        Complete prompt string for unified LLM call
    """
    
    # Default archetype_blocks if not provided
    if archetype_blocks is None:
        archetype_blocks = {}
    
    # Build archetype block content sections (compute outside f-string to avoid syntax errors)
    operating_constraints_content = ""
    if archetype_blocks.get('operating_constraints'):
        operating_constraints_content = f"[USE THIS EXACT CONTENT - DO NOT MODIFY:\n{archetype_blocks.get('operating_constraints', '')}\n]"
    else:
        operating_constraints_content = f"[ANALYZE the constraints, don't just list them. Explain the implications and trade-offs:\n- Time ({time_commitment}): What this ACTUALLY means for project scope, what types of projects are realistic vs. unrealistic, what shortcuts or approaches this forces, what opportunities this creates\n- Work Style ({work_style}): How this shapes execution, what types of projects match this style, what challenges this creates, what advantages this provides\n- Budget ({budget_range}): What tools/platforms this enables or rules out, what business models are feasible, what risks this creates, what creative solutions this demands\nEach point should be 2-3 sentences with real analysis, not just \"Your budget is {budget_range}.\"]"
    
    opportunity_content = ""
    if archetype_blocks.get('opportunity_within_interest'):
        opportunity_content = f"[USE THIS EXACT CONTENT - DO NOT MODIFY:\n{archetype_blocks.get('opportunity_within_interest', '')}\n]"
    else:
        opportunity_content = f"[ANALYZE why this interest area matters NOW and what opportunities exist. Don't just list the interest area. Explain:\n- Why this area is timely (market trends, technology shifts, demand signals)\n- What specific opportunities exist within this area that match their constraints\n- What gaps or problems exist that their skills could address\n- What the user might not know about opportunities in this space\n2-3 bullet points with concrete examples, specific tool names, frameworks, or market signals. Each bullet should provide insight, not just state facts.]"
    
    strengths_content = ""
    if archetype_blocks.get('strengths_to_leverage'):
        strengths_content = f"[USE THIS EXACT CONTENT - DO NOT MODIFY:\n{archetype_blocks.get('strengths_to_leverage', '')}\n]"
    else:
        strengths_content = "[ANALYZE their skill strength and experience. Don't just repeat what they said. Explain:\n- What this strength ACTUALLY means in practice\n- How this strength gives them an advantage others don't have\n- What types of problems this strength is uniquely suited to solve\n- What the user might not realize about how valuable this strength is\n2-4 bullet points. Each point: one strength + WHY it matters + HOW it helps execution + WHAT it enables.]"
    
    skill_gaps_content = ""
    if archetype_blocks.get('skill_gaps_to_fill'):
        skill_gaps_content = f"[USE THIS EXACT CONTENT - DO NOT MODIFY:\n{archetype_blocks.get('skill_gaps_to_fill', '')}\n]"
    else:
        skill_gaps_content = "[ANALYZE what's missing. Don't just list skills. Explain:\n- WHY these gaps matter for their goals\n- WHAT happens if they don't fill these gaps\n- HOW these gaps connect to their interest area and constraints\n- WHAT the fastest path to filling these gaps is\n2-4 bullet points. Be concrete: \"NLP basics: intents, entities, context, conversation memory\" NOT \"understanding of technical concepts.\" Each point should explain WHY this gap matters and WHAT it blocks.]"
    
    # Format founder psychology for prompt (deterministic order)
    psychology_text = ""
    if founder_psychology and isinstance(founder_psychology, dict):
        # Handle empty dict
        if not any(founder_psychology.values()):
            psychology_text = "Not provided"
        else:
            # Define order for deterministic output (matching new schema)
            psychology_parts = []
            
            # Motivation (with other handling)
            motivation = founder_psychology.get("motivation")
            if motivation:
                motivation_text = str(motivation).strip()
                if motivation == "Other":
                    motivation_other = founder_psychology.get("motivation_other")
                    if motivation_other:
                        motivation_text = f"{motivation_text}: {str(motivation_other).strip()}"
                psychology_parts.append(f"Motivation: {motivation_text}")
            
            # Fear / Psychological Barrier (with other handling, support both field names for backward compatibility)
            fear = founder_psychology.get("fear") or founder_psychology.get("biggest_fear")
            if fear:
                fear_text = str(fear).strip()
                if fear == "Other":
                    fear_other = founder_psychology.get("fear_other") or founder_psychology.get("biggest_fear_other")
                    if fear_other:
                        fear_text = f"{fear_text}: {str(fear_other).strip()}"
                psychology_parts.append(f"Biggest Fear / Psychological Barrier: {fear_text}")
            
            # Decision Style
            decision_style = founder_psychology.get("decision_style")
            if decision_style:
                psychology_parts.append(f"Decision-Making Style: {str(decision_style).strip()}")
            
            # Energy Pattern
            energy_pattern = founder_psychology.get("energy_pattern")
            if energy_pattern:
                psychology_parts.append(f"Energy Pattern: {str(energy_pattern).strip()}")
            
            # Consistency Pattern (new field)
            consistency_pattern = founder_psychology.get("consistency_pattern")
            if consistency_pattern:
                psychology_parts.append(f"Consistency Pattern: {str(consistency_pattern).strip()}")
            
            # Risk Approach (new field)
            risk_approach = founder_psychology.get("risk_approach")
            if risk_approach:
                psychology_parts.append(f"Risk Approach: {str(risk_approach).strip()}")
            
            # Success Definition (with other handling, support both field names for backward compatibility)
            success_definition = founder_psychology.get("success_definition")
            if success_definition:
                success_text = str(success_definition).strip()
                if success_definition == "Other":
                    success_other = founder_psychology.get("success_other") or founder_psychology.get("success_definition_other")
                    if success_other:
                        success_text = f"{success_text}: {str(success_other).strip()}"
                psychology_parts.append(f"Success Definition: {success_text}")
            
            # Archetype
            archetype = founder_psychology.get("archetype")
            if archetype:
                psychology_parts.append(f"Archetype: {str(archetype).strip()}")
            
            if psychology_parts:
                psychology_text = "\n".join(psychology_parts)
            else:
                psychology_text = "Not provided"
    else:
        psychology_text = "Not provided"
    
    # Format tool results for prompt (deterministic order)
    tool_results_text = ""
    if tool_results:
        tool_sections = []
        # Sort tool names for deterministic ordering
        sorted_tool_names = sorted(tool_results.keys())
        for tool_name in sorted_tool_names:
            result = tool_results[tool_name]
            # Sanitize result: remove excessive whitespace, clean markdown
            result = _sanitize_tool_result(result)
            tool_display_name = tool_name.replace("_", " ").title()
            tool_sections.append(f"### {tool_display_name} Results\n{result}\n")
        if tool_sections:
            tool_results_text = "\n".join(tool_sections)
    
    # Format domain research for prompt
    domain_research_text = ""
    if domain_research:
        domain_sections = []
        if domain_research.get("market_trends"):
            domain_sections.append(f"### Market Trends\n{domain_research.get('market_trends')}\n")
        if domain_research.get("competitor_overview"):
            domain_sections.append(f"### Competitor Overview\n{domain_research.get('competitor_overview')}\n")
        if domain_research.get("market_size"):
            domain_sections.append(f"### Market Size Estimates\n{domain_research.get('market_size')}\n")
        if domain_sections:
            domain_research_text = "\n".join(domain_sections)
    
    # Format static blocks for prompt (KNOWLEDGE ONLY - not to be copied)
    static_blocks_text = ""
    if static_blocks:
        static_sections = []
        if static_blocks.get("market_trends"):
            static_sections.append(f"### Market Trends (Knowledge Base)\n{static_blocks.get('market_trends')}\n")
        if static_blocks.get("competitors"):
            static_sections.append(f"### Competitor Landscape (Knowledge Base)\n{static_blocks.get('competitors')}\n")
        if static_blocks.get("market_size"):
            static_sections.append(f"### Market Size (Knowledge Base)\n{static_blocks.get('market_size')}\n")
        if static_blocks.get("risks"):
            static_sections.append(f"### Industry Risks (Knowledge Base)\n{static_blocks.get('risks')}\n")
        if static_blocks.get("opportunity_space"):
            static_sections.append(f"### Opportunity Space (Knowledge Base)\n{static_blocks.get('opportunity_space')}\n")
        if static_blocks.get("idea_patterns"):
            static_sections.append(f"### Successful Idea Patterns (Knowledge Base)\n{static_blocks.get('idea_patterns')}\n")
        if static_sections:
            static_blocks_text = "\n".join(static_sections)
    
    prompt = f"""You are a startup advisor helping a founder discover and evaluate startup ideas. Generate a complete analysis in a single response with three distinct sections.

CRITICAL INSTRUCTION - READ CAREFULLY:
DO NOT COPY OR PARAPHRASE static blocks directly. 
Use them as background knowledge only. 
Your output must be rewritten, personalized, and explained in context of the user's goals, work style, strengths, psychology, and constraints.
The static blocks below are for YOUR REFERENCE ONLY - they should inform your analysis but NOT appear verbatim in your response.

USER PROFILE:
- Goal Type: {goal_type}
- Time Commitment: {time_commitment}
- Budget Range: {budget_range}
- Interest Area: {interest_area}
- Sub-Interest Focus: {sub_interest_area}
- Work Style: {work_style}
- Skill Strength: {skill_strength}
- Experience Summary: {experience_summary}

FOUNDER PSYCHOLOGY:
{psychology_text if psychology_text else "Not provided"}

PRE-COMPUTED TOOL RESULTS:
{tool_results_text if tool_results_text else "No tool results provided"}

DOMAIN RESEARCH (Shared Facts):
{domain_research_text if domain_research_text else "No domain research available"}

KNOWLEDGE BLOCKS (Background Information - DO NOT COPY VERBATIM):
{static_blocks_text if static_blocks_text else "No static knowledge blocks available"}

---

YOUR TASK: Generate three complete sections in this EXACT format:

## SECTION 1: PROFILE ANALYSIS

YOU MUST START YOUR RESPONSE WITH EXACTLY THIS LINE (copy it exactly):
## 1. Core Motivation

CRITICAL: Write in second-person ("You") ONLY. Never use "the user" or "their." Write like you're talking directly to the person.

CRITICAL ANALYSIS REQUIREMENT: Do NOT simply repeat what the user told you. You MUST provide insights, reasoning, and analysis. Explain:
- WHY their inputs matter and what they reveal
- WHAT these inputs mean strategically
- HOW different inputs connect and create opportunities or constraints
- WHAT the user might not realize about their own profile
- WHAT patterns or implications emerge from their choices

Your job is to ANALYZE and provide VALUE, not echo back their inputs.

MANDATORY OUTPUT FORMAT - COPY THIS EXACT STRUCTURE:

## 1. Core Motivation

[ANALYZE their goal type and experience summary. Don't just say "You want to {goal_type}". Instead, explain:
- What this goal type reveals about their priorities and mindset
- What underlying motivations drive this choice
- What patterns in their experience summary connect to this goal
- What they might be seeking beyond the surface-level goal
Start with "You're exploring..." or "You want to..." but then add WHY and WHAT THIS MEANS. 3-4 sentences with real insight.]

## 2. Operating Constraints

{operating_constraints_content}

## 3. Opportunity Within {interest_area}

{opportunity_content}

## 4. Strengths You Can Leverage

{strengths_content}

## 5. Skill Gaps to Fill

{skill_gaps_content}

## 6. Recommendations

[Actionable steps in bullet format. Include specific platform/tool choices, concrete project framing, weekly milestones (Week 1: X, Week 2: Y, Week 3: Z, Week 4: W), learning approach, community resources, success metrics as questions.]

## 7. Founder Psychology Summary (INTERNAL - for downstream use)

[Interpret the founder_psychology data and provide structured insights. Include:
- psyche_summary: Brief interpretation of psychological signals
- execution_tendencies: How they likely approach execution based on decision_style, energy_pattern, and consistency_pattern
- risk_reactivity: How they respond to risks based on fear and risk_approach
- confidence_signals: Indicators of confidence level from their inputs
- ideal_work_patterns: Optimal work patterns based on energy_pattern and consistency_pattern
Keep this concise - 2-3 bullet points per field.]

## 8. Clarifications Needed

[3-5 questions. Format as questions, not statements. Example: "Which chatbot niche interests you most?" NOT "It would be helpful to know which chatbot niche..."]

STRICT REQUIREMENTS FOR SECTION 1:
- MANDATORY: You MUST include ALL 8 subsections in this EXACT order:
  1. ## 1. Core Motivation
  2. ## 2. Operating Constraints
  3. ## 3. Opportunity Within {interest_area}
  4. ## 4. Strengths You Can Leverage
  5. ## 5. Skill Gaps to Fill
  6. ## 6. Recommendations
  7. ## 7. Founder Psychology Summary
  8. ## 8. Clarifications Needed
- CRITICAL: Do NOT stop after 3 subsections. You MUST write all 8 subsections completely.
- Total word count: 600-800 words (increased to ensure all sections are included)
- Every sentence uses "You" not "the user" or "they"
- No phrases like "Given the", "It is important", "Additionally", "Furthermore"
- Be specific with tool names, not generic descriptions
- Keep paragraphs short (2-3 sentences max)
- Use markdown headings (##) not numbered lists (1.) or bold (**)
- DO NOT start with "Profile Summary Document" or any other title
- START DIRECTLY WITH: ## 1. Core Motivation
- DO NOT skip any of the 8 subsections - all must be present and complete
- If you run out of space, prioritize completing all 8 subsections over length

---

REMINDER: You MUST complete all 8 subsections in Section 1 before moving to Section 2. Do NOT stop after 3 subsections.

## SECTION 2: IDEA RESEARCH

Based on the user's profile analysis, research and generate at least five (ideally 5-8) innovative startup ideas that:
- Align with the user's goal type: {goal_type}
- Match their stated time commitment: {time_commitment}
- Respect the available budget range: {budget_range}
- Fit the primary interest area: {interest_area} and sub-focus: {sub_interest_area}
- Leverage their primary skill strength: {skill_strength}
- Support the preferred work style: {work_style}
- Build on context from the experience summary: {experience_summary}
- Consider founder psychology factors (use the psychology data provided above)

IMPORTANT STRUCTURE REQUIREMENT:
- Begin your response with the exact heading `### Idea Research Report`
- Follow with a short executive summary paragraph (3-4 sentences)
- Provide a numbered list of **at least five** ideas in the format `1. **Idea Name**` and include detailed subsections for each idea
- Close with a `### Validation Backlog` section containing bullet-point experiments
- If you cannot meet this structure, you must explicitly state why and request another try. Never provide a one-line summary.

IMPORTANT: Tool results have been pre-computed and are available above. Use the provided tool results context instead of calling tools directly. This saves significant time.

For each idea, provide:
- Business concept description and why it suits the intake profile
- Target market and customer segments consistent with their interests and skills
- Revenue model possibilities that respect budget boundaries
- Required resources, team structure, and how the user's strengths/work style map to them
- Time to market estimate based on stated time commitment
- Competitive landscape overview (reference tool outputs above)
- Market size estimation (reference tool outputs above)
- Market trends analysis (reference tool outputs above)
- Validation score and feasibility assessment (reference tool outputs above)
- Key challenges, required partnerships, and execution considerations

EXPECTED OUTPUT FORMAT:
- Heading `### Idea Research Report`
- Executive Summary paragraph (minimum 150 words)
- Numbered ideas section (`1.` through at least `5.`) where each idea contains:
  * **Idea Fit Summary** covering concept and alignment with profile
  * **Market Opportunity** describing segments, sizing, and trends (reference tool outputs)
  * **Revenue Model & Financials** detailing pricing, monetization, cost assumptions
  * **Resource & Skill Mapping** connecting requirements to the user's strengths, work style, and capacity
  * **Timeline & Effort** with realistic milestones respecting time commitment and budget
  * **Risks & Mitigations** leveraging tool insights and noting alignment with their goal type and work style
  * **Immediate Experiments** listing 2-3 validation steps with success metrics
- `### Validation Backlog` section aggregating experiments across ideas
The output should be 600-800 words (concise but complete). Focus on quality over length—avoid summaries or generic statements.

---

## SECTION 3: PERSONALIZED RECOMMENDATIONS

Based on the profile analysis (Section 1) and researched startup ideas (Section 2), create personalized recommendations:
- Rank the top 3 startup ideas that best match the user
- Provide detailed reasoning grounded in all profile inputs and founder_psychology
- Include actionable next steps for each top idea, highlighting how to leverage strengths and cover gaps
- Outline execution timeline and milestones compatible with their availability and budget
- Address potential challenges, capital requirements, and mitigation tactics
- Provide tips for validation, traction tests, and resource allocation
- Ensure that every section (execution, risks, experiments, validation questions, roadmap) contains idea-specific content and does not reuse wording from other ideas unless absolutely necessary; rewrite any repeated phrasing

MANDATORY FORMAT (non-negotiable):
- Start with the heading `### Comprehensive Recommendation Report`
- Add a "Profile Fit Summary" subsection with bullet points translating the profile into insights
- Present a table or bullet comparison showing how each top idea aligns with goals, budget, and risk
- Provide EXACTLY 3 ideas (not 4, not 5, EXACTLY 3) as a numbered list `1.` to `3.` titled **Idea Name** with deep dives
  CRITICAL: You MUST provide EXACTLY 3 ideas, no more, no less. Each idea MUST start with exactly: `1. **Idea Name**`, `2. **Idea Name**`, `3. **Idea Name**` (with number, period, space, bold, then idea name)
  Example: `1. **AI-Powered Customer Support Bot**` NOT `1. AI-Powered Customer Support Bot` (missing bold)
  Example: `**Idea Name**` NOT `1. **Idea Name**` (missing number)
  DO NOT include ideas numbered 4, 5, or higher - stop at 3.
- Include dedicated sections for `### Financial Outlook`, `### Risk Radar`, `### Customer Persona`, `### Validation Questions`, and `### 30/60/90 Day Roadmap`
- CRITICAL: The `### Risk Radar` and `### 30/60/90 Day Roadmap` sections MUST be highly specific to the recommended ideas and user profile. Generic content will be rejected. Each risk must explain HOW it impacts the specific idea given the user's constraints. Each roadmap milestone must be a concrete, actionable step with specific tools/platforms/actions, not vague tasks.
- Close with `### Decision Checklist` summarizing go/no-go signals
- ALWAYS produce EXACTLY 3 ideas (not 4, not 5, EXACTLY 3). These should be the TOP 3 ideas from Section 2, ranked by best fit.

Use founder_psychology and interpreted psyche signals (from Section 1) to:
- Rank ideas based on founder fit (how well each idea matches their psychological profile)
- Personalize tone and narrative (match their decision_style, energy_pattern, motivation)
- Highlight risks based on fears (if fear = "Fear of Failure", emphasize safe validation and quick wins)
- Emphasize strengths and motivations (align recommendations with motivation)
- Adjust execution pacing using energy_pattern and consistency_pattern (if short bursts or variable, break tasks into smaller blocks)
- Tailor roadmap steps using decision_style (if fast: short, crisp, action-heavy; if slow: include checkpoints, reflection tasks)
- Respect risk approach (if conservative, emphasize validation; if high-risk, highlight experimentation opportunities)
- Explain why each idea uniquely fits this founder (connect idea features to psychological profile)

BEHAVIORAL RULES:
- If fear = "Fear of Failure": emphasize safe validation, quick wins, and confidence building
- If decision_style = "Fast / Intuitive": roadmap tasks should be short, crisp, and action-heavy
- If decision_style = "Slow / Analytical": roadmap should include checkpoints, reflection tasks, structured analysis
- If energy_pattern = "Short Bursts" or consistency_pattern = "Highly Variable": break roadmap tasks into smaller, high impact blocks
- If risk_approach = "Conservative": prioritize lean, low-commitment validation tasks early
- If consistency_pattern = "Need External Accountability": emphasize community, mentors, or accountability partners

EXPECTED OUTPUT FORMAT:
- Heading `### Comprehensive Recommendation Report`
- `#### Profile Fit Summary` with at least six bullet points translating inputs
- `#### Recommendation Matrix` comparing the top 3 ideas (EXACTLY 3, not 5) against goal alignment, time, budget, skill fit, and work style
- Numbered ideas `1.` to `3.` (EXACTLY 3 ideas, stop at 3) where each idea covers:
  * **Execution path** with immediate actions, partners, and required skills; include at least one milestone or channel unique to this idea
  * **Financial snapshot** (costs, revenue projections, breakeven) citing tool outputs
  * **Key risks & mitigations** leveraging tool results and tailored to the idea's model and focus
- `### Financial Outlook` summarizing budget fit, revenue projections, and viability scores
- `### Risk Radar` section MUST contain:
  * SPECIFIC risks tied to the actual idea(s) being recommended
  * Risks that consider the user's specific constraints: budget ({budget_range}), time ({time_commitment}), work style ({work_style}), and skill level ({skill_strength})
  * Each risk must be idea-specific and actionable
  * Format: Risk name (Severity: Low/Medium/High): Specific explanation tied to the idea and user profile. Mitigation: Concrete action steps.
- `### Customer Persona` describing demographics, pains, gains, buying triggers (reference tool outputs)
- `### Validation Questions` listing at least eight discovery questions tied to learning goals; questions must mention the idea or audience explicitly
- `### 30/60/90 Day Roadmap` section MUST contain:
  * CONCRETE, ACTIONABLE milestones specific to the recommended idea(s), NOT generic steps
  * Each milestone must reference specific tools, platforms, or actions
  * Milestones must respect the user's time commitment ({time_commitment}) and budget ({budget_range})
  * Format: **Days 0-30**: [Specific action 1], [Specific action 2], [Specific action 3]. Success metric: [Measurable outcome]. **Days 30-60**: [Next phase actions]. **Days 60-90**: [Final phase actions]
- `### Decision Checklist` highlighting signals to move forward or pivot
The report should be 700-900 words (concise but complete). Retain the exact section headings specified. CRITICAL: Include EXACTLY 3 ideas (numbered 1, 2, 3), not 4 or 5.

---

CRITICAL OUTPUT REQUIREMENTS:
1. Generate ALL THREE sections in a single response
2. Use clear section delimiters: "## SECTION 1:", "## SECTION 2:", "## SECTION 3:"
3. Each section must be complete and standalone
4. Maintain exact formatting requirements for each section
5. Use second-person ("You") in Section 1 only
6. Reference pre-computed tool results instead of calling tools
7. Personalize all content based on founder_psychology
8. Ensure backward compatibility - frontend expects these exact section formats

Begin your response now with "## SECTION 1: PROFILE ANALYSIS" followed immediately by "## 1. Core Motivation"

CRITICAL REMINDERS - READ CAREFULLY:
- Section 1 MUST include ALL 8 subsections (## 1. Core Motivation, ## 2. Operating Constraints, ## 3. Opportunity Within {interest_area}, ## 4. Strengths You Can Leverage, ## 5. Skill Gaps to Fill, ## 6. Recommendations, ## 7. Founder Psychology Summary, ## 8. Clarifications Needed). 
- DO NOT stop after 3 subsections. You MUST write all 8 subsections completely.
- Section 3 MUST include EXACTLY 3 ideas (numbered 1, 2, 3). Do not include 4, 5, or more ideas.
- If you run out of tokens, prioritize completing all 8 subsections in Section 1 and all 3 ideas in Section 3 over length.
- Each subsection should be 2-4 sentences or 2-4 bullet points. Be concise but complete.
"""
    
    return prompt

