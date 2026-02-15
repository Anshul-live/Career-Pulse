import json
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

JOB_EMAILS_FILE = "job_emails.csv"
TEMPLATES_FILE = "phrases.json"
OUTPUT_FILE = "job_emails_with_status.csv"

SUBJECT_WEIGHT = 0.7
BODY_WEIGHT = 0.3
BASE_THRESHOLD = 0.10
AMBIGUITY_MARGIN = 0.02
STRONG_SCORE = 0.18

BACKOFF_RULES = {
    "interview": {
        "keywords": {"interview", "call", "discussion", "meeting", "connect"},
        "min_hits": 1
    },
    "assessment": {
        "keywords": {"test", "assessment", "assignment", "challenge", "task"},
        "min_hits": 1
    },
    "applied": {
        "keywords": {
            "application", "profile", "resume", "submission",
            "review", "screening", "considered", "received"
        },
        "min_hits": 2
    }
}


def backoff_classify(text: str) -> str:
    tokens = set(text.lower().split())
    for label, rule in BACKOFF_RULES.items():
        hits = tokens & rule["keywords"]
        if len(hits) >= rule["min_hits"]:
            return label
    return "unknown"


def main():
    df = pd.read_csv(JOB_EMAILS_FILE)
    df["subject"] = df["subject"].fillna("")
    df["body"] = df["body"].fillna("")

    with open(TEMPLATES_FILE, "r") as f:
        templates = json.load(f)

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

    vectorizer = TfidfVectorizer(
        stop_words="english",
        ngram_range=(1, 2),
        min_df=1
    )

    subj_tfidf = vectorizer.fit_transform(subject_corpus)
    body_tfidf = vectorizer.fit_transform(body_corpus)

    subj_email = subj_tfidf[:len(df)]
    subj_template = subj_tfidf[len(df):]

    body_email = body_tfidf[:len(df)]
    body_template = body_tfidf[len(df):]

    sim_matrix = (
        SUBJECT_WEIGHT * cosine_similarity(subj_email, subj_template)
        + BODY_WEIGHT * cosine_similarity(body_email, body_template)
    )

    final_status = []
    final_confidence = []

    for idx, sim_row in enumerate(sim_matrix):
        status_best = {}

        for score, status, weight in zip(
            sim_row, template_status, template_weight
        ):
            weighted_score = score * weight
            if status not in status_best or weighted_score > status_best[status]:
                status_best[status] = weighted_score

        ranked = sorted(
            status_best.items(),
            key=lambda x: x[1],
            reverse=True
        )

        token_count = len(df.iloc[idx]["subject"].split()) + len(
            df.iloc[idx]["body"].split()
        )
        if token_count < 6 or not ranked:
            status = "unknown"
            conf = 0.0
        else:
            top_status, top_score = ranked[0]
            second_score = ranked[1][1] if len(ranked) > 1 else 0.0

            if top_score < BASE_THRESHOLD:
                status = "unknown"
                conf = 0.0
            elif (top_score - second_score) < AMBIGUITY_MARGIN and top_score < STRONG_SCORE:
                status = "unknown"
                conf = 0.0
            else:
                status = top_status
                conf = round(float(top_score), 3)

        if status == "unknown":
            backoff = backoff_classify(
                df.iloc[idx]["subject"] + " " + df.iloc[idx]["body"]
            )
            if backoff != "unknown":
                status = backoff
                conf = 0.05

        final_status.append(status)
        final_confidence.append(conf)

    df["status"] = final_status
    df["confidence"] = final_confidence

    import os
    os.makedirs("status_outputs", exist_ok=True)
    
    for status in df["status"].unique():
        status_df = df[df["status"] == status]
        status_df.to_csv(f"status_outputs/{status}.csv", index=False)
    
    print(f"\n=== METRICS ===")
    print(f"input:{len(df)}")
    for status in df["status"].unique():
        count = len(df[df["status"] == status])
        print(f"{status}:{count}")
    print(f"==============")

    print("\nTotal job emails:", len(df))
    print("Final status distribution:")
    print(df["status"].value_counts())


if __name__ == "__main__":
    main()
