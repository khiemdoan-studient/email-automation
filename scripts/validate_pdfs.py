"""scripts/validate_pdfs.py — Find teachers with metrics but no PDF in Drive.

NOTE (v2.6.2): the service account `service-account@reading-dashboard-482106.iam`
typically does NOT have Drive access to the teacher PDF folders (those folders
are owned by mark.katigbak's upstream system, not Khiem's pipeline). When the
SA can't see PDFs, this script will report 0 PDFs found and flag every
metrics-teacher as MISSING — that's a permission gap, not real data drift.

For an authoritative answer, run **Email Tools -> Debug: Validate All PDFs
(last 2 weeks)** from the email-automation spreadsheet menu instead. That
function runs as the IM (e.g., khiem.doan@studient.com) whose Drive auth has
shared-with-me access to every teacher PDF folder. Same lookup chain as the
bulk Generate run, so the result mirrors what an IM would see when
generating drafts.

This Python script remains useful when the SA is properly shared on the
parent folder (one-line CLI run, scriptable in CI). Until then, prefer the
Apps Script menu item.

Cross-references the "All Teacher Metrics" tab (which teachers have data per
week) against the actual Drive folder (which teachers have a PDF per week).

Reports:
  - MISSING: teachers with metrics but NO matching PDF (would fail email gen)
  - EXTRA: PDFs in Drive for teachers NOT in metrics (less actionable, but flagged)
  - Total per-week match rate

Honors NAME_ALIASES — a metrics-tab name like 'anton haughton' will match a PDF
named 'Aston Haughton.pdf' if the alias is 'aston haughton' -> 'anton haughton'.

Usage:
    python scripts/validate_pdfs.py                                # default: last 2 weeks
    python scripts/validate_pdfs.py --weeks 2026-04-20,2026-04-27  # specific weeks
    python scripts/validate_pdfs.py --strict                       # exit 1 if any MISSING
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timedelta

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from google.oauth2 import service_account
from googleapiclient.discovery import build

SA_KEY = os.environ.get(
    "STUDIENT_SA_KEY",
    r"C:\Users\doank\Documents\Projects\Studient Excel Automation\service account key.json",
)
SPREADSHEET_ID = "1GKtoNumk363StPb2HZ1suiXNB3rHzA_wDLKgRiGj6f8"


def _load_name_aliases():
    """Load NAME_ALIASES from the canonical JSON (single source of truth)."""
    json_path = os.path.join(os.path.dirname(__file__), "name_aliases.json")
    if os.path.isfile(json_path):
        with open(json_path, encoding="utf-8") as f:
            return json.load(f)
    return {}


def fetch_metrics_for_weeks(sheets, weeks):
    """Return {week_start: set of lowercased teacher names with metrics}."""
    res = (
        sheets.spreadsheets()
        .values()
        .get(spreadsheetId=SPREADSHEET_ID, range="'All Teacher Metrics'!A:D")
        .execute()
    )
    values = res.get("values", [])
    out = {w: set() for w in weeks}
    for row in values[1:]:
        if not row or len(row) < 2:
            continue
        ws = str(row[0]).strip()
        if ws not in out:
            continue
        teacher = (row[1] or "").strip().lower()
        if teacher:
            out[ws].add(teacher)
    return out


def week_end_date(week_start):
    """Monday → Sunday end date (week_start + 6 days), ISO format."""
    dt = datetime.strptime(week_start, "%Y-%m-%d")
    return (dt + timedelta(days=6)).strftime("%Y-%m-%d")


def search_drive_pdfs(drive, week_start):
    """Search Drive for ALL PDFs whose name contains '{week_start} - {week_end}'.
    Returns set of lowercased teacher names extracted from filenames."""
    end = week_end_date(week_start)
    pattern = f"{week_start} - {end}"
    # Drive search query — escape single quotes per Drive API rules
    safe_pattern = pattern.replace("'", "\\'")
    query = (
        f"name contains '{safe_pattern}' "
        f"and mimeType = 'application/pdf' "
        f"and trashed = false"
    )
    teacher_names = set()
    page_token = None
    while True:
        resp = (
            drive.files()
            .list(
                q=query,
                pageSize=1000,
                fields="nextPageToken, files(name)",
                pageToken=page_token,
                supportsAllDrives=True,
                includeItemsFromAllDrives=True,
            )
            .execute()
        )
        for f in resp.get("files", []):
            name = f["name"]
            # Expected format: "Teacher Name - YYYY-MM-DD - YYYY-MM-DD.pdf"
            # Strip the date portion to get teacher name
            idx = name.find(" - " + week_start)
            if idx > 0:
                teacher = name[:idx].strip().lower()
                # Normalize underscores → spaces (folder structure may use underscored names)
                teacher = teacher.replace("_", " ").strip()
                teacher_names.add(teacher)
        page_token = resp.get("nextPageToken")
        if not page_token:
            break
    return teacher_names


def main(weeks, strict=False):
    creds = service_account.Credentials.from_service_account_file(
        SA_KEY,
        scopes=[
            "https://www.googleapis.com/auth/spreadsheets.readonly",
            "https://www.googleapis.com/auth/drive.readonly",
        ],
    )
    sheets = build("sheets", "v4", credentials=creds)
    drive = build("drive", "v3", credentials=creds)

    aliases = _load_name_aliases()
    # Reverse alias map: metrics_name -> roster_name (PDF is named per roster spelling)
    reverse_aliases = {v: k for k, v in aliases.items()}

    print("=" * 70)
    print("PDF VALIDATION — teachers with metrics but no PDF in Drive")
    print(f"Weeks: {', '.join(weeks)}")
    print(f"Aliases loaded: {len(aliases)}")
    print("=" * 70)

    metrics_by_week = fetch_metrics_for_weeks(sheets, weeks)
    total_missing = 0

    for week in weeks:
        metrics_teachers = metrics_by_week[week]
        end = week_end_date(week)
        print(f"\n--- Week {week} (Mon-Sun ending {end}) ---")
        print(f"Teachers in metrics:        {len(metrics_teachers)}")

        if not metrics_teachers:
            print("  (no metrics for this week — skipping)")
            continue

        try:
            pdf_teachers = search_drive_pdfs(drive, week)
        except Exception as e:
            print(f"  \u26a0  Drive search FAILED: {e}")
            print(f"     (Service account may lack access to teacher PDF folders)")
            continue

        print(f"PDFs found in Drive:        {len(pdf_teachers)}")

        # MISSING: in metrics but no PDF (the actionable list)
        missing = []
        for teacher in metrics_teachers:
            # Direct match (metrics name == PDF name)
            if teacher in pdf_teachers:
                continue
            # Alias match: metrics name might be the BQ-side, PDF is the roster-side
            if teacher in reverse_aliases:
                if reverse_aliases[teacher] in pdf_teachers:
                    continue
            missing.append(teacher)

        # EXTRA: PDFs without metrics (lower priority — could be inactive teachers
        # who got a PDF from the upstream system anyway)
        extra = []
        for pt in pdf_teachers:
            if pt in metrics_teachers:
                continue
            # Alias: PDF roster-name might map to a metrics-side BQ name
            if pt in aliases and aliases[pt] in metrics_teachers:
                continue
            extra.append(pt)

        match_rate = (
            (len(metrics_teachers) - len(missing)) / max(1, len(metrics_teachers)) * 100
        )
        print(
            f"Match rate:                 {match_rate:.1f}%  ({len(metrics_teachers) - len(missing)}/{len(metrics_teachers)})"
        )

        if missing:
            print(
                f"\n  \u26a0  MISSING PDFs ({len(missing)} teacher(s) with metrics but no PDF):"
            )
            for t in sorted(missing):
                alias_note = ""
                if t in reverse_aliases:
                    alias_note = f"  (PDF would be named '{reverse_aliases[t]}'?)"
                print(f"     - {t}{alias_note}")
            total_missing += len(missing)
        else:
            print(f"  \u2713 All metrics-teachers have PDFs.")

        if extra:
            print(
                f"\n  \u2139  EXTRA PDFs ({len(extra)} teacher(s) with PDF but no metrics):"
            )
            for t in sorted(extra)[:30]:
                print(f"     + {t}")
            if len(extra) > 30:
                print(f"     ... and {len(extra) - 30} more")

    print()
    print("=" * 70)
    print(f"SUMMARY: {total_missing} total missing PDFs across {len(weeks)} week(s)")
    print("=" * 70)

    if strict and total_missing > 0:
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--weeks",
        default="2026-04-20,2026-04-27",
        help="Comma-separated week_start dates (default: 2026-04-20,2026-04-27)",
    )
    parser.add_argument("--strict", action="store_true", help="Exit 1 if any MISSING")
    args = parser.parse_args()
    weeks = [w.strip() for w in args.weeks.split(",") if w.strip()]
    main(weeks, args.strict)
