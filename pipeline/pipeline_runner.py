"""
Job Email Pipeline Runner
=========================

This pipeline processes job application emails through multiple stages:

1. fetch_emails.py    - Fetch emails from Gmail (requires credentials.json)
2. type_classifier.py - Classify emails as job-related or not
3. stage_classifier.py - Classify job emails by status (applied, interview, etc.)
4. extract.py         - Extract structured data using Ollama LLM + status validation
5. convert_to_json.py - Convert to JSON for upload
6. upload_to_backend.py - Upload to backend (optional)

Requirements:
    - Ollama running (for extract.py)
    - credentials.json for fetch_emails.py (if fetching from Gmail)
    - Backend running for lastFetchDate tracking

Usage:
    python pipeline_runner.py [--skip-fetch] [--upload]

Options:
    --skip-fetch   Skip fetching emails (use existing emails.csv)
    --upload       Upload to backend after conversion
    --clean        Clean intermediate files after completion
    --token        JWT token for backend upload
    --backend      Backend URL (default: http://localhost:8000)
"""

import subprocess
import sys
import os
import shutil
import argparse
import requests
import webbrowser
import time
import threading
import http.server
import socketserver
import json
from datetime import datetime
from urllib.parse import urlparse, parse_qs
from collections import defaultdict


BACKEND_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:5173"
TOKEN_FILE = ".token"
LOCAL_SERVER_PORT = 8765

# Performance tracking
PERFORMANCE = {"stages": [], "totals": {}}


def log_stage(stage_name, count, duration, details=None):
    """Log performance for a stage."""
    PERFORMANCE["stages"].append(
        {
            "stage": stage_name,
            "count": count,
            "duration_seconds": round(duration, 2),
            "details": details or {},
        }
    )


def print_performance_table():
    """Print a formatted performance table."""
    print("\n" + "=" * 80)
    print("PIPELINE PERFORMANCE ANALYSIS")
    print("=" * 80)

    # Stage table
    print(f"\n{'Stage':<25} {'Count':<10} {'Duration':<12} {'Notes'}")
    print("-" * 80)

    for stage in PERFORMANCE["stages"]:
        notes = ""
        if stage["details"]:
            notes = ", ".join([f"{k}: {v}" for k, v in stage["details"].items()])
        print(
            f"{stage['stage']:<25} {stage['count']:<10} {stage['duration_seconds']:<12}s {notes}"
        )

    # Summary
    total_duration = sum(s["duration_seconds"] for s in PERFORMANCE["stages"])
    total_input = PERFORMANCE["stages"][0]["count"] if PERFORMANCE["stages"] else 0
    total_output = PERFORMANCE["stages"][-1]["count"] if PERFORMANCE["stages"] else 0

    print("\n" + "-" * 80)
    print(f"{'SUMMARY':<25}")
    print("-" * 80)
    print(f"Total Duration:     {total_duration:.2f} seconds")
    print(f"Initial Emails:     {total_input}")
    print(f"Final Records:      {total_output}")

    if total_input > 0:
        print(
            f"Processing Rate:    {total_output / total_input * 100:.1f}% success rate"
        )

    print("=" * 80 + "\n")


class TokenHandler(http.server.SimpleHTTPRequestHandler):
    """Simple handler to receive token from browser."""

    def do_GET(self):
        """Handle GET request with token in query params."""
        parsed = urlparse(self.path)
        if parsed.path == "/token":
            params = parse_qs(parsed.query)
            if "token" in params:
                token = params["token"][0]
                with open(TOKEN_FILE, "w") as f:
                    f.write(token)
                self.send_response(200)
                self.send_header("Content-type", "text/html")
                self.end_headers()
                self.wfile.write(b"""
                    <html>
                        <body style="font-family: Arial; text-align: center; padding: 50px;">
                            <h2 style="color: green;">Token received!</h2>
                            <p>You can close this window and return to the terminal.</p>
                            <script>setTimeout(() => window.close(), 2000)</script>
                        </body>
                    </html>
                """)
                print(f"Token saved to {TOKEN_FILE}")
                self.server.should_stop = True
                return

        self.send_response(200)
        self.send_header("Content-type", "text/html")
        self.end_headers()
        self.wfile.write(b"""
            <html>
                <body style="font-family: Arial; text-align: center; padding: 50px;">
                    <h2>Waiting for login...</h2>
                    <p>Please complete login in the other window.</p>
                </body>
            </html>
        """)

    def log_message(self, format, *args):
        """Suppress log messages."""
        pass


def start_token_server():
    """Start local server to receive token."""
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", LOCAL_SERVER_PORT), TokenHandler) as httpd:
        print(f"Token server running on http://localhost:{LOCAL_SERVER_PORT}")
        httpd.handle_request()


