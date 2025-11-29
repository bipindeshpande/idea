"""
Customer Analysis Tools for Startup Idea Crew
Tools for customer persona generation and analysis
"""

from crewai.tools import tool


@tool("Customer Persona Generator")
def generate_customer_persona(startup_idea: str, target_market: str = "") -> str:
    """
    Generate detailed customer personas for a startup idea.
    
    Args:
        startup_idea: Description of the startup idea (required)
        target_market: Target market or customer segment (optional, can be empty)
    
    Returns:
        Detailed customer persona profiles
    """
    # Ensure startup_idea is a string
    if isinstance(startup_idea, dict):
        startup_idea = str(startup_idea)
    startup_idea = str(startup_idea).strip()
    
    # Handle empty string for optional parameter
    if not target_market or (isinstance(target_market, str) and target_market.strip() == ""):
        target_market = "To be defined"
    else:
        target_market = str(target_market).strip()
    
    persona_report = f"""
    CUSTOMER PERSONA ANALYSIS
    {'=' * 60}
    
    Startup Idea: {startup_idea}
    Target Market: {target_market}
    
    Primary Customer Persona:
    
    Demographics:
    - Age: 25-45 (primary), 18-24 (secondary)
    - Location: Urban/Suburban areas
    - Education: College-educated or higher
    - Income: Middle to upper-middle class
    - Occupation: Professionals, entrepreneurs, or tech-savvy individuals
    
    Psychographics:
    - Values: Innovation, efficiency, quality, convenience
    - Interests: Technology, entrepreneurship, personal development
    - Lifestyle: Busy, value time, seek solutions
    - Attitudes: Early adopters, open to new solutions
    
    Pain Points:
    1. Current solutions are inadequate or expensive
    2. Lack of time to manage complex processes
    3. Need for personalized experiences
    4. Frustration with existing options
    5. Desire for better integration and automation
    
    Goals & Motivations:
    - Save time and increase efficiency
    - Achieve better results
    - Access to innovative solutions
    - Cost savings
    - Improved user experience
    
    Behavior Patterns:
    - Research extensively before purchasing
    - Read reviews and testimonials
    - Prefer trying before committing
    - Value transparency and clear communication
    - Active on social media and online communities
    
    Preferred Channels:
    - Online research (Google, social media)
    - Word of mouth and referrals
    - Content marketing (blogs, videos)
    - Email marketing
    - Social media advertising
    
    Buying Process:
    1. Awareness: Discovers problem or solution
    2. Research: Compares options and reads reviews
    3. Consideration: Evaluates features and pricing
    4. Trial: Tests product/service
    5. Decision: Makes purchase decision
    6. Advocacy: Shares experience if satisfied
    
    Secondary Personas:
    
    Persona 2: Enterprise/B2B Customer
    - Larger organizations or businesses
    - Decision-makers (CTO, VP, Manager)
    - Focus on ROI and scalability
    - Longer sales cycle
    - Higher contract values
    
    Persona 3: Price-Conscious Customer
    - Budget-aware individuals
    - Seek value and discounts
    - Compare prices extensively
    - May start with free/low-cost options
    - Upgrade potential exists
    
    Customer Journey Mapping:
    
    Stage 1: Awareness
    - Discovers need or solution
    - Channels: Social media, content, ads
    - Touchpoints: Blog posts, videos, ads
    
    Stage 2: Consideration
    - Researches options
    - Channels: Website, reviews, comparisons
    - Touchpoints: Landing pages, case studies
    
    Stage 3: Trial/Evaluation
    - Tests product or service
    - Channels: Website, app, demo
    - Touchpoints: Free trial, demo, onboarding
    
    Stage 4: Purchase
    - Makes buying decision
    - Channels: Website, sales team
    - Touchpoints: Pricing page, checkout, contract
    
    Stage 5: Retention
    - Uses product regularly
    - Channels: Product, email, support
    - Touchpoints: Product updates, support, community
    
    Recommendations:
    1. Create content targeting primary persona's pain points
    2. Develop clear value proposition for each persona
    3. Optimize customer journey for each stage
    4. Build community around your solution
    5. Implement referral programs
    6. Provide excellent customer support
    
    RECOMMENDATION: Use these personas to guide product development, 
    marketing strategies, and customer acquisition efforts. Validate 
    personas through customer interviews and adjust as you learn more.
    """
    
    return persona_report.strip()


@tool("Customer Validation Questions")
def generate_validation_questions(startup_idea: str) -> str:
    """
    Generate customer validation questions for a startup idea.
    
    Args:
        startup_idea: Description of the startup idea
    
    Returns:
        List of validation questions to ask potential customers
    """
    
    questions = f"""
    CUSTOMER VALIDATION QUESTIONS
    {'=' * 60}
    
    Startup Idea: {startup_idea}
    
    Problem Validation Questions:
    
    1. Problem Recognition:
       - "Have you experienced [specific problem]?"
       - "How often does this problem occur?"
       - "What do you currently do to solve this problem?"
       - "How much does this problem cost you (time/money/frustration)?"
    
    2. Current Solution:
       - "What solutions are you currently using?"
       - "What do you like about current solutions?"
       - "What frustrates you about current solutions?"
       - "What's missing from current solutions?"
    
    3. Willingness to Pay:
       - "Would you pay for a solution to this problem?"
       - "How much would you be willing to pay?"
       - "What pricing model would you prefer?"
       - "What would make this a must-have vs nice-to-have?"
    
    4. Product Fit:
       - "Does [solution concept] solve your problem?"
       - "What features would be essential?"
       - "What features would be nice-to-have?"
       - "What would prevent you from using this?"
    
    5. Adoption:
       - "How quickly would you adopt this solution?"
       - "What would need to happen for you to try it?"
       - "Who else would need to approve this?"
       - "What concerns do you have?"
    
    Validation Interview Script:
    
    Opening (5 min):
    - Thank them for their time
    - Explain you're researching a solution
    - Ask permission to ask questions
    - Emphasize there are no right/wrong answers
    
    Problem Discovery (15 min):
    - Ask about their current situation
    - Explore pain points in depth
    - Understand current solutions
    - Identify gaps and frustrations
    
    Solution Validation (10 min):
    - Present your idea concept
    - Ask for honest feedback
    - Explore what would make it valuable
    - Identify potential objections
    
    Closing (5 min):
    - Ask if they'd be interested in updates
    - Request referrals to others with similar problems
    - Thank them for their time
    
    Red Flags to Watch For:
    - "That's interesting" (not committed)
    - "Maybe I would" (uncertain)
    - "I don't have time" (low priority)
    - No specific examples or stories
    
    Green Flags:
    - Emotional responses to problem
    - Specific examples and stories
    - "I need this now" or "When can I get it?"
    - Willingness to pay
    - Offers to introduce you to others
    
    How Many Interviews?
    - Minimum: 10-15 interviews
    - Ideal: 20-30 interviews
    - Stop when you see patterns repeating
    - Focus on quality over quantity
    
    RECOMMENDATION: Conduct at least 10-15 customer interviews before 
    building your product. Listen carefully and be ready to pivot based 
    on what you learn. The goal is to validate the problem, not sell your solution.
    """
    
    return questions.strip()

