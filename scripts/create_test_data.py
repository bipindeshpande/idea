"""
Script to create test data for Founder Connect:
- 10 users with password "1234"
- Multiple validations and advisor runs per user
- Founder profiles for all users
- Idea listings from validations/runs
- Connection requests between users
"""
import sys
import os
import json
import uuid
from datetime import datetime, timedelta, date

# Add parent directory to path to import app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api import app
from app.models.database import (
    db, User, UserValidation, UserRun, FounderProfile, IdeaListing, 
    ConnectionRequest, ConnectionStatus, ValidationStatus, utcnow
)

# Test data templates
INDUSTRIES = ["SaaS", "E-commerce", "AI/ML", "Healthcare", "FinTech", "EdTech", "FoodTech", "Real Estate", "Travel", "Fitness"]
STAGES = ["idea", "mvp", "beta", "launched"]
SKILLS = ["Python", "JavaScript", "React", "Node.js", "Marketing", "Sales", "Design", "Product Management", "Data Science", "DevOps"]
COMMITMENT_LEVELS = ["part-time", "full-time", "flexible"]
LOOKING_FOR_OPTIONS = ["Technical co-founder", "Business co-founder", "Marketing partner", "Designer", "Investor"]

USER_NAMES = [
    ("Alice", "Johnson", "alice.johnson@test.com"),
    ("Bob", "Smith", "bob.smith@test.com"),
    ("Charlie", "Brown", "charlie.brown@test.com"),
    ("Diana", "Williams", "diana.williams@test.com"),
    ("Eve", "Davis", "eve.davis@test.com"),
    ("Frank", "Miller", "frank.miller@test.com"),
    ("Grace", "Wilson", "grace.wilson@test.com"),
    ("Henry", "Moore", "henry.moore@test.com"),
    ("Ivy", "Taylor", "ivy.taylor@test.com"),
    ("Jack", "Anderson", "jack.anderson@test.com"),
]

LOCATIONS = [
    "San Francisco, CA",
    "New York, NY",
    "Austin, TX",
    "Seattle, WA",
    "Boston, MA",
    "Los Angeles, CA",
    "Chicago, IL",
    "Denver, CO",
    "Portland, OR",
    "Miami, FL",
]

IDEA_TITLES = [
    "AI-Powered Personal Assistant",
    "Sustainable Food Delivery Platform",
    "Virtual Fitness Coaching App",
    "Blockchain-Based Payment System",
    "Online Learning Marketplace",
    "Smart Home Automation Hub",
    "Healthcare Appointment Scheduler",
    "Real Estate Investment Platform",
    "Travel Planning AI Assistant",
    "Social Media Analytics Tool",
    "E-commerce Personalization Engine",
    "Remote Team Collaboration Platform",
    "Mental Health Support App",
    "Local Event Discovery Platform",
    "Sustainable Fashion Marketplace",
]


def create_users():
    """Create 10 test users."""
    users = []
    user_ids = []
    for i, (first_name, last_name, email) in enumerate(USER_NAMES):
        # Check if user already exists
        existing = User.query.filter_by(email=email).first()
        if existing:
            print(f"User {email} already exists, skipping...")
            users.append(existing)
            user_ids.append(existing.id)
            continue
        
        user = User(
            email=email,
            subscription_type="free" if i < 7 else ("starter" if i < 9 else "pro"),
            payment_status="active",
            subscription_started_at=utcnow() - timedelta(days=30 + i * 5),
            usage_reset_date=(date.today() + timedelta(days=1)),
        )
        user.set_password("1234")
        db.session.add(user)
        users.append(user)
    
    db.session.flush()  # Flush to get IDs without committing
    # Extract IDs while objects are still in session
    user_ids = [u.id for u in users]
    db.session.commit()
    print(f"✓ Created {len(users)} users")
    return user_ids


