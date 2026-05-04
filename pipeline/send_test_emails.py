"""
Send test job application emails to yourself via Gmail SMTP.

Setup:
  1. Go to https://myaccount.google.com/apppasswords
  2. Generate an app password for "Mail"
  3. Run: python send_test_emails.py your_email@gmail.com your_app_password

The script sends 10 emails simulating 3 job application journeys.
"""

import smtplib
import sys
import time
from email.mime.text import MIMEText

EMAILS = [
    {
        "subject": "Application Received - Software Engineer at Google (GOOG-2025-7842)",
        "body": """Dear Candidate,

Thank you for applying to the Software Engineer position at Google. Your application has been received and is now under review by our hiring team.

Application ID: GOOG-2025-7842
Position: Software Engineer L4
Location: Mountain View, CA

No further action is required at this stage. We will contact you if your profile matches our requirements.

Best regards,
Google Careers Team"""
    },
    {
        "subject": "Online Assessment Invitation - Google SWE (GOOG-2025-7842)",
        "body": """Dear Candidate,

Congratulations! You have been shortlisted for the next round. Please complete the online coding assessment for the Software Engineer position at Google.

Application ID: GOOG-2025-7842
Platform: HackerRank
Test Link: https://www.hackerrank.com/test/google-swe-2025
Duration: 90 minutes
Deadline to Complete the Test: May 15, 2025 11:59 PM PST

Please ensure you complete the assessment before the deadline.

Best regards,
Google Recruiting"""
    },
    {
        "subject": "Interview Scheduled - Google SWE Round 1 (GOOG-2025-7842)",
        "body": """Dear Candidate,

We are pleased to inform you that you have passed the assessment. We would like to schedule your first technical interview.

Application ID: GOOG-2025-7842
Interview Date: May 22, 2025 at 10:00 AM PST
Mode: Virtual
Platform: Google Meet
Meeting Link: https://meet.google.com/abc-defg-hij
Topics: Data Structures and Algorithms

Please confirm your availability by replying to this email.

Best regards,
Google Recruiting"""
    },
    {
        "subject": "Offer Letter - Software Engineer at Google (GOOG-2025-7842)",
        "body": """Dear Candidate,

We are pleased to offer you the position of Software Engineer L4 at Google!

Application ID: GOOG-2025-7842
Compensation: $185,000 base salary + $80,000 equity/year + $15,000 signing bonus
Location: Mountain View, CA
Joining Date: July 1, 2025
Deadline to Accept: June 1, 2025

Please review and sign the attached offer letter by the deadline.

Congratulations!
Google HR Team"""
    },
    {
        "subject": "Application Confirmation - SDE II at Amazon",
        "body": """Thank you for your interest in the SDE II role at Amazon Web Services. Your application has been successfully submitted.

Application ID: AMZ-SDE2-44210
Position: Software Development Engineer II
Team: AWS Infrastructure

Your profile is under initial screening by our hiring team. We will reach out within 2 weeks.

Best,
Amazon Hiring Team"""
    },
    {
        "subject": "Online Assessment - Amazon SDE II (AMZ-SDE2-44210)",
        "body": """Dear Candidate,

An online assessment has been assigned to you for the SDE II position at Amazon.

Application ID: AMZ-SDE2-44210
Platform: HackerRank
Test Link: https://www.hackerrank.com/test/amazon-sde2-2025
Duration: 120 minutes
Deadline to Complete the Test: May 18, 2025 11:59 PM PST

Failure to complete the assessment by the deadline may affect your application.

Regards,
Amazon Recruiting"""
    },
    {
        "subject": "Application Update - Amazon SDE II (AMZ-SDE2-44210)",
        "body": """Dear Candidate,

We regret to inform you that after careful consideration, we have decided not to proceed with your application for the SDE II position at Amazon.

Application ID: AMZ-SDE2-44210

We appreciate your interest in Amazon and encourage you to apply for future opportunities.

Best regards,
Amazon Talent Acquisition"""
    },
    {
        "subject": "Application Received - Backend Engineer at Stripe",
        "body": """Hi,

Thank you for applying to the Backend Engineer role at Stripe. We have received your application and it is currently under review.

Application ID: STR-2025-4421
Position: Backend Engineer
Location: San Francisco, CA

We will be in touch soon.

Stripe Talent Team"""
    },
    {
        "subject": "Interview Scheduled - Stripe Backend Engineer (STR-2025-4421)",
        "body": """Dear Candidate,

Your interview has been scheduled for the Backend Engineer position at Stripe.

Application ID: STR-2025-4421
Interview Date: May 28, 2025 at 11:00 AM PST
Mode: Virtual
Platform: Zoom
Meeting Link: https://zoom.us/j/3344556677
Topics: API design, distributed systems, and pair programming

Please join 5 minutes early.

Best,
Stripe Recruiting"""
    },
    {
        "subject": "Regret - Backend Engineer at Stripe (STR-2025-4421)",
        "body": """Dear Candidate,

Unfortunately we will not be moving forward with your application for the Backend Engineer position at Stripe.

Application ID: STR-2025-4421

We have decided to pursue other candidates at this time. We appreciate your interest and encourage you to apply for future opportunities.

Best regards,
Stripe Talent Team"""
    },
]


def main():
    if len(sys.argv) < 3:
        print("Usage: python send_test_emails.py <your_gmail> <app_password>")
        print()
        print("Get an app password at: https://myaccount.google.com/apppasswords")
        sys.exit(1)

    email_addr = sys.argv[1]
    app_password = sys.argv[2]

    print(f"Sending {len(EMAILS)} test emails to {email_addr}...")

    server = smtplib.SMTP_SSL("smtp.gmail.com", 465)
    server.login(email_addr, app_password)

    for i, email in enumerate(EMAILS):
        msg = MIMEText(email["body"])
        msg["Subject"] = email["subject"]
        msg["From"] = email_addr
        msg["To"] = email_addr

        server.sendmail(email_addr, email_addr, msg.as_string())
        print(f"  [{i+1}/{len(EMAILS)}] Sent: {email['subject'][:60]}")
        time.sleep(2)  # small delay between sends

    server.quit()
    print(f"\nDone! All {len(EMAILS)} emails sent to {email_addr}")
    print("Wait a minute for them to arrive, then sync from the dashboard.")


if __name__ == "__main__":
    main()
