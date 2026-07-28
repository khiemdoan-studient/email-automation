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
import json
import os
import sys
from difflib import get_close_matches

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from google.cloud import bigquery
from google.oauth2 import service_account
from googleapiclient.discovery import build

# v2.5.3: SA key path reads from STUDIENT_SA_KEY env var with fallback to local
# Windows path. Lets the script run on EC2 / other dev machines.
SA_KEY = os.environ.get(
    "STUDIENT_SA_KEY",
    r"C:\Users\doank\Documents\Projects\Studient Excel Automation\service account key.json",
)
SPREADSHEET_ID = "1GKtoNumk363StPb2HZ1suiXNB3rHzA_wDLKgRiGj6f8"

# Mirrors Code.gs CONFIG.* — column indices for Teacher Emails tab (0-indexed).
CAMPUS_COL = 2
TEACHER_FIRST_COL = 24
TEACHER_LAST_COL = 25
TEACHER_EMAIL_COL = 26


# v2.5.3: NAME_ALIASES loaded from scripts/name_aliases.json (single source of
# truth). Code.gs still hardcodes the same map at the top of the file (Apps
# Script can't easily fetch JSON at runtime), and test_runner.js verifies they
# match by parsing Code.gs and comparing — drift fails CI.
def _load_name_aliases():
    json_path = os.path.join(os.path.dirname(__file__), "name_aliases.json")
    if not os.path.isfile(json_path):
        # Fallback for unusual setups (script run from non-standard cwd).
        return {
            "lisa kloesz": "lisa kloetz",
            "aston haughton": "anton haughton",
            "lakieshie jennings": "lakieshie roberts-jennings",
        }
    with open(json_path, "r", encoding="utf-8") as f:
        return json.load(f)


NAME_ALIASES = _load_name_aliases()

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
    # v2.6.6: BQ scope added for the new cross-validation probes against
    # weekly_dashboard. The probes hit the same BQ project the parent
    # pipeline writes to.
    creds = service_account.Credentials.from_service_account_file(
        SA_KEY,
        scopes=[
            "https://www.googleapis.com/auth/spreadsheets.readonly",
            "https://www.googleapis.com/auth/bigquery",
        ],
    )
    sheets = build("sheets", "v4", credentials=creds)
    bq_client = bigquery.Client(project="studient-flat-exports-doan", credentials=creds)

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
    # v2.6.5: probe the 2 new year-cumulative tabs (parent v3.41.4).
    print()
    print("=" * 70)
    print("YEAR-CUMULATIVE TABS (v2.6.5 — SC Final Email template)")
    print("=" * 70)
    year_totals_ok = _probe_year_teacher_totals(sheets)
    student_highlights_ok = _probe_student_year_highlights(sheets)
    if not (year_totals_ok and student_highlights_ok):
        print("  -> Run `python email_only.py` from parent repo to populate.")

    # v2.6.6: cross-validate year-cumulative tabs against raw weekly_dashboard.
    # Catches the v3.41.4 cross-product multiplication bug class.
    print()
    print("=" * 70)
    print("YEAR-TAB ↔ WEEKLY_DASHBOARD CROSS-VALIDATION (v2.6.6)")
    print("=" * 70)
    year_totals_match_ok = _probe_year_totals_match_weekly_dashboard(sheets, bq_client)
    highlights_within_ok = _probe_highlights_within_actuals(sheets, bq_client)

    # v2.6.7: catch multi-campus teacher row collision in Year Teacher Totals.
    # Previously query_year_teacher_totals GROUP BY (campus, teacher) emitted
    # multiple rows for teachers serving multiple campuses; Apps Script's
    # last-write-wins map silently dropped the larger campus.
    print()
    print("=" * 70)
    print("MULTI-CAMPUS TEACHER UNIQUENESS (v2.6.7)")
    print("=" * 70)
    no_dupe_teachers_ok = _probe_no_duplicate_teacher_in_year_totals(sheets)

    # v2.6.9: catch "school imported via IMPORTRANGE but Campus column blank"
    # upstream. The JRES Column-A-E wipe bug class: source tab had teacher
    # data in Y/Z/AA but empty Column C, so getTeachersForSchools silently
    # returned 0 teachers and the IM hit "No teachers found for your schools".
    print()
    print("=" * 70)
    print("SCHOOL ROSTER COVERAGE (v2.6.9)")
    print("=" * 70)
    school_coverage_ok = _probe_no_silently_dropped_school(sheets)

    # v2.8.0: assert the Spring 2026 MAP Scores tab is populated. Catches the
    # case where parent generate_report_v3.py hasn't yet written the tab
    # (e.g., before first --full run with NWEA CSV), which would make the
    # Spring 2026 MAP Scores template skip every teacher silently.
    print()
    print("=" * 70)
    print("SPRING 2026 MAP SCORES TAB (v2.8.0)")
    print("=" * 70)
    map_scores_ok = _probe_map_scores_tab_populated(sheets)
    if not map_scores_ok:
        print("  -> Run `python email_only.py` from parent repo to populate.")

    # v2.26.1: the shared email tabs have TWO independent writers (Studient
    # email_winners.py and Timeback email_export_timeback.py). Verify the
    # consumer-critical structure survived the last write from either.
    print()
    print("=" * 70)
    print("SHARED TAB INTEGRITY (v2.26.1 - cross-pipeline clobber guard)")
    print("=" * 70)
    shared_tabs_ok = _probe_shared_tabs_not_clobbered(sheets)

    if strict and (
        likely_typo
        or upstream_gap
        or not year_totals_ok
        or not student_highlights_ok
        or not year_totals_match_ok
        or not highlights_within_ok
        or not no_dupe_teachers_ok
        or not school_coverage_ok
        or not map_scores_ok
        or not shared_tabs_ok
    ):
        sys.exit(1)


