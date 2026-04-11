import pandas as pd
import joblib
import json
import os
import sys
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

MODEL_FILE = "job_email_classifier.joblib"
TEMPLATES_FILE = "phrases.json"
OUTPUT_DIR = "extracted"

SUBJECT_WEIGHT = 0.7
BODY_WEIGHT = 0.3
BASE_THRESHOLD = 0.10
THRESHOLD = 0.5

BACKOFF_RULES = {
    "interview": {
        "keywords": {"interview", "call", "discussion", "meeting", "connect", "scheduled", "slot"},
        "min_hits": 1
    },
    "assessment": {
        "keywords": {"test", "assessment", "assignment", "challenge", "task", "coding"},
        "min_hits": 1
    },
    "applied": {
        "keywords": {"application", "profile", "resume", "submission", "applied", "consideration"},
        "min_hits": 1
    }
}

def load_templates():
    with open(TEMPLATES_FILE, "r") as f:
        return json.load(f)

def backoff_classify(text: str) -> str:
    tokens = set(text.lower().split())
    for label, rule in BACKOFF_RULES.items():
        hits = tokens & rule["keywords"]
        if len(hits) >= rule["min_hits"]:
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
    
    template_texts = []
    template_status = []
    template_weight = []
    
    for status, phrases in templates.items():
        for p in phrases:
            template_texts.append(p)
            template_status.append(status)
            template_weight.append(min(len(p.split()) / 4, 1.5))
    
    subject_corpus = df["subject"].tolist() + template_texts
    body_corpus = df["body"].tolist() + template_texts
    
    vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), min_df=1)
    
    subj_tfidf = vectorizer.fit_transform(subject_corpus)
    body_tfidf = vectorizer.fit_transform(body_corpus)
    
    subj_email = subj_tfidf[:len(df)]
    subj_template = subj_tfidf[len(df):]
    body_email = body_tfidf[:len(df)]
    body_template = body_tfidf[len(df):]
    
    sim_matrix = SUBJECT_WEIGHT * cosine_similarity(subj_email, subj_template) + \
                 BODY_WEIGHT * cosine_similarity(body_email, body_template)
    
    final_status = []
    final_confidence = []
    
    for idx, sim_row in enumerate(sim_matrix):
        status_best = {}
        for score, status, weight in zip(sim_row, template_status, template_weight):
            weighted_score = score * weight
            if status not in status_best or weighted_score > status_best[status]:
                status_best[status] = weighted_score
        
        ranked = sorted(status_best.items(), key=lambda x: x[1], reverse=True)
        
        token_count = len(df.iloc[idx]["subject"].split()) + len(df.iloc[idx]["body"].split())
        if token_count < 6 or not ranked:
            status = "unknown"
            conf = 0.0
        else:
            top_status, top_score = ranked[0]
            second_score = ranked[1][1] if len(ranked) > 1 else 0.0
            
            if top_score < BASE_THRESHOLD or (top_score - second_score) < 0.02:
                status = "unknown"
                conf = 0.0
            else:
                status = top_status
                conf = round(float(top_score), 3)
        
        if status == "unknown":
            backoff = backoff_classify(df.iloc[idx]["subject"] + " " + df.iloc[idx]["body"])
            if backoff != "unknown":
                status = backoff
                conf = 0.05
        
        final_status.append(status)
        final_confidence.append(conf)
    
    df["final_status"] = final_status
    df["confidence"] = final_confidence
    return df

