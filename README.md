# Career-Pulse

Automatic job application tracking system that processes Gmail emails through a multi-stage ML/LLM pipeline and provides a dashboard to manage applications.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌────────────┐     ┌─────────────┐
│   Gmail     │────▶│   Pipeline   │────▶│   Backend  │────▶│  Frontend   │
│     API     │     │  (Python)   │     │ (Express)  │     │   (React)   │
└─────────────┘     └──────────────┘     └────────────┘     └─────────────┘
                           │                     │
                           │                     ▼
                     ┌─────▼─────┐        ┌────────────┐
                     │  Gemini   │        │  MongoDB   │
                     │   API     │        └────────────┘
                     └───────────┘
```

### Pipeline Flow (sync_user.py)

1. **Fetch** - Gmail API fetches emails for authenticated user
2. **Type Classify** - ML model (TF-IDF + Logistic Regression) filters job-related emails
3. **Stage Classify** - TF-IDF cosine similarity classifies status (applied, interview, etc.)
4. **Extract** - Gemini API extracts structured data (company, role, interview time, etc.)
5. **Upload** - Direct MongoDB upsert

## Prerequisites

- **Node.js** (v18+) + npm
- **Python** (3.9+) + pip
- **MongoDB** (local or Atlas)
- **Gemini API Key** (for LLM extraction — get from https://aistudio.google.com/app/apikey)
- **Google Cloud Console** project (for Gmail API)

## Project Structure

```
career-pulse/
├── backend/           # Express.js API server
├── frontend/          # React + Vite dashboard
├── pipeline/          # Python ML/LLM processing
└── careerpulse.py    # Unified startup script
```

## Quick Start

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
- Starts MongoDB (if not running via brew services)
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

# Create .env file with required variables
```

Edit `.env` with your values:

```env
# Required
PORT=8000
MONGODB_URI=mongodb://localhost:27017
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
ACCESS_TOKEN_SECRET=your_jwt_secret_key

# Optional
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=your_refresh_secret
REFRESH_TOKEN_EXPIRY=7d
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
pip install -r requirements.txt
```

**Setup Gmail API credentials:**

1. Place your `credentials.json` (from Step 1) in the `pipeline/` folder

**Start Gemini API:**

1. Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Add it to `pipeline/.env`:

```env
GEMINI_API_KEY=your_api_key_here
```

---

## Running the Pipeline

### Sync User Emails (via Backend)

The recommended way to sync emails is through the frontend dashboard or via API:

```bash
# Sync for specific user (via sync_user.py directly)
cd pipeline
python3 sync_user.py <user_mongodb_id> [--start-date YYYY-MM-DD] [--end-date YYYY-MM-DD]
```

### Manual Pipeline (pipeline_runner.py)

```bash
cd pipeline
python3 pipeline_runner.py --upload
```

### Individual Stages

```bash
# 1. Fetch emails (requires user tokens in MongoDB)
python3 fetch_emails.py <user_id>

# 2. Classify job vs non-job
python3 type_classifier.py

# 3. Classify by status
python3 stage_classifier.py

# 4. Extract data (requires Gemini API key)
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
  --start-date      Start date for email fetch (YYYY-MM-DD)
  --end-date        End date for email fetch (YYYY-MM-DD)
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/google` | Google OAuth login |
| GET | `/auth/google/callback` | OAuth callback |
| POST | `/users/register` | Register new user |
| POST | `/users/login` | Login user |
| POST | `/users/logout` | Logout user |
| GET | `/users/me` | Get current user |

### Gmail/Emails
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/gmail/emails` | Get all emails with stats |
| PUT | `/gmail/emails/:emailId/status` | Update email status |
| POST | `/gmail/emails/refresh` | Refresh/auto-close statuses |
| POST | `/gmail/upload-emails` | Upload processed emails |
| DELETE | `/gmail/emails/all` | Delete all emails |
| DELETE | `/gmail/emails/:emailId` | Delete single email |
| GET | `/gmail/status` | Check Gmail connection status |
| POST | `/gmail/sync` | Sync emails from Gmail (spawns pipeline) |
| POST | `/gmail/reprocess` | Re-process and group emails |
| GET | `/gmail/last-fetch` | Get last fetch date |
| POST | `/gmail/last-fetch` | Update last fetch date |

### Groups
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/groups` | Get all application groups |
| GET | `/groups/:groupId` | Get single group with emails |
| PUT | `/groups/:groupId/state` | Update group status |
| POST | `/groups/merge` | Merge multiple groups |
| POST | `/groups/:groupId/split` | Split group emails |
| PUT | `/groups/:groupId/notes` | Add notes to group |
| DELETE | `/groups/:groupId` | Delete a group |

