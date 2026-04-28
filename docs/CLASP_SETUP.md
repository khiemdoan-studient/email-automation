# clasp Setup Guide (v2.6.0+)

`clasp` is Google's official CLI for managing Apps Script projects from the command line. With clasp set up, you can run `clasp push` to deploy `Code.gs` to production directly — no more copy-paste into the editor.

This guide is for setting up clasp on Khiem's local machine. Other dev machines can repeat the same steps.

## Prerequisites

- Node.js >= 18 (already installed for `npm test`)
- A Google account that owns or has Editor access to the Apps Script project (`scriptId: 1IbokxMbI7i3FrGGFEQfVtnYHB7ir8vRMcpX9Fs7xDTG3Vlrtuy65ubaP`)
- ~10-30 minutes for first-time auth

## Step 1 — Install clasp globally

```bash
npm install -g @google/clasp
clasp --version  # confirm: 2.x or higher
```

## Step 2 — Enable the Apps Script API for your account

1. Open https://script.google.com/home/usersettings
2. Toggle **Google Apps Script API** to **ON**
3. Wait ~30 seconds for the toggle to take effect

If you skip this step, `clasp login` will succeed but `clasp pull` / `clasp push` will fail with "User has not enabled the Apps Script API."

## Step 3 — Authenticate

```bash
clasp login
```

This opens a browser tab. Log in with your Google account that has access to the email automation script. Click **Allow** on the OAuth consent screen.

After approval, the browser shows "Logged in." Close the tab. Your terminal will show:
```
Logged in.
```

The auth token is saved to `~/.clasprc.json` (Linux/Mac) or `%USERPROFILE%\.clasprc.json` (Windows). This file should NOT be committed (already gitignored via `.clasp.json` pattern).

## Step 4 — Verify connection

The repo already has `.clasp.json` with the project's `scriptId`. From the email-automation repo root:

```bash
clasp pull
```

This downloads the production `Code.gs` (and any other Apps Script files) to your local working directory.

**If `clasp pull` shows different content than your local `Code.gs`:** that's drift between repo and production. Decide which to keep:
- **Repo is authoritative**: `git checkout Code.gs` (revert pull) → `clasp push` (overwrite production)
- **Production is authoritative**: review the diff, commit the pull as a "production state" commit

After this point, repo and production should match.

## Step 5 — Use clasp going forward

Replace the old "paste into editor" workflow with:

```bash
# After editing Code.gs locally + committing + pushing to GitHub:
npm run push       # alias for `clasp push` — uploads Code.gs to production
```

To verify production matches local:
```bash
npm run pull       # alias for `clasp pull` — downloads production
git diff           # should show NO changes (production matches repo)
```

To open the Apps Script editor in browser:
```bash
clasp open
```

## Troubleshooting

### "User has not enabled the Apps Script API"
You skipped Step 2. Go back, toggle the API on, wait 30 seconds, retry.

### "Could not refresh access token" / "Login required"
Your auth token expired. Run `clasp login` again.

### "Permission denied: User does not have access to script"
Your Google account is not an Editor of the Apps Script project. Contact the script owner (likely Khiem) to add you as an Editor at https://script.google.com.

### Workspace SSO restrictions
Some Google Workspace orgs restrict OAuth scopes for non-domain accounts. If `clasp login` succeeds but `clasp push` fails with permission errors, the org admin needs to allow clasp's OAuth app. Workaround: stick with manual paste-into-editor for that account.

### `clasp push` says "Pushed 0 files"
The `.clasp.json` `rootDir` setting points to where clasp looks for files. Default is `.` (repo root). If your `Code.gs` lives in a subdirectory, update `rootDir` in `.clasp.json`.

## When NOT to use clasp

- **You're not the script owner / Editor**: Use the manual paste workflow.
- **Your Workspace blocks clasp**: Use the manual paste workflow.
- **Quick one-off tweak in editor**: Edit in the browser → `clasp pull` to sync back to local. Easier than committing through git for very small changes.

## Reference

- clasp docs: https://github.com/google/clasp
- Apps Script API: https://developers.google.com/apps-script/api
- Project script ID: `1IbokxMbI7i3FrGGFEQfVtnYHB7ir8vRMcpX9Fs7xDTG3Vlrtuy65ubaP`
