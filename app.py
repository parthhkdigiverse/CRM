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
    
    # Start ngrok tunnel
    try:
        from pyngrok import ngrok
        print("Starting ngrok tunnel...")
        
        # Check for authtoken in environment
        authtoken = os.getenv("NGROK_AUTHTOKEN")
        if authtoken:
            ngrok.set_auth_token(authtoken)
            
        tunnel = ngrok.connect(frontend_port, "http")
        print("="*50)
        print(f"🌟 CRM is live on the internet at: {tunnel.public_url}")
        print("="*50)
    except ImportError:
        print("pyngrok not installed. Run 'pip install pyngrok' to expose the CRM to the internet.")
    except Exception as e:
        print(f"Failed to start ngrok: {e}")
    
    try:
        backend_process.wait()
        frontend_process.wait()
    except KeyboardInterrupt:
        print("\nShutting down servers...")
        backend_process.terminate()
        frontend_process.terminate()

if __name__ == "__main__":
    main()