def _probe_year_teacher_totals(sheets):
    """v2.6.5: validate Year Teacher Totals tab structure + row count."""
    expected_header = [
        "campus_name",
        "teacher_name",
        "num_students",
        "total_minutes",
        "total_lessons",
        "total_grade_levels",
        "avg_lessons_per_student",
        "avg_grade_levels_per_student",
    ]
    try:
        res = (
            sheets.spreadsheets()
            .values()
            .get(spreadsheetId=SPREADSHEET_ID, range="'Year Teacher Totals'!A1:H")
            .execute()
        )
    except Exception as e:
        print(f"  ✗ Year Teacher Totals: tab not readable ({e})")
        return False
    values = res.get("values", [])
    if not values:
        print("  ✗ Year Teacher Totals: tab is EMPTY")
        return False
    header = values[0]
    if header != expected_header:
        print(f"  ✗ Year Teacher Totals: header mismatch — got {header}")
        return False
    n_rows = len(values) - 1
    if n_rows < 1:
        print(f"  ✗ Year Teacher Totals: 0 data rows (header only)")
        return False
    print(f"  ✓ Year Teacher Totals: {n_rows} teacher rows, schema OK")
    return True


def _probe_year_totals_match_weekly_dashboard(sheets, bq_client):
    """v2.6.6: cross-validate Year Teacher Totals tab against raw weekly_dashboard.

    For each teacher in the tab, the total_lessons cell must equal the per-teacher
    SUM(weekly_dashboard.lessons_mastered) since 2025-09-01 within 1% tolerance.

    Catches regressions in query_year_teacher_totals (e.g., filter drift,
    incorrect aggregation grain).
    """
    try:
        res = (
            sheets.spreadsheets()
            .values()
            .get(spreadsheetId=SPREADSHEET_ID, range="'Year Teacher Totals'!A1:H")
            .execute()
        )
    except Exception as e:
        print(f"  ✗ Year Teacher Totals: tab not readable ({e})")
        return False

    rows = res.get("values", [])[1:]  # skip header
    sheet_totals = {}
    for r in rows:
        if len(r) < 5 or not r[1]:
            continue
        sheet_totals[r[1].strip()] = float(r[4] or 0)

    if not sheet_totals:
        print("  ✗ Year Teacher Totals: empty tab")
        return False

    # Query BQ for ground truth (no whitelist filter -- match the writer's scope)
    # Upper bound mirrors dashboard YEAR_END_DATE cap (2026-05-29) so June weeks
    # do not cause false-FAIL once they arrive in weekly_dashboard.
    sql = """
    SELECT teacher_name, IFNULL(SUM(lessons_mastered), 0) AS total_lessons
    FROM `studient-flat-exports-doan.studient_analytics.weekly_dashboard`
    WHERE week_start >= DATE '2025-09-01'
      AND week_start <= DATE '2026-05-29'
      AND teacher_name IS NOT NULL AND TRIM(teacher_name) != ''
    GROUP BY teacher_name
    """
    bq_totals = {
        r.teacher_name: float(r.total_lessons) for r in bq_client.query(sql).result()
    }

    drift_count = 0
    drift_examples = []
    for teacher, sheet_val in sheet_totals.items():
        bq_val = bq_totals.get(teacher, 0)
        if bq_val == 0 and sheet_val == 0:
            continue
        denom = max(abs(bq_val), 1)
        rel_diff = abs(sheet_val - bq_val) / denom
        if rel_diff > 0.01:
            drift_count += 1
            if len(drift_examples) < 3:
                drift_examples.append(
                    f"{teacher}: sheet={sheet_val:.1f}, bq={bq_val:.1f} (Δ={rel_diff:.1%})"
                )

    if drift_count > 0:
        print(f"  ✗ Year Teacher Totals: {drift_count} teacher(s) drift > 1%")
        for ex in drift_examples:
            print(f"      {ex}")
        return False
    print(
        f"  ✓ Year Teacher Totals: all {len(sheet_totals)} teachers within 1% of BQ baseline"
    )
    return True


