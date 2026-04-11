import base64
import csv
import os
import re
import sys
import argparse
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
from email.utils import parsedate_to_datetime

from pymongo import MongoClient
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]

def get_user_tokens(user_id, mongo_uri="mongodb://localhost:27017", db_name="careerpulse"):
    """Fetch user's Gmail tokens from MongoDB"""
    client = MongoClient(mongo_uri)
    db = client[db_name]
    user = db.users.find_one({"_id": user_id})
    client.close()
    
    if not user:
        raise ValueError(f"User {user_id} not found")
    
    if not user.get("googleAccessToken"):
        raise ValueError("User has not connected Gmail")
    
    return {
        "access_token": user["googleAccessToken"],
        "refresh_token": user.get("googleRefreshToken"),
        "expiry": user.get("googleTokenExpiry")
    }

def authenticate_with_tokens(tokens):
    """Create credentials from stored tokens"""
    creds = Credentials(
        token=tokens["access_token"],
        refresh_token=tokens.get("refresh_token"),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
        scopes=SCOPES
    )
    
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        update_user_tokens(tokens["access_token"], creds.token)
    
    return creds

def update_user_tokens(old_access_token, new_access_token, mongo_uri="mongodb://localhost:27017", db_name="careerpulse"):
    """Update user's access token in MongoDB"""
    client = MongoClient(mongo_uri)
    db = client[db_name]
    db.users.update_one(
        {"googleAccessToken": old_access_token},
        {"$set": {"googleAccessToken": new_access_token, "googleTokenExpiry": datetime.utcnow()}}
    )
    client.close()

def html_to_text(html):
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "noscript", "header", "footer"]):
        tag.decompose()
    text = soup.get_text(separator="\n")
    text = re.sub(r"\n\s*\n+", "\n\n", text)
    return text.strip()

def extract_body(payload):
    if "parts" in payload:
        for part in payload["parts"]:
            mime = part.get("mimeType")
            data = part.get("body", {}).get("data")
            if not data:
                continue
            decoded = base64.urlsafe_b64decode(data).decode("utf-8", errors="ignore")
            if mime == "text/plain":
                return decoded.strip()
            if mime == "text/html":
                return html_to_text(decoded)
    
    data = payload.get("body", {}).get("data")
    if data:
        decoded = base64.urlsafe_b64decode(data).decode("utf-8", errors="ignore")
        return html_to_text(decoded)
    return ""

def fetch_emails_for_user(user_id, output_file="emails.csv", max_results=500, cutoff_days=30):
    """Fetch emails for a specific user from their Gmail"""
    print(f"[Fetch] Getting tokens for user: {user_id}")
    tokens = get_user_tokens(user_id)
    
    print(f"[Fetch] Authenticating with stored tokens...")
    creds = authenticate_with_tokens(tokens)
    
    print(f"[Fetch] Building Gmail service...")
    service = build("gmail", "v1", credentials=creds)
    
    cutoff_date = datetime.now() - timedelta(days=cutoff_days)
    query = f"after:{cutoff_date.strftime('%Y/%m/%d')} (subject:job OR subject:interview OR subject:offer OR subject:application OR subject:assessment OR subject:coding OR subject:hire OR subject:position)"
    
    print(f"[Fetch] Query: {query}")
    
    response = service.users().messages().list(
        userId="me", 
        q=query, 
        maxResults=max_results
    ).execute()
    
    messages = response.get("messages", [])
    print(f"[Fetch] Found {len(messages)} job-related emails")
    
    with open(output_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["message_id", "thread_id", "date", "from", "subject", "body"])
        
        for msg in messages:
            try:
                message = service.users().messages().get(
                    userId="me", 
                    id=msg["id"], 
                    format="full"
                ).execute()
                
                headers = message["payload"].get("headers", [])
                subject = sender = date = ""
                
                for h in headers:
                    name = h["name"].lower()
                    if name == "subject":
                        subject = h["value"]
                    elif name == "from":
                        sender = h["value"]
                    elif name == "date":
                        date = h["value"]
                
                body = extract_body(message["payload"])
                
                writer.writerow([message["id"], message["threadId"], date, sender, subject, body])
            except Exception as e:
                print(f"[Fetch] Error fetching message {msg['id']}: {e}")
    
    print(f"[Fetch] Saved {len(messages)} emails to {output_file}")
    print(f"total:{len(messages)}")
    return len(messages)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fetch emails from user's Gmail")
    parser.add_argument("user_id", help="MongoDB user ID")
    parser.add_argument("--output", type=str, default="emails.csv", help="Output CSV file")
    parser.add_argument("--max", type=int, default=500, help="Max results")
    parser.add_argument("--days", type=int, default=30, help="Days to look back")
    
    args = parser.parse_args()
    
    try:
        count = fetch_emails_for_user(args.user_id, args.output, args.max, args.days)
        print(f"[Fetch] Done! Fetched {count} emails")
    except Exception as e:
        print(f"[Fetch] ERROR: {e}")
        sys.exit(1)
