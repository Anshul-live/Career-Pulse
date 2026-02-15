import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report

# DATA_FILE = "training_data.csv"
DATA_FILE = "corpus.csv"
MODEL_FILE = "job_email_classifier.joblib"


def main():
    df = pd.read_csv(DATA_FILE)

    # ---- column validation ----
    required_cols = {"subject", "body", "label"}
    missing = required_cols - set(df.columns)
    if missing:
        raise ValueError(f"Missing columns in CSV: {missing}")

    # ---- text construction ----
    df["text"] = (
        "[SUBJECT] " + df["subject"].fillna("") + " [BODY] " + df["body"].fillna("")
    )

    # ---- label normalization ----
    # Empty / NaN / anything not 1 -> 0
    df["label"] = df["label"].fillna(0)
    df["label"] = df["label"].astype(int)

    # ---- sanity check (important) ----
    print("Label distribution:")
    print(df["label"].value_counts())
    print()

    X = df["text"]
    y = df["label"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = Pipeline(
        [
            (
                "tfidf",
                TfidfVectorizer(
                    stop_words="english",
                    ngram_range=(1, 2),
                    min_df=2,
                    max_df=0.9,
                    sublinear_tf=True,
                ),
            ),
            (
                "clf",
                LogisticRegression(max_iter=1000, class_weight="balanced", n_jobs=-1),
            ),
        ]
    )

    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    print(
        classification_report(
            y_test, y_pred, digits=3, target_names=["non_job_related", "job_related"]
        )
    )

    joblib.dump(model, MODEL_FILE)
    print(f"Model saved to {MODEL_FILE}")


if __name__ == "__main__":
    main()