def _probe_no_duplicate_teacher_in_year_totals(sheets):
    """v2.6.7: assert each teacher_name appears in AT MOST 1 row of the
    Year Teacher Totals tab.

    Catches re-introduction of per-(campus, teacher) GROUP BY in the parent
    query_year_teacher_totals. When a teacher serves multiple campuses,
    multiple rows would silently collide in Apps Script's
    `getYearTeacherTotals()` map (last-write-wins picks one campus's data).
    """
    from collections import Counter

    try:
        res = (
            sheets.spreadsheets()
            .values()
            .get(
                spreadsheetId=SPREADSHEET_ID,
                range="'Year Teacher Totals'!B2:B",
                valueRenderOption="UNFORMATTED_VALUE",
            )
            .execute()
        )
    except Exception as e:
        print(f"  ✗ Year Teacher Totals: tab not readable ({e})")
        return False

    teacher_names = [
        str(r[0]).strip()
        for r in res.get("values", [])
        if r and r[0] and str(r[0]).strip()
    ]
    counts = Counter(teacher_names)
    duplicates = [(n, c) for n, c in counts.items() if c > 1]

    if duplicates:
        print(f"  ✗ Year Teacher Totals: {len(duplicates)} teacher(s) appear in >1 row")
        for n, c in duplicates[:5]:
            print(f"      {n}: {c} rows")
        return False
    print(
        f"  ✓ Year Teacher Totals: {len(set(teacher_names))} unique teachers, no duplicates"
    )
    return True


def _normalize_campus(s):
    """Python port of Code.js normalizeFolderName for the v2.6.9 probe.

    lowercase, trim, underscore to space, collapse whitespace, apostrophe normalize.
    """
    if not s:
        return ""
    out = str(s).lower().strip()
    for ch in ("‘", "’", "‛", "`", "´"):
        out = out.replace(ch, "'")
    out = out.replace("_", " ")
    out = " ".join(out.split())
    return out


