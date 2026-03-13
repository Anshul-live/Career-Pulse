# Career-Pulse

Automatic job application tracking system that processes Gmail emails through a multi-stage ML/LLM pipeline and provides a dashboard to manage applications.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌────────────┐     ┌─────────────┐
│   Gmail     │────▶│   Pipeline   │────▶│   Backend  │────▶│  Frontend   │
│     API     │     │  (Python)    │     │ (Express)  │     │   (React)   │
└─────────────┘     └──────────────┘     └────────────┘     └─────────────┘
                           │                     │
                           │                     ▼
                     ┌─────▼─────┐        ┌────────────┐
                     │  Ollama   │        │  MongoDB   │
                     │  (LLM)    │        └────────────┘
                     └───────────┘
```

### Pipeline Flow

1. **Fetch** - Gmail API fetches emails (last 30 days)
2. **Type Classify** - ML model (TF-IDF + Logistic Regression) filters job-related emails
3. **Stage Classify** - TF-IDF cosine similarity classifies status (applied, interview, etc.)
4. **Extract** - Ollama LLM extracts structured data (company, role, interview time, etc.)
5. **Upload** - POST to Express API → MongoDB

## Prerequisites

- **Node.js** (v18+) + npm
- **Python** (3.9+) + pip
- **MongoDB** (local or Atlas)
- **Ollama** (for LLM extraction)
- **Google Cloud Console** project (for Gmail API)

## Project Structure

```
career-pulse/
├── backend/           # Express.js API server
├── frontend/          # React + Vite dashboard
├── pipeline/          # Python ML/LLM processing
└── careerpulse.py     # Unified startup script
```

## Quick Start (Demo Mode)

Run everything with one command:

```bash
# Start all services (MongoDB + Backend + Frontend)
python3 careerpulse.py

# Start services + run pipeline
python3 careerpulse.py --pipeline

# Start services + run pipeline (skip email fetch)
python3 careerpulse.py --pipeline --skip-fetch

# Start services + run pipeline + upload to backend
python3 careerpulse.py --pipeline --skip-fetch --upload
```

**careerpulse.py** automatically:
- Starts MongoDB (if not running)
- Checks Ollama status
- Starts Backend on http://localhost:8000
- Starts Frontend on http://localhost:5173

### Other Commands

```bash
# Stop all services
python3 careerpulse.py --stop

# Start MongoDB only
python3 careerpulse.py --mongo-only

# See all options
python3 careerpulse.py --help
```

---

## Setup Guide (Manual)

### Step 1: Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable **Gmail API**
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:8000/auth/google/callback`
5. Download credentials as `credentials.json` to `pipeline/` folder

---

### Step 2: Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

Edit `.env` with your values:

```env
# Required
PORT=8000
MONGO_URI=mongodb://localhost:27017/careerpulse
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
ACCESS_TOKEN_SECRET=your_jwt_secret_key

# Optional (for production)
CORS_ORIGIN=http://localhost:5173
```

**Start backend:**
```bash
npm run dev
```

---

### Step 3: Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs at `http://localhost:5173`

---

### Step 4: Pipeline Setup

```bash
cd pipeline

# Install Python dependencies
pip install pandas scikit-learn aiohttp beautifulsoup4 requests

# Or use requirements.txt (create one)
pip install -r requirements.txt
```

**Setup Gmail API credentials:**

1. Place your `credentials.json` (from Step 1) in the `pipeline/` folder

**Start Ollama (for extraction):**

```bash
# Install Ollama from https://ollama.ai
ollama serve
ollama pull llama3.1:8b
```

---

## Running the Pipeline

### Full Pipeline (with upload)

```bash
cd pipeline
python3 pipeline_runner.py --upload
```

This will:
1. Fetch emails from Gmail
2. Classify job-related emails
3. Classify by status
4. Extract structured data with LLM
5. Upload to backend

### Individual Stages

```bash
# 1. Fetch emails
python3 fetch_emails.py

# 2. Classify job vs non-job
python3 type_classifier.py

# 3. Classify by status
python3 stage_classifier.py

# 4. Extract data (requires Ollama)
python3 extract.py

# 5. Convert to JSON
python3 convert_to_json.py

# 6. Upload to backend
python3 upload_to_backend.py YOUR_JWT_TOKEN
```

### Pipeline Options

```bash
python3 pipeline_runner.py --help

Options:
  --skip-fetch      Skip fetching emails (use existing emails.csv)
  --upload          Upload to backend after conversion
  --clean           Clean intermediate files after completion
  --token TOKEN     JWT token for backend upload
  --backend URL     Backend URL (default: http://localhost:8000)
  --force-fetch     Force fetch all emails (ignore last fetch date)
  --login           Force new Google OAuth login
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/google` | Google OAuth login |
| GET | `/auth/google/callback` | OAuth callback |
| POST | `/gmail/upload-emails` | Upload processed emails |
| GET | `/gmail/emails` | Get all emails with stats |
| PUT | `/gmail/emails/:emailId/status` | Update email status |
| POST | `/gmail/emails/refresh` | Auto-refresh statuses |
| DELETE | `/gmail/emails/all` | Delete all emails |

---

## Email Statuses

| Status | Description |
|--------|-------------|
| `applied` | Application submitted |
| `interview` | Interview scheduled |
| `assessment` | Coding test/assessment |
| `offer` | Job offer received |
| `rejected` | Application rejected |
| `closed` | Manually or auto-closed |
| `unknown` | Unclassified |

---

## Auto-Close Rules

The backend automatically closes statuses based on:
- **Assessment**: 2 hours after deadline (or 7 days if no deadline)
- **Interview**: 2 hours after interview time (or 7 days if no time)
- **Offer**: When deadline passes

---

## Training the Classifier

To retrain the job email classifier:

```bash
cd pipeline
python3 train_type_classifier.py
```

This will create a new `job_email_classifier.joblib` file.

---

## Troubleshooting

### Gmail API Errors
- Ensure credentials.json is properly downloaded
- Check Gmail API is enabled in Google Cloud Console

### MongoDB Connection
- Verify MongoDB is running
- Check MONGO_URI in backend/.env

### Ollama Errors
- Ensure Ollama is running: `ollama serve`
- Pull the model: `ollama pull llama3.1:8b`

### Token Issues
- Delete `.token` file and run with `--login` flag
- Ensure frontend OAuth redirect URI matches Google Console

---

## Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS 4, React Router
- **Backend:** Express.js, MongoDB, Passport.js (Google OAuth), JWT
- **ML Pipeline:** scikit-learn (TF-IDF), Ollama (llama3.1:8b)
- **Gmail API:** Google APIs Client Library for Python