def create_validations(users):
    """Create 2-4 validations per user."""
    validations = []
    # Get user IDs to avoid session issues
    user_ids = [u.id for u in users] if users else []
    for user_id in user_ids:
        user = User.query.get(user_id)
        if not user:
            continue
        num_validations = 2 + (user.id % 3)  # 2-4 validations per user
        for i in range(num_validations):
            validation_id = f"val_{uuid.uuid4().hex[:12]}"
            industry = INDUSTRIES[user.id % len(INDUSTRIES)]
            stage = STAGES[user.id % len(STAGES)]
            
            validation = UserValidation(
                user_id=user.id,
                validation_id=validation_id,
                category_answers=json.dumps({
                    "industry": industry,
                    "stage": stage,
                    "target_audience": f"Target audience for {industry}",
                    "problem": f"Problem statement for validation {i+1}",
                }),
                idea_explanation=f"This is a {industry} idea at {stage} stage. {IDEA_TITLES[(user.id * 3 + i) % len(IDEA_TITLES)]}",
                validation_result=json.dumps({
                    "overall_score": 7.0 + (user.id % 3) * 0.5,
                    "scores": {
                        "market_opportunity": 7.5,
                        "feasibility": 7.0,
                        "uniqueness": 6.5,
                    },
                    "recommendations": ["Focus on market research", "Develop MVP quickly"],
                }),
                status=ValidationStatus.COMPLETED,
                is_deleted=False,
                created_at=utcnow() - timedelta(days=30 - i * 5),
            )
            db.session.add(validation)
            validations.append(validation)
    
    db.session.commit()
    print(f"✓ Created {len(validations)} validations")
    return validations


def create_runs(users):
    """Create 2-4 advisor runs per user."""
    runs = []
    # Get user IDs to avoid session issues
    user_ids = [u.id for u in users] if users else []
    for user_id in user_ids:
        user = User.query.get(user_id)
        if not user:
            continue
        num_runs = 2 + (user.id % 3)  # 2-4 runs per user
        for i in range(num_runs):
            run_id = f"run_{int((utcnow().timestamp() * 1000) + user.id * 1000 + i)}"
            industry = INDUSTRIES[(user.id + i) % len(INDUSTRIES)]
            stage = STAGES[(user.id + i) % len(STAGES)]
            
            run = UserRun(
                user_id=user.id,
                run_id=run_id,
                inputs=json.dumps({
                    "goal_type": "extra_income" if i % 2 == 0 else "side_project",
                    "industry": industry,
                    "stage": stage,
                    "budget": "low" if i % 2 == 0 else "medium",
                    "time_commitment": COMMITMENT_LEVELS[i % len(COMMITMENT_LEVELS)],
                }),
                reports=json.dumps({
                    "personalized_recommendations": [
                        f"Recommendation 1 for {industry}",
                        f"Recommendation 2 for {stage} stage",
                        f"Recommendation 3 for user {user.id}",
                    ],
                    "market_analysis": f"Market analysis for {industry}",
                    "next_steps": ["Step 1", "Step 2", "Step 3"],
                }),
                status="completed",
                is_deleted=False,
                created_at=utcnow() - timedelta(days=25 - i * 4),
            )
            db.session.add(run)
            runs.append(run)
    
    db.session.commit()
    print(f"✓ Created {len(runs)} advisor runs")
    return runs


def create_founder_profiles(users):
    """Create founder profiles for all users."""
    profiles = []
    # Get user IDs to avoid session issues
    user_ids = [u.id for u in users] if users else []
    for i, user_id in enumerate(user_ids):
        user = User.query.get(user_id)
        if not user:
            continue
        # Check if profile already exists
        existing = FounderProfile.query.filter_by(user_id=user.id).first()
        if existing:
            print(f"Profile for {user.email} already exists, skipping...")
            profiles.append(existing)
            continue
        
        first_name, last_name, _ = USER_NAMES[i]
        user_skills = SKILLS[i % len(SKILLS):(i % len(SKILLS) + 3)]
        industries = [INDUSTRIES[i % len(INDUSTRIES)], INDUSTRIES[(i + 1) % len(INDUSTRIES)]]
        
        profile = FounderProfile(
            user_id=user.id,
            full_name=f"{first_name} {last_name}",
            bio=f"Experienced {user_skills[0]} developer with passion for {industries[0]}. Looking to build something meaningful.",
            location=LOCATIONS[i % len(LOCATIONS)],
            linkedin_url=f"https://linkedin.com/in/{first_name.lower()}-{last_name.lower()}",
            website_url=f"https://{first_name.lower()}{last_name.lower()}.com",
            skills=json.dumps(user_skills),
            primary_skills=json.dumps(user_skills[:2]),
            industries_of_interest=json.dumps(industries),
            looking_for=LOOKING_FOR_OPTIONS[i % len(LOOKING_FOR_OPTIONS)],
            commitment_level=COMMITMENT_LEVELS[i % len(COMMITMENT_LEVELS)],
            is_active=True,
            is_public=True,
            created_at=utcnow() - timedelta(days=20),
        )
        db.session.add(profile)
        profiles.append(profile)
    
    db.session.commit()
    print(f"✓ Created {len(profiles)} founder profiles")
    return profiles


