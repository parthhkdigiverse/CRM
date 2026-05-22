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
    backend_process = subprocess.Popen(
        [sys.executable, "main.py"], 
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
