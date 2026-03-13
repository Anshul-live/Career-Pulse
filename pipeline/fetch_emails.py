import base64
import csv
import os.path
import re
import sys
import argparse
from datetime import datetime, timedelta
from bs4 import BeautifulSoup

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]


def authenticate():
    creds = None

    if os.path.exists("token.json"):
        creds = Credentials.from_authorized_user_file("token.json", SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file("credentials.json", SCOPES)
            creds = flow.run_local_server(port=0)

        with open("token.json", "w") as token:
            token.write(creds.to_json())

    return creds


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


def parse_date_to_rfc(date_str):
    """Parse email date to timestamp for comparison."""
    from email.utils import parsedate_to_datetime
    try:
        dt = parsedate_to_datetime(date_str)
        return dt
    except:
        return None


def fetch_emails_to_csv(output_file="my_emails.csv", max_results=500, cutoff_date=None, start_date=None, end_date=None):
    creds = authenticate()
    service = build("gmail", "v1", credentials=creds)

    query_parts = []
    
    if start_date:
        query_parts.append(f"after:{start_date.strftime('%Y/%m/%d')}")
    elif cutoff_date:
        query_parts.append(f"after:{cutoff_date.strftime('%Y/%m/%d')}")
    else:
        query_parts.append("newer_than:30d")
    
    if end_date:
        query_parts.append(f"before:{end_date.strftime('%Y/%m/%d')}")
    
    if query_parts:
        query = " ".join(query_parts)
        print(f"Query: {query}")
    else:
        query = "newer_than:30d"
        print("No date filters provided, fetching last 30 days")

    response = (
        service.users()
        .messages()
        .list(userId="me", q=query, maxResults=max_results)
        .execute()
    )

    messages = response.get("messages", [])
    print(f"Found {len(messages)} messages")

    with open(output_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["message_id", "thread_id", "date", "from", "subject", "body"])

        for msg in messages:
            message = (
                service.users()
                .messages()
                .get(userId="me", id=msg["id"], format="full")
                .execute()
            )

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

            writer.writerow(
                [message["id"], message["threadId"], date, sender, subject, body]
            )

    print(f"Saved {len(messages)} emails to {output_file}")
    print(f"\n=== METRICS ===")
    print(f"total:{len(messages)}")
    print(f"==============")
    return len(messages)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fetch emails from Gmail")
    parser.add_argument("--cutoff", type=str, help="Cutoff date (YYYY-MM-DD) - fetch after this date")
    parser.add_argument("--start-date", type=str, help="Start date (YYYY-MM-DD) - fetch after this date")
    parser.add_argument("--end-date", type=str, help="End date (YYYY-MM-DD) - fetch before this date")
    parser.add_argument("--output", type=str, default="my_emails.csv", help="Output CSV file")
    parser.add_argument("--max", type=int, default=500, help="Max results")
    
    args = parser.parse_args()
    
    cutoff_date = None
    start_date = None
    end_date = None
    
    if args.cutoff:
        cutoff_date = datetime.strptime(args.cutoff, "%Y-%m-%d")
    
    if args.start_date:
        start_date = datetime.strptime(args.start_date, "%Y-%m-%d")
    
    if args.end_date:
        end_date = datetime.strptime(args.end_date, "%Y-%m-%d")
    
    count = fetch_emails_to_csv(args.output, args.max, cutoff_date, start_date, end_date)
    print(f"Done! Fetched {count} emails")
