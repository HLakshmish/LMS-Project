import subprocess
import os
import time
import signal
import sys
import psutil

def restart_server():
    print("Restarting FastAPI server...")
    
    # Find any running uvicorn processes and terminate them
    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
        if 'uvicorn' in proc.info['name'] or (proc.info['cmdline'] and 'uvicorn' in ' '.join(proc.info['cmdline'])):
            print(f"Terminating existing uvicorn process {proc.info['pid']}")
            try:
                p = psutil.Process(proc.info['pid'])
                p.terminate()
                p.wait(timeout=5)
            except (psutil.NoSuchProcess, psutil.TimeoutExpired, psutil.AccessDenied):
                pass
    
    print("Starting FastAPI server...")
    # Start the server
    try:
        subprocess.Popen(["python", "-m", "uvicorn", "app.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"])
        print("Server started successfully")
    except Exception as e:
        print(f"Error starting server: {str(e)}")

if __name__ == "__main__":
    restart_server() 