import pandas as pd
import joblib
import json
import os
import sys
import re
from datetime import datetime, timedelta
from dotenv import load_dotenv
from pymongo import MongoClient
from bson import ObjectId
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Load pipeline .env (for GEMINI_API_KEY)
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]

MODEL_FILE = "job_email_classifier.joblib"
TEMPLATES_FILE = "phrases.json"

SUBJECT_WEIGHT = 0.7
BODY_WEIGHT = 0.3
BASE_THRESHOLD = 0.10
THRESHOLD = 0.25

BACKOFF_RULES = {
    "interview": {"keywords": {"interview", "call", "discussion", "meeting", "connect", "scheduled", "slot"}, "min_hits": 1},
    "assessment": {"keywords": {"test", "assessment", "assignment", "challenge", "task", "coding"}, "min_hits": 1},
    "applied": {"keywords": {"application", "profile", "resume", "submission", "applied", "consideration"}, "min_hits": 1},
    "opportunities": {"keywords": {"hiring", "opportunity", "fresher", "placement", "vacancy", "openings", "recruitment", "campus", "apply", "eligible", "drive", "job fair", "positions"}, "min_hits": 2}
}

def get_user_tokens(user_id, mongo_uri="mongodb://localhost:27017", db_name="college_project"):
    client = MongoClient(mongo_uri)
    db = client[db_name]
    try:
        user = db.users.find_one({"_id": ObjectId(user_id)})
    except:
        user = db.users.find_one({"_id": user_id})
    client.close()
    if not user:
        raise ValueError(f"User {user_id} not found")
    if not user.get("googleAccessToken"):
        raise ValueError("User has not connected Gmail")
    return user

def update_user_tokens(user_id, new_access_token, mongo_uri="mongodb://localhost:27017", db_name="college_project"):
    client = MongoClient(mongo_uri)
    db = client[db_name]
    try:
        user_oid = ObjectId(user_id)
    except:
        user_oid = user_id
    db.users.update_one(
        {"_id": user_oid},
        {"$set": {"googleAccessToken": new_access_token, "googleTokenExpiry": datetime.utcnow()}}
    )
    client.close()

def load_templates():
    with open(TEMPLATES_FILE, "r") as f:
        return json.load(f)

def backoff_classify(text):
    tokens = set(text.lower().split())
    for label, rule in BACKOFF_RULES.items():
        if len(tokens & rule["keywords"]) >= rule["min_hits"]:
            return label
    return "unknown"

def classify_job_emails(df, model):
    df["subject"] = df["subject"].fillna("")
    df["body"] = df["body"].fillna("")
    df["text"] = "[SUBJECT] " + df["subject"] + " [BODY] " + df["body"]
    probs = model.predict_proba(df["text"])[:, 1]
    df["confidence"] = probs.round(4)
    df["job_related"] = (probs >= THRESHOLD).astype(int)
    return df[df["job_related"] == 1].copy()

