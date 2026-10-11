"""CarePilot AI — Root API Entry Point
Exports the FastAPI application from carepilot-backend.
Allows running:
    uvicorn main:app --reload --port 8000 (from project root)
    or python main.py
"""
import os
import sys
from pathlib import Path

# Ensure carepilot-backend is on python import path
root_dir = Path(__file__).resolve().parent
backend_dir = root_dir / "carepilot-backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Import main application from carepilot-backend
from app.main import app  # noqa: E402, F401

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