def extract_info(df):
    for idx, row in df.iterrows():
        text = f"{row.get('subject', '')} {row.get('body', '')} {row.get('from', '')}"
        text_lower = text.lower()
        
        company = None
        patterns = [
            r"from:\s*([^\n<]+)",
            r"careers?@([a-zA-Z0-9]+)",
            r"jobs?@([a-zA-Z0-9]+)",
            r"([A-Z][a-zA-Z]+)\s+(?:Inc|LLC|Corp|Ltd|Technologies|Technologies|Software)",
        ]
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                company = match.group(1).strip()
                break
        
        if not company and row.get("from"):
            from_match = re.search(r"@([a-zA-Z0-9]+)\.", row["from"])
            if from_match:
                company = from_match.group(1).capitalize()
        
        role = None
        role_patterns = [
            r"(?:looking for|seeking|hiring|position|role|opportunity)\s+(?:a|an)?\s*([A-Za-z\s]+(?:engineer|developer|manager|analyst|designer|consultant|specialist|lead|intern))",
            r"(?:job|title|position):\s*([^\n,]+)",
        ]
        for pattern in role_patterns:
            match = re.search(pattern, text_lower)
            if match:
                role = match.group(1).strip().title()
                break
        
        df.at[idx, "company_name"] = company
        df.at[idx, "role"] = role
        
        interview_patterns = [
            r"(?:interview|call|meeting|discussion)\s+(?:on|at|scheduled for|is scheduled)\s*:?\s*([A-Z][a-z]{2,}\s+\d{1,2},?\s+\d{4}\s+\d{1,2}:?\d{2}?\s*(?:am|pm)?)",
            r"(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\s+\d{1,2}:?\d{2}?\s*(?:am|pm)?)",
        ]
        for pattern in interview_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                df.at[idx, "interview_datetime"] = match.group(1)
                break
        
        compensation = None
        comp_patterns = [
            r"\$[\d,]+(?:k|K)?(?:\s*-\s*\$[\d,]+(?:k|K)?)?",
            r"[\d]+(?:\.\d+)?\s*(?:lakh|L|LPA|lpa)",
        ]
        for pattern in comp_patterns:
            match = re.search(pattern, text)
            if match:
                compensation = match.group(0)
                break
        df.at[idx, "compensation"] = compensation
        
        location = None
        location_patterns = [
            r"(?:location|based in|remote|hybrid)\s*:?\s*([A-Za-z\s,]+)",
            r"((?:Bangalore|Delhi|Mumbai|Chennai|Hyderabad|Pune|Bengaluru|India|US|Remote))",
        ]
        for pattern in location_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                location = match.group(1).strip()
                break
        df.at[idx, "location"] = location
        
        link_patterns = [
            r"https?://[^\s<>\"']+",
        ]
        for pattern in link_patterns:
            matches = re.findall(pattern, text)
            for link in matches:
                if "meet.google" in link or "zoom" in link or "teams.microsoft" in link:
                    df.at[idx, "meeting_link"] = link
                    break
                if "test" in link or "assessment" in link or "hackerrank" in link or "leetcode" in link:
                    df.at[idx, "test_link"] = link
                    break
    
    return df

def main():
    if len(sys.argv) < 2:
        print("Usage: python pextract.py <input.json> [user_id]")
        sys.exit(1)
    
    input_file = sys.argv[1]
    user_id = sys.argv[2] if len(sys.argv) > 2 else "default"
    
    with open(input_file, "r") as f:
        emails = json.load(f)
    
    if isinstance(emails, dict):
        emails = [emails]
    elif not isinstance(emails, list):
        emails = []
    
    if len(emails) == 0:
        print("No emails to process")
        sys.exit(0)
    
    df = pd.DataFrame(emails)
    
    if "subject" not in df.columns:
        df["subject"] = ""
    if "body" not in df.columns:
        df["body"] = ""
    if "from" in df.columns and "from_email" not in df.columns:
        df["from_email"] = df["from"]
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    if not os.path.exists(MODEL_FILE):
        print("Model file not found. Creating dummy output.")
        df["job_related"] = True
        df["final_status"] = "unknown"
        df["confidence"] = 0.5
        output_file = os.path.join(OUTPUT_DIR, f"{user_id}_emails.csv")
        df.to_csv(output_file, index=False)
        print(f"Output saved to {output_file}")
        sys.exit(0)
    
    model = joblib.load(MODEL_FILE)
    templates = load_templates()
    
    job_df = classify_job_emails(df, model)
    
    if len(job_df) == 0:
        print("No job-related emails found.")
        sys.exit(0)
    
    classified_df = classify_status(job_df, templates)
    final_df = extract_info(classified_df)
    
    output_file = os.path.join(OUTPUT_DIR, f"{user_id}_emails.csv")
    final_df.to_csv(output_file, index=False)
    
    print(f"total:{len(df)}")
    print(f"job_related:{len(job_df)}")
    print(f"processed:{len(final_df)}")
    print(f"status_distribution:{final_df['final_status'].value_counts().to_dict()}")
    print(f"Output saved to {output_file}")

if __name__ == "__main__":
    main()