def classify_status(df, templates):
    df["subject"] = df["subject"].fillna("")
    df["body"] = df["body"].fillna("")
    
    template_texts, template_status, template_weight = [], [], []
    for status, phrases in templates.items():
        for p in phrases:
            template_texts.append(p)
            template_status.append(status)
            template_weight.append(min(len(p.split()) / 4, 1.5))
    
    vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), min_df=1)
    subj_tfidf = vectorizer.fit_transform(df["subject"].tolist() + template_texts)
    body_tfidf = vectorizer.fit_transform(df["body"].tolist() + template_texts)
    
    subj_email = subj_tfidf[:len(df)]
    subj_template = subj_tfidf[len(df):]
    body_email = body_tfidf[:len(df)]
    body_template = body_tfidf[len(df):]
    
    sim_matrix = SUBJECT_WEIGHT * cosine_similarity(subj_email, subj_template) + \
                 BODY_WEIGHT * cosine_similarity(body_email, body_template)
    
    final_status, final_confidence = [], []
    for idx, sim_row in enumerate(sim_matrix):
        status_best = {}
        for score, status, weight in zip(sim_row, template_status, template_weight):
            weighted_score = score * weight
            if status not in status_best or weighted_score > status_best[status]:
                status_best[status] = weighted_score
        
        ranked = sorted(status_best.items(), key=lambda x: x[1], reverse=True)
        token_count = len(df.iloc[idx]["subject"].split()) + len(df.iloc[idx]["body"].split())
        
        if token_count < 6 or not ranked:
            status, conf = "unknown", 0.0
        else:
            top_status, top_score = ranked[0]
            second_score = ranked[1][1] if len(ranked) > 1 else 0.0
            if top_score < BASE_THRESHOLD or (top_score - second_score) < 0.02:
                status, conf = "unknown", 0.0
            else:
                status, conf = top_status, round(float(top_score), 3)
        
        if status == "unknown":
            backoff = backoff_classify(df.iloc[idx]["subject"] + " " + df.iloc[idx]["body"])
            if backoff != "unknown":
                status, conf = backoff, 0.05
        
        final_status.append(status)
        final_confidence.append(conf)
    
    df["final_status"] = final_status
    df["confidence"] = final_confidence
    return df

def extract_info(df):
    if "job_related" in df.columns and df["job_related"].dtype != bool:
        df["job_related"] = df["job_related"].astype(bool)
    
    for idx, row in df.iterrows():
        text = f"{row.get('subject', '')} {row.get('body', '')} {row.get('from', '')}"
        text_lower = text.lower()
        
        company = None
        if row.get("from"):
            match = re.search(r"@([a-zA-Z0-9]+)\.", row["from"])
            if match:
                company = match.group(1).capitalize()
        df.at[idx, "company_name"] = company if company else ""
        
        role = None
        role_match = re.search(r"(?:position|role)\s*[-:]\s*([^\n,]+)", text_lower)
        if role_match:
            role = role_match.group(1).strip().title()
        df.at[idx, "role"] = role if role else ""
        df.at[idx, "from_email"] = str(row.get("from", ""))
        df.at[idx, "job_related"] = True
        
        app_id = extract_application_id_regex(text)
        df.at[idx, "application_id"] = app_id if app_id else ""
    
    return df