---

## Email Statuses

| Status | Description | Dashboard Fields |
|--------|-------------|------------------|
| `opportunities` | Job alerts/hiring notifications | - |
| `applied` | Application submitted | Platform, Application ID, Location |
| `interview` | Interview scheduled | Date/Time, Mode, Location, Duration, Meeting Link |
| `assessment` | Coding test/assessment | Deadline, Duration, Test Link |
| `offer` | Job offer received | Compensation, Joining Date, Deadline |
| `rejected` | Application rejected | - |
| `closed` | Manually or auto-closed | - |
| `unknown` | Unclassified | - |

The dashboard displays status badges with icons and relevant fields based on email type. Unknown emails can be resolved via the "Resolve" page in the navbar.

---

## Auto-Close Rules

The backend automatically closes statuses based on:
- **Assessment**: 2 hours after deadline (or 7 days if no deadline)
- **Interview**: 2 hours after interview time (or 7 days if no time)
- **Offer**: When deadline passes
- **Opportunities**: 3 days after deadline (or 3 days if no deadline)

---

## Dashboard Features

### List View
- Shows recent applications sorted by date
- Status badges with icons (applied, interview, assessment, offer, rejected, closed)
- Relevant fields displayed based on email type
- Click to expand details or edit

### Timeline View
- Groups emails by application into timelines
- Shows chronological progression through application stages
- Status badges and relevant fields per email
- Edit status directly from timeline

### Groups View
- Grid view of all applications grouped by company
- Filter by status
- Click to view full timeline with all related emails

### Resolve Unknowns Page
- Manually classify emails marked as "unknown"
- Extract company/role from email subject automatically
- Set status (applied, interview, assessment, offer, rejected)
- View email body to make informed decisions
- Badge count in navbar updates automatically when resolved

---

## Data Models

### Email Schema
- `user_id`: Reference to User
- `message_id`: Gmail message ID (unique)
- `thread_id`: Gmail thread ID
- `date`: Email date
- `from`: Sender
- `status`: Current status (applied, interview, etc.)
- `company_name`, `role`: Extracted job details
- `application_id`: Job application reference
- `interview_datetime`, `meeting_link`: Interview details
- `deadline_datetime`, `test_link`: Assessment details
- `compensation`, `joining_date`: Offer details
- `group_id`: Reference to Group

### Group Schema
- `user_id`: Reference to User
- `company_name`, `role`: Application details
- `application_id`, `thread_id`: For grouping
- `state`: Current state (from statuses)
- `timeline`: Array of status changes
- `email_ids`: References to Emails
- `is_merged`, `merged_from`: Merge tracking
- `notes`: User notes

---

## Training the Classifier

To retrain the job email classifier:

```bash
cd pipeline
python3 train_type_classifier.py
```

This will create a new `job_email_classifier.joblib` file using `corpus.csv`.

---

## Troubleshooting

### Gmail API Errors
- Ensure credentials.json is properly downloaded
- Check Gmail API is enabled in Google Cloud Console

### MongoDB Connection
- Verify MongoDB is running: `brew services list | grep mongodb`
- Check `MONGODB_URI` in backend/.env

### Gemini API Errors
- Ensure GEMINI_API_KEY is set in pipeline/.env
- Check your API quota at https://aistudio.google.com/app/apikey
- Default model is gemini-2.0-flash; override with GEMINI_MODEL env var

### Token Issues
- Delete `.token` file and run with `--login` flag
- Ensure frontend OAuth redirect URI matches Google Console

---

## Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS 4, React Router, Recharts
- **Backend:** Express.js 5, MongoDB/Mongoose, Passport.js (Google OAuth), JWT
- **ML Pipeline:** scikit-learn (TF-IDF), Google Gemini API
- **Gmail API:** Google APIs Client Library for Python