def open_login_and_get_token():
    """Open login page and wait for token."""
    server_thread = threading.Thread(target=start_token_server, daemon=True)
    server_thread.start()
    time.sleep(1)

    login_url = f"{FRONTEND_URL}/login"

    print("\n" + "=" * 50)
    print("Login Required")
    print("=" * 50)
    print(f"\n1. Opening: {login_url}")
    print("2. Click 'Sign in with Google'")
    print("3. Complete Google OAuth login")
    print("4. Wait for redirect to dashboard\n")

    webbrowser.open(login_url)

    timeout = 120
    start_time = time.time()

    while time.time() - start_time < timeout:
        if os.path.exists(TOKEN_FILE):
            with open(TOKEN_FILE, "r") as f:
                token = f.read().strip()
            if token:
                print(f"Token received!")
                return token
        time.sleep(2)

    print("Timeout waiting for token.")
    print("Please run: python pipeline_runner.py --upload --token YOUR_TOKEN")
    return None


def save_token(token):
    """Save token to file."""
    with open(TOKEN_FILE, "w") as f:
        f.write(token)
    print(f"Token saved to {TOKEN_FILE}")


def load_token():
    """Load token from file."""
    if os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE, "r") as f:
            return f.read().strip()
    return None


def run(cmd, required=True, stage_name="", details=None):
    """Run a command and track performance."""
    start_time = time.time()

    print(f"\n{'=' * 50}")
    print(f"Running: {' '.join(cmd)}")
    print(f"{'=' * 50}")

    result = subprocess.run(cmd, capture_output=True, text=True)

    duration = time.time() - start_time

    # Try to extract count from output
    count = 0
    output = result.stdout + result.stderr

    # Common patterns for counting
    import re

    # Map stage names to preferred metric keys
    preferred_keys = {
        "Type Classification": "job_related",
        "Stage Classification": "total",
        "Feature Extraction": "total",
        "Convert to JSON": "total",
    }
    preferred_key = preferred_keys.get(stage_name, "total")

    # Pattern 0: "=== METRICS ===" format (custom scripts)
    in_metrics = False
    metrics_dict = {}

    for line in output.split("\n"):
        line_stripped = line.strip()
        if line_stripped == "=== METRICS ===":
            in_metrics = True
            continue
        if line_stripped == "==============":
            in_metrics = False
            continue
        if in_metrics and ":" in line_stripped:
            key, val = line_stripped.split(":", 1)
            metrics_dict[key] = val.strip()
            print(f"  {line_stripped}")

    # Use preferred key if available, otherwise total, otherwise fall back
    if preferred_key and preferred_key in metrics_dict:
        try:
            count = int(metrics_dict[preferred_key])
        except:
            pass

    if count == 0 and "total" in metrics_dict:
        try:
            count = int(metrics_dict["total"])
        except:
            pass

    # Pattern 1: "✓ status: N" (old format)
    if count == 0:
        for line in output.split("\n"):
            match = re.search(r"✓\s*\w+:\s*(\d+)", line)
            if match:
                count = int(match.group(1))

    # Pattern 2: "Saved X emails" or "X emails"
    if count == 0:
        for line in output.split("\n"):
            if "emails" in line.lower():
                nums = re.findall(r"\d+", line)
                if nums:
                    count = int(nums[0])

    # Pattern 3: "Saved X"
    if count == 0 and "Saved" in output:
        match = re.search(r"Saved\s+(\d+)", output, re.IGNORECASE)
        if match:
            count = int(match.group(1))

    if result.returncode != 0:
        print(f"Failed: {' '.join(cmd)}")
        if required:
            sys.exit(1)
        return False, 0

    print(f"Success ({duration:.1f}s)")
    log_stage(stage_name, count, duration, details)
    return True, count