def extract_with_llm(df):
    import requests
    import time
    
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"
    MAX_BODY_CHARS = 4000
    
    if not GEMINI_API_KEY:
        print("[Step 3d] No GEMINI_API_KEY set, skipping LLM extraction")
        return df
    
    def parse_llm_json(raw_text):
        text = raw_text.strip()
        # Remove markdown code fences
        if "```" in text:
            lines = text.split("\n")
            cleaned = []
            inside_fence = False
            for line in lines:
                if line.strip().startswith("```"):
                    inside_fence = not inside_fence
                    continue
                cleaned.append(line)
            text = "\n".join(cleaned).strip()
        if not text.startswith('{'):
            start = text.find('{')
            end = text.rfind('}') + 1
            if start != -1 and end > start:
                text = text[start:end]
        return json.loads(text)
    
    def call_gemini(prompt):
        for attempt in range(3):
            try:
                response = requests.post(
                    f"{GEMINI_URL}?key={GEMINI_API_KEY}",
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 512}
                    },
                    headers={"Content-Type": "application/json"},
                    timeout=30
                )
                if response.status_code == 429:
                    wait = 2 ** (attempt + 1)
                    print(f"[LLM] Rate limited, waiting {wait}s...")
                    time.sleep(wait)
                    continue
                if response.status_code != 200:
                    print(f"[LLM] API error {response.status_code}: {response.text[:200]}")
                    continue
                data = response.json()
                candidates = data.get("candidates", [])
                if not candidates:
                    continue
                text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "").strip()
                if not text:
                    continue
                return parse_llm_json(text)
            except json.JSONDecodeError as e:
                print(f"[LLM] JSON parse error: {e}")
            except Exception as e:
                print(f"[LLM] Error: {e}")
        return None
    
    print(f"[Step 3d] Processing {len(df)} emails with Gemini ({GEMINI_MODEL})...")
    
    extracted = 0
    garbage = 0
    for idx, row in df.iterrows():
        subject = str(row.get("subject", ""))[:300]
        body = str(row.get("body", ""))[:MAX_BODY_CHARS]
        status = row.get("final_status", "unknown")
        
        prompt = f"""Analyze this email and extract job application details. Return ONLY valid JSON.

Email Subject: {subject}
Email Body: {body if body else "No body"}
Detected Status: {status}

FIRST determine if this is actually a job application email. Then extract details.
Return this JSON structure:
{{
    "is_job_email": true or false,
    "company_name": "Company name or null",
    "role": "Job role/title or null",
    "application_id": "Application/reference ID or null",
    "interview_datetime": "Interview date and time or null",
    "meeting_link": "Meeting/video call URL or null",
    "test_link": "Assessment/test URL or null",
    "compensation": "Salary/package details or null",
    "location": "Job location or null"
}}

If this is NOT a job application email (spam, promotions, personal, newsletters, file sharing, etc), set is_job_email to false and all other fields to null.

JSON:"""

        result = call_gemini(prompt)
        
        if result:
            # Check if LLM flagged this as not a job email
            if not result.get("is_job_email", True):
                print(f"[LLM] Filtered non-job email: {subject[:60]}")
                df.at[idx, "job_related"] = False
                garbage += 1
                continue
            
            for field in ["company_name", "role", "application_id", "interview_datetime",
                          "meeting_link", "test_link", "compensation", "location"]:
                val = result.get(field)
                if val and str(val).lower() not in ("null", "none", ""):
                    df.at[idx, field] = val
            extracted += 1
        
        if idx % 5 == 0:
            print(f"[Step 3d] Processed {extracted}/{len(df)} emails...")
    
    if garbage > 0:
        print(f"[Step 3d] Filtered {garbage} non-job emails")
        df = df[df["job_related"] != False].copy()
    
    print(f"[Step 3d] [OK] LLM extracted data for {extracted}/{len(df)} emails")
    return df

def extract_application_id_regex(text):
    if not text:
        return None
    patterns = [
        r'linkedin\.com/jobs/view/(\d+)',
        r'linkedin\.com/jobs/(\d+)',
        r'(?:WD|wd)\d+',
        r'workday\.com.*?job/(\w+)',
        r'greenhouse\.io.*?jobs/(\d+)',
        r'/jobs/(\d+)',
        r'lever\.co.*?jobs/(\w+)',
        r'ashby\.co.*?jobs/(\w+)',
        r'bamboohr\.com.*?hire.*?/(\w+)',
        r'(?:application\s*(?:id|#|ref|reference|no|number))[:\s]*([A-Z0-9]{4,12})',
        r'(?:job\s*(?:id|#|ref|reference|no|number))[:\s]*([A-Z0-9-]{4,12})',
        r'(?:reference|candidate)\s*id[:\s]*([A-Z0-9-]{4,12})',
        r'\b([A-Z]{2,4}[0-9]{4,10})\b',
        r'\b([0-9]{6,10})\b',
    ]
    text_lower = text.lower()
    for pattern in patterns:
        match = re.search(pattern, text_lower)
        if match:
            app_id = match.group(1) if match.lastindex else match.group(0)
            return app_id.upper() if app_id.isupper() or app_id.isdigit() else app_id
    return None