def create_idea_listings(profiles, validations, runs):
    """Create idea listings from validations and runs."""
    listings = []
    # Group validations and runs by user
    validations_by_user = {}
    runs_by_user = {}
    
    for validation in validations:
        if validation.user_id not in validations_by_user:
            validations_by_user[validation.user_id] = []
        validations_by_user[validation.user_id].append(validation)
    
    for run in runs:
        if run.user_id not in runs_by_user:
            runs_by_user[run.user_id] = []
        runs_by_user[run.user_id].append(run)
    
    # Create listings from validations and runs
    for profile in profiles:
        user_id = profile.user_id
        
        # Create 1-2 listings from validations
        if user_id in validations_by_user:
            for i, validation in enumerate(validations_by_user[user_id][:2]):  # Max 2 per user
                category_answers = json.loads(validation.category_answers or "{}")
                industry = category_answers.get("industry", INDUSTRIES[user_id % len(INDUSTRIES)])
                stage = category_answers.get("stage", STAGES[user_id % len(STAGES)])
                
                listing = IdeaListing(
                    founder_profile_id=profile.id,
                    source_type="validation",
                    source_id=validation.id,
                    title=IDEA_TITLES[(user_id * 2 + i) % len(IDEA_TITLES)],
                    industry=industry,
                    stage=stage,
                    skills_needed=json.dumps(SKILLS[user_id % len(SKILLS):(user_id % len(SKILLS) + 2)]),
                    commitment_level=COMMITMENT_LEVELS[user_id % len(COMMITMENT_LEVELS)],
                    brief_description=f"A {stage} stage {industry} idea looking for collaboration.",
                    is_active=True,
                    is_open_for_collaborators=True,
                    created_at=utcnow() - timedelta(days=15 - i * 2),
                )
                db.session.add(listing)
                listings.append(listing)
        
        # Create 1-2 listings from runs
        if user_id in runs_by_user:
            for i, run in enumerate(runs_by_user[user_id][:2]):  # Max 2 per user
                inputs = json.loads(run.inputs or "{}")
                industry = inputs.get("industry", INDUSTRIES[user_id % len(INDUSTRIES)])
                stage = inputs.get("stage", STAGES[user_id % len(STAGES)])
                
                listing = IdeaListing(
                    founder_profile_id=profile.id,
                    source_type="advisor",
                    source_id=run.id,
                    title=IDEA_TITLES[(user_id * 2 + i + 1) % len(IDEA_TITLES)],
                    industry=industry,
                    stage=stage,
                    skills_needed=json.dumps(SKILLS[(user_id + 1) % len(SKILLS):((user_id + 1) % len(SKILLS) + 2)]),
                    commitment_level=COMMITMENT_LEVELS[(user_id + 1) % len(COMMITMENT_LEVELS)],
                    brief_description=f"A {stage} stage {industry} idea discovered through advisor.",
                    is_active=True,
                    is_open_for_collaborators=True,
                    created_at=utcnow() - timedelta(days=12 - i * 2),
                )
                db.session.add(listing)
                listings.append(listing)
    
    db.session.commit()
    print(f"✓ Created {len(listings)} idea listings")
    return listings


