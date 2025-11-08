from crewai import Agent, Crew, Process, Task
from crewai.project import CrewBase, agent, crew, task
from crewai.agents.agent_builder.base_agent import BaseAgent
from typing import List

# Import custom tools
from startup_idea_crew.tools import (
    # Market Research Tools
    research_market_trends,
    analyze_competitors,
    estimate_market_size,
    # Validation Tools
    validate_startup_idea,
    check_domain_availability,
    assess_startup_risks,
    # Financial Tools
    estimate_startup_costs,
    project_revenue,
    check_financial_viability,
    # Customer Tools
    generate_customer_persona,
    generate_validation_questions,
)


@CrewBase
class StartupIdeaCrew():
    """Startup Idea Crew - AI-powered startup idea recommendation platform"""

    agents: List[BaseAgent]
    tasks: List[Task]

    @agent
    def profile_analyzer(self) -> Agent:
        return Agent(
            config=self.agents_config['profile_analyzer'], # type: ignore[index]
            verbose=True,
            allow_delegation=False,
            # Profile analyzer doesn't need tools - it just analyzes user input
            # Customer tools will be used later by other agents
        )

    @agent
    def idea_researcher(self) -> Agent:
        return Agent(
            config=self.agents_config['idea_researcher'], # type: ignore[index]
            verbose=True,
            allow_delegation=False,
            tools=[
                research_market_trends,
                analyze_competitors,
                estimate_market_size,
                validate_startup_idea,
            ]
        )

    @agent
    def recommendation_advisor(self) -> Agent:
        return Agent(
            config=self.agents_config['recommendation_advisor'], # type: ignore[index]
            verbose=True,
            allow_delegation=False,
            tools=[
                assess_startup_risks,
                estimate_startup_costs,
                project_revenue,
                check_financial_viability,
                check_domain_availability,
                generate_customer_persona,  # Now available for recommendation task
                generate_validation_questions,  # Available for validation strategies
            ]
        )

    @task
    def profile_analysis_task(self) -> Task:
        return Task(
            config=self.tasks_config['profile_analysis_task'], # type: ignore[index]
            output_file='output/profile_analysis.md'
        )

    @task
    def idea_research_task(self) -> Task:
        return Task(
            config=self.tasks_config['idea_research_task'], # type: ignore[index]
            output_file='output/startup_ideas_research.md',
            context=[self.profile_analysis_task()]  # This task depends on profile analysis
        )

    @task
    def recommendation_task(self) -> Task:
        return Task(
            config=self.tasks_config['recommendation_task'], # type: ignore[index]
            output_file='output/personalized_recommendations.md',
            context=[self.profile_analysis_task(), self.idea_research_task()]  # Depends on both previous tasks
        )

    @crew
    def crew(self) -> Crew:
        """Creates the Startup Idea Crew"""
        return Crew(
            agents=self.agents,  # Automatically created by the @agent decorator
            tasks=self.tasks,    # Automatically created by the @task decorator
            process=Process.sequential,  # Tasks run in sequence
            verbose=True,
        )