def upload_emails(emails, user_id, mongo_uri="mongodb://localhost:27017", db_name="college_project"):
    client = MongoClient(mongo_uri)
    db = client[db_name]
    try:
        user_oid = ObjectId(user_id)
    except:
        user_oid = user_id
    
    inserted, updated = 0, 0
    for email in emails:
        try:
            safe_date = None
            if email.get("date"):
                try:
                    from email.utils import parsedate_to_datetime
                    safe_date = parsedate_to_datetime(email["date"])
                except:
                    pass
            
            company_name = email.get("company_name") or None
            role = email.get("role") or None
            application_id = email.get("application_id") or None
            resolved = bool(company_name and role)
            
            result = db.emails.update_one(
                {"message_id": email["message_id"], "user_id": user_oid},
                {"$set": {
                    "user_id": user_oid,
                    "message_id": email["message_id"],
                    "thread_id": email.get("thread_id"),
                    "date": safe_date,
                    "from": email.get("from"),
                    "subject": email.get("subject", ""),
                    "body": email.get("body", ""),
                    "job_related": True,
                    "status": email.get("final_status", "unknown"),
                    "original_status": email.get("final_status"),
                    "status_confidence": float(email.get("confidence", 0)),
                    "company_name": company_name,
                    "role": role,
                    "application_id": application_id,
                    "resolved": resolved,
                }},
                upsert=True
            )
            if result.upserted_id:
                inserted += 1
            elif result.modified_count > 0:
                updated += 1
        except Exception as e:
            print(f"[Upload] Error: {e}")
    
    db.users.update_one({"_id": user_oid}, {"$set": {"lastFetchDate": datetime.utcnow()}})
    client.close()
    return inserted, updated

def fetch_gmail_emails(user_tokens, max_results=500, start_date=None, end_date=None):
    import base64
    from bs4 import BeautifulSoup
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build
    
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    
    creds = Credentials(
        token=user_tokens["googleAccessToken"],
        refresh_token=user_tokens.get("googleRefreshToken"),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=client_id,
        client_secret=client_secret,
        scopes=SCOPES
    )
    
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        update_user_tokens(str(user_tokens["_id"]), creds.token)
    
    service = build("gmail", "v1", credentials=creds)
    
    query_parts = []
    if start_date:
        query_parts.append(f"after:{start_date}")
    else:
        cutoff_date = (datetime.utcnow() - timedelta(days=30)).strftime("%Y/%m/%d")
        query_parts.append(f"after:{cutoff_date}")
    if end_date:
        query_parts.append(f"before:{end_date}")
    
    query = " ".join(query_parts)
    print(f"[Fetch] Query: {query}")
    
    response = service.users().messages().list(userId="me", q=query, maxResults=max_results).execute()
    messages = response.get("messages", [])
    print(f"[Fetch] Found {len(messages)} emails")
    
    emails = []
    for msg in messages:
        try:
            message = service.users().messages().get(userId="me", id=msg["id"], format="full").execute()
            headers = message["payload"].get("headers", [])
            subject, sender, date = "", "", ""
            for h in headers:
                name = h["name"].lower()
                if name == "subject": subject = h["value"]
                elif name == "from": sender = h["value"]
                elif name == "date": date = h["value"]
            
            body = ""
            if "parts" in message["payload"]:
                for part in message["payload"]["parts"]:
                    if part.get("body", {}).get("data"):
                        decoded = base64.urlsafe_b64decode(part["body"]["data"]).decode("utf-8", errors="ignore")
                        if part.get("mimeType") == "text/plain":
                            body = decoded.strip()
                            break
                        elif part.get("mimeType") == "text/html":
                            soup = BeautifulSoup(decoded, "lxml")
                            for tag in soup(["script", "style"]):
                                tag.decompose()
                            body = soup.get_text(separator="\n").strip()
            
            emails.append({
                "message_id": message["id"],
                "thread_id": message["threadId"],
                "date": date,
                "from": sender,
                "subject": subject,
                "body": body[:5000]
            })
        except Exception as e:
            print(f"[Fetch] Error: {e}")
    
    print(f"[Fetch] Fetched {len(emails)} emails")
    return emails