def _probe_no_silently_dropped_school(sheets):
    """v2.6.9: assert each School-IM Mapping displayName with a non-blank IM
    has at least 1 matching row in the destination Teacher Emails tab.

    Catches the JRES Column-A-E wipe bug class: when the upstream MAP Master
    Roster tab for a school loses Column C, the IMPORTRANGE pulls empty values
    into Teacher Emails Column C, getTeachersForSchools correctly filters them
    out, and the assigned IM hits "No teachers found for your schools" with no
    diagnostic of why. This probe fires BEFORE the IM cycle so the data team
    can repopulate the source before any IM is blocked.

    Reading Community uses the "Reading Teachers" tab (not Teacher Emails),
    so this probe skips that displayName.
    """
    try:
        mapping_res = (
            sheets.spreadsheets()
            .values()
            .get(spreadsheetId=SPREADSHEET_ID, range="'School-IM Mapping'!A:C")
            .execute()
        )
    except Exception as e:
        print(f"  ✗ School-IM Mapping: tab not readable ({e})")
        return False

    try:
        roster_res = (
            sheets.spreadsheets()
            .values()
            .get(spreadsheetId=SPREADSHEET_ID, range="'Teacher Emails'!C:C")
            .execute()
        )
    except Exception as e:
        print(f"  ✗ Teacher Emails: tab not readable ({e})")
        return False

    mapping_rows = mapping_res.get("values", [])
    roster_rows = roster_res.get("values", [])

    roster_campus_set = set()
    for row in roster_rows[1:]:
        if not row:
            continue
        c = (row[0] or "").strip() if row else ""
        if c:
            roster_campus_set.add(_normalize_campus(c))

    dropped = []
    checked = 0
    for row in mapping_rows[1:]:
        if not row or len(row) < 3:
            continue
        display = (row[1] or "").strip() if len(row) > 1 else ""
        im_email = (row[2] or "").strip() if len(row) > 2 else ""
        if not display or not im_email:
            continue
        if _normalize_campus(display) == _normalize_campus(READING_DISPLAY_NAME):
            continue
        checked += 1
        if _normalize_campus(display) not in roster_campus_set:
            dropped.append((display, im_email))

    if dropped:
        print(
            f"  ✗ {len(dropped)} of {checked} School-IM Mapping schools are DROPPED in Teacher Emails:"
        )
        for display, im in dropped:
            print(f"      {display!r} (IM: {im}) has 0 rows in Teacher Emails Column C")
        print()
        print("    Likely cause: upstream source spreadsheet (ID")
        print("    1scEay0a8OR6vU3uJuxbHKWCEx_RVgSsRXF9naJh3XYw) lost Column C for")
        print("    that school's tab. Restore from File > Version history.")
        return False
    print(
        f"  ✓ Roster coverage: all {checked} assigned schools present in Teacher Emails"
    )
    return True


def _probe_map_scores_tab_populated(sheets):
    """v2.9.0: assert the Spring 2026 MAP Scores tab exists, has >= 1 data
    row, and has the expected 8-column schema (v2.9.0 added Winter-to-Spring
    projected_growth + observed_growth for client-side X Growth computation).

    The MAP Scores tab is written by parent generate_report_v3.py Step 5
    (calling query_map_scores_for_email + write_map_scores_to_email_sheet).
    If the tab is empty / missing, the Spring 2026 MAP Scores email template
    cannot render anything useful and all teachers will be skipped via the
    v2.7.0 partition logic. Catch the empty state pre-cycle.
    """
    expected_header = [
        "campus_name",
        "teacher_name",
        "student_name",
        "subject",
        "winter_rit",
        "spring_rit",
        "winter_to_spring_projected_growth",
        "winter_to_spring_observed_growth",
    ]
    try:
        res = (
            sheets.spreadsheets()
            .values()
            .get(
                spreadsheetId=SPREADSHEET_ID,
                range="'Spring 2026 MAP Scores'!A1:H",
            )
            .execute()
        )
    except Exception as e:
        print(f"  ✗ Spring 2026 MAP Scores: tab not readable ({e})")
        return False
    values = res.get("values", [])
    if not values:
        print("  ✗ Spring 2026 MAP Scores: tab is EMPTY")
        return False
    if values[0] != expected_header:
        print(
            f"  ✗ Spring 2026 MAP Scores: header mismatch. got={values[0]} expected={expected_header}"
        )
        return False
    n_rows = len(values) - 1
    if n_rows < 1:
        print("  ✗ Spring 2026 MAP Scores: 0 data rows (header only)")
        return False
    print(f"  ✓ Spring 2026 MAP Scores: {n_rows} score rows, schema OK")
    return True


