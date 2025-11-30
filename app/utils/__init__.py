"""
Utility modules for the application.
"""
from app.utils.json_helpers import safe_json_loads, safe_json_dumps
from app.utils.response_helpers import (
    success_response,
    error_response,
    not_found_response,
    unauthorized_response,
    forbidden_response,
    internal_error_response,
)
from app.utils.serialization import serialize_datetime, serialize_model, serialize_list

# Import from app.utils module (utils.py file, not this package)
# Use a relative import approach
import sys
import os

# Get the parent directory (app/)
parent_dir = os.path.dirname(__file__)
# Import utils.py as a module
import importlib.util
utils_py_path = os.path.join(parent_dir, "..", "utils.py")
utils_py_path = os.path.normpath(utils_py_path)

if os.path.exists(utils_py_path):
    spec = importlib.util.spec_from_file_location("app.utils_module", utils_py_path)
    utils_module = importlib.util.module_from_spec(spec)
    # Add to sys.modules with a unique name to avoid conflicts
    sys.modules['app.utils_module'] = utils_module
    spec.loader.exec_module(utils_module)
    
    # Re-export the needed functions/constants
    PROFILE_FIELDS = utils_module.PROFILE_FIELDS
    read_output_file = utils_module.read_output_file
    create_user_session = utils_module.create_user_session
    get_current_session = utils_module.get_current_session
    require_auth = utils_module.require_auth
    check_admin_auth = utils_module.check_admin_auth
    _validate_discovery_inputs = utils_module._validate_discovery_inputs
else:
    raise ImportError(f"Cannot find utils.py at {utils_py_path}")

__all__ = [
    "safe_json_loads",
    "safe_json_dumps",
    "success_response",
    "error_response",
    "not_found_response",
    "unauthorized_response",
    "forbidden_response",
    "internal_error_response",
    "serialize_datetime",
    "serialize_model",
    "serialize_list",
    "PROFILE_FIELDS",
    "read_output_file",
    "create_user_session",
    "get_current_session",
    "require_auth",
    "check_admin_auth",
    "_validate_discovery_inputs",
]

