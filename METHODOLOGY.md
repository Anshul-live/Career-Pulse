# Career-Pulse Methodology

## Overview
Career-Pulse automatically tracks job applications by processing Gmail emails through a multi-stage ML/LLM pipeline.

## Architecture

```
Gmail API → Type Classifier → Stage Classifier → Extraction → Database
```

## Pipeline Stages

### 1. Email Fetching
- Uses Gmail API with OAuth 2.0
- Fetches emails from last 30 days
- Extracts: message_id, date, from, subject, body

### 2. Type Classification (ML)
- **Model:** TF-IDF + Logistic Regression
- **Purpose:** Filter job-related emails from spam/personal
- **Threshold:** 0.5 probability

### 3. Stage Classification (ML)
- **Model:** TF-IDF Cosine Similarity
- **Templates:** phrases.json (handcrafted phrases per status)
- **Weights:** Subject (70%), Body (30%)
- **Fallback:** Keyword-based backoff rules

### 4. Data Extraction (LLM)
- **Model:** Ollama (llama3.1:8b)
- **Purpose:** Verify status + extract structured fields
- **Fields:** company_name, role, interview_datetime, compensation, etc.

### 5. Upload & Storage
- Convert to JSON → POST to Express API → MongoDB

## Tech Stack
- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Express.js + MongoDB
- **ML:** scikit-learn (TF-IDF)
- **LLM:** Ollama (local)
- **Auth:** Google OAuth 2.0 + JWT

## Key Features
- Automatic job application tracking
- Real-time status updates
- Dashboard with analytics
- Email-to-Gmail integration
