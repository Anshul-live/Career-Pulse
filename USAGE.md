# CareerPulse — Setup & Usage Guide

## Prerequisites

Install these before starting:

1. **Node.js** (v18+) — [nodejs.org](https://nodejs.org)
2. **Python** (3.9+) — [python.org](https://www.python.org/downloads/)
3. **MongoDB** (7.0+) — [mongodb.com/try/download](https://www.mongodb.com/try/download/community)
4. **Google Cloud Console** project with Gmail API enabled
5. **Gemini API Key** — [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

---

## Step 1: Install Dependencies

```bash
node start.js --install
```

This installs npm packages for backend and frontend, Python packages for the pipeline, and creates `.env` files from templates.

---

## Step 2: Configure Environment

### Backend (`backend/.env`)

```env
PORT=8000
MONGODB_URI=mongodb://localhost:27017
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
ACCESS_TOKEN_SECRET=<any-random-secret-string>
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=<another-random-secret-string>
REFRESH_TOKEN_EXPIRY=7d
CORS_ORIGIN=http://localhost:5173
```

To get Google OAuth credentials:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or use existing)
3. Enable **Gmail API**
4. Go to Credentials → Create OAuth 2.0 Client ID
5. Set authorized redirect URI: `http://localhost:8000/google/callback`
6. Copy Client ID and Client Secret into `backend/.env`

### Pipeline (`pipeline/.env`)

```env
GEMINI_API_KEY=<your-gemini-api-key>
```

Get your key from [Google AI Studio](https://aistudio.google.com/app/apikey) → Create API key.

---

## Step 3: Start Everything

```bash
node start.js
```

This starts MongoDB, Backend (port 8000), and Frontend (port 5173) in one command.

Open **http://localhost:5173** in your browser.

---

## Step 4: Use the App

1. Click **Sign In** → **Continue with Google**
2. Authorize Gmail access
3. You'll be redirected to the Dashboard
4. Click **Sync** to fetch and process your job emails
5. View your applications in **Dashboard** and **Groups**

---

## Pipeline (Manual Run)

The pipeline processes emails through these stages:

```
Gmail Fetch → Type Classify → Stage Classify → Gemini Extract → Upload
```

### Run the full pipeline manually:

```bash
cd pipeline

# 1. Stage classification (if you have job_emails.csv)
python stage_classifier.py

# 2. Extract structured data with Gemini
python extract.py

# 3. Convert to JSON
python convert_to_json.py

# 4. Upload to backend
python upload_to_backend.py <your-jwt-token>
```

### Train the type classifier (optional):

```bash
cd pipeline
# Requires corpus.csv with labeled training data
python train_type_classifier.py
```

---

## Stopping Services

Press `Ctrl+C` in the terminal where `node start.js` is running.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| MongoDB won't start | Make sure port 27017 is free. Check if MongoDB is installed correctly. |
| Google OAuth fails | Verify redirect URI in Cloud Console matches `http://localhost:8000/google/callback` |
| Gemini API 429 error | Free tier quota exceeded. Wait a minute or enable billing on your Google Cloud project. |
| Python not found | Ensure Python is on your PATH, or set `PYTHON_PATH` env variable. |
| "No Subject" in dashboard | This is expected for older data. New syncs show company name and role. |
| Pipeline fails on sync | Check backend logs for Python path issues. Ensure `pipeline/.env` has your Gemini key. |

---

## Project Structure

```
career-pulse/
├── start.js              # Single command startup
├── backend/              # Express.js API (port 8000)
│   ├── src/
│   │   ├── controllers/  # Route handlers
│   │   ├── models/       # Mongoose schemas
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   └── utils/        # Helpers
│   └── .env.example
├── frontend/             # React + Vite (port 5173)
│   └── src/
│       ├── components/   # UI components
│       ├── context/      # Auth context
│       └── pages/        # Route pages
├── pipeline/             # Python ML/LLM pipeline
│   ├── extract.py        # Gemini API extraction
│   ├── stage_classifier.py
│   ├── type_classifier.py
│   ├── sync_user.py      # End-to-end sync script
│   └── .env.example
└── README.md
```
