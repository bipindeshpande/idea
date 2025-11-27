"""API routes package - registers all blueprints."""
from flask import Flask

def register_blueprints(app: Flask):
    """Register all route blueprints with the Flask app."""
    from app.routes.health import bp as health_bp
    from app.routes.public import bp as public_bp
    from app.routes.auth import bp as auth_bp
    from app.routes.validation import bp as validation_bp
    from app.routes.user import bp as user_bp
    from app.routes.payment import bp as payment_bp
    from app.routes.discovery import bp as discovery_bp
    from app.routes.admin import bp as admin_bp
    
    app.register_blueprint(health_bp)
    app.register_blueprint(public_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(validation_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(payment_bp)
    app.register_blueprint(discovery_bp)
    app.register_blueprint(admin_bp)
