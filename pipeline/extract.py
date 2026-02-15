"""
Extract structured data from job emails using Ollama LLM
with authoritative status decision, HARD interview constraints,
empty-body rejection, phrase grounding, proper bucket routing,
and per-email audit logs.

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

# =========================
# CONFIG
# =========================
INPUT_DIR = "status_outputs"
OUTPUT_DIR = "extracted"
LOGS_DIR = "logs"

PHRASES_FILE = "phrases.json"

OLLAMA_MODEL = "llama3.1:8b"
OLLAMA_URL = "http://localhost:11434/api/generate"

MAX_BODY_CHARS = 1500
MAX_SUBJECT_CHARS = 250
MIN_BODY_CHARS = 20
CONCURRENCY = 6

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(LOGS_DIR, exist_ok=True)

# =========================
# LOAD PHRASES
# =========================
with open(PHRASES_FILE, "r", encoding="utf-8") as f:
    PHRASES = json.load(f)

# =========================
# CLEANING
# =========================
JUNK_RE = re.compile(r"(\r|\t|\\u200c|\\u200b|\\xa0|=\\n|=\\r\\n)")
MULTISPACE_RE = re.compile(r"\s+")


def clean_text(text: str) -> str:
    if not text:
        return ""
    text = str(text)
    text = JUNK_RE.sub(" ", text)
    text = MULTISPACE_RE.sub(" ", text)
    return text.strip()


# =========================
# INTERVIEW GUARD (FIXED)
# =========================
INTERVIEW_EVIDENCE_RE = re.compile(
    r"(zoom\.us|teams\.microsoft\.com|meet\.google\.com|"
    r"\binterview\b.*\b(scheduled|confirmed)\b|"
    r"\b(calendar invite|meeting link)\b|"
    r"\b\d{1,2}(:\d{2})?\s?(am|pm)\b|"
    r"\b\d{1,2}/\d{1,2}/\d{2,4}\b)",
    re.IGNORECASE,
)

APPLIED_FALLBACK_RE = re.compile(
    r"(thank(s)? for applying|"
    r"application (received|submitted)|"
    r"we received your application|"
    r"your application has been received)",
    re.IGNORECASE,
)

# =========================
# SCHEMAS
# =========================
SCHEMA_MAP = {
    "applied": ["company_name", "role", "role_id"],
    "interview": [
        "company_name",
        "role",
        "role_id",
        "interview_datetime",
        "mode",
        "platform",
        "location",
        "meeting_link",
    ],
    "assessment": [
        "company_name",
        "role",
        "role_id",
        "deadline_datetime",
        "platform",
        "duration",
        "test_link",
    ],
    "offer": [
        "company_name",
        "role",
        "role_id",
        "compensation",
        "joining_date",
        "location",
    ],
    "rejected": ["company_name", "role", "role_id"],
    "unknown": ["company_name", "role", "role_id"],
}

FINAL_BUCKETS = {k: [] for k in SCHEMA_MAP}


# =========================
# PROMPTS
# =========================
def build_authoritative_status_prompt(subject: str, body: str) -> str:
    phrase_block = "\n".join(
        f"{status} examples:\n- " + "\n- ".join(phrases[:3])
        for status, phrases in PHRASES.items()
    )

    return f"""
You are an expert system that classifies job-related emails.

Valid statuses:
applied | interview | assessment | offer | rejected | unknown

DEFINITIONS (STRICT):
- applied: confirmation that an application was received or submitted.
- interview: ONLY if confirmed with date/time, calendar invite, or meeting link.
- assessment: coding test or evaluation.
- offer: job offer with compensation or joining info.
- rejected: explicit rejection.
- unknown: none of the above.

REFERENCE PHRASES:
{phrase_block}

CRITICAL RULE:
If application confirmation exists, choose applied.

Email:
Subject: {subject}
Body: {body}

Return ONLY ONE WORD:
applied | interview | assessment | offer | rejected | unknown
"""


def build_extraction_prompt(status: str, subject: str, body: str) -> str:
    fields = SCHEMA_MAP[status]
    fields_json = ", ".join([f'"{f}": null' for f in fields])

    return f"""
Extract structured data from this job email.

