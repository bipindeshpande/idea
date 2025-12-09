# Sample JSON Structures

## 1. Profile Analysis JSON (Stage 1 Output)

**Location:** Generated dynamically by `run_profile_analysis()` in Stage 1  
**Format:** Strict JSON object with 8 required string fields

```json
{
  "core_motivation": "You're driven to build something meaningful while maintaining work-life balance. You want to create value and generate income, but not at the expense of your personal time. Your motivation stems from wanting to prove you can succeed as a founder while staying true to your values.",
  
  "operating_constraints": "You have limited time (10-20 hrs/week), which means you need ideas that can be built incrementally without requiring full-time commitment. Your budget is minimal (Free/Sweat-equity only), so you'll need to bootstrap and use free/low-cost tools. You're working solo, so ideas must be manageable by one person initially. Your analytical/strategic skills are strong, but you may lack deep technical implementation expertise.",
  
  "opportunity_space": "Given your interest in AI / Automation, there are several high-opportunity areas: (1) AI-powered automation tools for small businesses - many SMBs lack technical expertise to implement AI, (2) Vertical AI solutions for specific industries - deeper, more valuable than horizontal tools, (3) AI agent frameworks and no-code AI builders - making AI accessible to non-technical users, (4) AI data infrastructure tools - cleaning, managing, preparing data for AI applications. The Content/Creator Economy also offers opportunities in AI-generated content tools, personalized content platforms, and creator monetization solutions.",
  
  "strengths": "Your analytical and strategic thinking will help you identify market gaps and position your product effectively. Your ability to work solo means faster decision-making and lower overhead. Your interest in emerging technologies (AI) positions you well in a fast-growing market. Your balanced approach to work-life means you'll build sustainable, maintainable solutions rather than burning out.",
  
  "skill_gaps": "Limited technical implementation expertise may slow development of AI-powered features. Limited time means you'll need to prioritize ruthlessly and may struggle with complex technical learning curves. Limited budget means you can't hire help early, so you'll need to learn or use no-code tools. Solo work means you'll need to handle all aspects (product, marketing, customer support) yourself.",
  
  "recommendations": "Focus on no-code/low-code AI tools initially to validate ideas quickly without deep technical implementation. Consider using existing AI APIs (OpenAI, Anthropic) rather than building from scratch. Start with a narrow, specific use case rather than trying to build a comprehensive platform. Use your analytical skills to identify underserved niches where you can provide value quickly.",
  
  "founder_psychology_summary": "You're a balanced builder - motivated but pragmatic, ambitious but realistic about constraints. You value sustainable growth over rapid scaling. You prefer working independently and making decisions quickly. You're comfortable with uncertainty but want to validate ideas before committing too much time or resources.",
  
  "clarifications_needed": "What specific AI/Automation use cases interest you most? Do you have any existing technical skills or are you starting from scratch? Are you open to partnerships or do you prefer to work completely solo? What's your risk tolerance - are you comfortable with unproven ideas or do you prefer more validated opportunities?"
}
```

---

## 2. Static Block JSON

**Location:** `src/startup_idea_crew/static_blocks/{interest_area}.json`  
**Example:** `src/startup_idea_crew/static_blocks/ai_automation.json`

