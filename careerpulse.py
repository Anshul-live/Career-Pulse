#!/usr/bin/env python3
"""
CareerPulse - Unified Startup Script
=====================================
Starts MongoDB, Backend, Frontend, and optionally runs the pipeline.

Usage:
    python careerpulse.py              # Start all services
    python careerpulse.py --pipeline   # Start services + run pipeline
    python careerpulse.py --help       # Show help
"""

import subprocess
import sys
import os
import time
import signal
import argparse
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent
BACKEND_DIR = PROJECT_ROOT / "backend"
FRONTEND_DIR = PROJECT_ROOT / "frontend"
PIPELINE_DIR = PROJECT_ROOT / "pipeline"

processes = []

def run_command(cmd, cwd=None, name="", background=False):
    """Run a command and return the process."""
    print(f"\n{'='*50}")
    print(f"Starting: {name}")
    print(f"{'='*50}")
    
    if background:
        proc = subprocess.Popen(
            cmd,
            cwd=cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )
        processes.append((name, proc))
        return proc
    else:
        return subprocess.run(cmd, cwd=cwd)

def start_mongodb():
    """Start MongoDB if not running."""
    print("\nChecking MongoDB...")
    result = subprocess.run(
        ["brew", "services", "list"],
        capture_output=True,
        text=True
    )
    
    if "mongodb-community" in result.stdout:
        if "started" not in result.stdout or "mongodb-community" not in result.stdout.split("started")[0]:
            print("Starting MongoDB...")
            subprocess.run(["brew", "services", "start", "mongodb-community@7.0"])
            time.sleep(2)
        else:
            print("MongoDB already running")
    else:
        print("MongoDB not found via brew, attempting to start...")
        subprocess.run(["brew", "services", "start", "mongodb-community@7.0"], check=False)
        time.sleep(2)

def start_backend():
    """Start the Express backend server."""
    print("\nStarting Backend server...")
    proc = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=BACKEND_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    processes.append(("Backend", proc))
    
    # Wait for backend to be ready
    print("Waiting for backend to start...")
    for _ in range(30):
        time.sleep(1)
        try:
            import requests
            resp = requests.get("http://localhost:8000", timeout=1)
            print("Backend ready!")
            break
        except:
            continue
    else:
        print("Warning: Backend may not be ready")
    
    return proc

def start_frontend():
    """Start the Vite frontend dev server."""
    print("\nStarting Frontend server...")
    proc = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=FRONTEND_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    processes.append(("Frontend", proc))
    
    # Wait for frontend to be ready
    print("Waiting for frontend to start...")
    for _ in range(30):
        time.sleep(1)
        try:
            import requests
            resp = requests.get("http://localhost:5173", timeout=1)
            print("Frontend ready!")
            break
        except:
            continue
    else:
        print("Warning: Frontend may not be ready")
    
    return proc

def run_pipeline(skip_fetch=False, upload=False, start_date=None, end_date=None):
    """Run the email processing pipeline."""
    print("\nRunning Pipeline...")
    
    cmd = [sys.executable, "pipeline_runner.py"]
    if skip_fetch:
        cmd.append("--skip-fetch")
    if upload:
        cmd.append("--upload")
    if start_date:
        cmd.extend(["--start-date", start_date])
    if end_date:
        cmd.extend(["--end-date", end_date])
    
    result = subprocess.run(cmd, cwd=PIPELINE_DIR)
    return result.returncode == 0

def check_ollama():
    """Check if Ollama is running."""
    try:
        result = subprocess.run(
            ["ollama", "list"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0 and "llama3.1" in result.stdout:
            print("Ollama with llama3.1:8b is ready")
            return True
    except:
        pass
    
    print("Warning: Ollama not running or llama3.1:8b not installed")
    print("  Run: ollama serve")
    print("  Run: ollama pull llama3.1:8b")
    return False

def print_status():
    """Print current service status."""
    print("\n" + "="*50)
    print("CareerPulse Services")
    print("="*50)
    print(f"MongoDB:      http://localhost:27017")
    print(f"Backend API:  http://localhost:8000")
    print(f"Frontend:     http://localhost:5173")
    print("="*50)

def cleanup(signum=None, frame=None):
    """Stop all processes."""
    print("\n\nShutting down...")
    for name, proc in processes:
        print(f"Stopping {name}...")
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
    print("All services stopped.")
    sys.exit(0)

def main():
    parser = argparse.ArgumentParser(description="CareerPulse - Unified Startup")
    parser.add_argument("--pipeline", action="store_true", help="Also run the pipeline")
    parser.add_argument("--skip-fetch", action="store_true", help="Skip fetching emails in pipeline")
    parser.add_argument("--upload", action="store_true", help="Upload results to backend")
    parser.add_argument("--mongo-only", action="store_true", help="Start MongoDB only")
    parser.add_argument("--backend-only", action="store_true", help="Start backend only")
    parser.add_argument("--stop", action="store_true", help="Stop all services")
    parser.add_argument("--start-date", type=str, help="Start date (YYYY-MM-DD) for email fetch")
    parser.add_argument("--end-date", type=str, help="End date (YYYY-MM-DD) for email fetch")
    
    args = parser.parse_args()
    
    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)
    
    # Stop command
    if args.stop:
        print("Stopping all CareerPulse services...")
        # Try to kill processes on common ports
        subprocess.run(["pkill", "-f", "vite"], check=False)
        subprocess.run(["pkill", "-f", "nodemon"], check=False)
        print("Done.")
        return
    
    # MongoDB only
    if args.mongo_only:
        start_mongodb()
        return
    
    # Start services
    start_mongodb()
    check_ollama()
    start_backend()
    start_frontend()
    print_status()
    
    # Run pipeline if requested
    if args.pipeline:
        print("\n" + "="*50)
        print("Running Pipeline")
        print("="*50)
        run_pipeline(
            skip_fetch=args.skip_fetch, 
            upload=args.upload,
            start_date=args.start_date,
            end_date=args.end_date
        )
    
    # Keep running
    print("\nAll services started!")
    print("Press Ctrl+C to stop all services")
    
    try:
        while True:
            time.sleep(1)
            # Check if any process died
            for name, proc in processes:
                if proc.poll() is not None:
                    print(f"\nWarning: {name} process died!")
    except KeyboardInterrupt:
        cleanup()

if __name__ == "__main__":
    main()
