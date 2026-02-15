import pandas as pd
import joblib
import os
import sys

MODEL_FILE = "job_email_classifier.joblib"
INPUT_FILE = "emails.csv"
JOB_OUTPUT = "job_emails.csv"
NON_JOB_OUTPUT = "non_job_emails.csv"
THRESHOLD = 0.5


def main():
    if not os.path.exists(MODEL_FILE):
        print("Model file not found.")
        sys.exit(1)

    # Support both emails.csv and my_emails.csv
    input_file = INPUT_FILE
    if not os.path.exists(INPUT_FILE):
        if os.path.exists("my_emails.csv"):
            input_file = "my_emails.csv"
            print(f"Using input file: {input_file}")
        else:
            print("Input CSV not found (tried emails.csv and my_emails.csv).")
            sys.exit(1)

    model = joblib.load(MODEL_FILE)

    df = pd.read_csv(input_file)

    if "subject" not in df.columns or "body" not in df.columns:
        raise ValueError("CSV must contain 'subject' and 'body' columns")

    # ---- EXACT training format reproduction ----
    df["subject"] = df["subject"].fillna("")
    df["body"] = df["body"].fillna("")

    df["text"] = "[SUBJECT] " + df["subject"] + " [BODY] " + df["body"]

    # ---- Predict probabilities ----
    probs = model.predict_proba(df["text"])[:, 1]

    df["confidence"] = probs.round(4)
    df["job_related"] = (probs >= THRESHOLD).astype(int)

    # ---- Split into two files ----
    job_df = df[df["job_related"] == 1].drop(columns=["text"])
    non_job_df = df[df["job_related"] == 0].drop(columns=["text"])

    job_df.to_csv(JOB_OUTPUT, index=False)
    non_job_df.to_csv(NON_JOB_OUTPUT, index=False)

    print(f"\n=== METRICS ===")
    print(f"total:{len(df)}")
    print(f"job_related:{len(job_df)}")
    print(f"non_job:{len(non_job_df)}")
    print(f"rate:{len(job_df)/len(df)*100:.1f}%")
    print(f"==============")

    print("\nTotal emails:", len(df))
    print("Job-related:", len(job_df))
    print("Non-job-related:", len(non_job_df))
    print("Outputs saved:")
    print(" -", JOB_OUTPUT)
    print(" -", NON_JOB_OUTPUT)


if __name__ == "__main__":
    main()