```json
{
  "market_trends": "The AI and automation market is experiencing explosive growth, with global market size projected to reach $1.8 trillion by 2030. Key trends include: (1) Generative AI adoption accelerating across industries, with ChatGPT reaching 100M users in 2 months, (2) Low-code/no-code platforms democratizing automation (Zapier, Make.com, Bubble.io seeing 50%+ YoY growth), (3) Vertical AI solutions gaining traction (healthcare AI, legal AI, finance AI), (4) AI agent frameworks emerging (LangChain, AutoGPT, BabyAGI), (5) Edge AI and on-device processing becoming critical for privacy and latency, (6) AI safety and governance becoming enterprise priorities. The market is shifting from general-purpose AI to specialized, domain-specific solutions that solve concrete business problems.",
  
  "competitors": "The AI/automation space is highly competitive with several categories: (1) Enterprise AI platforms (OpenAI, Anthropic, Google AI) - dominant in foundational models, (2) Automation platforms (Zapier, Make.com, n8n) - workflow automation leaders, (3) Vertical AI solutions (Jasper for marketing, Casetext for legal, Harvey for law) - industry-specific tools, (4) AI development tools (LangChain, LlamaIndex, Pinecone) - developer-focused infrastructure, (5) No-code AI builders (Bubble.io, Adalo, Softr) - citizen developer tools. Key differentiators include: ease of use, integration depth, vertical specialization, pricing model, and data privacy. Most successful products focus on specific use cases rather than trying to be everything to everyone.",
  
  "risks": "Major risks in AI/automation startups include: (1) Technology risk - rapid obsolescence as AI models improve, dependency on third-party APIs (OpenAI, Anthropic), (2) Market risk - crowded space with well-funded competitors, customer acquisition costs rising, (3) Regulatory risk - evolving AI governance (EU AI Act, US AI Executive Order), data privacy requirements (GDPR, CCPA), (4) Execution risk - difficulty finding AI talent, high infrastructure costs for training/inference, (5) Business model risk - customers expecting free/low-cost AI tools, difficulty demonstrating ROI, (6) Data risk - need for quality training data, data privacy concerns, bias and fairness issues. Successful startups mitigate these by: focusing on specific verticals, building defensible data moats, creating strong user experiences, and establishing clear compliance frameworks.",
  
  "market_size": "The global AI market is valued at $150B in 2024 and projected to reach $1.8T by 2030 (CAGR 37%). Key segments: (1) AI software ($50B) - largest segment, growing 40% YoY, (2) AI services ($30B) - consulting and implementation, (3) AI hardware ($20B) - GPUs, specialized chips, (4) Automation software ($25B) - RPA and workflow automation. The addressable market for vertical AI solutions is $200B+, with SMB segment ($50B) being underserved. Geographic distribution: North America (40%), Europe (25%), Asia-Pacific (30%). Growth drivers: enterprise digital transformation, cost reduction pressures, productivity gains, and competitive necessity.",
  
  "opportunity_space": "Significant opportunities exist in: (1) Vertical AI solutions - industry-specific tools with deep domain knowledge (legal AI, healthcare AI, finance AI), (2) AI agent platforms - tools that enable businesses to deploy AI agents for customer service, sales, operations, (3) AI-powered workflow automation - beyond simple integrations, intelligent automation that learns and adapts, (4) AI development tools - making it easier for non-technical users to build AI applications, (5) AI data infrastructure - tools for managing, cleaning, and preparing data for AI, (6) AI safety and governance - tools for ensuring AI systems are fair, transparent, and compliant. The biggest gap is in tools that combine ease of use with powerful capabilities, targeting non-technical users who want AI but don't want to code.",
  
  "idea_patterns": "Successful AI/automation startup patterns include: (1) Vertical specialization - pick one industry and go deep (e.g., legal AI, healthcare AI), (2) Workflow-first approach - solve a specific workflow problem, not just add AI features, (3) Data moat strategy - build proprietary datasets or fine-tuned models that improve with usage, (4) Integration-heavy - connect to existing tools (Slack, Notion, Salesforce) rather than replacing them, (5) Freemium model - free tier to acquire users, paid tier for power users, (6) Community-driven - build developer/user communities around the product, (7) API-first - make the product accessible via API for developers to build on top. The most successful startups start with a narrow focus, achieve product-market fit, then expand horizontally."
}
```

---

## 3. Domain Research JSON

**Location:** `app/data/domain_research/{normalized_interest_area}.json`  
**Example:** `app/data/domain_research/ai___automation.json`

