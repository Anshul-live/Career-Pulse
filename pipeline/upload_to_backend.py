import os
import json
import pandas as pd
import requests
import sys

INPUT_DIR = "extracted"
DEFAULT_URL = "http://localhost:8000/gmail/upload-emails"


def load_all_emails():
    emails = []
    
    for filename in os.listdir(INPUT_DIR):
        if not filename.endswith(".csv"):
            continue
        
        filepath = os.path.join(INPUT_DIR, filename)
        df = pd.read_csv(filepath)
        
        for _, row in df.iterrows():
            # Use final_status if available, otherwise fall back to status
            final_status = row.get("final_status") if pd.notna(row.get("final_status")) else row.get("status", "unknown")
            if pd.isna(final_status):
                final_status = "unknown"
            
            email = {
                "message_id": str(row.get("message_id", "")),
                "thread_id": str(row.get("thread_id", "")) if pd.notna(row.get("thread_id")) else None,
                "date": str(row.get("date", "")) if pd.notna(row.get("date")) else None,
                "from": str(row.get("from_email", "")) if pd.notna(row.get("from_email")) else None,
                "job_related": bool(row.get("job_related", False)) if pd.notna(row.get("job_related")) else False,
                "job_confidence": float(row.get("confidence", 0)) if pd.notna(row.get("confidence")) else 0,
                "status": str(final_status).lower().strip(),
                "original_status": str(row.get("original_status")) if pd.notna(row.get("original_status")) else None,
                "status_confidence": float(row.get("confidence", 0)) if pd.notna(row.get("confidence")) else 0,
                "company_name": str(row.get("company_name")) if pd.notna(row.get("company_name")) else None,
                "role": str(row.get("role")) if pd.notna(row.get("role")) else None,
                "role_id": str(row.get("role_id")) if pd.notna(row.get("role_id")) else None,
                "interview_datetime": str(row.get("interview_datetime")) if pd.notna(row.get("interview_datetime")) else None,
                "mode": str(row.get("mode")) if pd.notna(row.get("mode")) else None,
                "platform": str(row.get("platform")) if pd.notna(row.get("platform")) else None,
                "location": str(row.get("location")) if pd.notna(row.get("location")) else None,
                "meeting_link": str(row.get("meeting_link")) if pd.notna(row.get("meeting_link")) else None,
                "deadline_datetime": str(row.get("deadline_datetime")) if pd.notna(row.get("deadline_datetime")) else None,
                "duration": str(row.get("duration")) if pd.notna(row.get("duration")) else None,
                "test_link": str(row.get("test_link")) if pd.notna(row.get("test_link")) else None,
                "compensation": str(row.get("compensation")) if pd.notna(row.get("compensation")) else None,
                "joining_date": str(row.get("joining_date")) if pd.notna(row.get("joining_date")) else None,
            }
            emails.append(email)
    
    return emails


def upload_to_backend(emails, url, token):
    print(f"\nUploading {len(emails)} emails to {url}")
    
    headers = {
        "Content-Type": "application/json"
    }
    
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    try:
        response = requests.post(url, json=emails, headers=headers, timeout=60)
        
        if response.status_code == 200:
            data = response.json()
            print(f"Success: {data.get('message', 'Uploaded')}")
            print(f"   Count: {data.get('count', 0)}")
            return True
        else:
            print(f"Failed: {response.status_code}")
            print(f"   {response.text}")
            return False
    
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to backend. Is it running?")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False


def main():
    token = None
    url = DEFAULT_URL
    
    if len(sys.argv) >= 2:
        token = sys.argv[1]
    if len(sys.argv) >= 3:
        url = sys.argv[2]
    
    if not token:
        token = input("Enter JWT token: ").strip()
    
    emails = load_all_emails()
    
    if not emails:
        print("No emails found in extracted folder")
        sys.exit(1)
    
    print(f"Loaded {len(emails)} emails from {INPUT_DIR}")
    
    # Show status breakdown before upload
    status_counts = {}
    for email in emails:
        status = email.get("status", "unknown")
        status_counts[status] = status_counts.get(status, 0) + 1
    
    print("\nStatus breakdown:")
    for status, count in sorted(status_counts.items()):
        print(f"  {status}: {count}")
    
    # Show corrections if any
    corrections = sum(1 for e in emails if e.get("original_status"))
    if corrections > 0:
        print(f"\n🔄 Status corrections: {corrections}")
    
    success = upload_to_backend(emails, url, token)
    
    if not success:
        sys.exit(1)


if __name__ == "__main__":
    main()