Return ONLY valid JSON.
Use null if missing.
Do NOT infer.

Email:
Subject: {subject}
Body: {body}

JSON:
{{{fields_json}}}
"""


# =========================
# OLLAMA
# =========================
async def call_ollama(session, prompt: str) -> str:
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.0, "num_predict": 256},
    }

    try:
        async with session.post(OLLAMA_URL, json=payload) as resp:
            if resp.status != 200:
                return ""
            return (await resp.json()).get("response", "")
    except Exception:
        return ""


# =========================
# PARSERS
# =========================
def parse_status(text: str) -> str:
    text = text.lower().strip()
    return text if text in SCHEMA_MAP else "unknown"


def safe_parse_json(text: str) -> Dict[str, Any]:
    try:
        s, e = text.find("{"), text.rfind("}")
        if s == -1 or e == -1:
            return {}
        return json.loads(text[s : e + 1])
    except Exception:
        return {}


# =========================
# LOGGING
# =========================
def write_log(filename: str, data: Dict[str, Any]):
    with open(os.path.join(LOGS_DIR, filename), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


# =========================
# PROCESS FILE
# =========================
async def process_file(input_status: str, filepath: str) -> List[Dict[str, Any]]:
    df = pd.read_csv(filepath).fillna("")
    sem = asyncio.Semaphore(CONCURRENCY)

    async with aiohttp.ClientSession() as session:

        async def handle_row(idx, row):
            async with sem:
                subject = clean_text(row["subject"])[:MAX_SUBJECT_CHARS]
                body = clean_text(row["body"])[:MAX_BODY_CHARS]

                if len(body) < MIN_BODY_CHARS:
                    final_status = "unknown"
                    extracted = {}
                else:
                    status_prompt = build_authoritative_status_prompt(subject, body)
                    status_resp = await call_ollama(session, status_prompt)
                    final_status = parse_status(status_resp)

                    # Force applied status fallback
                    if final_status in {"unknown", "interview"}:
                        if APPLIED_FALLBACK_RE.search(subject + " " + body):
                            final_status = "applied"

                    # Interview guard - verify interview evidence
                    if final_status == "interview":
                        if not INTERVIEW_EVIDENCE_RE.search(subject + " " + body):
                            final_status = "unknown"

                    extracted = {}
                    if final_status != "unknown":
                        extract_prompt = build_extraction_prompt(
                            final_status, subject, body
                        )
                        extract_resp = await call_ollama(session, extract_prompt)
                        extracted = safe_parse_json(extract_resp)

                write_log(
                    f"{input_status}_{idx}.json",
                    {
                        "subject": subject,
                        "body": body,
                        "final_status": final_status,
                        "extracted": extracted,
                    },
                )

                return {
                    **row.to_dict(),
                    **extracted,
                    "original_status": input_status,
                    "final_status": final_status,
                    "status_corrected": final_status != input_status,
                }

        return await asyncio.gather(*(handle_row(i, r) for i, r in df.iterrows()))


# =========================
# MAIN
# =========================
async def main():
    files = [f for f in os.listdir(INPUT_DIR) if f.endswith(".csv")]
    if not files:
        raise RuntimeError("No input CSV files found")

    total_input = sum(len(pd.read_csv(os.path.join(INPUT_DIR, f))) for f in files)

    for file in files:
        rows = await process_file(
            file.replace(".csv", ""), os.path.join(INPUT_DIR, file)
        )
        for r in rows:
            FINAL_BUCKETS[r["final_status"]].append(r)

    print("\n=== METRICS ===")
    print(f"input:{total_input}")

    total_output = corrections = 0
    for status, rows in FINAL_BUCKETS.items():
        if not rows:
            continue
        df = pd.DataFrame(rows)
        df.to_csv(os.path.join(OUTPUT_DIR, f"{status}_feature.csv"), index=False)
        print(f"{status}:{len(df)}")
        total_output += len(df)
        corrections += df["status_corrected"].sum()

    print(f"total:{total_output}")
    print(f"rate:{total_output / total_input * 100:.1f}%")
    print(f"corrections:{corrections}")
    print("\nDone")


if __name__ == "__main__":
    asyncio.run(main())
