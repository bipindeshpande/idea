"""
Error tracking setup for production monitoring.
Supports Sentry (recommended) or can be extended for other services.
"""
import os
from typing import Optional

def init_error_tracking(app) -> Optional[object]:
    """
    Initialize error tracking service (Sentry).
    Returns the Sentry client if initialized, None otherwise.
    
    In development, this is optional and won't fail if not configured.
    In production, it's recommended but won't crash the app if not configured.
    """
    flask_env = os.environ.get("FLASK_ENV", "").lower()
    is_production = flask_env == "production"
    
    # Get Sentry DSN from environment
    sentry_dsn = os.environ.get("SENTRY_DSN")
    
    if not sentry_dsn:
        if is_production:
            app.logger.warning("SENTRY_DSN not configured - error tracking disabled")
        else:
            app.logger.info("SENTRY_DSN not set - error tracking disabled (optional in development)")
        return None
    
    try:
        import sentry_sdk
        from sentry_sdk.integrations.flask import FlaskIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
        
        # Configure Sentry
        sentry_sdk.init(
            dsn=sentry_dsn,
            integrations=[
                FlaskIntegration(transaction_style='endpoint'),
                SqlalchemyIntegration(),
            ],
            # Set traces_sample_rate to 1.0 to capture 100% of transactions for performance monitoring
            # In production, you may want to reduce this to 0.1 or 0.2
            traces_sample_rate=1.0 if not is_production else 0.1,
            # Set profiles_sample_rate to profile 100% of sampled transactions
            # In production, set to 0.0 to disable profiling
            profiles_sample_rate=1.0 if not is_production else 0.0,
            # Environment
            environment="production" if is_production else "development",
            # Release version (set via environment variable)
            release=os.environ.get("APP_VERSION", "unknown"),
            # Only send errors in production, or if explicitly enabled in dev
            before_send=lambda event, hint: None if (not is_production and not os.environ.get("SENTRY_ENABLE_DEV")) else event,
        )
        
        app.logger.info("Sentry error tracking initialized")
        return sentry_sdk
        
    except ImportError:
        app.logger.warning("sentry-sdk not installed - install with: pip install sentry-sdk")
        return None
    except Exception as e:
        app.logger.error(f"Failed to initialize Sentry: {e}")
        return None

