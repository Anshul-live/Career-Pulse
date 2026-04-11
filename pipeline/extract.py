"""
Extract structured data from job emails using Ollama LLM
with improved cleaning, better prompts, and robust fallbacks.

Usage:
    python extract.py
"""

import os
import pandas as pd
import asyncio
import aiohttp
import re
import json
from typing import Dict, Any, List

INPUT_DIR = "status_outputs"
OUTPUT_DIR = "extracted"
LOGS_DIR = "logs"
PHRASES_FILE = "phrases.json"

OLLAMA_MODEL = "llama3.1:8b"
OLLAMA_URL = "http://localhost:11434/api/generate"

MAX_BODY_CHARS = 4000
MAX_SUBJECT_CHARS = 300
MIN_BODY_CHARS = 15
CONCURRENCY = 6

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(LOGS_DIR, exist_ok=True)

with open(PHRASES_FILE, "r", encoding="utf-8") as f:
    PHRASES = json.load(f)

FINAL_BUCKETS = {}

SCHEMA_MAP = {
    "applied": ["company_name", "role", "role_id", "application_id"],
    "interview": ["company_name", "role", "role_id", "application_id", "interview_datetime", "mode", "platform", "location", "meeting_link"],
    "assessment": ["company_name", "role", "role_id", "application_id", "deadline_datetime", "platform", "duration", "test_link"],
    "offer": ["company_name", "role", "role_id", "application_id", "compensation", "joining_date", "location"],
    "rejected": ["company_name", "role", "role_id", "application_id"],
    "unknown": ["company_name", "role", "role_id", "application_id"],
}


def clean_text(text: str) -> str:
    if not text:
        return ""
    text = str(text)
    
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'http[s]?://\S+', ' LINK ', text)
    text = re.sub(r'\S+@\S+', ' EMAIL ', text)
    
    # Check if this is primarily a forwarded/replied email
    forwarded_patterns = [
        r'----------\s*forwarded\s*message',
        r'begin\s*forwarded\s*message',
        r'on\s+\w+,\s+\d+\s+\w+\s+\d{4},',
        r'_{10,}',
    ]
    
    has_forward = False
    for pattern in forwarded_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            has_forward = True
            break
    
    if has_forward:
        # Extract both original AND forwarded content
        parts = []
        forwarded_idx = len(text)
        
        for pattern in forwarded_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match and match.start() > 50:
                forwarded_idx = min(forwarded_idx, match.start())
        
        if forwarded_idx < len(text):
            main_part = text[:forwarded_idx]
            forwarded_part = text[forwarded_idx:]
            
            # Clean forwarded part
            forwarded_part = re.sub(r'>\s+', ' ', forwarded_part)
            forwarded_part = re.sub(r'^\s*>', '', forwarded_part, flags=re.MULTILINE)
            forwarded_part = re.sub(r'\*+', '', forwarded_part)
            
            # Combine: main question + forwarded details
            text = main_part + "\n\n--- FORWARDED CONTENT ---\n\n" + forwarded_part
    
    text = re.sub(r'>\s+', ' ', text)
    text = re.sub(r'^\s*>.*$', '', text, flags=re.MULTILINE)
    
    text = re.sub(r'[=\-]{10,}', '', text)
    text = re.sub(r'unsubscribe|privacy policy|terms of service|manage preferences', '', text)
    
    text = re.sub(r'[\r\t\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', ' ', text)
    text = re.sub(r'&nbsp;|&amp;|&lt;|&gt;|&quot;', ' ', text)
    text = re.sub(r'\*{2,}', '', text)
    
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'[ \t]{2,}', ' ', text)
    text = re.sub(r'^\s+|\s+$', '', text, flags=re.MULTILINE)
    
    return text.strip()


def build_extraction_prompt(status: str, subject: str, body: str) -> str:
    fields = SCHEMA_MAP.get(status, SCHEMA_MAP["unknown"])
    
    return f"""Extract job details from this email.

IMPORTANT:
- Return ONLY JSON like: {{"company_name": "Acme Corp", "role": "Engineer"}}
- Use null if a field is NOT clearly stated
- Do NOT make up values
- Look in "--- FORWARDED CONTENT ---" section for nested email details

Fields needed: {", ".join(fields)}
If "test_link" or "meeting_link": extract the URL
If "deadline_datetime" or "interview_datetime": extract full date and time
If "platform": extract the platform name (Zoom, Teams, HackerRank, etc.)

Subject: {subject}

Body: {body}

JSON:"""