def create_connections(profiles, listings):
    """Create connection requests between users."""
    connections = []
    # Create a network: user 0 connects to 1,2,3; user 1 connects to 2,4; etc.
    connection_patterns = [
        (0, [1, 2, 3]),  # User 0 connects to 1, 2, 3
        (1, [2, 4, 5]),  # User 1 connects to 2, 4, 5
        (2, [3, 6]),     # User 2 connects to 3, 6
        (3, [4, 7]),     # User 3 connects to 4, 7
        (4, [5, 8]),     # User 4 connects to 5, 8
        (5, [6, 9]),     # User 5 connects to 6, 9
        (6, [7]),        # User 6 connects to 7
        (7, [8, 9]),     # User 7 connects to 8, 9
    ]
    
    for sender_idx, recipient_indices in connection_patterns:
        if sender_idx >= len(profiles):
            continue
        
        sender_profile = profiles[sender_idx]
        
        for recipient_idx in recipient_indices:
            if recipient_idx >= len(profiles):
                continue
            
            recipient_profile = profiles[recipient_idx]
            
            # Skip self-connections
            if sender_profile.id == recipient_profile.id:
                continue
            
            # Check if connection already exists
            existing = ConnectionRequest.query.filter_by(
                sender_id=sender_profile.id,
                recipient_id=recipient_profile.id
            ).first()
            
            if existing:
                continue
            
            # Find a listing from recipient to connect about
            recipient_listings = [l for l in listings if l.founder_profile_id == recipient_profile.id]
            idea_listing_id = recipient_listings[0].id if recipient_listings else None
            
            # Create connection with different statuses
            status_idx = (sender_idx + recipient_idx) % 3
            if status_idx == 0:
                status = ConnectionStatus.PENDING
                responded_at = None
            elif status_idx == 1:
                status = ConnectionStatus.ACCEPTED
                responded_at = utcnow() - timedelta(days=5)
            else:
                status = ConnectionStatus.DECLINED
                responded_at = utcnow() - timedelta(days=3)
            
            connection = ConnectionRequest(
                sender_id=sender_profile.id,
                recipient_id=recipient_profile.id,
                idea_listing_id=idea_listing_id,
                message=f"Hi! I'm interested in your {recipient_listings[0].title if recipient_listings else 'idea'}. Let's connect!" if status == ConnectionStatus.PENDING else None,
                status=status,
                responded_at=responded_at,
                created_at=utcnow() - timedelta(days=10 - (sender_idx + recipient_idx) % 5),
            )
            db.session.add(connection)
            connections.append(connection)
    
    db.session.commit()
    print(f"✓ Created {len(connections)} connection requests")
    return connections


def main():
    """Main function to create all test data."""
    print("=" * 60)
    print("Creating Founder Connect Test Data")
    print("=" * 60)
    
    with app.app_context():
        # Create users (returns user IDs)
        user_ids = create_users()
        
        # Re-query users to get fresh objects in current session
        users = [User.query.get(uid) for uid in user_ids]
        users = [u for u in users if u]
        
        # Create validations
        validations = create_validations(users)
        
        # Create runs
        runs = create_runs(users)
        
        # Create founder profiles
        profiles = create_founder_profiles(users)
        
        # Create idea listings
        listings = create_idea_listings(profiles, validations, runs)
        
        # Create connections
        connections = create_connections(profiles, listings)
        
        print("=" * 60)
        print("Test Data Creation Complete!")
        print("=" * 60)
        print(f"Users: {len(users)}")
        print(f"Validations: {len(validations)}")
        print(f"Advisor Runs: {len(runs)}")
        print(f"Founder Profiles: {len(profiles)}")
        print(f"Idea Listings: {len(listings)}")
        print(f"Connection Requests: {len(connections)}")
        print("\nAll users have password: 1234")
        print("\nUser emails:")
        # Re-query users to get emails
        for user_id in user_ids:
            user = User.query.get(user_id)
            if user:
                print(f"  - {user.email}")


if __name__ == "__main__":
    main()

