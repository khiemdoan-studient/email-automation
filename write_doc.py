"""Write formatted documentation to the Email Automation Google Doc."""
import sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from google.oauth2 import service_account
from googleapiclient.discovery import build

creds = service_account.Credentials.from_service_account_file(
    r"C:\Users\doank\Documents\Projects\Studient Excel Automation\service account key.json",
    scopes=["https://www.googleapis.com/auth/documents"])
docs = build("docs", "v1", credentials=creds)
DOC_ID = "1CDTKCSgFN5vsljZLnK-JiEd1b8RY1MFxtTd7P-SLyZk"

# Clear existing content
doc = docs.documents().get(documentId=DOC_ID).execute()
body_content = doc.get("body", {}).get("content", [])
end_index = body_content[-1]["endIndex"] if body_content else 1
requests = []
if end_index > 2:
    requests.append({"deleteContentRange": {"range": {"startIndex": 1, "endIndex": end_index - 1}}})

text = (
    "Email Automation\n"
    "User Guide & Documentation\n"
    "\n"
    "What Is This?\n"
    "This system automatically creates email drafts in Gmail for every teacher you manage. "
    "Each email includes the teacher\u2019s performance data, a list of student achievement awards, "
    "and a PDF report attached. You don\u2019t need to write any emails manually \u2014 the system builds them for you.\n"
    "\n"
    "How to Send Weekly Emails (3 Steps)\n"
    "\n"
    "Step 1: Update the date range\n"
    "Open the spreadsheet. Go to the Config tab. Change the Date Range to match this week\u2019s folder "
    "(for example: 2026-03-30_to_2026-04-05). This tells the system which week of data to use.\n"
    "\n"
    "Step 2: Run the data pipeline\n"
    "Open a terminal and run:  python generate_report_v3.py\n"
    "This does two things automatically:\n"
    "\u2022 Pulls this week\u2019s Teacher Metrics from the database and writes them to the spreadsheet\n"
    "\u2022 Pulls the last 6 weeks of Student Achievement data and writes the winners to the spreadsheet\n"
    "You used to download Teacher Metrics manually from QuickSight. You no longer need to do that.\n"
    "\n"
    "Step 3: Generate the email drafts\n"
    "Go back to the spreadsheet. Click Email Tools in the menu bar, then click Generate My Email Drafts. "
    "Wait for it to finish. Check your Gmail Drafts folder \u2014 you\u2019ll see one draft per teacher, "
    "ready to review and send.\n"
    "\n"
    "Important: These 3 steps do not happen automatically. You must do all three each week, in this order.\n"
    "\n"
    "What\u2019s in Each Email?\n"
    "\n"
    "Each teacher receives an email with these sections:\n"
    "\u2022 Performance Table \u2014 Avg Active Days and Avg Minutes per grade, color-coded green/yellow/red\n"
    "\u2022 Current Trend \u2014 A message based on overall performance (on track, close, or needs attention)\n"
    "\u2022 Weekly Focus \u2014 This week\u2019s coaching theme and 3 action items\n"
    "\u2022 Student Achievement Awards \u2014 Students who hit milestones in the last 6 weeks\n"
    "\u2022 Resources \u2014 Links to AIM Launches, Pomodoro Timer, and Goal Tracker sheets\n"
    "\u2022 Weekly Challenge & Reflection Prompt\n"
    "\u2022 PDF Attachment \u2014 The teacher\u2019s detailed data report\n"
    "\n"
    "Student Achievement Awards\n"
    "\n"
    "The awards table highlights students who reached specific milestones. Each student appears only once, "
    "in their highest category. The table has two columns:\n"
    "\u2022 3+ Weeks \u2014 Students who hit the milestone in 3 or more of the last 6 weeks\n"
    "\u2022 1-2 Times \u2014 Students who hit it once or twice\n"
    "\n"
    "Categories (highest to lowest):\n"
    "\u2022 Grade Level Mastered \u2014 Passed a placement test\n"
    "\u2022 10+ Lessons/Week \u2014 Completed 10+ lessons (excludes from 5+ category)\n"
    "\u2022 5+ Lessons/Week \u2014 Completed 5-9 lessons\n"
    "\u2022 Resilience Award \u2014 Failed a test then later passed the same subject\n"
    "\u2022 125+ Minutes \u2014 Spent 125+ minutes (excludes from 100+ category)\n"
    "\u2022 100+ Minutes \u2014 Spent 100-124 minutes\n"
    "\u2022 4.5+ Active Days \u2014 Active 5+ days/week (excludes from 4+ category)\n"
    "\u2022 4+ Active Days \u2014 Active exactly 4 days/week\n"
    "\n"
    "Color Coding\n"
    "\n"
    "Performance table colors:\n"
    "\u2022 Green \u2014 Avg Active Days 4+, Avg Minutes 100+\n"
    "\u2022 Yellow \u2014 Avg Active Days 3, Avg Minutes 80-99\n"
    "\u2022 Red \u2014 Avg Active Days 1-2, Avg Minutes below 80\n"
    "\n"
    "Current Trend messages:\n"
    "\u2022 Green: \u201CGreat work! Your students are on track and meeting their goals.\u201D\n"
    "\u2022 Yellow: \u201CYou\u2019re close \u2014 schedule at least 35 minutes daily.\u201D\n"
    "\u2022 Red: \u201CYour class isn\u2019t meeting time goals yet \u2014 students need 35 minutes daily.\u201D\n"
    "\n"
    "Spreadsheet Tabs Explained\n"
    "\n"
    "Config \u2014 The date range for this week. This is the only tab you need to edit each week.\n"
    "\n"
    "School-IM Mapping \u2014 Controls which schools you generate emails for. The system checks your "
    "email address against this list to find your assigned schools.\n"
    "\n"
    "Teacher Emails \u2014 A live feed of teacher names and emails from the master roster. Do not edit.\n"
    "\n"
    "Teacher Metrics \u2014 This week\u2019s performance numbers for every teacher. Auto-populated by the pipeline "
    "(Step 2). Previously required a manual download from QuickSight. Do not edit manually.\n"
    "\n"
    "Student Winners \u2014 Student achievement data for the last 6 weeks. Auto-populated by the pipeline. "
    "Do not edit manually.\n"
    "\n"
    "Reading Teachers \u2014 Teacher names and emails for Reading Community City School District. "
    "Manual list because the roster import doesn\u2019t include emails for this district. "
    "Add new Reading teachers here when hired.\n"
    "\n"
    "PDF Attachments\n"
    "\n"
    "The system finds PDF files in Google Drive at this path:\n"
    "Bruna and Mark\u2019s Schools - Weekly Report > School Folder > Teacher Folder > Date Folder > PDF\n"
    "The PDF filename must start with \u201C00\u201D and contain \u201CSUMMARY.\u201D "
    "If the folder or PDF is missing, that teacher shows as an error.\n"
    "\n"
    "Schools and Assigned IMs\n"
    "\n"
    "\u2022 AASP - Allendale Aspire Academy \u2192 frank.galindo@studient.com\n"
    "\u2022 AFES - Allendale Fairfax Elementary \u2192 alicia.westcot@studient.com\n"
    "\u2022 AFMS - Allendale Fairfax Middle \u2192 margaret.olah@studient.com\n"
    "\u2022 JHES - Hardeeville Elementary \u2192 kelli.helle@studient.com\n"
    "\u2022 JHMS - Hardeeville Jr/Sr High \u2192 gaston.griffin@studient.com\n"
    "\u2022 JRES - Ridgeland Elementary \u2192 tony.disario@studient.com\n"
    "\u2022 JRHS - Ridgeland Secondary Academy \u2192 allison.atkins@studient.com\n"
    "\u2022 Metro Schools \u2192 margaret.olah@studient.com\n"
    "\u2022 Reading Community \u2192 frank.galindo@studient.com\n"
    "\n"
    "Troubleshooting\n"
    "\n"
    "\u201CNo teachers found\u201D \u2014 Your email isn\u2019t in School-IM Mapping, or teachers are missing from the roster.\n"
    "\n"
    "\u201CTeacher folder not found\u201D \u2014 The Drive folder doesn\u2019t exist or has a different name.\n"
    "\n"
    "\u201CNo data available\u201D in the email \u2014 Teacher Metrics is empty for that teacher. "
    "Make sure you ran Step 2 first.\n"
    "\n"
    "\u201CNo student achievement data\u201D \u2014 None of that teacher\u2019s students hit milestones in the last 6 weeks.\n"
    "\n"
    "Version History\n"
    "\n"
    "v1.2.1 \u2014 April 7, 2026\n"
    "\u2022 Teacher Metrics now auto-populated (no more QuickSight download)\n"
    "\u2022 Fixed name matching for middle names and spelling variations\n"
    "\u2022 Added Queenie Henry to Reading Teachers\n"
    "\n"
    "v1.2.0 \u2014 April 6, 2026\n"
    "\u2022 Added Student Achievement Awards table to emails\n"
    "\u2022 New email theme: Culture, Shoutouts & Rewards\n"
    "\u2022 AIM Launches updated to Weeks 6, 7, 8\n"
    "\u2022 Added Reading Teachers tab\n"
    "\n"
    "v1.1.0 \u2014 March 29, 2026\n"
    "\u2022 New theme: Mental Focus & Persistence with coaching strategies\n"
    "\u2022 Conditional trend messages (green/yellow/red)\n"
    "\n"
    "v1.0.0 \u2014 March 23, 2026\n"
    "\u2022 Initial release\n"
)