async def call_ollama(session, prompt: str) -> str:
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.1, "num_predict": 1024},
    }
    try:
        async with session.post(OLLAMA_URL, json=payload, timeout=aiohttp.ClientTimeout(total=90)) as resp:
            if resp.status != 200:
                return ""
            return (await resp.json()).get("response", "")
    except Exception:
        return ""


def parse_json(text: str) -> Dict[str, Any]:
    try:
        text = text.strip()
        if not text.startswith('{'):
            start = text.find('{')
            end = text.rfind('}') + 1
            if start != -1 and end > start:
                text = text[start:end]
        return json.loads(text)
    except Exception:
        return {}


def extract_from_subject(subject: str) -> Dict[str, Any]:
    result = {}
    subject_lower = subject.lower()
    
    job_titles = ['software engineer', 'sde', 'frontend', 'backend', 'full stack', 'data scientist', 'data analyst', 'product manager', 'devops', 'ml engineer', 'ai engineer', 'machine learning', 'analyst', 'developer', 'designer', 'consultant', 'manager', 'intern', 'associate', 'senior', 'junior', 'lead', 'principal', 'architect']
    
    company_patterns = [
        r'(?:at|from)\s+([A-Z][A-Za-z0-9\s&\.\-]+?)(?:\s*[-–—]\s*|\s*\|\s*|$)',
        r'(?:for|at)\s+([A-Z][A-Za-z0-9\s&\.\-]+?)(?:\s*[-–—]\s*|\s*\|\s*|$)',
    ]
    for pattern in company_patterns:
        match = re.search(pattern, subject)
        if match:
            potential = match.group(1).strip()
            potential_lower = potential.lower()
            if not any(bad in potential_lower for bad in ['update', 'application', 'position', 'role']):
                if not any(title in potential_lower for title in job_titles):
                    result["company_name"] = potential
                    break
    
    if "company_name" not in result:
        common = ["American Express", "Goldman Sachs", "JP Morgan", "Morgan Stanley", "Barclays", "Google", "Amazon", "Microsoft", "Meta", "Apple", "Netflix", "Adobe", "IBM", "Oracle", "Salesforce", "Uber", "Stripe", "Spotify", "LinkedIn", "Flipkart", "Paytm", "Databricks", "Snowflake", "MongoDB", "Uber", "Airbnb", "Coinbase"]
        for co in common:
            if co.lower() in subject_lower:
                result["company_name"] = co
                break
    
    role_patterns = [
        r'((?:Senior |Junior |Staff |Lead |Principal |Intern |Graduate )?(?:Software|SDE|Full-?Stack|Frontend|Backend|Front-?End|Back-?End|Mobile|DevOps|ML|AI|Data|Cloud|Cyber|Security)\s*(?:Engineer|Developer|Scientist|Architect|Analyst|Manager)?)',
        r'((?:Senior |Junior |Lead )?[A-Za-z\s]+(?:Engineer|Developer|Scientist|Analyst|Manager|Designer|Administrator))',
    ]
    for pattern in role_patterns:
        match = re.search(pattern, subject, re.IGNORECASE)
        if match:
            result["role"] = match.group(1).strip()
            break
    
    id_patterns = [
        r'(?:ID|Ref|Application|Ref\.)[#:\s\-]*([A-Z0-9]{4,20})',
        r'(?:-|_|job|app)(\d{4,})',
        r'([A-Z]{2,5}\d{4,})',
    ]
    for pattern in id_patterns:
        match = re.search(pattern, subject)
        if match:
            result["application_id"] = match.group(1).strip()
            break
    
    return result


