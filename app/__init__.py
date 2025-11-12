"""
App package initialization
Exports the FastAPI app for deployment compatibility
"""
import sys
import traceback

try:
    print("Attempting to import app from main module...", file=sys.stderr)
    from .main import app
    print("Successfully imported app:", type(app), file=sys.stderr)
except Exception as e:
    print(f"Failed to import app: {e}", file=sys.stderr)
    print("Traceback:", file=sys.stderr)
    traceback.print_exc(file=sys.stderr)
    
    # Try alternative import
    try:
        print("Trying alternative import...", file=sys.stderr)
        import app.main
        app = app.main.app
        print("Alternative import successful:", type(app), file=sys.stderr)
    except Exception as e2:
        print(f"Alternative import also failed: {e2}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        raise e

__all__ = ["app"]