requests.append({"insertText": {"location": {"index": 1}, "text": text}})
docs.documents().batchUpdate(documentId=DOC_ID, body={"requests": requests}).execute()
print("Text inserted.")

# --- Formatting ---
fmt = []
idx = 1
end = 1 + text.index("\n")
fmt.append({"updateParagraphStyle": {"range": {"startIndex": idx, "endIndex": end},
    "paragraphStyle": {"namedStyleType": "HEADING_1"}, "fields": "namedStyleType"}})

sub_start = end + 1
sub_end = sub_start + len("User Guide & Documentation")
fmt.append({"updateParagraphStyle": {"range": {"startIndex": sub_start, "endIndex": sub_end},
    "paragraphStyle": {"namedStyleType": "SUBTITLE"}, "fields": "namedStyleType"}})

for title in ["What Is This?", "How to Send Weekly Emails (3 Steps)",
    "What\u2019s in Each Email?", "Student Achievement Awards", "Color Coding",
    "Spreadsheet Tabs Explained", "PDF Attachments", "Schools and Assigned IMs",
    "Troubleshooting", "Version History"]:
    i = text.find(title)
    if i >= 0:
        fmt.append({"updateParagraphStyle": {"range": {"startIndex": 1+i, "endIndex": 1+i+len(title)},
            "paragraphStyle": {"namedStyleType": "HEADING_2"}, "fields": "namedStyleType"}})

