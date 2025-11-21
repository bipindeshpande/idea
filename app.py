"""Main entry point for Flask application."""
import os
import sys

# Fix Unicode encoding issues on Windows
if sys.platform == "win32":
    # Set UTF-8 encoding for stdout/stderr
    if sys.stdout.encoding != "utf-8":
        sys.stdout.reconfigure(encoding="utf-8")
    if sys.stderr.encoding != "utf-8":
        sys.stderr.reconfigure(encoding="utf-8")
    # Set environment variable for subprocesses
    os.environ["PYTHONIOENCODING"] = "utf-8"

# Import api.py which has all the routes and creates the Flask app
# This is the main entry point until routes are fully split into blueprints
import api

# Use the app from api.py
app = api.app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=True)

