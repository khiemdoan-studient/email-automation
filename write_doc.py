"""Write formatted documentation to the Email Automation Google Doc."""

import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from google.oauth2 import service_account
from googleapiclient.discovery import build

creds = service_account.Credentials.from_service_account_file(
    r"C:\Users\doank\Documents\Projects\Studient Excel Automation\service account key.json",
    scopes=["https://www.googleapis.com/auth/documents"],
)
docs = build("docs", "v1", credentials=creds)
DOC_ID = "1CDTKCSgFN5vsljZLnK-JiEd1b8RY1MFxtTd7P-SLyZk"

# Clear existing content
doc = docs.documents().get(documentId=DOC_ID).execute()
body_content = doc.get("body", {}).get("content", [])
end_index = body_content[-1]["endIndex"] if body_content else 1
requests = []
if end_index > 2:
    requests.append(
        {"deleteContentRange": {"range": {"startIndex": 1, "endIndex": end_index - 1}}}
    )

text = (
    "Email Automation\n"
    "User Guide & Documentation (v2.5.1)\n"
    "\n"
    "What Is This?\n"
    "This system automatically creates email drafts in Gmail for every teacher you manage. "
    "Each email includes the teacher\u2019s performance data, a weekly coaching theme, and a PDF report attached. "
    "You don\u2019t write any emails manually \u2014 the system builds them for you.\n"
    "\n"
    "What\u2019s New in v2.5.1\n"
    "Audit-driven hardening release \u2014 v2.5.0 tested working for one school, then a code "
    "audit surfaced 13 potential issues. This release lands the 5 highest-priority fixes:\n"
    "\u2022 Cross-school PDF mix-up defense: if two teachers share a name across schools (rare "
    "but possible), the system now walks the file's parent chain to verify it's in the right "
    "school. The common 'one match' case still works without verification (no regression for "
    "shared-with-me users).\n"
    "\u2022 Error Log performance: previous version trimmed the log on every error past 500 "
    "entries (slow). Now trims once every ~100 errors via a hysteresis pattern.\n"
    "\u2022 Run-id reset: each 'Generate My Email Drafts' invocation now gets a fresh run_id "
    "in the Error Log, so you can filter by run.\n"
    "\u2022 Cache robustness: school folder cache now keyed by both folder name and display name.\n"
    "\u2022 Legacy path safety: backward-compat PDF lookup (old date-subfolder format) now has "
    "the same defensive try/catch wrapping as the new path.\n"
    "\u2022 Test count grew 17 \u2192 26. Run 'Email Tools \u2192 Run Unit Tests' after deploying.\n"
    "\n"
    "What\u2019s New in v2.5.0\n"
    "Major fix: 'Service error: Drive' should no longer appear during draft generation. "
    "Previous releases (v2.4.1\u2013v2.4.3) wrapped the failing Drive iteration calls in try/catch "
    "but didn't change the underlying mechanism. v2.5.0 pivots: PDF lookup now uses Google "
    "Drive's search API (which works for shared-with-me users) instead of folder-by-folder "
    "iteration (which requires explicit Editor membership on the parent folder). Folder "
    "iteration is kept as a safety-net fallback for filename anomalies.\n"
    "\n"
    "Two new menu items help with debugging and confidence:\n"
    "\u2022 Email Tools \u2192 View Error Log \u2014 opens a new Error Log tab showing structured details "
    "of every failure (timestamp, severity, function, teacher, message, stack). Replaces "
    "the old console.log approach that only Apps Script editors could see.\n"
    "\u2022 Email Tools \u2192 Run Unit Tests \u2014 runs 14 in-script tests covering name lookup, folder "
    "normalization, and PDF filename construction. Run this after pasting any new Code.gs "
    "version to confirm the pure logic still works.\n"
    "\n"
    "Action after deploy: paste the latest Code.gs into Apps Script, save, reload the "
    "spreadsheet, then run 'Email Tools \u2192 Run Unit Tests' to confirm all 14 tests pass. "
    "Then run 'Generate My Email Drafts' as usual.\n"
    "\n"
    "What\u2019s New in v2.4.3\n"
    "Comprehensive iteration wrap (4th attempt at the 'Service error: Drive' class of bug). "
    "Audited ALL 10 getFolders/getFiles callsites and wrapped every iterator step in try/catch. "
    "Pre-flight Drive folder check is now FAIL-OPEN: if iteration crashes, return TRUE so the "
    "per-teacher loop can surface specific errors instead of blocking the entire run. v2.5.0 "
    "supersedes this approach entirely by removing iteration from the happy path.\n"
    "\n"
    "What\u2019s New in v2.4.2\n"
    "Root cause for 'Service error: Drive' identified and fixed. The error happens "
    "when your Drive access is via 'Shared with me' (not explicit folder membership) "
    "\u2014 Drive's children-list API blocks shared-with-me users even when individual "
    "folder access works. Three fixes: the code now tries the exact-name search "
    "first (works for shared-with-me users), wraps the failure surface in try/catch "
    "so it returns gracefully instead of crashing, and adds a new 'Debug: Drive Auth' "
    "menu item that diagnoses your specific Drive permission state and prints the "
    "exact fix. Run that diagnostic FIRST when 'Service error: Drive' appears.\n"
    "\n"
    "What\u2019s New in v2.4.1\n"
    "Drive error hardening. Some IMs hit a generic 'Exception: Service error: Drive' "
    "during draft generation. The new code wraps every Drive call with named errors "
    "(you'll now see the exact PDF + size if any single draft fails), detects stale "
    "folder references (auto-recovers without breaking the run), retries once on "
    "transient 5xx blips, and drops a redundant PDF coercion that was a failure "
    "surface. Pairs with parent repo v3.33.0 which extends 'Avg Minutes' to include "
    "Math Academy / Lalilo / Zearn / Freckle / MobyMax minutes (when those apps' "
    "data has synced) \u2014 most teachers' Avg Minutes will jump significantly after "
    "the next pipeline run (mean +32 mins per teacher in our test week).\n"
    "\n"
    "What\u2019s New in v2.4.0\n"
    "Two production bugs fixed. First, when a teacher had no metrics for the selected "
    "week, the email used to show a vague 'No data available' line; now it explains "
    "the three possible causes (upstream roster gap, name mismatch, pipeline not run) "
    "so you know who to escalate to. Second, the data pipeline now matches the WPD "
    "admin numbers: previously the email showed weekly_dashboard's base avg minutes "
    "(35 for Shanatae Taylor week 4/20) while the admin WPD showed 123 (FastMath "
    "connector minutes added). The pipeline now uses the SAME merged data, so the "
    "numbers will be identical after the next pipeline run.\n"
    "\n"
    "What\u2019s New in v2.3.1\n"
    "Behind-the-scenes tightening release. The name-matching logic now correctly "
    "rejects same-last-name same-first-letter collisions (Liam vs Lisa Smith would "
    "previously have leaked data; now it returns no-match). Drive folder lookups are "
    "cached so a 30-teacher run does ~50% fewer Drive API calls \u2014 each draft generates "
    "noticeably faster. No user-visible changes for the happy path.\n"
    "\n"
    "What\u2019s New in v2.3\n"
    "Audit-driven hardening release. The 4/27 template now also drops the green/yellow/red "
    "trend alert box (felt out of place at end of year). The default template (when Config "
    "is unset) is now 4/27 \u2014 update at the next cycle. Behind the scenes: a LockService "
    "guard prevents duplicate Gmail drafts if you accidentally click Generate twice; the "
    "name-matching logic is tighter so two teachers sharing a last name no longer risk "
    "swapped data.\n"
    "\n"
    "What\u2019s New in v2.2\n"
    "Added the end-of-year Last Week of Motivention template (4/27). It covers the FastMath "
    "+200 bonus reminder, May 8 store close, May 26 raffle drawing, and the Weeks 8-11 AIM "
    "Launches as bonus content for testing days. Total templates: 13.\n"
    "\n"
    "What\u2019s New in v2.1\n"
    "Every email\u2019s data table now includes Avg Lessons/Student as a column so teachers "
    "can see mastered-lesson volume at a glance. Two new Finishing Strong templates were "
    "added (Jasper and Math+ELA) covering Reading Focus, Math Academy, Fast Math, and "
    "testing-prep updates. Total templates: 12.\n"
    "\n"
    "What\u2019s New in v2.0\n"
    "You can now pick the week AND the template from dropdowns. You are no longer locked "
    "to one hardcoded template or date range. All available weeks are preloaded, so switching "
    "weeks is instant \u2014 no need to re-run the pipeline each time.\n"
    "\n"
    "How to Send Weekly Emails (3 Steps)\n"
    "\n"
    "Step 1: Refresh the data (only needed once per new week)\n"
    "Khiem runs the Python pipeline to pull all available weeks from BigQuery into the "
    "spreadsheet. This populates the All Teacher Metrics and Student Winners tabs with every "
    "week of data. You do not need to run this yourself \u2014 it runs on a schedule.\n"
    "To refresh manually (Khiem only):  python email_only.py\n"
    "\n"
    "Step 2: Pick your week and template in Config\n"
    "Open the spreadsheet. Go to the Config tab. Two dropdowns drive everything:\n"
    "\u2022 Date Range \u2014 pick from the list of available weeks (newest first)\n"
    "\u2022 Template \u2014 pick Week 0 through Week 8, Wrap Up, one of the Finishing Strong templates, or Last Week of Motivention (13 total)\n"
    "You can change either one without re-running the pipeline.\n"
    "\n"
    "Step 3: Generate the email drafts\n"
    "Click Email Tools in the menu bar, then click Generate My Email Drafts.\n"
    "A confirmation dialog will show you:\n"
    "\u2022 The date range and template you picked\n"
    "\u2022 How many teachers were found\n"
    "\u2022 Whether the metrics data and Drive folders are available\n"
    "Click Yes to proceed. Check your Gmail Drafts folder \u2014 one draft per teacher, ready to review and send.\n"
    "\n"
    "Email Tools Menu\n"
    "\n"
    "\u2022 Generate My Email Drafts \u2014 Main action, creates Gmail drafts for all your teachers\n"
    "\u2022 Debug: Check Teacher Folders \u2014 Lists any missing teacher folders per school\n"
    "\u2022 Debug: Drive Access \u2014 Shows exactly what the system can see in Drive (use this first when anything breaks)\n"
    "\u2022 Set Date Range \u2014 Type a custom date range if the dropdown doesn\u2019t have what you need\n"
    "\u2022 Set Template \u2014 Type a template name manually\n"
    "\u2022 Refresh Template Dropdown \u2014 Rebuilds the Config Template dropdown from the template list in Code.gs (run this after any template add or rename)\n"
    "\n"
    "Template Library\n"
    "\n"
    "13 templates covering the full semester arc plus end-of-year Finishing Strong + Last Week:\n"
    "\u2022 Week 0: Data \u2014 MAP baseline review\n"
    "\u2022 Week 1: Goals & Monitoring \u2014 setting targets, doorway greeting, walk the room\n"
    "\u2022 Week 2: Tech Hygiene \u2014 daily logins, Dash routines, restart routine\n"
    "\u2022 Week 3: Micro-Coaching \u2014 the \u201cBig 3,\u201d ask don\u2019t tell, reframe negative talk\n"
    "\u2022 Week 4: Diagnosing Habits \u2014 coaching flags, the 3 Lenses\n"
    "\u2022 Week 5: Re-Engagement \u2014 mid-block breath, doom loop reset, 3-minute conference\n"
    "\u2022 Week 6: Culture & Shoutouts \u2014 Trailblazer shoutout + Student Achievement Awards table\n"
    "\u2022 Week 7: I\u2019m Stuck Protocol \u2014 watch for stalling, path forward, built-in protocol\n"
    "\u2022 Week 8: Growth Mindset \u2014 catch the language, normalize struggle, shift to strategy\n"
    "\u2022 Wrap Up: Celebrate Wins \u2014 final celebration (content still in progress)\n"
    "\u2022 4/20 Jasper: Finishing Strong \u2014 Reading Focus, Personalized Reading (AlphaRead/Lalilo), Math Fluency via Fast Math, Incentivized Progress\n"
    "\u2022 4/20 Math+ELA: Finishing Strong \u2014 Same as Jasper plus Math Academy rollout for 4th grade+ students\n"
    "\u2022 4/27: Last Week of Motivention \u2014 End-of-year template: FastMath +200 bonus, May 8 store close, May 26 raffle drawing, Weeks 8-11 AIM Launches\n"
    "\n"
    "Only Week 6 and Wrap Up include the Student Achievement Awards table. Other templates "
    "focus on the coaching theme for that week.\n"
    "\n"
    "What\u2019s in Each Email?\n"
    "\n"
    "All templates share these sections:\n"
    "\u2022 Performance Table \u2014 5 columns per grade: Teacher, Grade, Avg Active Days, Avg Minutes, Avg Lessons/Student. Active Days and Minutes are color-coded green/yellow/red.\n"
    "\u2022 Current Trend \u2014 Message based on overall performance (on track, close, or needs attention)\n"
    "\u2022 Weekly Focus \u2014 The theme for the selected template\n"
    "\u2022 Your Actions This Week \u2014 3 action items specific to the template\n"
    "\u2022 Resources \u2014 Links to AIM Launches, Pomodoro Timer, Goal Tracker sheets\n"
    "\u2022 Weekly Challenge & Reflection Prompt\n"
    "\u2022 PDF Attachment \u2014 The teacher\u2019s detailed data report\n"
    "\n"
    "Week 6 and Wrap Up also include the Student Achievement Awards table.\n"
    "\n"
    "Student Achievement Awards (Week 6 / Wrap Up only)\n"
    "\n"
    "The awards table highlights students who reached specific milestones over the last 6 weeks. "
    "Each student appears only once, in their highest category. Two columns:\n"
    "\u2022 3+ Weeks \u2014 Hit the milestone in 3+ of the last 6 weeks\n"
    "\u2022 1-2 Times \u2014 Hit it once or twice\n"
    "\n"
    "Categories (highest tier shown first):\n"
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
    "Performance table colors (Avg Active Days and Avg Minutes columns only \u2014 Avg Lessons/Student is uncolored):\n"
    "\u2022 Green \u2014 Avg Active Days 4+, Avg Minutes 100+\n"
    "\u2022 Yellow \u2014 Avg Active Days 3, Avg Minutes 80-99\n"
    "\u2022 Red \u2014 Avg Active Days 1-2, Avg Minutes below 80\n"
    "\n"
    "Key metrics reference (shown below the trend alert):\n"
    "\u2022 Average mastered lessons, active days, Daily logins, Average minutes\n"
    "\n"
    "Current Trend messages:\n"
    "\u2022 Green: \u201cGreat work! Your students are on track and meeting their goals.\u201d\n"
    "\u2022 Yellow: \u201cYou\u2019re close \u2014 schedule at least 35 minutes daily.\u201d\n"
    "\u2022 Red: \u201cYour class isn\u2019t meeting time goals yet \u2014 students need 35 minutes daily.\u201d\n"
    "\n"
    "Spreadsheet Tabs Explained\n"
    "\n"
    "Config \u2014 Two dropdowns: Date Range and Template. This is the only tab you edit.\n"
    "\n"
    "School-IM Mapping \u2014 Controls which schools you generate emails for. Your email must "
    "appear in column C for at least one school.\n"
    "\n"
    "Teacher Emails \u2014 A live feed of teacher names and emails from the master roster. Do not edit.\n"
    "\n"
    "All Teacher Metrics \u2014 Every week of performance data for every teacher, preloaded by the "
    "pipeline. Apps Script filters by your selected week. Do not edit manually.\n"
    "\n"
    "Available Weeks \u2014 The list of weeks that have data available, used to populate the Date "
    "Range dropdown in Config. Auto-populated. Do not edit.\n"
    "\n"
    "Student Winners \u2014 Student achievement data for the last 6 weeks. Auto-populated. Do not edit.\n"
    "\n"
    "Reading Teachers \u2014 Teacher names and emails for Reading Community City School District. "
    "Manual list because the roster import doesn\u2019t include emails for this district.\n"
    "\n"
    "Teacher Metrics \u2014 Legacy single-week tab kept for backward compatibility. Safe to ignore.\n"
    "\n"
    "PDF Attachments\n"
    "\n"
    "The system finds PDF files in Google Drive at this path:\n"
    "Bruna and Mark\u2019s Schools - Weekly Report > School Folder > Teacher Folder > PDF\n"
    "\n"
    "PDFs now sit directly in the teacher folder (no date subfolder). The filename format is:\n"
    "Teacher Name - YYYY-MM-DD - YYYY-MM-DD.pdf\n"
    "For example: Danielle Roberts - 2026-04-06 - 2026-04-12.pdf\n"
    "\n"
    "The system matches the selected Date Range to the filename date pattern. If no matching "
    "PDF is found, generation is blocked for that teacher.\n"
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
    "FIRST STEP FOR ANY ERROR: Click Email Tools > Debug: Drive Access. The report shows "
    "exactly what the system sees in your Drive and where it breaks.\n"
    "\n"
    "\u201cDrive folders: NOT FOUND\u201d \u2014 The PDF for the selected date range doesn\u2019t exist yet, or "
    "the folder names have changed. Run Debug: Drive Access to see which school/teacher is missing.\n"
    "\n"
    "\u201cNo teachers found\u201d \u2014 Your email isn\u2019t in School-IM Mapping column C for any school.\n"
    "\n"
    "\u201cMetrics data: NOT FOUND\u201d \u2014 Pipeline hasn\u2019t been run for that week. Ask Khiem to run it.\n"
    "\n"
    "\u201cTeacher folder not found\u201d \u2014 The Drive folder for that teacher doesn\u2019t exist or is named differently. "
    "The system tries both \u201cFirst_Last\u201d and \u201cFirst Last\u201d automatically.\n"
    "\n"
    "\u201cNo data available\u201d in the email \u2014 Teacher Metrics is empty for that teacher. "
    "Run Debug: Drive Access to confirm, then ask Khiem to re-run the pipeline.\n"
    "\n"
    "New templates are missing from the Template dropdown \u2014 The Config dropdown uses a "
    "fixed data validation that doesn\u2019t auto-update when new templates are added. "
    "Fix: Click Email Tools > Refresh Template Dropdown. This rebuilds the dropdown "
    "from the current template list in the code.\n"
    "\n"
    "Version History\n"
    "\n"
    "v2.4.2 \u2014 April 27, 2026\n"
    "\u2022 Root cause fix for 'Service error: Drive' (shared-with-me parent permission gap)\n"
    "\u2022 displayName lookup now FIRST (exact-match search avoids the failing children-list call)\n"
    "\u2022 New 'Debug: Drive Auth' menu item with actionable diagnostic\n"
    "\n"
    "v2.4.1 \u2014 April 27, 2026\n"
    "\u2022 Drive error hardening: named errors + stale-cache detection + retry-once + drop redundant PDF coercion\n"
    "\u2022 Pairs with parent repo v3.33.0 (raw_data now includes ALL 5 connector apps)\n"
    "\n"
    "v2.4.0 \u2014 April 27, 2026\n"
    "\u2022 Improved 'No data available' message (3 possible causes spelled out)\n"
    "\u2022 Pairs with parent repo v3.32.0: email Avg Minutes now matches WPD admin (FastMath-inclusive)\n"
    "\n"
    "v2.3.1 \u2014 April 27, 2026\n"
    "\u2022 Smart-prefix name matching (Liam vs Lisa Smith collision fixed)\n"
    "\u2022 School folder caching saves ~50% of Drive API calls per run\n"
    "\u2022 Parent repo CLAUDE.md cross-project dependencies row corrected\n"
    "\n"
    "v2.3.0 \u2014 April 26, 2026\n"
    "\u2022 4/27 template now omits the trend alert (context-appropriate)\n"
    "\u2022 Default template changed to 4/27 Last Week of Motivention\n"
    "\u2022 Tightened name-matching to prevent cross-teacher data swaps when last names match\n"
    "\u2022 Added LockService double-click guard \u2014 second click shows \u201cAlready Running\u201d alert\n"
    "\u2022 TEMPLATE_NAMES now auto-derived from TEMPLATES \u2014 dropdown can\u2019t drift out of sync\n"
    "\u2022 Defensive null guards, error message truncation, dead code removal, diagnostic cap bumps\n"
    "\n"
    "v2.2.0 \u2014 April 26, 2026\n"
    "\u2022 Added 4/27: Last Week of Motivention template \u2014 end-of-year format with FastMath bonus, store close, raffle drawing, and Weeks 8-11 AIM Launches\n"
    "\u2022 No Actions / Weekly Challenge / Reflection Prompt sections in this template by design \u2014 just the 3 updates and a one-line Persistence focus\n"
    "\u2022 Total templates: 13\n"
    "\n"
    "v2.1.1 \u2014 April 17, 2026\n"
    "\u2022 Documentation: Added troubleshooting entry for stale Template dropdown (run Refresh Template Dropdown after adding templates)\n"
    "\n"
    "v2.1.0 \u2014 April 17, 2026\n"
    "\u2022 Added Avg Lessons/Student column to the shared performance table (cascades to every template)\n"
    "\u2022 Added 4/20 Jasper: Finishing Strong template\n"
    "\u2022 Added 4/20 Math+ELA: Finishing Strong template (includes Math Academy rollout for 4th grade+)\n"
    "\u2022 Key metrics line updated to include Average mastered lessons\n"
    "\u2022 Added Refresh Template Dropdown menu item for syncing the Config dropdown with Code.gs\n"
    "\n"
    "v2.0.3 \u2014 April 16, 2026\n"
    "\u2022 Bulletproof root folder lookup via folder ID (survives folder renames)\n"
    "\u2022 New Debug: Drive Access diagnostic showing exactly what Drive looks like from the system\u2019s view\n"
    "\u2022 Verified Drive structure against live production Drive\n"
    "\u2022 Flexible folder name matching: underscores / spaces / case / apostrophe variants all treated as equivalent\n"
    "\n"
    "v2.0.2 \u2014 April 15, 2026\n"
    "\u2022 Support for new PDF format: \u201cTeacher Name - YYYY-MM-DD - YYYY-MM-DD.pdf\u201d directly in teacher folder\n"
    "\u2022 Backward compat with old structure (date subfolder + 00_SUMMARY_...PDF)\n"
    "\n"
    "v2.0.0 \u2014 April 15, 2026\n"
    "\u2022 Selectable templates (Week 0 through Wrap Up \u2014 10 total)\n"
    "\u2022 Date Range dropdown populated from preloaded weeks\n"
    "\u2022 Template dropdown in Config\n"
    "\u2022 Confirmation dialog before generation with validation status\n"
    "\u2022 All weeks of data preloaded \u2014 no pipeline re-run when switching weeks\n"
    "\u2022 Drive folder existence validation blocks generation if PDFs missing\n"
    "\n"
    "v1.2.1 \u2014 April 7, 2026\n"
    "\u2022 Teacher Metrics auto-populated (no more QuickSight download)\n"
    "\u2022 Fixed name matching for middle names and spelling variations\n"
    "\u2022 Added Reading Teachers tab for Reading Community\n"
    "\n"
    "v1.2.0 \u2014 April 6, 2026\n"
    "\u2022 Added Student Achievement Awards table to emails\n"
    "\u2022 New email theme: Culture, Shoutouts & Rewards\n"
    "\u2022 AIM Launches updated to Weeks 6, 7, 8\n"
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
fmt.append(
    {
        "updateParagraphStyle": {
            "range": {"startIndex": idx, "endIndex": end},
            "paragraphStyle": {"namedStyleType": "HEADING_1"},
            "fields": "namedStyleType",
        }
    }
)

sub_start = end + 1
sub_end = sub_start + len("User Guide & Documentation (v2.4.2)")
fmt.append(
    {
        "updateParagraphStyle": {
            "range": {"startIndex": sub_start, "endIndex": sub_end},
            "paragraphStyle": {"namedStyleType": "SUBTITLE"},
            "fields": "namedStyleType",
        }
    }
)

for title in [
    "What Is This?",
    "What\u2019s New in v2.4.2",
    "What\u2019s New in v2.4.1",
    "What\u2019s New in v2.4.0",
    "What\u2019s New in v2.3.1",
    "What\u2019s New in v2.3",
    "What\u2019s New in v2.2",
    "What\u2019s New in v2.1",
    "What\u2019s New in v2.0",
    "How to Send Weekly Emails (3 Steps)",
    "Email Tools Menu",
    "Template Library",
    "What\u2019s in Each Email?",
    "Student Achievement Awards (Week 6 / Wrap Up only)",
    "Color Coding",
    "Spreadsheet Tabs Explained",
    "PDF Attachments",
    "Schools and Assigned IMs",
    "Troubleshooting",
    "Version History",
]:
    i = text.find(title)
    if i >= 0:
        fmt.append(
            {
                "updateParagraphStyle": {
                    "range": {"startIndex": 1 + i, "endIndex": 1 + i + len(title)},
                    "paragraphStyle": {"namedStyleType": "HEADING_2"},
                    "fields": "namedStyleType",
                }
            }
        )

for title in [
    "Step 1: Refresh the data (only needed once per new week)",
    "Step 2: Pick your week and template in Config",
    "Step 3: Generate the email drafts",
]:
    i = text.find(title)
    if i >= 0:
        fmt.append(
            {
                "updateParagraphStyle": {
                    "range": {"startIndex": 1 + i, "endIndex": 1 + i + len(title)},
                    "paragraphStyle": {"namedStyleType": "HEADING_3"},
                    "fields": "namedStyleType",
                }
            }
        )

imp = "FIRST STEP FOR ANY ERROR: Click Email Tools > Debug: Drive Access. The report shows exactly what the system sees in your Drive and where it breaks."
i = text.find(imp)
if i >= 0:
    fmt.append(
        {
            "updateTextStyle": {
                "range": {"startIndex": 1 + i, "endIndex": 1 + i + len(imp)},
                "textStyle": {"bold": True},
                "fields": "bold",
            }
        }
    )

for tab in [
    "Config",
    "School-IM Mapping",
    "Teacher Emails",
    "All Teacher Metrics",
    "Available Weeks",
    "Student Winners",
    "Reading Teachers",
    "Teacher Metrics",
]:
    search = tab + " \u2014"
    start = text.find("Spreadsheet Tabs Explained")
    i = text.find(search, start)
    if i >= 0:
        fmt.append(
            {
                "updateTextStyle": {
                    "range": {"startIndex": 1 + i, "endIndex": 1 + i + len(tab)},
                    "textStyle": {"bold": True},
                    "fields": "bold",
                }
            }
        )

for ver in [
    "v2.4.2 \u2014 April 27, 2026",
    "v2.4.1 \u2014 April 27, 2026",
    "v2.4.0 \u2014 April 27, 2026",
    "v2.3.1 \u2014 April 27, 2026",
    "v2.3.0 \u2014 April 26, 2026",
    "v2.2.0 \u2014 April 26, 2026",
    "v2.1.1 \u2014 April 17, 2026",
    "v2.1.0 \u2014 April 17, 2026",
    "v2.0.3 \u2014 April 16, 2026",
    "v2.0.2 \u2014 April 15, 2026",
    "v2.0.0 \u2014 April 15, 2026",
    "v1.2.1 \u2014 April 7, 2026",
    "v1.2.0 \u2014 April 6, 2026",
    "v1.1.0 \u2014 March 29, 2026",
    "v1.0.0 \u2014 March 23, 2026",
]:
    i = text.find(ver)
    if i >= 0:
        fmt.append(
            {
                "updateTextStyle": {
                    "range": {"startIndex": 1 + i, "endIndex": 1 + i + len(ver)},
                    "textStyle": {"bold": True},
                    "fields": "bold",
                }
            }
        )

docs.documents().batchUpdate(documentId=DOC_ID, body={"requests": fmt}).execute()
print("Formatting applied.")
print(f"Done! https://docs.google.com/document/d/{DOC_ID}/edit")