for title in ["Step 1: Update the date range", "Step 2: Run the data pipeline",
    "Step 3: Generate the email drafts"]:
    i = text.find(title)
    if i >= 0:
        fmt.append({"updateParagraphStyle": {"range": {"startIndex": 1+i, "endIndex": 1+i+len(title)},
            "paragraphStyle": {"namedStyleType": "HEADING_3"}, "fields": "namedStyleType"}})

imp = "Important: These 3 steps do not happen automatically. You must do all three each week, in this order."
i = text.find(imp)
if i >= 0:
    fmt.append({"updateTextStyle": {"range": {"startIndex": 1+i, "endIndex": 1+i+len(imp)},
        "textStyle": {"bold": True}, "fields": "bold"}})

for tab in ["Config", "School-IM Mapping", "Teacher Emails", "Teacher Metrics", "Student Winners", "Reading Teachers"]:
    search = tab + " \u2014"
    start = text.find("Spreadsheet Tabs Explained")
    i = text.find(search, start)
    if i >= 0:
        fmt.append({"updateTextStyle": {"range": {"startIndex": 1+i, "endIndex": 1+i+len(tab)},
            "textStyle": {"bold": True}, "fields": "bold"}})

for ver in ["v1.2.1 \u2014 April 7, 2026", "v1.2.0 \u2014 April 6, 2026",
            "v1.1.0 \u2014 March 29, 2026", "v1.0.0 \u2014 March 23, 2026"]:
    i = text.find(ver)
    if i >= 0:
        fmt.append({"updateTextStyle": {"range": {"startIndex": 1+i, "endIndex": 1+i+len(ver)},
            "textStyle": {"bold": True}, "fields": "bold"}})

docs.documents().batchUpdate(documentId=DOC_ID, body={"requests": fmt}).execute()
print("Formatting applied.")
print(f"Done! https://docs.google.com/document/d/{DOC_ID}/edit")
