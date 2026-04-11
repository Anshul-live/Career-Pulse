#!/usr/bin/env python3
"""
Demo Setup - Seeds database with sample job applications
Usage: python3 demo-setup.py [--reset]
"""

import sys
import os
from pathlib import Path
from datetime import datetime, timedelta
import random

project_root = Path(__file__).parent.parent
backend_env = project_root / "backend" / ".env"

def load_env(env_path):
    env_vars = {}
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    env_vars[key.strip()] = value.strip()
    return env_vars

env = load_env(backend_env)
MONGODB_URI = env.get("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = "college_project"

from pymongo import MongoClient
from bson import ObjectId
import bcrypt

DEMO_EMAIL = "demo@careerpulse.app"
DEMO_PASSWORD = "demo123"
DEMO_NAME = "Demo User"

SAMPLE_APPLICATIONS = [
    {
        "company": "Google",
        "role": "Software Engineer",
        "status": "interview",
        "compensation": "$150,000 + $30,000 bonus",
        "location": "Mountain View, CA",
        "platform": "Google Careers",
        "timeline": [
            ("applied", -30),
            ("assessment", -25),
            ("interview", -5),
        ]
    },
    {
        "company": "Microsoft",
        "role": "Frontend Developer",
        "status": "assessment",
        "compensation": "$130,000 + $20,000 bonus",
        "location": "Seattle, WA",
        "platform": "Microsoft Jobs",
        "timeline": [
            ("applied", -20),
            ("assessment", -10),
        ]
    },
    {
        "company": "Amazon",
        "role": "SDE I",
        "status": "applied",
        "compensation": "$118,000 + $55,000 signing",
        "location": "Austin, TX",
        "platform": "Amazon.jobs",
        "timeline": [
            ("applied", -3),
        ]
    },
    {
        "company": "Meta",
        "role": "React Developer",
        "status": "offer",
        "compensation": "$145,000 + $50,000 RSU",
        "location": "Menlo Park, CA",
        "platform": "Meta Careers",
        "timeline": [
            ("applied", -45),
            ("assessment", -35),
            ("interview", -20),
            ("offer", -2),
        ]
    },
    {
        "company": "Netflix",
        "role": "Full Stack Engineer",
        "status": "rejected",
        "compensation": None,
        "location": "Los Gatos, CA",
        "platform": "Netflix Jobs",
        "timeline": [
            ("applied", -60),
            ("assessment", -50),
            ("interview", -40),
            ("rejected", -35),
        ]
    },
    {
        "company": "Stripe",
        "role": "Backend Engineer",
        "status": "interview",
        "compensation": "$170,000 + $100,000 RSU",
        "location": "San Francisco, CA",
        "platform": "Stripe Careers",
        "timeline": [
            ("applied", -15),
            ("interview", -2),
        ]
    },
    {
        "company": "Airbnb",
        "role": "iOS Developer",
        "status": "applied",
        "compensation": "$140,000 + equity",
        "location": "Remote",
        "platform": "Airbnb Careers",
        "timeline": [
            ("applied", -1),
        ]
    },
    {
        "company": "Adobe",
        "role": "UX Engineer",
        "status": "assessment",
        "compensation": "$125,000 + 15% bonus",
        "location": "San Jose, CA",
        "platform": "Adobe Careers",
        "timeline": [
            ("applied", -12),
            ("assessment", -5),
        ]
    },
]

def connect_db():
    client = MongoClient(MONGODB_URI)
    db = client[DB_NAME]
    return client, db

def create_demo_user(db):
    print("Creating demo user...")
    
    existing = db.users.find_one({"email": DEMO_EMAIL})
    if existing:
        print(f"Demo user already exists: {DEMO_EMAIL}")
        return existing["_id"]
    
    hashed = bcrypt.hashpw(DEMO_PASSWORD.encode(), bcrypt.gensalt())
    user = {
        "_id": ObjectId(),
        "email": DEMO_EMAIL,
        "fullName": DEMO_NAME,
        "password": hashed,
        "authProvider": "local",
        "refreshToken": None,
        "lastFetchDate": datetime.now(),
        "googleAccessToken": "demo_token_mock",  # Simulates connected Gmail
        "googleRefreshToken": "demo_refresh_mock",
        "googleTokenExpiry": datetime.now() + timedelta(days=30),
        "createdAt": datetime.now(),
        "updatedAt": datetime.now()
    }
    db.users.insert_one(user)
    print(f"Created demo user: {DEMO_EMAIL} / {DEMO_PASSWORD}")
    return user["_id"]

def seed_applications(db, user_id):
    print("Clearing existing demo data...")
    db.emails.delete_many({"user_id": user_id})
    db.groups.delete_many({"user_id": user_id})
    
    print("Seeding sample applications...")
    created_groups = []
    
    for app in SAMPLE_APPLICATIONS:
        email_ids = []
        
        for i, (status, days_ago) in enumerate(app["timeline"]):
            email_id = ObjectId()
            email_date = datetime.now() - timedelta(days=abs(days_ago))
            
            email = {
                "_id": email_id,
                "user_id": user_id,
                "message_id": f"demo-{app['company']}-{status}-{days_ago}@careerpulse",
                "thread_id": f"thread-{app['company'].lower().replace(' ', '')}",
                "date": email_date,
                "from": f"noreply@{app['platform'].lower().replace(' ', '')}.com",
                "job_related": True,
                "job_confidence": 0.95,
                "status": status,
                "original_status": status if status != "applied" else None,
                "status_reason": None,
                "status_confidence": 0.9,
                "company_name": app["company"],
                "role": app["role"],
                "role_id": f"{app['company'].lower()}-{app['role'].lower().replace(' ', '-')}-001",
                "application_id": f"APP-{app['company'].upper()[:3]}-{random.randint(10000, 99999)}",
                "group_id": None,
                "resolved": True,
                "interview_datetime": email_date + timedelta(days=7) if status == "interview" else None,
                "mode": "Virtual" if random.random() > 0.3 else "Onsite",
                "platform": app["platform"],
                "location": app["location"],
                "meeting_link": "https://meet.google.com/demo-interview" if status == "interview" else None,
                "deadline_datetime": None,
                "duration": "60 minutes" if status == "interview" or status == "assessment" else None,
                "test_link": "https://test.platform.com/demo" if status == "assessment" else None,
                "compensation": app["compensation"],
                "joining_date": (datetime.now() + timedelta(days=60)).isoformat() if status == "offer" else None,
                "createdAt": email_date,
                "updatedAt": email_date
            }
            db.emails.insert_one(email)
            email_ids.append(email_id)
        
        timeline = [
            {
                "status": status,
                "date": datetime.now() - timedelta(days=abs(days_ago)),
                "from_email_id": email_ids[i],
                "triggered_by": "system",
                "notes": None
            }
            for i, (status, days_ago) in enumerate(app["timeline"])
        ]
        
        group_id = ObjectId()
        group = {
            "_id": group_id,
            "user_id": user_id,
            "company_name": app["company"],
            "role": app["role"],
            "application_id": email_ids[0] if email_ids else None,
            "thread_id": f"thread-{app['company'].lower().replace(' ', '')}",
            "state": app["status"],
            "timeline": timeline,
            "email_ids": email_ids,
            "is_merged": False,
            "merged_from": [],
            "notes": None,
            "createdAt": datetime.now() - timedelta(days=abs(app["timeline"][0][1])),
            "updatedAt": datetime.now()
        }
        db.groups.insert_one(group)
        created_groups.append(group)
        
        db.emails.update_many(
            {"_id": {"$in": email_ids}},
            {"$set": {"group_id": group_id}}
        )
        
        print(f"  - {app['company']} ({app['role']}): {app['status']}")
    
    return len(created_groups)

def main():
    reset = "--reset" in sys.argv
    
    client, db = connect_db()
    
    try:
        # Clear ALL demo emails and groups first (in case of orphaned data)
        print("Clearing any existing demo data...")
        db.emails.delete_many({"message_id": {"$regex": "^demo-"}})
        db.groups.delete_many({"company_name": {"$in": [a["company"] for a in SAMPLE_APPLICATIONS]}})
        
        if reset:
            db.users.delete_many({"email": DEMO_EMAIL})
        
        user_id = create_demo_user(db)
        count = seed_applications(db, user_id)
        
        print(f"\n✓ Demo setup complete!")
        print(f"  User: {DEMO_EMAIL}")
        print(f"  Password: {DEMO_PASSWORD}")
        print(f"  Applications: {count}")
        print(f"\nLogin at http://localhost:5173 to view demo.")
        
    finally:
        client.close()

if __name__ == "__main__":
    main()