def get_last_fetch_date(token):
    """Get last fetch date from backend."""
    try:
        response = requests.get(
            f"{BACKEND_URL}/gmail/last-fetch",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        if response.status_code == 200:
            data = response.json()
            return data.get("lastFetchDate")
    except Exception as e:
        print(f"Could not get last fetch date: {e}")
    return None


def update_last_fetch_date(token, date=None):
    """Update last fetch date in backend."""
    try:
        response = requests.post(
            f"{BACKEND_URL}/gmail/last-fetch",
            json={"lastFetchDate": date.isoformat() if date else None},
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        if response.status_code == 200:
            date_str = date.strftime("%Y-%m-%d") if date else "now"
            print(f"Updated last fetch date: {date_str}")
            return True
    except Exception as e:
        print(f"Could not update last fetch date: {e}")
    return False


def cleanup_intermediate():
    """Remove intermediate files to save space."""
    print("\nCleaning up intermediate files...")

    dirs_to_clean = ["status_outputs"]
    files_to_clean = ["job_emails.csv", "non_job_emails.csv"]

    for d in dirs_to_clean:
        if os.path.exists(d):
            shutil.rmtree(d)
            print(f"  Removed directory: {d}/")

    for f in files_to_clean:
        if os.path.exists(f):
            os.remove(f)
            print(f"  Removed file: {f}")

    print("  Done!")


def main():
    parser = argparse.ArgumentParser(description="Job Email Pipeline")
    parser.add_argument(
        "--skip-fetch", action="store_true", help="Skip fetching emails"
    )
    parser.add_argument(
        "--upload", action="store_true", help="Upload to backend after conversion"
    )
    parser.add_argument(
        "--clean", action="store_true", help="Clean intermediate files after completion"
    )
    parser.add_argument(
        "--token", type=str, default=None, help="JWT token for backend upload"
    )
    parser.add_argument(
        "--backend", type=str, default="http://localhost:8000", help="Backend URL"
    )
    parser.add_argument(
        "--force-fetch",
        action="store_true",
        help="Force fetch all emails (ignore last fetch date)",
    )
    parser.add_argument("--login", action="store_true", help="Force new login")
    parser.add_argument(
        "--start-date", type=str, default=None, help="Start date (YYYY-MM-DD) for fetching emails"
    )
    parser.add_argument(
        "--end-date", type=str, default=None, help="End date (YYYY-MM-DD) for fetching emails"
    )

    args = parser.parse_args()
    global BACKEND_URL
    BACKEND_URL = args.backend

    print("Job Email Processing Pipeline")
    print("=" * 50)
    print("Using Ollama for extraction + status validation")

    # Get token
    token = args.token
    if not token:
        token = load_token()

    if args.upload and (not token or args.login):
        token = open_login_and_get_token()

    # Validate token works
    if args.upload and token:
        try:
            response = requests.get(
                f"{BACKEND_URL}/gmail/emails",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10,
            )
            if response.status_code == 401:
                print("Token expired or invalid.")
                token = open_login_and_get_token()
        except Exception as e:
            print(f"Could not validate token: {e}")

    cutoff_date = None
    total_fetched = 0

    # Step 1: Fetch emails
    if not args.skip_fetch:
        fetch_cmd = ["python3", "fetch_emails.py"]
        
        # Determine date range
        start_date = None
        end_date = None
        
        if args.start_date:
            start_date = args.start_date
            fetch_cmd.extend(["--start-date", start_date])
        elif token and not args.force_fetch:
            last_fetch = get_last_fetch_date(token)
            if last_fetch:
                cutoff_date = datetime.fromisoformat(last_fetch.replace("Z", "+00:00"))
                print(f"Last fetch: {cutoff_date.strftime('%Y-%m-%d')}")
                start_date = cutoff_date.strftime("%Y-%m-%d")
                fetch_cmd.extend(["--cutoff", start_date])
            else:
                print("No previous fetch found, will fetch last 30 days")
        elif args.force_fetch:
            print("Force fetch enabled, will fetch last 30 days")
        
        if args.end_date:
            end_date = args.end_date
            fetch_cmd.extend(["--end-date", end_date])
        
        details = {}
        if start_date:
            details["start_date"] = start_date
        if end_date:
            details["end_date"] = end_date
        if not details:
            details["period"] = "30 days"
        
        success, count = run(fetch_cmd, stage_name="Fetch Emails", details=details)
        total_fetched = count

        if os.path.exists("my_emails.csv"):
            if os.path.exists("emails.csv"):
                os.remove("emails.csv")
            os.rename("my_emails.csv", "emails.csv")
            print("  Renamed my_emails.csv -> emails.csv")
    else:
        print("\nSkipping fetch_emails.py")
        log_stage("Fetch Emails", 0, 0, {"skipped": True})

    # Step 2: Type classification
    success, count = run(
        ["python3", "type_classifier.py"],
        stage_name="Type Classification",
        details={"threshold": 0.5},
    )

    # Step 3: Stage classification
    success, count = run(
        ["python3", "stage_classifier.py"], stage_name="Stage Classification"
    )

    # Step 4: Feature extraction
    success, count = run(["python3", "extract.py"],
    stage_name="Feature Extraction (LLM)",
    details={"model": "llama3.1:8b"})

    # Step 5: Convert to JSON
    success, count = run(
        ["python3", "convert_to_json.py"], stage_name="Convert to JSON"
    )

    final_count = count

    # Step 6: Upload to backend
    if args.upload:
        if not token:
            token = open_login_and_get_token()

        if token:
            success, upload_count = run(
                ["python3", "upload_to_backend.py", token],
                stage_name="Upload to Backend",
            )

            # Update last fetch date
            update_last_fetch_date(token, datetime.now())

            log_stage("Update Last Fetch", 1, 0, {"action": "timestamp"})
        else:
            print("No token provided, skipping upload")

    # Cleanup
    if args.clean:
        cleanup_intermediate()

    # Print performance table
    print_performance_table()

    print("Pipeline completed successfully!")

    if os.path.exists("extracted.json"):
        with open("extracted.json") as f:
            data = json.load(f)

        status_counts = defaultdict(int)
        for record in data:
            status = record.get("status", "unknown")
            status_counts[status] += 1

        print("Status breakdown:")
        for status, count in sorted(status_counts.items()):
            print(f"  {status}: {count}")


if __name__ == "__main__":
    main()