def _probe_shared_tabs_not_clobbered(sheets):
    """v2.26.1: assert the shared email tabs still have a header row AND a
    populated teacher-name column.

    INCIDENT (2026-08-04): the Timeback pipeline's email_export_timeback.py
    cleared these tabs and appended its own rows with NO header and an empty
    teacher_name (Vita/ScienceSIS have no OneRoster teacher assignments).
    "All Teacher Metrics" was found with 300 rows, no header, and a blank
    Teacher column; "Student Winners" was destroyed the same way. Apps Script
    keys every one of these tabs by lowercased teacher_name, so all lookups
    returned nothing and teacher emails plus admin summaries rendered blank
    for all 9 public schools, while every log still looked clean.

    Writer-agnostic on purpose: it catches the damage no matter which pipeline
    causes it. The Timeback side is guarded as of its v0.11.1, but this
    spreadsheet has two independent writers, so the consumer verifies rather
    than trusts.
    """
    checks = [
        ("All Teacher Metrics", "week_start", 1, "A1:L"),
        ("Student Winners", "campus_name", 1, "A1:G"),
        ("Student Year Highlights", "campus_name", 1, "A1:H"),
        ("Year Teacher Totals", "campus_name", 1, "A1:H"),
    ]
    all_ok = True
    for tab, first_header, teacher_idx, rng in checks:
        try:
            res = (
                sheets.spreadsheets()
                .values()
                .get(spreadsheetId=SPREADSHEET_ID, range=f"'{tab}'!{rng}")
                .execute()
            )
        except Exception as e:
            print(f"  X {tab}: not readable ({e})")
            all_ok = False
            continue
        values = res.get("values", [])
        if not values:
            print(f"  X {tab}: EMPTY")
            all_ok = False
            continue
        header_ok = str(values[0][0]).strip().lower() == first_header
        rows = values[1:] if header_ok else values
        named = sum(
            1 for r in rows if len(r) > teacher_idx and str(r[teacher_idx]).strip()
        )
        if not header_ok:
            got = values[0][0] if values[0] else ""
            print(
                f"  X {tab}: HEADER ROW MISSING (row 1 starts with '{got}', "
                f"expected '{first_header}')"
            )
            all_ok = False
        if rows and named == 0:
            print(
                f"  X {tab}: {len(rows)} rows but ZERO teacher names. The tab was "
                f"clobbered by another writer; every email lookup returns nothing."
            )
            all_ok = False
        elif header_ok and named:
            print(f"  OK {tab}: header present, {named}/{len(rows)} rows carry a teacher name")
    if not all_ok:
        print("  Repair: run `python email_only.py` in the pipeline repo.")
    return all_ok


