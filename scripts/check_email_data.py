"""scripts/check_email_data.py — Comprehensive email-automation roster ↔ metrics validator.

Run before each weekly email cycle to catch name divergences (the Aston/Anton
class of bug) BEFORE IMs hit them in production.

What it does
------------
1. Read the roster from BOTH the "Teacher Emails" tab (regular schools) and
   the "Reading Teachers" tab (Reading Community).
2. Read the "All Teacher Metrics" tab and build a teacher-name-keyed dict
   matching what Apps Script's getTeacherMetricsForWeek() produces.
3. For each unique (firstName, lastName, campus) in the roster, run a
   FAITHFUL Python port of Apps Script's lookupByName function (including
   v2.3.1's cross-leak guard).
4. Categorize:
     MATCHED  — lookup succeeded; teacher will get metrics in their email.
     LIKELY-TYPO  — lookup failed but a metrics name within Levenshtein/
                    sequence-matcher cutoff exists. Suggest a NAME_ALIASES
                    entry.
     LIKELY-UPSTREAM-GAP  — lookup failed AND no close metrics name. Probably
                            missing from BigQuery for this week.
5. Print a copy-paste-able block of NAME_ALIASES additions for Code.gs.

Usage
-----
    python scripts/check_email_data.py
    python scripts/check_email_data.py --week 2026-04-20
    python scripts/check_email_data.py --week 2026-04-13 --strict
"""

from __future__ import annotations

import argparse
import sys
from difflib import get_close_matches

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from google.oauth2 import service_account
from googleapiclient.discovery import build

SA_KEY = r"C:\Users\doank\Documents\Projects\Studient Excel Automation\service account key.json"
SPREADSHEET_ID = "1GKtoNumk363StPb2HZ1suiXNB3rHzA_wDLKgRiGj6f8"

# Mirrors Code.gs CONFIG.* — column indices for Teacher Emails tab (0-indexed).
CAMPUS_COL = 2
TEACHER_FIRST_COL = 24
TEACHER_LAST_COL = 25
TEACHER_EMAIL_COL = 26

# Mirrors Code.gs NAME_ALIASES at module scope. Keep in sync.
NAME_ALIASES = {
    "lisa kloesz": "lisa kloetz",
    "aston haughton": "anton haughton",  # v2.5.2: BQ typo (AFMS) — remove once fixed upstream
    "lakieshie jennings": "lakieshie roberts-jennings",  # v2.5.2: hyphenated last name (JHES)
}

READING_DISPLAY_NAME = "Reading Community City School District"


def lookup_by_name(metrics_dict, first_name, last_name, full_name, aliases=None):
    """Faithful Python port of Code.gs lookupByName.

    Returns the metrics value (a list of grade rows) on match, else None.
    """
    aliases = aliases if aliases is not None else NAME_ALIASES
    if not metrics_dict:
        return None
    if not full_name or not first_name or not last_name:
        return None
    full = full_name.lower().strip()
    if full in metrics_dict:
        return metrics_dict[full]
    first = first_name.lower().strip().split(" ")[0]
    last = last_name.lower().strip()
    short_key = f"{first} {last}"
    if short_key in metrics_dict:
        return metrics_dict[short_key]
    # Last-name fallback with v2.3.1 cross-leak guard.
    suffix = " " + last
    last_matches = []
    for k in metrics_dict:
        if not k.endswith(suffix):
            continue
        before_last = k[: -len(suffix)]
        if before_last == first or before_last.startswith(first + " "):
            last_matches.append(k)
    if len(last_matches) == 1:
        return metrics_dict[last_matches[0]]
    if full in aliases and aliases[full] in metrics_dict:
        return metrics_dict[aliases[full]]
    if short_key in aliases and aliases[short_key] in metrics_dict:
        return metrics_dict[aliases[short_key]]
    return None


