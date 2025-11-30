"""
Pytest configuration and fixtures for testing.
"""
import os
import pytest
from flask import Flask
from app.models.database import db, User, Admin, UserSession
from datetime import datetime, timedelta
import secrets
# Import create_user_session - it's in app/utils.py (module, not package)
import sys
import importlib.util
utils_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "app", "utils.py")
spec = importlib.util.spec_from_file_location("app_utils_module", utils_path)
app_utils_module = importlib.util.module_from_spec(spec)
sys.modules['app_utils_module'] = app_utils_module
spec.loader.exec_module(app_utils_module)
create_user_session = app_utils_module.create_user_session

# Set test environment variables before importing app
os.environ["FLASK_ENV"] = "testing"
os.environ["SECRET_KEY"] = "test-secret-key-for-testing-only"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"  # Use in-memory SQLite for tests
os.environ["ADMIN_EMAIL"] = "admin@test.com"
os.environ["ADMIN_PASSWORD"] = "test-admin-password"
os.environ["DEV_MFA_CODE"] = "1234"  # Test MFA code


@pytest.fixture(scope="session")
def app():
    """Create application for testing."""
    # Import here to ensure environment variables are set
    from api import app as flask_app
    
    flask_app.config["TESTING"] = True
    flask_app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    flask_app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    flask_app.config["WTF_CSRF_ENABLED"] = False
    
    with flask_app.app_context():
        db.create_all()
        yield flask_app
        db.drop_all()


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def runner(app):
    """Create test CLI runner."""
    return app.test_cli_runner()


@pytest.fixture
def test_user(app):
    """Create a test user."""
    with app.app_context():
        import uuid
        # Use unique email to avoid conflicts between tests
        unique_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        user = User(
            email=unique_email,
            subscription_type="free",
            payment_status="active",
        )
        user.set_password("test-password")
        db.session.add(user)
        db.session.commit()
        
        # Refresh to get ID
        db.session.refresh(user)
        yield user
        
        # Cleanup - ensure we're in the same session
        try:
            # Re-query to ensure user is in current session
            user_to_delete = User.query.filter_by(id=user.id).first()
            if user_to_delete:
                db.session.delete(user_to_delete)
                db.session.commit()
        except Exception:
            db.session.rollback()


@pytest.fixture
def test_user_session(app, test_user):
    """Create a test user session."""
    with app.app_context():
        import uuid
        # Use unique session token to avoid conflicts
        session_token = f"test_{uuid.uuid4().hex}_{secrets.token_urlsafe(16)}"
        expires_at = datetime.utcnow() + timedelta(days=7)
        session = UserSession(
            user_id=test_user.id,
            session_token=session_token,
            ip_address="127.0.0.1",
            expires_at=expires_at,
        )
        db.session.add(session)
        db.session.commit()
        db.session.refresh(session)
        yield session
        # Cleanup
        try:
            session_to_delete = UserSession.query.filter_by(id=session.id).first()
            if session_to_delete:
                db.session.delete(session_to_delete)
                db.session.commit()
        except Exception:
            db.session.rollback()


@pytest.fixture
def authenticated_client(client, test_user_session):
    """Create an authenticated test client."""
    # Set authorization header instead of cookie (as the app uses header-based auth)
    client.environ_base['HTTP_AUTHORIZATION'] = f'Bearer {test_user_session.session_token}'
    return client


@pytest.fixture
def admin_user(app):
    """Create a test admin user."""
    with app.app_context():
        admin_email = os.environ.get("ADMIN_EMAIL", "admin@test.com")
        admin = Admin.get_or_create_admin(admin_email, "test-admin-password")
        db.session.commit()
        yield admin


@pytest.fixture
def free_trial_user(app):
    """Create a user with free trial subscription."""
    with app.app_context():
        user = User(
            email="trial@example.com",
            subscription_type="free_trial",
            payment_status="trial",
        )
        user.set_password("test-password")
        from datetime import datetime, timedelta
        user.subscription_started_at = datetime.utcnow()
        user.subscription_expires_at = datetime.utcnow() + timedelta(days=3)
        db.session.add(user)
        db.session.commit()
        db.session.refresh(user)
        yield user
        db.session.delete(user)
        db.session.commit()


@pytest.fixture
def paid_user(app):
    """Create a user with paid subscription."""
    with app.app_context():
        user = User(
            email="paid@example.com",
            subscription_type="pro",
            payment_status="active",
        )
        user.set_password("test-password")
        from datetime import datetime, timedelta
        user.subscription_started_at = datetime.utcnow()
        user.subscription_expires_at = datetime.utcnow() + timedelta(days=30)
        db.session.add(user)
        db.session.commit()
        db.session.refresh(user)
        yield user
        db.session.delete(user)
        db.session.commit()

