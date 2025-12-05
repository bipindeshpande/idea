"""API routes package - registers all blueprints."""
from flask import Flask

def register_blueprints(app: Flask):
    """Register all route blueprints with the Flask app."""
    # Check if blueprints are already registered to avoid double registration
    registered_names = [bp.name for bp in app.blueprints.values()]
    
    from app.routes.health import bp as health_bp
    from app.routes.public import bp as public_bp
    from app.routes.auth import bp as auth_bp
    from app.routes.validation import bp as validation_bp
    from app.routes.user import bp as user_bp
    from app.routes.payment import bp as payment_bp
    from app.routes.discovery import bp as discovery_bp
    from app.routes.admin import bp as admin_bp
    from app.routes.resources import bp as resources_bp
    from app.routes.founder import bp as founder_bp
    
    # Only register if not already registered
    if health_bp.name not in registered_names:
        app.register_blueprint(health_bp)
    if public_bp.name not in registered_names:
        app.register_blueprint(public_bp)
    if auth_bp.name not in registered_names:
        app.register_blueprint(auth_bp)
    if validation_bp.name not in registered_names:
        app.register_blueprint(validation_bp)
    if user_bp.name not in registered_names:
        app.register_blueprint(user_bp)
    if payment_bp.name not in registered_names:
        app.register_blueprint(payment_bp)
    if discovery_bp.name not in registered_names:
        app.register_blueprint(discovery_bp)
    if admin_bp.name not in registered_names:
        app.register_blueprint(admin_bp)
    if resources_bp.name not in registered_names:
        app.register_blueprint(resources_bp)
    if founder_bp.name not in registered_names:
        app.register_blueprint(founder_bp)
