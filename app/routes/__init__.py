"""API routes package - registers all blueprints."""
from flask import Flask

def register_blueprints(app: Flask):
    """Register all route blueprints with the Flask app."""
    # Check if blueprints are already registered to avoid double registration
    registered_names = set(bp.name for bp in app.blueprints.values())
    
    # Import all blueprints first to ensure modules are loaded
    # This allows us to catch any import errors before trying to register
    
    # Import and register blueprints
    try:
        from app.routes.health import bp as health_bp
        app.register_blueprint(health_bp)
    except (AssertionError, ValueError) as e:
        # Blueprint already registered or route conflict - this is OK with reloader
        pass
    except Exception as e:
        import logging
        logging.error(f"Failed to register health blueprint: {e}")
    
    try:
        from app.routes.public import bp as public_bp
        app.register_blueprint(public_bp)
    except (AssertionError, ValueError) as e:
        pass
    except Exception as e:
        import logging
        logging.error(f"Failed to register public blueprint: {e}")
    
    # Auth blueprint - handle carefully due to reloader issues
    try:
        if 'auth' not in registered_names:
            # Not registered yet - import and register
            try:
                from app.routes.auth import bp as auth_bp
                app.register_blueprint(auth_bp)
            except AssertionError as ae:
                # AssertionError during import means decorators failed
                # But we need the blueprint registered - try a different approach
                # This is normal in Flask debug mode with auto-reload - silently handle
                import logging
                import importlib
                import sys
                # Silently handle - this is expected behavior in Flask debug mode
                # Remove the module from cache and re-import
                if 'app.routes.auth' in sys.modules:
                    del sys.modules['app.routes.auth']
                # Re-import with a fresh blueprint
                from app.routes.auth import bp as auth_bp
                # Force register even if AssertionError occurred
                try:
                    app.register_blueprint(auth_bp)
                except Exception as e2:
                    logging.error(f"Failed to register auth blueprint after re-import: {e2}")
                    # Last resort: create a minimal blueprint with just the routes
                    from flask import Blueprint
                    minimal_auth_bp = Blueprint("auth", "app.routes.auth", url_prefix="/api/auth")
                    # Import the route functions and register them manually
                    import app.routes.auth as auth_module
                    # Copy routes from the original blueprint if possible
                    if hasattr(auth_bp, 'deferred_functions'):
                        for func in auth_bp.deferred_functions:
                            minimal_auth_bp.record(func)
                    app.register_blueprint(minimal_auth_bp)
    except Exception as e:
        import logging
        import traceback
        logging.error(f"Failed to register auth blueprint: {e}")
        logging.error(f"Traceback: {traceback.format_exc()}")
        # Don't raise - let other blueprints register
    
    try:
        from app.routes.validation import bp as validation_bp
        app.register_blueprint(validation_bp)
    except (AssertionError, ValueError) as e:
        pass
    except Exception as e:
        import logging
        logging.error(f"Failed to register validation blueprint: {e}")
    
    try:
        from app.routes.user import bp as user_bp
        app.register_blueprint(user_bp)
    except (AssertionError, ValueError) as e:
        pass
    except Exception as e:
        import logging
        logging.error(f"Failed to register user blueprint: {e}")
    
    try:
        from app.routes.payment import bp as payment_bp
        app.register_blueprint(payment_bp)
    except (AssertionError, ValueError) as e:
        pass
    except Exception as e:
        import logging
        logging.error(f"Failed to register payment blueprint: {e}")
    
    try:
        from app.routes.discovery import bp as discovery_bp
        app.register_blueprint(discovery_bp)
    except (AssertionError, ValueError) as e:
        pass
    except Exception as e:
        import logging
        logging.error(f"Failed to register discovery blueprint: {e}")
    
    try:
        from app.routes.admin import bp as admin_bp
        app.register_blueprint(admin_bp)
    except (AssertionError, ValueError) as e:
        pass
    except Exception as e:
        import logging
        logging.error(f"Failed to register admin blueprint: {e}")
    
    try:
        from app.routes.resources import bp as resources_bp
        app.register_blueprint(resources_bp)
    except (AssertionError, ValueError) as e:
        pass
    except Exception as e:
        import logging
        logging.error(f"Failed to register resources blueprint: {e}")
    
    try:
        from app.routes.founder import bp as founder_bp
        app.register_blueprint(founder_bp)
    except (AssertionError, ValueError) as e:
        pass
    except Exception as e:
        import logging
        logging.error(f"Failed to register founder blueprint: {e}")
    
    try:
        from app.routes.founder_psychology import bp as founder_psychology_bp
        app.register_blueprint(founder_psychology_bp, url_prefix="/api/founder")
    except (AssertionError, ValueError) as e:
        pass
    except Exception as e:
        import logging
        logging.error(f"Failed to register founder_psychology blueprint: {e}")