def extract_from_body(body: str) -> Dict[str, Any]:
    result = {}
    body_lower = body.lower()
    
    id_patterns = [
        r'(?:application|reference|reference id|job|req|position)[#:\s]*([A-Z0-9\-]{3,20})',
        r'(?:id|ref)[:\s]+([A-Z0-9]{5,})',
        r'(?:job|application|position)\s*(?:number|#|id)[:\s]*(\d{4,})',
    ]
    for pattern in id_patterns:
        match = re.search(pattern, body, re.IGNORECASE)
        if match:
            result["role_id"] = match.group(1).strip()
            break
    
    deadline_match = re.search(r'Deadline to Complete the Test[:\s]*([^*\n]+)', body, re.IGNORECASE)
    if deadline_match:
        result["deadline_datetime"] = deadline_match.group(1).strip()
    
    date_of_match = re.search(r'Date of the Assessment[:\s]*([^*\n]+)', body, re.IGNORECASE)
    if date_of_match:
        full_date = date_of_match.group(1).strip()
        time_match = re.search(r'Reporting Time[:\s]*([^*\n]+)', body, re.IGNORECASE)
        if time_match:
            full_date += " " + time_match.group(1).strip()
        if "deadline_datetime" not in result:
            result["deadline_datetime"] = full_date
        elif "11:00 AM" in result.get("deadline_datetime", ""):
            result["deadline_datetime"] = full_date
    
    date_patterns = [
        r'(?:interview|schedule|call|meeting).*?(\w+\s+\d{1,2},?\s+\d{4}\s+(?:at\s+)?\d{1,2}:\d{2}\s*(?:am|pm)?)',
        r'(?:on|at|for)\s+(?:the\s+)?(?:interview|call|meeting).*?(\w+\s+\d{1,2}\s+(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)?)',
    ]
    for pattern in date_patterns:
        match = re.search(pattern, body, re.IGNORECASE)
        if match:
            result["interview_datetime"] = match.group(1).strip()
            break
    
    link_patterns = [
        r'(https?://[^\s<>"\'\(\)]+(?:zoom|teams|meet|google|simplify|hackerrank|coddy)[^\s<>"\'\(\)]*)',
        r'(https?://[^\s<>"\'\(\)]+)',
    ]
    for pattern in link_patterns:
        match = re.search(pattern, body, re.IGNORECASE)
        if match:
            url = match.group(1).strip()
            url_lower = url.lower()
            
            if any(p in url_lower for p in ['zoom', 'teams', 'meet', 'calendar']) and 'meeting_link' not in result:
                result["meeting_link"] = url
                if 'zoom' in url_lower:
                    result["platform"] = "Zoom"
                elif 'teams' in url_lower:
                    result["platform"] = "Microsoft Teams"
                elif 'meet' in url_lower:
                    result["platform"] = "Google Meet"
            
            if any(p in url_lower for p in ['hackerrank', 'coddy', 'simplify', 'assessment', 'quiz']):
                result["test_link"] = url
                if 'hackerrank' in url_lower:
                    result["platform"] = "HackerRank"
                elif 'coddy' in url_lower:
                    result["platform"] = "Coddy"
                elif 'simplify' in url_lower:
                    result["platform"] = "SimplifySkills"
            break
    
    simplify_match = re.search(r'(app\.simplif\w+\.com[^\s]*)', body, re.IGNORECASE)
    if simplify_match and 'test_link' not in result:
        result["test_link"] = "https://" + simplify_match.group(1).strip()
        result["platform"] = "SimplifySkills"
    
    salary_patterns = [
        r'(?:salary|compensation|ctc|package)[:\s]*([^,\n]{3,30})',
        r'(\$[\d,]+(?:\.\d{2})?(?:\s*(?:k|K|lakh|LPA))?)',
        r'(\d+\s*(?:LPA|lakhs|\$[\d,]+))',
    ]
    for pattern in salary_patterns:
        match = re.search(pattern, body, re.IGNORECASE)
        if match:
            result["compensation"] = match.group(1).strip()
            break
    
    company_patterns = [
        r'([A-Z][A-Za-z0-9\s&\.\-]+?)\s+Careers\s+site',
        r'Talent\s+Acquisition\s*\n?\s*([A-Z][A-Za-z\s&\.\-]+?)(?:\n|$)',
        r'from\s+([A-Z][A-Za-z0-9\s&\.\-]+?)(?:\s*[-|–]\s*|\s*for|\s*\|\s*|$)',
        r'([A-Z][A-Za-z0-9\s&\.\-]+?)\s+(?:Recruiting|Recruitment|Hiring|Talent)',
        r'(?:©?\s*)?([A-Z][A-Za-z0-9\s&\.\-]+?)\s*$\n',
    ]
    for pattern in company_patterns:
        match = re.search(pattern, body, re.MULTILINE)
        if match:
            potential = match.group(1).strip()
            if len(potential) > 2 and len(potential) < 50 and 'please' not in potential.lower():
                result["company_name"] = potential
                break
    
    if "company_name" not in result:
        common = ["American Express", "Goldman Sachs", "JP Morgan", "Morgan Stanley", "Barclays", "Google", "Amazon", "Microsoft", "Meta", "Apple", "Netflix", "Adobe", "IBM", "Oracle", "Salesforce", "Uber", "Stripe", "Spotify", "LinkedIn", "Flipkart", "Paytm"]
        for co in common:
            if co.lower() in body_lower:
                result["company_name"] = co
                break
    
    return result