def _probe_highlights_within_actuals(sheets, bq_client):
    """v2.6.6: cross-validate Student Year Highlights spotlight values stay
    bounded by actual per-student weekly_dashboard SUMs.

    For each spotlight row, asserts cumulative_lessons <= actual + 5% slack.
    Catches the v3.41.4 cross-product multiplication bug class (subject-axis
    or week-axis inflation).
    """
    try:
        res = (
            sheets.spreadsheets()
            .values()
            .get(
                spreadsheetId=SPREADSHEET_ID,
                range="'Student Year Highlights'!A1:H",
            )
            .execute()
        )
    except Exception as e:
        print(f"  ✗ Student Year Highlights: tab not readable ({e})")
        return False

    rows = res.get("values", [])[1:]
    spotlights = []  # list of (teacher, student_name, cumulative_lessons)
    for r in rows:
        if len(r) < 8 or not r[1] or not r[3]:
            continue
        try:
            spotlights.append((r[1].strip(), r[3].strip(), float(r[4] or 0)))
        except ValueError:
            continue

    if not spotlights:
        print("  ✗ Student Year Highlights: empty tab")
        return False

    # Single BQ query for actual per-(teacher, student) lessons.
    # Upper bound mirrors dashboard YEAR_END_DATE cap (2026-05-29) so June weeks
    # do not cause false-FAIL once they arrive in weekly_dashboard.
    sql = """
    SELECT teacher_name, student_name, IFNULL(SUM(lessons_mastered), 0) AS actual_lessons
    FROM `studient-flat-exports-doan.studient_analytics.weekly_dashboard`
    WHERE week_start >= DATE '2025-09-01'
      AND week_start <= DATE '2026-05-29'
      AND teacher_name IS NOT NULL AND TRIM(teacher_name) != ''
      AND student_name IS NOT NULL AND TRIM(student_name) != ''
    GROUP BY 1, 2
    """
    bq_lookup = {
        (r.teacher_name, r.student_name): float(r.actual_lessons)
        for r in bq_client.query(sql).result()
    }

    over_count = 0
    over_examples = []
    for teacher, student, sheet_lessons in spotlights:
        actual = bq_lookup.get((teacher, student), 0)
        if sheet_lessons > actual * 1.05:
            over_count += 1
            if len(over_examples) < 3:
                over_examples.append(
                    f"{teacher} / {student}: sheet={sheet_lessons:.0f}, actual={actual:.0f}"
                )

    if over_count > 0:
        print(
            f"  ✗ Student Year Highlights: {over_count} spotlight(s) exceed actual + 5% slack"
        )
        for ex in over_examples:
            print(f"      {ex}")
        return False
    print(
        f"  ✓ Student Year Highlights: all {len(spotlights)} spotlights within 5% of actual per-student weekly_dashboard SUM"
    )
    return True


def _probe_student_year_highlights(sheets):
    """v2.6.5: validate Student Year Highlights tab structure + row count."""
    expected_header = [
        "campus_name",
        "teacher_name",
        "rank",
        "student_name",
        "cumulative_lessons",
        "cumulative_grade_levels",
        "top_subject",
        "leading_metric",
    ]
    try:
        res = (
            sheets.spreadsheets()
            .values()
            .get(spreadsheetId=SPREADSHEET_ID, range="'Student Year Highlights'!A1:H")
            .execute()
        )
    except Exception as e:
        print(f"  ✗ Student Year Highlights: tab not readable ({e})")
        return False
    values = res.get("values", [])
    if not values:
        print("  ✗ Student Year Highlights: tab is EMPTY")
        return False
    header = values[0]
    if header != expected_header:
        print(f"  ✗ Student Year Highlights: header mismatch — got {header}")
        return False
    n_rows = len(values) - 1
    if n_rows < 1:
        print(f"  ✗ Student Year Highlights: 0 data rows")
        return False
    print(f"  ✓ Student Year Highlights: {n_rows} student rows, schema OK")
    return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--week", required=True, help="ISO week_start date, e.g. 2026-06-15 (required, no default)"
    )
    parser.add_argument(
        "--strict", action="store_true", help="Exit 1 if any mismatch found"
    )
    args = parser.parse_args()
    main(args.week, args.strict)