def fetch_metrics_for_week(sheets, week):
    """Build the same teacher-keyed dict as getTeacherMetricsForWeek(weekStart)."""
    res = (
        sheets.spreadsheets()
        .values()
        .get(spreadsheetId=SPREADSHEET_ID, range="'All Teacher Metrics'!A:L")
        .execute()
    )
    values = res.get("values", [])
    metrics = {}
    for row in values[1:]:
        if not row or len(row) < 2:
            continue
        ws = str(row[0]).strip()
        if ws != week:
            continue
        teacher = (row[1] or "").strip().lower()
        if not teacher or teacher == "undefined":
            continue
        grade = row[2] if len(row) > 2 else ""
        metrics.setdefault(teacher, []).append({"grade": str(grade), "row": row})
    return metrics


def fetch_teachers_emails_roster(sheets):
    """Read regular schools' roster from 'Teacher Emails' tab."""
    res = (
        sheets.spreadsheets()
        .values()
        .get(spreadsheetId=SPREADSHEET_ID, range="'Teacher Emails'!A:AC")
        .execute()
    )
    values = res.get("values", [])
    seen = set()
    out = []
    for row in values[1:]:
        if not row or len(row) <= TEACHER_EMAIL_COL:
            continue
        campus = (row[CAMPUS_COL] or "").strip() if len(row) > CAMPUS_COL else ""
        if not campus:
            continue
        if campus == READING_DISPLAY_NAME:
            continue
        first = (row[TEACHER_FIRST_COL] or "").strip()
        last = (row[TEACHER_LAST_COL] or "").strip()
        email = (row[TEACHER_EMAIL_COL] or "").strip()
        if not (first and last and email):
            continue
        key = (first.lower(), last.lower(), campus.lower())
        if key in seen:
            continue
        seen.add(key)
        out.append(
            {
                "firstName": first,
                "lastName": last,
                "fullName": f"{first} {last}",
                "campus": campus,
                "email": email,
            }
        )
    return out


def fetch_reading_teachers_roster(sheets):
    """Read Reading Community roster from 'Reading Teachers' tab."""
    try:
        res = (
            sheets.spreadsheets()
            .values()
            .get(spreadsheetId=SPREADSHEET_ID, range="'Reading Teachers'!A:C")
            .execute()
        )
    except Exception as e:
        print(f"  ⚠ Could not read Reading Teachers tab: {e}")
        return []
    values = res.get("values", [])
    out = []
    seen = set()
    for row in values[1:]:
        if not row or len(row) < 3:
            continue
        first = (row[0] or "").strip()
        last = (row[1] or "").strip()
        email = (row[2] or "").strip()
        if not (first and last and email):
            continue
        key = (first.lower(), last.lower())
        if key in seen:
            continue
        seen.add(key)
        out.append(
            {
                "firstName": first,
                "lastName": last,
                "fullName": f"{first} {last}",
                "campus": READING_DISPLAY_NAME,
                "email": email,
            }
        )
    return out


def categorize_unmatched(teacher, metrics_keys, cutoff=0.85):
    """Use difflib.get_close_matches to find the closest metrics name.

    Returns (verdict, suggestion). verdict ∈ {"likely-typo", "likely-upstream-gap"}.
    """
    full = teacher["fullName"].lower().strip()
    matches = get_close_matches(full, metrics_keys, n=1, cutoff=cutoff)
    if matches:
        return ("likely-typo", matches[0])
    # Try a more lenient cutoff to surface any plausible match
    matches_loose = get_close_matches(full, metrics_keys, n=1, cutoff=0.7)
    if matches_loose:
        return ("possible-typo", matches_loose[0])
    return ("likely-upstream-gap", None)


