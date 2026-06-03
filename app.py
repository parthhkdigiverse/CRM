import os
import subprocess
import sys
from dotenv import load_dotenv

def main():
    load_dotenv()
    frontend_port = os.getenv("FRONTEND_PORT", "5173")
    backend_port = os.getenv("BACKEND_PORT", "8000")
    
    print(f"Starting Backend on port {backend_port}...")
    backend_env = os.environ.copy()
    backend_env["PORT"] = backend_port
    
    # Try to find a virtual environment python executable
    base_dir = os.path.dirname(os.path.abspath(__file__))
    venv_python = sys.executable
    possible_venvs = [
        os.path.join(base_dir, ".venv", "Scripts", "python.exe"),
        os.path.join(base_dir, "backend", "venv", "Scripts", "python.exe"),
        os.path.join(base_dir, ".venv", "bin", "python"),
        os.path.join(base_dir, "backend", "venv", "bin", "python"),
    ]
    for path in possible_venvs:
        if os.path.exists(path):
            venv_python = path
            break
            
    print(f"Using Python executable: {venv_python}")
    backend_process = subprocess.Popen(
        [venv_python, "main.py"], 
        cwd="backend", 
        env=backend_env
    )
    
    print(f"Starting Frontend on port {frontend_port}...")
    frontend_process = subprocess.Popen(
        ["npm", "run", "dev", "--", "--port", frontend_port], 
        cwd="frontend",
        shell=True
    )
    
    try:
        backend_process.wait()
        frontend_process.wait()
    except KeyboardInterrupt:
        print("\nShutting down servers...")
        backend_process.terminate()
        frontend_process.terminate()

if __name__ == "__main__":
    main()
