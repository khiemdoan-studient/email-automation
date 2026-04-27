# Changelog

All notable changes to this project will be documented in this file.

## [v2.4.3] - 2026-04-27

### Fixed — "Service error: Drive" — comprehensive iteration wrap (FOURTH attempt at this class of bug)

User reported same error returning at JHMS:
```
Exception: Service error: Drive
    at checkDriveFolderExists(Code:538:20)        <-- inside files.hasNext() iteration
    at generateDraftsForCurrentUser(Code:330:27)
```

v2.4.1 wrapped `createDraftForTeacher`. v2.4.2 wrapped `findFolderByName` + `schoolFolderCache` build + `debugDriveAccess`. **But `checkDriveFolderExists` and `checkTeacherFolders` still had unwrapped iterators** — those threw exactly the same error in different code paths.

The shared-with-me Drive permission gap throws "Service error: Drive" on:
- `parentFolder.getFolders()` (initial call) — covered in v2.4.2
- `iter.hasNext()` (mid-iteration) — **NEW failure surface in v2.4.3**
- `iter.next()` (mid-iteration) — **NEW failure surface**
- `tf.getFiles()` (initial) — covered in v2.4.1's createDraftForTeacher only
- `files.hasNext()` (mid-iteration) — **NEW failure surface (this is line 538 from user's stack trace)**

### Changes (`Code.gs`)

1. **`checkDriveFolderExists` (lines ~510-590)** — completely rewritten with try/catch on EVERY iteration step (school folder lookup, getFolders, hasNext, next, getFiles, files.hasNext, files.next). Each failure logs to `console.log` for triage and continues with the next iteration item OR fails-open.

2. **FAIL-OPEN by design** — when iteration crashes, return `true` (assume PDFs exist) instead of `false` (block generation). Rationale: createDraftForTeacher (v2.4.1+) wraps every per-teacher Drive call with named errors. The pre-flight "no PDFs at all" check is now best-effort; per-teacher errors surface specific failures clearly. **Blocking the whole run because one Drive call fails was making the symptom worse.**

3. **`checkTeacherFolders` (lines ~1665-1700)** — same comprehensive wrapping. School lookup tries `displayName` FIRST (search-API fast path), wraps every iteration step.

4. **`debugDriveAccess` per-teacher PDF iteration (lines ~1810-1845)** — wrapped every step (`tfs.hasNext`, `tfs.next`, `tf.getFiles`, `files.hasNext`, `files.next`). Diagnostic now produces partial output even on partial Drive failure.

### Why this finally fixes it

The class of bug was wrapping ONE callsite at a time and missing siblings. v2.4.3 audits ALL `getFolders()` and `getFiles()` calls in Code.gs (10 of them) and confirms each is now inside a try/catch, AND that the iterator's `hasNext()` / `next()` methods are also inside try/catch. Every Drive iteration in the codebase is now defensible.

### Investigation: Hamid + Edwards specifically not generating

Confirmed via BQ probe — both ARE in the `All Teacher Metrics` tab and roster:
- `Muntasir Hamid` (JHMS, grade 7, 106 students, 88.21 mins)
- `Avlen Edwards` (JHMS, grade 8, 25 students, 75.43 mins)

Their teacher folders DO exist in Drive (per user screenshot). After v2.4.3 deploys, run "Generate My Email Drafts" again — the per-teacher errors will now surface CLEAN messages identifying any specific PDF / folder issue if one exists. If they still don't generate after deploy, the new error string in the alert will identify exactly why.

### Action required after deploy

1. Paste latest Code.gs into Apps Script editor → save → reload spreadsheet tab
2. Run "Email Tools → Generate My Email Drafts" for JHMS
3. The pre-flight Drive iteration will no longer crash. If individual teachers fail (e.g., missing PDF for that week), each will be listed with the specific reason in the completion alert.
4. If Hamid/Edwards still don't appear: paste the new alert text — the error message now identifies the specific failure phase (school folder / teacher folder / PDF / createDraft) + the specific file/path.

## [v2.4.2] - 2026-04-27

### Fixed — "Service error: Drive" root cause: shared-with-me parent permission gap

User Khiem reported v2.4.1 didn't fix the bare `Exception: Service error: Drive` error. Apps Script Executions stack trace pinpointed the failure:

```
Exception: Service error: Drive
    at findFolderByName(Code:614:13)        <-- parentFolder.getFolders() iteration
    at generateDraftsForCurrentUser(Code:253:18)   <-- schoolFolderCache build
```

Plus a screenshot showing folders accessed via "**Shared with me > Bruna and Mark's Schoo...**" — owner is `mark.katigbak`, NOT the running user. Diagnosis:

**Drive permission gap pattern:**
- `parentFolder.getFoldersByName(name)` (search API) — works for shared-with-me users ✓
- `parentFolder.getFolders()` (children-list API) — **fails** for shared-with-me users ✗

Drive's child-listing requires explicit Editor/Viewer membership on the parent folder. Direct-share recipients ("Shared with me") get individual folder access but NOT parent-list permission. Frank (the IM whose runs work) is presumably an explicit Editor of the parent. Khiem's account is only a direct-share recipient.

The exact failure path was the **normalized-name fallback** in `findFolderByName`. It hits when the School-IM Mapping's column A uses underscores (`JRES_-_Ridgeland_Elementary_School`) but actual Drive folder names use spaces. `getFoldersByName('JRES_-_...')` (search) returns empty → falls through to `parentFolder.getFolders()` (list) → throws.

### Fixes (`Code.gs`)

1. **`findFolderByName` (line ~602)** — both Drive calls now wrapped in named try/catch. On failure, returns `null` and emits a console.log line; does NOT propagate the exception. Calling code's existing null-handling kicks in instead of crashing the whole orchestrator.

2. **schoolFolderCache build (line ~250)** — try `displayName` (with spaces) FIRST, fall back to `folderName` (underscores) only if displayName fails. The space-version exact-matches via `getFoldersByName` (search API which DOES work for shared-with-me users), avoiding the failing `getFolders()` iteration entirely. **This alone resolves the symptom for shared-with-me users**, provided the displayName column is populated correctly.

3. **`debugDriveAccess` (lines ~1675, ~1700, ~1713)** — every `getFolders()` call now wrapped. The diagnostic now produces partial output even if one section fails, with a clear pointer to the new auth diagnostic.

4. **NEW: `diagnoseDriveAuth()` menu item** — minimal Drive auth probe that tests three operations in isolation:
   - `DriveApp.getRootFolder()` (your "My Drive" reachable?)
   - `DriveApp.getFolderById(ROOT_FOLDER_ID)` (project root reachable by ID?)
   - `rootFolder.getFolders()` (can list children?)

   When any test fails, it produces a CLEAR explanation + actionable fix (e.g., "Have the folder OWNER add you as Editor on 'Bruna and Mark's Schools - Weekly Report'. Once added, child iteration works."). Run this FIRST when "Service error: Drive" appears.

### Why v2.4.1's fix wasn't enough

v2.4.1 wrapped `createDraftForTeacher` (per-teacher loop) but the failure was in the **pre-flight `schoolFolderCache` build** that runs BEFORE the per-teacher loop. Pre-flight code paths weren't wrapped — bare exceptions propagated up as `Exception: Service error: Drive`.

### Action required after deploy

1. **Paste latest Code.gs into Apps Script editor → save → reload spreadsheet tab**
2. **Run `Email Tools > Debug: Drive Auth (run if "Service error: Drive")` first** — confirms whether your account hits the shared-with-me limitation
3. If diagnosis shows the limitation: have **mark.katigbak** add you as **Editor** directly on "Bruna and Mark's Schools - Weekly Report" parent folder (NOT just the children). One-click in Drive sharing settings.
4. Re-run "Generate My Email Drafts" — should succeed now.

### Why this works without admin permission grant (workaround)

Even WITHOUT being added to the parent, v2.4.2 will now:
- Use `getFoldersByName('JRES - Ridgeland Elementary School', rootFolder)` (exact-match search) — succeeds for shared-with-me users
- Cache the resolved folder
- Per-teacher loop uses the cached Folder object directly (no further `getFolders` iteration on the parent)
- The teacher folders themselves (children of the school folder) ARE listable via `getFolders()` if the SCHOOL folder is fully accessible (which it is — Khiem confirmed all 12+ JRES teacher folders open fine)

So the immediate symptom resolves with just the v2.4.2 deploy. The proper long-term fix is the parent-folder permission grant.

### Known carry-forward

- If a teacher folder is shared-with-me but NOT under explicit listing permission, `tf.getFiles()` for finding the PDF could still fail in rare cases. Not observed in user's reports. v2.4.1's named try/catch already wraps that surface.

## [v2.4.1] - 2026-04-27

### Fixed — "Exception: Service error: Drive" during email generation

Production user reported the bare error message "Exception: Service error: Drive" while running `Email Tools > Generate My Email Drafts` on the v2.4.0 deploy. The error message had no teacher / file context, making it impossible to triage.

Investigation (parallel Sonnet agent) identified 3 likely causes:
1. **Stale cached Folder reference** — `schoolFolderCache` from v2.3.1 stores `Folder` objects across the run; if a folder is moved/renamed/deleted mid-run, subsequent calls on the cached reference throw "Service error: Drive". The defensive fallback only fired on falsy cache values, not on stale `Folder` objects.
2. **`getAs(MimeType.PDF)` coercion failure** — calling `getAs(MimeType.PDF)` on an already-PDF File is normally a no-op, but adds a Drive API call AND a failure surface. The PDF generator (parent repo v3.31.0+) produces files that occasionally trip this if the size or encoding shifts.
3. **Drive rate limit** — the per-user budget is 1000 reads / 100 sec. With 30+ teachers and 4 Drive calls per teacher worst-case, the budget can exhaust mid-run, surfacing as transient "Service error: Drive".

### Changes (`Code.gs`)

1. **`createDraftForTeacher`** — every Drive surface call (school folder lookup, teacher folder lookup, PDF iteration, createDraft) now wrapped in a named try/catch. Any "Service error: Drive" now identifies the specific phase + file + size in the per-teacher error string. Closes the diagnostic gap.

2. **Stale-Folder-cache detection** — cache hit is now validated via a cheap `getId()` probe; on throw, the cache entry is dropped and a fresh lookup runs. Fixes cause #1.

3. **Drop the `getAs(MimeType.PDF)` coercion** — pass the `File` object directly to `createDraft`. `GmailApp.createDraft` accepts a File without explicit MIME coercion. One fewer Drive call AND eliminates the cause #2 failure surface.

4. **`withDriveRetry(fn)` helper** — wraps the `GmailApp.createDraft` call in a one-retry-after-2s helper that catches transient errors matching `/Service error|Rate Limit|Internal error|Backend Error|temporarily/i`. Real failures still propagate. Closes cause #3 for transient blips.

### Pairs with parent repo v3.33.0

The parent repo (`Studient Excel Automation`) ships v3.33.0 simultaneously, which extends v3.32.0's FastMath-only raw_data injection to ALL 5 connector apps (MA, Lalilo, Zearn, Freckle, MobyMax). When the next pipeline cron runs, the email's "All Teacher Metrics" tab will reflect all 5 apps' minutes — same as the WPD's `Avg Minutes` column. **Most teachers (~80%) will see their email Avg Minutes jump significantly** (mean +32.6 mins, max +112.3 in week 2026-04-20 quantification).

### Action required after deploy

1. Paste latest `Code.gs` into Apps Script editor → save → reload spreadsheet tab
2. Re-test "Email Tools > Generate My Email Drafts" on the same week that previously errored
3. If the error returns, the new error string will identify the specific phase + file (e.g., "createDraft failed for 'Shanatae Taylor - 2026-04-20 - 2026-04-26.pdf' (XXXX bytes): <real error>")
4. Wait for next parent-repo pipeline run for full v3.33.0 effect on metrics values

### Known limitations

- The diagnostic improvements catch errors at named boundaries but don't fix RATE LIMIT exhaustion — for very large IM rosters (40+ teachers), the Drive 1000-reads/100-sec budget can still trigger transient "Service error: Drive". The retry-once helper handles single 5xx blips; persistent rate-limit errors still surface but with more context. Future work: pre-resolve teacher folders + PDFs before the per-teacher loop (mirrors v2.3.1 schoolFolderCache) to halve Drive call count.

## [v2.4.0] - 2026-04-27

### Changed — Improved "No data available" message (`Code.gs:~703`)

When a teacher exists in the roster but has no row in "All Teacher Metrics" for the selected week, the email previously showed only:

> *No data available for this week.*

This was ambiguous — IMs couldn't tell whether the cause was (a) upstream SIS data gap, (b) name mismatch in roster vs BQ, or (c) pipeline hadn't run. Now the message renders as a yellow callout box with the 3 possible causes spelled out and a recommended diagnostic step (`Email Tools > Debug: Check Teacher Folders`).

### Related — sibling repo fix shipping in parallel

The "Shanatae Taylor showed 35 mins in email but 123 in admin" bug from production is fixed in the parent repo (`Studient Excel Automation` v3.32.0). The cause was that the email pipeline queried base `weekly_dashboard` directly while the admin/WPD displays values that include FastMath connector minutes injected during `_inject_fastmath_minutes()`. The parent repo now uses an in-memory aggregator over the already-merged `raw_data`, so the next time the pipeline runs (hourly cron `:07` or manual `./refresh_data.sh`), the email-automation "All Teacher Metrics" tab will show WPD-aligned values.

No change to email-automation Code.gs's metric column count or schema — Apps Script consumes the same 12 columns; only the values inside `Avg Minutes` change.

### Action required after deploy

1. Paste latest Code.gs into Apps Script editor, save
2. Reload spreadsheet tab
3. Wait for next pipeline run (hourly `:07` or manual) to repopulate "All Teacher Metrics" with FastMath-included values
4. Test draft for Shanatae Taylor (or any FastMath-active teacher) — should now show ~123 mins for week 2026-04-20 instead of 35

### Known limitations

- The improved "No data" message only fires if the teacher has ZERO rows for the selected week. If a teacher has SOME rows but the lookup fails (rare with v2.3.1 smart-prefix), the message won't show. That's the right behavior — those are different failure modes.
- For Armi Laigue specifically: even after this release, she'll still show "No data available" because she's not in the upstream SIS at all. The new message guides IMs to the right team to escalate.

## [v2.3.1] - 2026-04-27

### Fixed — `lookupByName` last-name fallback (Code.gs:~339)

v2.3.0 tightened the fallback to require first-letter match — but `Lisa` and `Liam` both start with `L`, so a same-last-name same-first-letter collision could still leak data. Replaced with smart-prefix matching:

```
beforeLast = k.substring(0, k.length - last.length - 1);
if (beforeLast === first || beforeLast.startsWith(first + ' ')) lastMatches.push(k);
```

- **Match**: `lisa smith`, `lisa marie smith`, `lisa b smith` (lookup: Lisa Smith)
- **Reject**: `liam smith`, `marion smith`, `alisa smith`, `lisa jones`

Verified via 11 edge-case unit tests in verify-build (Liam/Lisa, Marion/Mary, alisa/Lisa, two-teacher ambiguous case all behave correctly).

### Performance — School folder caching across validation + per-teacher loops (Code.gs:~245, ~426, ~619)

`generateDraftsForCurrentUser` now pre-resolves each school's Drive folder ONCE into a `schoolFolderCache` keyed by displayName. `checkDriveFolderExists` and `createDraftForTeacher` consume the cache instead of re-doing `findFolderByName()` for every teacher.

For an IM with 4 schools and 30 teachers, this saves **~30 redundant Drive API calls per run** (~50% reduction in school-folder lookups). Both consumers fall back to fresh lookup defensively if the cache misses, so behavior is preserved.

New signatures:
- `checkDriveFolderExists(rootFolder, schools, dateRange, schoolFolderCache)` — fourth param optional for backward compat
- `createDraftForTeacher(teacher, rootFolder, dateRange, metrics, winners, schoolFolderMap, template, schoolFolderCache)` — eighth param optional

### Docs

- `CLAUDE.md` (parent repo `Studient Excel Automation`): Cross-project dependencies row for email-automation updated. Was stale — listed `teacher_email`, `pts_earned`, `target_status` columns that don't exist. Now correctly lists all 12 actual columns of `All Teacher Metrics` plus `Available Weeks` + `Student Winners` schemas. Separate isolated commit on parent repo `main`.
- `CLAUDE.md` (this repo): v2.3.1 entry in version history.
- `write_doc.py`: v2.3.1 + version-history entry. Google Doc pushed live.

### Verification

25/25 verification checks passed. 11 lookupByName edge cases + 7 folder cache plumbing checks + 7 regression checks (template count, 4/27 trend omission, LockService preserved, default template, etc.).

### Known limitations carried forward

- Same-first-name same-last-name + ambiguous match (e.g., `lisa marie smith` AND `lisa beth smith` both in metrics) returns `null` rather than guessing — IM sees "No data available" for that teacher. Correct conservative behavior; if it ever occurs in practice we can add an alias.
- Teacher folder caching not done (school cache only). Lower payoff since teacher folders are looked up once per teacher anyway.
- Default template still hardcoded to 4/27. Update at next cycle handoff.

### Action required after deploy

After pasting Code.gs into Apps Script:
1. Save in editor
2. Reload spreadsheet tab
3. Test draft on one teacher with 4/27 template — confirm trend box still GONE, draft still attaches the correct PDF, draft still creates correctly. The cache should produce **identical output** to v2.3.0 for the happy path.

## [v2.3.0] - 2026-04-26

### Changed — 4/27 template omits trend alert

`generateLastWeekFinishLineBody()` (`Code.gs:~1320`) no longer renders `buildTrendAlert(metricsArray)`. End-of-year context made the green/yellow/red coaching message feel out of place. All 12 other templates retain their trend alert. Verified via diff: only the 4/27 path changed.

### Changed — Default template (Code.gs:~213)

When Config Template is empty, default is now `'4/27: Last Week of Motivention'` (was `'Week 6: Culture & Shoutouts'`). End-of-year cycle handoff. Update at next cycle (or remove default in a future patch).

### Changed — `lookupByName` last-name fallback (Code.gs:~325)

Tightened: the single-last-name fallback now ALSO requires the first letter of the first name to match. Prevents cross-teacher data leak when two teachers share a last name and only one has metrics for the selected week.

Edge case still possible: same-last-name + same-first-letter (e.g., Lisa vs Liam Smith) — narrow window but acknowledged in code comment.

### Added — Concurrency guard (Code.gs:~200)

`generateDraftsForCurrentUser()` now wraps its body in `LockService.getDocumentLock().tryLock(0)` + `try`/`finally`. If the menu fires twice (double-click, accidental re-run), the second invocation shows an "Already Running" alert instead of creating duplicate Gmail drafts. Lock always released in finally.

### Added — TEMPLATE_NAMES auto-derived (Code.gs:~86)

`TEMPLATE_NAMES = Object.keys(TEMPLATES)` instead of a parallel hardcoded array. Eliminates the class of bug where the dropdown is missing a template that's actually registered (or vice versa). V8 preserves insertion order, so dropdown order matches `TEMPLATES` literal order.

### Fixed — Defensive null guards in `lookupByName` (Code.gs:~315)

If `firstName`, `lastName`, or `fullName` is empty/null/undefined, returns null instead of throwing on `.toLowerCase()`. Earlier the per-teacher try/catch caught these but they polluted the error report.

### Fixed — `getTeacherMetricsForWeek` 'undefined' string (Code.gs:~465)

Skips rows where the teacher cell is null. Previously `String(null).trim().toLowerCase()` produced the literal string `'undefined'` which polluted the metrics map (harmless but messy).

### Fixed — Error message truncation (Code.gs:~298)

The completion alert caps the error string at 1500 chars (was unbounded). For 50-teacher runs with many errors, prevents alert overflow past the 4096-char Apps Script limit. Full error list dumped to `console.log` for debugging.

### Fixed — `endsWith('.PDF')` (Code.gs:~635)

Old PDF format fallback now uses `name.endsWith('.PDF')` instead of `name.indexOf('.PDF') === name.length - 4`. Both work in practice but the new form is the conventional safe pattern.

### Fixed — Inner file-count cap in `checkDriveFolderExists` (Code.gs:~430)

The inner `getFiles()` loop now caps at 50 files per teacher folder. Defends against teacher folders with thousands of files (would have stalled the validation).

### Fixed — `debugDriveAccess` teacher cap raised 15 → 50 (Code.gs:~1305)

Matches `checkDriveFolderExists`. IMs with 5+ schools / 30+ teachers per school now see a complete diagnostic.

### Fixed — `checkTeacherFolders` O(N×M) → O(N) (Code.gs:~1220)

Drive folder names now live in a Set-style object literal (`{name: true}`) instead of an Array iterated with `indexOf`. Diagnostic-only, but cheaper.

### Removed — Dead `CONFIG.TEACHER_DATA_SHEET_NAME` (Code.gs:~16)

Was defined but never referenced. Deleted.

### Docs

- CLAUDE.md fixed 3 stale references: "10 templates / Week 0-8 + Wrap Up" → "13 templates including 4/20 + 4/27 templates"; "All 13 school folders" → unhardcoded count
- write_doc.py bumped to v2.3.0 with version-history entry
- Google Doc user guide pushed live

### Audit Coverage

This release was driven by a `/go_plan --push` audit. Three Sonnet subagents fired in parallel scanned: (a) Code.gs for bugs/perf/dead code/error handling/edge cases, (b) parent repo email_winners.py schema vs Code.gs column expectations, (c) doc consistency (CHANGELOG / CLAUDE.md / write_doc.py / Code.gs). Schema cross-check: aligned. Doc audit found 3 stale refs (now fixed). Code audit produced 19 findings (13 auto-fixed as behavior-preserving; 4 fixed with explicit user approval as behavior-changing; 2 deferred as larger refactors). Live Apps Script confirmed in sync with repo HEAD pre-fix.

### Known limitations carried into v2.3.0

- **Folder caching across validation + per-teacher loops** is duplicated work (~50% wasted Drive API calls). Worth a future refactor.
- **`'Lisa' vs 'Liam' Smith` edge case** in lookupByName: same-last-name + same-first-letter still ambiguous. Documented in code; can be tightened further if a real conflict is observed.
- **Default template** still hardcoded; a future patch could derive default from the most recent week_start in Available Weeks instead.

### Action required after deploy

After pasting Code.gs into Apps Script:
1. Verify `Email Tools` menu still has all items (no syntax error broke `onOpen`)
2. Run **Email Tools > Refresh Template Dropdown** (since TEMPLATE_NAMES is now auto-derived, this just confirms the dropdown matches; no functional change)
3. Test draft generation on one teacher with the 4/27 template and verify the trend box is GONE while the data table + update note + 3 updates are still present

## [v2.2.0] - 2026-04-26

### Added — "4/27: Last Week of Motivention" template

End-of-year template covering the final Motivention week. Sections: FastMath +200 bonus reminder, store closing dates (May 8), end-of-year raffle drawing (May 26), AIM Launch links (Weeks 8-11). Subject: "Data crunch & point calculation complete: (+ 3 non-boring updates to finish strong)".

- **`generateLastWeekFinishLineBody()`** (`Code.gs:1304`) — new template body. Uses standard section order (Greeting → Data Table → Color Legend → Trend Alert → Updates → Weekly Focus → Resources). Per source content, OMITS the standard "Your Actions This Week" / "Weekly Challenge" / "Reflection Prompt" sections — just the 3 updates + one-line Persistence focus + Resources.
- **Registry**: `'4/27: Last Week of Motivention'` added to TEMPLATES + TEMPLATE_NAMES (now 13 entries).
- **Update note**: Yellow callout box ("Minutes/lessons may look different due to recent updates") rendered between trend alert and updates section to acknowledge v2.1.0 metric column changes for IMs comparing week-over-week.
- **AIM Launch links**: Week 8 (Curiosity), Week 9 (What Is Confidence), Week 10 (Self-Efficacy), Week 11 (Brain-Body Feedback Loop) — all 4 hyperlinked. Prize slide hyperlinked in raffle section.

### Verification
- Node syntax check passed
- 13 TEMPLATES keys = 13 TEMPLATE_NAMES = 13 `generate*Body` definitions, all names match
- 30/30 content assertions passed (subject, +200 bonus, FastMath, MAY 8 close, raffle prizes, May 26 raffle, prize slide hyperlink, all 4 AIM Launch URLs, no emoji, no Actions/Challenge per source, yellow callout for update note, standard section order)

### Action required after deploy
After pasting Code.gs into Apps Script, run **Email Tools > Refresh Template Dropdown** so the Config B4 dropdown picks up the new template.

## [v2.1.1] - 2026-04-17

### Docs — Troubleshooting entry for stale Template dropdown
Real-world validation of v2.1.0: after pasting the new Code.gs into Apps Script, the new 4/20 templates appeared in the "Set Template" popup (which reads `TEMPLATE_NAMES` directly) but NOT in the Config B4 dropdown (which uses fixed data validation). The fix is `Email Tools > Refresh Template Dropdown`, but this wasn't documented.

- `CLAUDE.md` — added "New templates don't appear in the Config Template dropdown" troubleshooting section with explanation of the popup vs dropdown source-of-truth difference
- `write_doc.py` (Google Doc user guide) — added matching troubleshooting entry

## [v2.1.0] - 2026-04-17

### Added — Avg Lessons/Student column + 2 new templates

**New column: Avg Lessons/Student**
- `buildMetricsTable()` (`Code.gs:620-639`) now renders 5 columns instead of 4. New rightmost column: `Avg Lessons/Student`, pulled from `m.avgLessons` (already parsed from "All Teacher Metrics" column L).
- Max table width bumped `560px` → `640px` to accommodate the new column.
- Propagates to **every** template automatically since `buildMetricsTable()` is the shared component.

**New templates (total now 12)**
- **`4/20 Jasper: Finishing Strong`** — `generateJasperFinishingStrongBody()` (`Code.gs:1213`). Reading Focus next 2 weeks, Personalized Reading (AlphaRead/Lalilo), Math Fluency via Fast Math, Incentivized Progress. Subject: "Data drop: What's changing this week (and why it matters)". AIM Launches: Weeks 7-8 + Bonus Confidence week.
- **`4/20 Math+ELA: Finishing Strong`** — `generateMathElaFinishingStrongBody()` (`Code.gs:1256`). Same intro as Jasper plus New Math App (Math Academy for 4th grade+), math-track students below 4th grade spend full block on fluency. Same subject line. Same AIM Launches.

**Color legend updated**
- `buildColorLegend()` (`Code.gs:640-647`) "Key metrics" line updated: `Average active days, Daily logins, Average minutes` → `Average mastered lessons, active days, Daily logins, Average minutes`. Cascades to Week 0, 4, 5, 6, 7, 8, Wrap Up, and both new 4/20 templates.

**New menu item + function**
- **Email Tools > Refresh Template Dropdown** — runs `setupTemplateDropdown()` (`Code.gs:107-147`) which finds the "Template" row on Config and sets a ONE_OF_LIST data validation rule from the current `TEMPLATE_NAMES`. Run this once after any template add/remove in Code.gs to sync the dropdown. Avoids manually editing Sheets data validation.

### Verification
- Node syntax check passed (via renamed `.js` tmp file)
- 12 TEMPLATES keys = 12 TEMPLATE_NAMES entries = 12 `generate*Body` function definitions, all names match exactly
- Both new templates executed with realistic metrics in Node harness; 19/19 content assertions passed (columns, Reading Focus, Incentivized Progress, Math Academy, Fast Math, below-4th-grade note, Bonus Confidence week, trend alert, updated color legend, no emoji, wrapper, greeting, subject strings)
- No non-ASCII characters introduced (em-dash at byte 4194 is pre-existing from v2.0.3)

## [v2.0.3] - 2026-04-16

### Fixed — Root Folder Lookup (REVERT + bulletproof fallback)
v2.0.2 incorrectly dropped "- Weekly Report" from the root folder name. Restored.

**Verified via Playwright against live Drive:**
- Root: `Bruna and Mark's Schools - Weekly Report` (id: 1cDnSQ2P8EmmvC1bb4CuRPIdG9XNfozgR)
- Schools: human-readable with spaces (`Reading Community City School District`, `AFMS - Allendale Fairfax Middle School`, etc.)
- Teachers: `First Last` (spaces, e.g., `Danielle Roberts`, `Kim Bell`)
- PDFs: `First Last - YYYY-MM-DD - YYYY-MM-DD.pdf` directly in teacher folder

### Added
- **`CONFIG.ROOT_FOLDER_ID`** — direct folder ID fallback (bulletproof against future name changes)
- **`getRootFolder()`** — tries ID first via `getFolderById()`, falls back to name lookup
- **`debugDriveAccess()`** — comprehensive diagnostic accessible from Email Tools menu:
  - Shows which user is running
  - Root folder lookup via both ID and name
  - Lists all school folders in root
  - For each of current user's assigned schools: lists teacher folders + whether a PDF matches the current Config date range pattern
- Better error messages with actionable next steps

## [v2.0.2] - 2026-04-15

### Fixed — New Drive Folder Structure (April 2026 change)
The weekly-report Drive structure was restructured. Updated code to match.

**Old structure:**
```
Bruna and Mark's Schools - Weekly Report/
  School_Folder/Teacher_Folder/
    2026-04-06_to_2026-04-12/
      00_SUMMARY_....PDF
```

**New structure:**
```
Bruna and Mark's Schools/                  (no "- Weekly Report")
  School Folder/Teacher Name/              (spaces, not underscores)
    Teacher Name - 2026-04-06 - 2026-04-12.pdf   (PDF directly in folder)
```

Changes:
- `CONFIG.ROOT_FOLDER_NAME` → `"Bruna and Mark's Schools"`
- New `dateRangeToPdfPattern()` — converts `2026-04-06_to_2026-04-12` → `2026-04-06 - 2026-04-12`
- `checkDriveFolderExists()` now searches for PDFs matching the date pattern directly in teacher folders (no date subfolder)
- `createDraftForTeacher()` searches teacher folder for PDF matching date pattern; falls back to old structure (date subfolder + `00_SUMMARY_...PDF`) for backward compatibility

## [v2.0.1] - 2026-04-15

### Fixed — Flexible Folder Name Matching
Drive folders can now be named with either spaces OR underscores and the code will find them. Previously, `findFolderByName` required exact case-sensitive matches, which broke when folders were named `"Reading Community City School District"` (spaces) but the School-IM Mapping had `"Reading_Community_City_School_District"` (underscores). Similar issue for teacher folders: `"Kim Bell"` (space) vs `"Kim_Bell"` (underscore).

- `findFolderByName()` now tries exact match first (fast path), then falls back to normalized comparison (case-insensitive, underscores and spaces treated as equivalent)
- New `normalizeFolderName()` helper: lowercases, replaces underscores with spaces, collapses whitespace
- `checkDriveFolderExists()` also tries the school's display name as a fallback
- `createDraftForTeacher()` tries both `firstname_lastname` and `firstname lastname` formats for teacher folders
- Added safety cap of 50 teacher folders in checkDriveFolderExists to prevent runaway iteration

## [v2.0.0] - 2026-04-15

### Added — Flexible Email System (Selectable Dates & Templates)
Major rewrite: IMs can now choose any available week and any email template before generating drafts.

- **Template system** — 10 email templates (Week 0-8 + Wrap Up), each with unique subject, coaching content, and action items. Templates are registered in `TEMPLATES` object and dispatched by name.
  - Weeks 0-3 and 6: fully implemented with content from Google Doc
  - Weeks 4-5, 7-8, Wrap Up: skeleton templates (placeholder content)
- **Preloaded metrics** — Pipeline now loads ALL weeks of teacher metrics into "All Teacher Metrics" tab (~2600 rows). Apps Script filters by selected week at generation time. No pipeline re-run needed when switching weeks.
- **Available Weeks helper tab** — Pipeline writes distinct weeks with `YYYY-MM-DD_to_YYYY-MM-DD` format to "Available Weeks" tab, feeding the Config dropdown.
- **Confirmation dialog** — Before generating, shows date range, template, teacher count. Validates Drive folder existence (blocks if missing) and metrics availability.
- **Config: Template row** — New "Template" setting in Config tab with dropdown of all template names.
- **Shared components** — Extracted `buildGreeting()`, `buildMetricsTable()`, `buildTrendAlert()`, `buildColorLegend()`, `buildWinnersHtml()`, `buildResourcesSection()`, `buildWeeklyChallenge()`, `wrapEmailHtml()` as reusable functions.
- **`getTeacherMetricsForWeek(weekStart)`** — Filters "All Teacher Metrics" by selected week, with Date-to-ISO guard for Sheets auto-parsing.
- **`checkDriveFolderExists()`** — Pre-validates Drive folder structure before generation.

### Changed
- `generateDraftsForCurrentUser()` now reads template from Config and passes it through the pipeline
- `createDraftForTeacher()` takes a `template` parameter (subject + body function)
- Legacy "Teacher Metrics" single-week tab kept for backward compatibility

## [v1.2.2] - 2026-04-09

### Added
- **Data freshness validation** — `getMetricsWeekStamp()` reads the pipeline-stamped `week_start` from Teacher Metrics column L. `generateDraftsForCurrentUser()` now compares this stamp against the Config Date Range and blocks draft generation if they don't match, preventing emails with stale/wrong-week data.
- **`write_doc.py`** — Python utility that writes formatted user documentation to a Google Doc via the Docs API. Supports headings, bold text, bulleted lists, and version history formatting.

## [v1.2.1] - 2026-04-08

### Added
- **Auto Teacher Metrics** — Teacher Metrics tab is now auto-populated by the Python pipeline from BigQuery (`query_teacher_metrics_for_email()` in `email_winners.py`). IMs no longer need to manually download data from QuickSight.
- **Reading Teachers tab integration** — `getTeachersForSchools()` now checks if the school matches Reading Community and pulls from the dedicated "Reading Teachers" tab instead of the IMPORTRANGE-based "Teacher Emails" tab.

### Fixed
- **Name matching hardened** — `lookupByName()` now handles middle names (e.g., "John Bradley Apostol" matches "John Apostol") and includes `NAME_ALIASES` map for spelling mismatches (e.g., "Kloesz" → "Kloetz").

### Changed
- Updated `CLAUDE.md` with complete 6-tab architecture, Student Winners schema, and Reading Teachers documentation.

## [v1.2.0] - 2026-04-06

### Added
- **Student Achievement Winners table** — New "Student Winners" tab populated by the Python dashboard pipeline (BigQuery query). Shows per-teacher student achievements across the last 6 weeks with "3+ Weeks" and "1-2 Times" columns.
- Achievement categories (with tiered exclusivity — students only in their highest tier):
  - Grade Level Mastered
  - 10+ Lessons/Week (excludes from 5+)
  - 5+ Lessons/Week (only if not in 10+)
  - Resilience: Fail then Pass (any test fail followed by pass for same subject+grade)
  - 125+ Minutes (excludes from 100+)
  - 100+ Minutes (only if not in 125+)
  - 4.5+ Active Days (excludes from 4+)
  - 4+ Active Days (only if not in 4.5+)
- `getStudentWinners()` function reads pre-computed winners from "Student Winners" tab
- `buildWinnersHtml()` generates HTML table with colored dot icons, alternating rows
- **"Reading Teachers" tab** — Dedicated teacher list for Reading Community (IMPORTRANGE doesn't include teacher email columns for this district)

### Changed
- **New email theme: "Culture, Shoutouts & Rewards"** replacing "Re-Engagement & Resets"
- New subject line: "Data drop: A 2-minute summary of everything that matters about culture, shoutouts, & Rewards"
- Weekly Focus changed to "Persistence" with PBIS/culture-driven actions:
  - Weekly Trailblazer Shoutout
  - Narrate the Why
  - Peer Nominations (Win Cards)
- AIM Launches updated to Weeks 6/7/8 (Productive Struggle, Celebrating Effort, Curiosity)
- Participation language updated: "monitored at the school, district, and state levels"
- Resources section now uses ordered list
- All section headers use plain text (no emojis — they render as broken characters in email clients)
- Category indicators use inline colored dot spans instead of emoji characters

### Removed
- Previous "Mental Focus & Persistence" theme content (Mid-Block Breath, Doom Loop Reset, Reset Conference)
- Week 5 AIM Launch link (Cognitive Reframing)
- Coaching Moves link (moved to previous version's template)
- All emoji unicode characters from email body (replaced with colored CSS dots)

## [v1.1.1] - 2026-03-29

### Changed
- Removed yellow background highlight from Weekly Challenge / Reflection Prompt section
- Added [Coaching Moves] hyperlink to Doom Loop Reset action item
- Added Pomodoro Timer link (studient.com/customer-portal) to Resources section
- Updated AIM Launches Week 6 URL to new Canva design
- Updated AIM Launches Week 7 URL to new Canva design

## [v1.1.0] - 2026-03-29

### Changed
- New subject line: "Freshly pressed data (+ 3 insights that aren't just noise about Re-Engagement & Resets)"
- Complete email template rewrite with new weekly focus theme: Mental Focus & Persistence
- Added conditional "Current trend" logic based on overall average active days:
  - Green (4+): positive reinforcement message
  - Yellow (3): encouragement to schedule more time
  - Red (1-2): direct call to action for 35 minutes daily
- Updated "Your Actions This Week" with three new coaching strategies:
  - Mid-Block Breath (green dot) - reset for individual students
  - Doom Loop Reset (blue dot) - break test retry cycles
  - The Reset Conference (orange dot) - 3-minute disengagement check-in
- Updated AIM Launches links to Weeks 5, 6, 7 (Cognitive Reframing, Productive Struggle, Celebrating Effort)
- Replaced "Weekly Class Goal" section with "Weekly Challenge" format
- Simplified "Reflection Prompt" to single question: "What will you tweak for this coming week?"
- Trend callout box now uses dynamic background color matching the trend level
- Participation monitoring language updated: "reported to the school admin, district leaders, and state team"

### Removed
- "Week 4: Diagnosing Habits with Data" theme and related content
- Coaching flags image embed (Google Drive hosted image)
- "3 Lenses" framework section (AI Data, Trackers, Points)
- "How Many Green Days" detailed checklist
- Fill-in-the-blank goal and reflection format

## [v1.0.0] - 2026-03-23

### Added
- Initial email automation system
- Gmail draft generation with teacher data tables (Avg Active Days, Avg Minutes)
- Color-coded metrics cells (green/yellow/red thresholds)
- PDF attachment support (summary reports from Google Drive)
- School-IM mapping for multi-user support
- Reading Community City School District column index exception
- Teacher folder diagnostic tool (Debug: Check Teacher Folders)
- Configurable date range via UI prompt
- Support for 9 schools across multiple districts