def main():
    if len(sys.argv) < 2:
        print("Usage: python sync_user.py <user_id> [--start-date YYYY-MM-DD] [--end-date YYYY-MM-DD]")
        sys.exit(1)
    
    user_id = sys.argv[1]
    print(f"[Pipeline] Starting for user: {user_id}")
    
    start_date = None
    end_date = None
    for i in range(2, len(sys.argv)):
        if sys.argv[i] == "--start-date" and i + 1 < len(sys.argv):
            start_date = sys.argv[i + 1]
            print(f"[Pipeline] Start date: {start_date}")
        elif sys.argv[i] == "--end-date" and i + 1 < len(sys.argv):
            end_date = sys.argv[i + 1]
            print(f"[Pipeline] End date: {end_date}")
    
    print("[Pipeline] Step 1: Getting user tokens...")
    user = get_user_tokens(user_id)
    print(f"[Step 1] [OK] User authenticated: {user.get('email')}")
    
    print("\n[Pipeline] Step 2: Fetching emails from Gmail...")
    emails = fetch_gmail_emails(user, max_results=500, start_date=start_date, end_date=end_date)
    print(f"[Step 2] [OK] Fetched {len(emails)} emails from Gmail")
    
    if not emails:
        print("[Pipeline] No emails found")
        sys.exit(0)
    
    print("\n[Pipeline] Step 3: Processing emails...")
    df = pd.DataFrame(emails)
    
    if os.path.exists(MODEL_FILE):
        print("[Step 3a] Loading ML model (type classifier)...")
        model = joblib.load(MODEL_FILE)
        templates = load_templates()
        
        print("[Step 3b] Classifying job-related emails...")
        job_df = classify_job_emails(df, model)
        print(f"[Step 3b] [OK] Classified: {len(job_df)}/{len(df)} are job-related")
        
        if len(job_df) == 0:
            print("[Pipeline] No job-related emails")
            sys.exit(0)
        
        print("\n[Step 3c] Classifying application status...")
        classified_df = classify_status(job_df, templates)
        
        status_counts = classified_df['final_status'].value_counts().to_dict()
        print(f"[Step 3c] [OK] Status breakdown:")
        for status, count in sorted(status_counts.items()):
            print(f"       - {status}: {count}")
        
        opportunity_count = len(classified_df[classified_df['final_status'] == 'opportunities'])
        if opportunity_count > 0:
            print(f"[Step 3c] Ignoring {opportunity_count} opportunity notifications")
        final_df = classified_df[classified_df['final_status'] != 'opportunities'].copy()
        
        if len(final_df) == 0:
            print("[Pipeline] No application emails")
            sys.exit(0)
        
        final_df = extract_info(final_df)
        print("\n[Step 3d] Extracting structured data with Gemini...")
        final_df = extract_with_llm(final_df)
    else:
        print("[Pipeline] No type classifier model, skipping type classification")
        templates = load_templates()
        final_df = df.copy()
        final_df["job_related"] = True
        final_df["confidence"] = 0.5
        final_df = classify_status(final_df, templates)
        
        status_counts = final_df['final_status'].value_counts().to_dict()
        print(f"[Step 3c] [OK] Status breakdown:")
        for status, count in sorted(status_counts.items()):
            print(f"       - {status}: {count}")
        
        final_df = extract_info(final_df)
        print("\n[Step 3d] Extracting structured data with Gemini...")
        final_df = extract_with_llm(final_df)
    
    print("\n[Pipeline] Step 4: Uploading to database...")
    records = final_df.to_dict("records")
    inserted, updated = upload_emails(records, user_id)
    
    print(f"\n[Pipeline] ========== SUMMARY ==========")
    print(f"[Summary] Total emails fetched: {len(emails)}")
    print(f"[Summary] Job-related emails: {len(final_df)}")
    print(f"[Summary] Uploaded to DB: {inserted} new, {updated} updated")
    print(f"[Summary] total:{len(final_df)}")
    print(f"[Summary] job_related:{len(final_df)}")
    print("[Pipeline] ========== COMPLETE ==========")

if __name__ == "__main__":
    main()