```json
{
  "market_trends": "MARKET RESEARCH SUMMARY: AI / Automation\n============================================================\n\nMarket Segment: AI / Automation\n\nCurrent Market Trends (specific to AI / Automation):\n- Generative AI adoption accelerating across industries\n- Low-code/no-code platforms democratizing automation\n- Vertical AI solutions gaining traction\n- AI agent frameworks emerging\n- Edge AI and on-device processing becoming critical\n\nMarket Opportunities (specific to AI / Automation):\n1. Vertical AI solutions for specific industries\n2. AI agent platforms for business automation\n3. AI-powered workflow automation tools\n4. AI development tools for non-technical users\n\nMarket Challenges (specific to AI / Automation):\n- Rapid technology obsolescence\n- High competition and customer acquisition costs\n- Regulatory compliance requirements\n- Difficulty finding AI talent\n\nRECOMMENDATION: Focus on vertical specialization with deep domain knowledge...",
  
  "competitor_overview": "COMPETITIVE ANALYSIS: AI / Automation\n============================================================\n\nIndustry: AI / Automation\n\nDirect Competitors (ACTUAL companies/products):\n\n1. OpenAI:\n   - Product/Service: GPT-4, ChatGPT, API access\n   - Strengths: Leading foundational models, strong brand\n   - Weaknesses: Generic, requires technical expertise\n   - Pricing: Usage-based API pricing\n   - Market Position: Infrastructure provider\n\n2. Zapier:\n   - Product/Service: Workflow automation platform\n   - Strengths: Massive integration library, easy to use\n   - Weaknesses: Limited AI capabilities, can be expensive\n   - Pricing: Free tier + paid plans starting at $19.99/month\n   - Market Position: Workflow automation leader\n\n...",
  
  "market_size": "MARKET SIZE ESTIMATION: AI / Automation\n============================================================\n\nTarget Audience: Businesses and developers\n\nMarket Size Breakdown:\n\n1. TAM (Total Addressable Market):\n   - Global market size: $150 billion\n   - Market Definition: Total AI software and services market\n   - Represents: Total revenue opportunity if 100% market share achieved\n\n2. SAM (Serviceable Addressable Market):\n   - Realistic target market: $50 billion\n   - Geographic Scope: North America and Europe\n   - Customer Segments: SMBs and startups\n   - Represents: Portion of TAM that can realistically be served\n\n3. SOM (Serviceable Obtainable Market):\n   - Realistic first-year target: $2-5 million\n   - Market Share Assumption: 0.01% of SAM\n   - Timeline: First 1-3 years\n   - Represents: Realistic market share that can be captured initially\n\nMarket Growth Rate:\n- Estimated CAGR: 37% annually\n- Growth Drivers: Enterprise digital transformation, productivity gains\n- Market Timing: Excellent - early growth phase...",
  
  "risks": "...",
  
  "opportunity_space": "..."
}
```

---

## 4. Idea Research JSON (Stage 2 Output)

**Location:** Generated dynamically by `run_idea_research()` in Stage 2  
**Format:** Strict JSON object with 2 required fields