def main(week: str, strict: bool = False):
    creds = service_account.Credentials.from_service_account_file(
        SA_KEY, scopes=["https://www.googleapis.com/auth/spreadsheets.readonly"]
    )
    sheets = build("sheets", "v4", credentials=creds)

    print("=" * 70)
    print(f"EMAIL ROSTER ↔ METRICS ALIGNMENT  —  week {week}")
    print("=" * 70)

    metrics = fetch_metrics_for_week(sheets, week)
    metrics_keys = list(metrics.keys())
    print(f"\nMetrics tab: {sum(len(v) for v in metrics.values())} rows for {week}")
    print(f"  → {len(metrics_keys)} unique teacher names")

    roster_main = fetch_teachers_emails_roster(sheets)
    roster_reading = fetch_reading_teachers_roster(sheets)
    roster = roster_main + roster_reading
    print(f"\nRoster: {len(roster)} unique teachers")
    print(f"  → {len(roster_main)} from 'Teacher Emails' tab")
    print(f"  → {len(roster_reading)} from 'Reading Teachers' tab")

    matched = []
    likely_typo = []
    possible_typo = []
    upstream_gap = []

    for t in roster:
        result = lookup_by_name(metrics, t["firstName"], t["lastName"], t["fullName"])
        if result is not None:
            matched.append(t)
            continue
        verdict, suggestion = categorize_unmatched(t, metrics_keys)
        if verdict == "likely-typo":
            likely_typo.append((t, suggestion))
        elif verdict == "possible-typo":
            possible_typo.append((t, suggestion))
        else:
            upstream_gap.append(t)

    print()
    print("=" * 70)
    print("RESULTS")
    print("=" * 70)
    print(f"\n✓ MATCHED            : {len(matched)} of {len(roster)} teachers")
    print(f"⚠ LIKELY TYPO       : {len(likely_typo)}")
    print(f"? POSSIBLE TYPO     : {len(possible_typo)}")
    print(f"✗ UPSTREAM GAP      : {len(upstream_gap)}")

    if likely_typo:
        print("\n" + "─" * 70)
        print("LIKELY TYPOS (high confidence — suggest adding to NAME_ALIASES)")
        print("─" * 70)
        for t, suggestion in sorted(likely_typo, key=lambda x: x[0]["campus"]):
            print(
                f"  • {t['fullName']!r} ({t['campus']})\n"
                f"      metrics has: {suggestion!r}\n"
                f"      → alias: {t['fullName'].lower()!r}: {suggestion!r},"
            )

    if possible_typo:
        print("\n" + "─" * 70)
        print("POSSIBLE TYPOS (low confidence — review manually)")
        print("─" * 70)
        for t, suggestion in sorted(possible_typo, key=lambda x: x[0]["campus"]):
            print(
                f"  • {t['fullName']!r} ({t['campus']})\n"
                f"      possibly: {suggestion!r}"
            )

    if upstream_gap:
        print("\n" + "─" * 70)
        print(
            f"UPSTREAM GAPS — {len(upstream_gap)} teachers in roster but NOT in metrics"
        )
        print("(Likely missing from BigQuery for this week — escalate to data team)")
        print("─" * 70)
        by_campus = {}
        for t in upstream_gap:
            by_campus.setdefault(t["campus"], []).append(t)
        for campus, ts in sorted(by_campus.items()):
            print(f"\n  {campus} ({len(ts)} teachers):")
            for t in sorted(ts, key=lambda x: x["fullName"]):
                print(f"    - {t['fullName']!r} ({t['email']})")

    # Copy-paste block for Code.gs
    if likely_typo:
        print("\n" + "=" * 70)
        print("COPY-PASTE BLOCK FOR Code.gs NAME_ALIASES (high-confidence typos only)")
        print("=" * 70)
        print("\nvar NAME_ALIASES = {")
        # Existing
        for k, v in sorted(NAME_ALIASES.items()):
            print(f"  '{k}': '{v}',")
        # New
        for t, suggestion in sorted(
            likely_typo, key=lambda x: x[0]["fullName"].lower()
        ):
            key = t["fullName"].lower()
            print(f"  '{key}': '{suggestion}',  // {t['campus']} — added v2.5.2")
        print("};")

    print()
    if strict and (likely_typo or upstream_gap):
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--week", default="2026-04-20", help="ISO date (default: 2026-04-20)"
    )
    parser.add_argument(
        "--strict", action="store_true", help="Exit 1 if any mismatch found"
    )
    args = parser.parse_args()
    main(args.week, args.strict)
