# Playbooks - Email Automation

Operator recipes for the teacher email flow. The pipeline side (populating the sheet) lives in the dashboard repo; this repo holds the Apps Script sending side.

## 1. The weekly email flow, end to end

1. Populate the data tabs (from the dashboard repo, after the weekly data lands):

```
python email_only.py
```

Expected: Teacher Metrics + Student Winners tabs in the email automation sheet refresh.
2. A human opens the email automation sheet and runs **Email Tools > Generate My Email Drafts**. Drafts appear in that user's Gmail; nothing sends automatically.
3. Review + send from Gmail.

## 2. Change the email template

Edit `Code.js` here, then push (auto-deploy) or `npm run deploy`. Same green-without-deploy trap as weekly-corrections: verify the menu behavior changed in the sheet.

## 3. Ownership note

Draft generation runs as the SIGNED-IN user clicking the menu. After Aug 1 that is Mark or whoever owns the teacher-email send (Decisions Log item); no credential handoff needed, any editor of the sheet can generate their own drafts.