```json
{
  "idea_research_report": "# Startup Ideas Research Report\n\n## Market Analysis\n\nBased on the current market trends in AI / Automation, several high-opportunity areas have been identified:\n\n### Opportunity 1: AI-Powered Customer Support Agent Builder\n- Market Size: $5B+ (customer support automation)\n- Competition: Intercom, Zendesk (established players, but limited AI customization)\n- Differentiation: No-code builder that lets businesses create custom AI agents\n- Target: SMBs wanting AI support but lacking technical expertise\n\n### Opportunity 2: Vertical AI for Legal Document Review\n- Market Size: $2B+ (legal tech automation)\n- Competition: Casetext, Harvey (well-funded, but enterprise-focused)\n- Differentiation: Affordable, easy-to-use solution for small law firms\n- Target: Solo practitioners and small law firms\n\n### Opportunity 3: AI Workflow Automation for Content Creators\n- Market Size: $500M+ (creator economy tools)\n- Competition: Canva, Adobe (design-focused, limited automation)\n- Differentiation: AI that automates content planning, scheduling, and repurposing\n- Target: Content creators and social media managers\n\n## Key Insights\n\n- Focus on vertical specialization over horizontal platforms\n- No-code/low-code approach is critical for non-technical users\n- Integration with existing tools (Slack, Notion, etc.) is essential\n- Freemium model works well for acquisition\n- Community-building drives organic growth",
  
  "personalized_recommendations": "# Personalized Startup Ideas for You\n\nBased on your profile (10-20 hrs/week, minimal budget, solo work, analytical skills), here are 3 startup ideas tailored to your situation:\n\n## 1. **No-Code AI Agent Builder for Small Businesses**\n\n**Why This Fits:**\n- Can be built using existing AI APIs (OpenAI, Anthropic) - no need for deep ML expertise\n- No-code approach means you can validate quickly without extensive development\n- Targets SMBs (underserved segment with $50B+ market)\n- Solo-friendly: Start with simple use cases, expand based on feedback\n\n**How to Start:**\n- Week 1-2: Build MVP using Zapier/Make.com + OpenAI API for one specific use case (e.g., customer support chatbot)\n- Week 3-4: Get 5-10 beta customers to validate\n- Month 2-3: Iterate based on feedback, add 2-3 more use cases\n- Month 4+: Consider raising seed funding or bootstrap if profitable\n\n**Revenue Model:**\n- Freemium: Free for basic agents, $29/month for advanced features\n- Target: 1000 paying customers = $29K MRR = $348K ARR\n\n**Key Risks & Mitigation:**\n- Risk: Competition from established players\n  Mitigation: Focus on specific vertical (e.g., real estate, healthcare) for deeper expertise\n- Risk: API costs at scale\n  Mitigation: Optimize prompts, use caching, pass costs to customers\n\n## 2. **AI Content Repurposing Tool for Creators**\n\n**Why This Fits:**\n- Can be built using AI APIs (content generation, summarization)\n- Targets growing creator economy ($104B market)\n- Minimal upfront investment - validate with manual process first\n- Solo-friendly: Start as a service, productize later\n\n**How to Start:**\n- Week 1: Offer manual content repurposing service to 5 creators\n- Week 2-4: Build basic automation using existing tools (ChatGPT, Canva API)\n- Month 2: Launch beta product with 20-30 creators\n- Month 3+: Scale with subscription model\n\n**Revenue Model:**\n- $19/month for individuals, $99/month for agencies\n- Target: 500 paying users = $9.5K MRR = $114K ARR\n\n**Key Risks & Mitigation:**\n- Risk: Content quality concerns\n  Mitigation: Human-in-the-loop review process, focus on specific content types\n- Risk: Platform dependency (YouTube, TikTok policy changes)\n  Mitigation: Multi-platform support, focus on evergreen content formats\n\n## 3. **Vertical AI Assistant for Real Estate Agents**\n\n**Why This Fits:**\n- Real estate is underserved by AI tools (most focus on enterprise)\n- Solo agents need affordable solutions\n- Can start with simple use cases (email responses, document analysis)\n- Build data moat through usage (property data, agent preferences)\n\n**How to Start:**\n- Week 1-2: Interview 10 real estate agents to identify pain points\n- Week 3-4: Build MVP for one specific problem (e.g., automated email responses to leads)\n- Month 2: Launch with 5-10 agents, iterate based on feedback\n- Month 3+: Add more features (document analysis, property matching)\n\n**Revenue Model:**\n- $49/month per agent, $299/month for teams\n- Target: 200 paying agents = $9.8K MRR = $117.6K ARR\n\n**Key Risks & Mitigation:**\n- Risk: Compliance requirements (real estate regulations)\n  Mitigation: Partner with real estate attorney, focus on non-regulated features first\n- Risk: Slow sales cycle (agents are cautious)\n  Mitigation: Free trial, showcase ROI with case studies"
}
```

---

## Summary

| JSON Type | Location | Generated/Static | Purpose |
|-----------|----------|------------------|---------|
| **Profile Analysis** | Generated dynamically | Generated | Stage 1 output - user's profile analysis |
| **Static Blocks** | `src/startup_idea_crew/static_blocks/` | Static files | Pre-computed knowledge blocks for interest areas |
| **Domain Research** | `app/data/domain_research/` | Generated/Cached | Tool results cached by interest area |
| **Idea Research** | Generated dynamically | Generated | Stage 2 output - idea research + recommendations |