def is_valid_value(val, key):
    if not val or str(val).lower() in ['null', 'none', 'n/a', '', 'nan', 'undefined']:
        return False
    val_str = str(val).strip()
    if len(val_str) < 2:
        return False
    # Check for common hallucinations
    bad_patterns = ['zoom, teams', 'example.com', 'http']
    for bad in bad_patterns:
        if bad in val_str.lower():
            return False
    return True

def merge_extractions(llm_extraction: Dict, subject_fallback: Dict, body_fallback: Dict) -> Dict:
    result = {}
    
    priority_fields = ['company_name', 'role', 'application_id', 'role_id', 'interview_datetime', 
                       'deadline_datetime', 'meeting_link', 'test_link', 'platform', 'mode', 'compensation', 'joining_date', 'location']
    
    for key in priority_fields:
        body_val = body_fallback.get(key)
        subject_val = subject_fallback.get(key)
        llm_val = llm_extraction.get(key)
        
        # Priority: body_fallback > subject_fallback > llm
        val = None
        if is_valid_value(body_val, key):
            val = body_val
        elif is_valid_value(subject_val, key):
            val = subject_val
        elif is_valid_value(llm_val, key):
            val = llm_val
        
        if val:
            result[key] = str(val).strip()
    
    return result


async def process_file(input_status: str, filepath: str) -> List[Dict[str, Any]]:
    df = pd.read_csv(filepath).fillna("")
    sem = asyncio.Semaphore(CONCURRENCY)
    
    async with aiohttp.ClientSession() as session:
        async def handle_row(idx, row):
            async with sem:
                subject = clean_text(row.get("subject", ""))[:MAX_SUBJECT_CHARS]
                body = clean_text(row.get("body", ""))[:MAX_BODY_CHARS]
                
                final_status = input_status
                extracted = {}
                
                if final_status != "unknown" and len(body) >= MIN_BODY_CHARS:
                    prompt = build_extraction_prompt(final_status, subject, body)
                    llm_resp = await call_ollama(session, prompt)
                    extracted = parse_json(llm_resp)
                
                subject_fallback = extract_from_subject(subject)
                body_fallback = extract_from_body(body)
                extracted = merge_extractions(extracted, subject_fallback, body_fallback)
                
                write_log(f"{input_status}_{idx}.json", {
                    "subject": subject,
                    "body": body[:500],
                    "final_status": final_status,
                    "extracted": extracted,
                    "llm_used": final_status != "unknown" and len(body) >= MIN_BODY_CHARS,
                })
                
                return {
                    **row.to_dict(),
                    **extracted,
                    "original_status": input_status,
                    "final_status": final_status,
                }
        
        return await asyncio.gather(*(handle_row(i, r) for i, r in df.iterrows()))


def write_log(filename: str, data: Dict[str, Any]):
    with open(os.path.join(LOGS_DIR, filename), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


async def main():
    files = [f for f in os.listdir(INPUT_DIR) if f.endswith(".csv")]
    if not files:
        raise RuntimeError("No input CSV files found")
    
    total_input = sum(len(pd.read_csv(os.path.join(INPUT_DIR, f))) for f in files)
    
    for file in files:
        status = file.replace(".csv", "")
        FINAL_BUCKETS[status] = []
        rows = await process_file(status, os.path.join(INPUT_DIR, file))
        FINAL_BUCKETS[status].extend(rows)
    
    print("\n=== METRICS ===")
    print(f"input:{total_input}")
    
    total_output = 0
    for status, rows in FINAL_BUCKETS.items():
        if not rows:
            continue
        df = pd.DataFrame(rows)
        output_file = os.path.join(OUTPUT_DIR, f"{status}_feature.csv")
        df.to_csv(output_file, index=False)
        print(f"{status}:{len(df)}")
        total_output += len(df)
    
    print(f"total:{total_output}")
    print("\nDone")


if __name__ == "__main__":
    asyncio.run(main())
