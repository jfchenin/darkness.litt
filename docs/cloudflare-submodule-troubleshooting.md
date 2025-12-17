# Cloudflare Pages Submodule Troubleshooting Guide

## Overview

This guide addresses common issues when deploying Git submodules to Cloudflare Pages, specifically for the DrknssCheninFR project.

---

## Table of Contents

1. [Build Failures](#build-failures)
2. [Submodule Not Cloned](#submodule-not-cloned)
3. [Permission Issues](#permission-issues)
4. [Content Not Updated](#content-not-updated)
5. [Build Cache Issues](#build-cache-issues)
6. [Deployment Configuration](#deployment-configuration)

---

## Build Failures

### Symptom: Build fails with "content not found" error

```
Error: ENOENT: no such file or directory, scandir './src/content'
```

**Diagnosis:**
The submodule was not initialized before the build started.

**Solutions:**

#### Solution 1: Verify Repository Access
1. Go to Cloudflare Dashboard → **Workers & Pages** → Your Project → **Settings** → **Source**
2. Click **Configure** next to GitHub
3. Ensure BOTH repositories have access:
   - ✅ `hostoftheshell/DrknssCheninFR` (main)
   - ✅ `hostoftheshell/DrknssCheninFR-content` (submodule)
4. Save and trigger new deployment

#### Solution 2: Check .gitmodules URL Format
```bash
# In your local repository, verify .gitmodules:
cat .gitmodules
```

Should use HTTPS format:
```ini
[submodule "src/content"]
    path = src/content
    url = https://github.com/hostoftheshell/DrknssCheninFR-content.git
```

If using SSH format (`git@github.com:`), change to HTTPS:
```bash
git config -f .gitmodules submodule.src/content.url https://github.com/hostoftheshell/DrknssCheninFR-content.git
git add .gitmodules
git commit -m "chore: use HTTPS for submodule (Cloudflare compatibility)"
git push origin main
```

#### Solution 3: Add Explicit Submodule Command
Update `package.json`:
```json
{
  "scripts": {
    "build": "git submodule update --init --recursive && astro check && astro build && pnpm apply-lqip && wrangler deploy"
  }
}
```

Or create a custom build script `scripts/cloudflare-build.sh`:
```bash
#!/bin/bash
set -e

echo "Initializing submodules..."
git submodule update --init --recursive

echo "Building project..."
astro check
astro build
pnpm apply-lqip
```

Then in Cloudflare build settings:
- Build command: `bash scripts/cloudflare-build.sh`

---

## Submodule Not Cloned

### Symptom: Build logs don't show "Submodule 'src/content'" messages

**Expected in build logs:**
```
Submodule 'src/content' (https://github.com/hostoftheshell/DrknssCheninFR-content.git) registered for path 'src/content'
Cloning into '/opt/buildhome/repo/src/content'...
Submodule path 'src/content': checked out 'abc1234567890'
```

**If missing:**

#### Check 1: Verify .gitmodules Exists
```bash
# Locally:
ls -la .gitmodules
cat .gitmodules
```

If missing, submodule was not added correctly. Re-run:
```bash
git submodule add https://github.com/hostoftheshell/DrknssCheninFR-content.git src/content
git add .gitmodules src/content
git commit -m "chore: add content submodule"
git push origin main
```

#### Check 2: Verify Submodule Commit Reference
```bash
# Check if src/content is tracked as submodule:
git ls-tree main src/content

# Output should show:
# 160000 commit <hash>	src/content

# If it shows "tree" instead, it's a regular directory, not a submodule
```

#### Check 3: Content Repo Visibility
- If content repository is **Private**, ensure Cloudflare has access
- If content repository is **Public**, access should work automatically

Test by visiting: `https://github.com/hostoftheshell/DrknssCheninFR-content`
- If you see 404 while logged out → Private repo, check Cloudflare permissions
- If you see the repo → Public, permissions OK

---

## Permission Issues

### Symptom: "Permission denied" or "Authentication failed" during submodule clone

```
fatal: could not read Username for 'https://github.com': No such device or address
```

**Root Cause:** Cloudflare cannot authenticate to clone the submodule repository.

### Solution: Grant Cloudflare GitHub App Access

#### Via Cloudflare Dashboard:
1. Cloudflare Dashboard → **Workers & Pages** → Your Project
2. **Settings** → **Source** → **Configure**
3. Redirects to GitHub → Select repositories
4. Check **both** repositories:
   - `hostoftheshell/DrknssCheninFR`
   - `hostoftheshell/DrknssCheninFR-content`
5. Click **Save**
6. Return to Cloudflare and retry deployment

#### Via GitHub Settings:
1. GitHub → **Settings** → **Integrations** → **Applications**
2. Find "Cloudflare Pages"
3. Click **Configure**
4. Under "Repository access", ensure both repos are selected
5. Save changes

### Alternative: Make Content Repo Public (if acceptable)
```bash
# On GitHub:
# Settings → Danger Zone → Change visibility → Make public
```

⚠️ **Warning:** Only do this if content should be publicly accessible.

---

## Content Not Updated

### Symptom: Deployed site shows old content even after pushing updates

**Diagnosis Steps:**

#### Step 1: Verify Content Repo Was Updated
```bash
# Check content repository
cd src/content
git log --oneline | head -5

# Verify latest commit is pushed
git status
```

#### Step 2: Check Main Repo Submodule Reference
```bash
# In main repository root
cd ../..
git submodule status

# Output shows current commit:
# abc1234567890 src/content (heads/main)
```

#### Step 3: Update Submodule Reference
```bash
# Update to latest content
git submodule update --remote src/content

# Stage and commit
git add src/content
git commit -m "chore: update content to latest"
git push origin main
```

### Why This Happens
Git submodules point to **specific commits**, not branches. When you update content:
1. Content repo gets new commit ✅
2. Main repo still points to old commit ❌
3. Deployment uses main repo's reference (old) ❌

**Solution:** Always update the submodule reference after content changes.

### Automation Option
Add to content repository (`.github/workflows/notify-main.yml`):
```yaml
name: Notify Main Repo

on:
  push:
    branches: [main]

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger main repo update
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.MAIN_REPO_TOKEN }}" \
            -H "Accept: application/vnd.github.v3+json" \
            https://api.github.com/repos/hostoftheshell/DrknssCheninFR/dispatches \
            -d '{"event_type":"content-updated"}'
```

---

## Build Cache Issues

### Symptom: Old submodule content persists despite updates

**Cloudflare Pages caches builds for performance.**

### Solution: Clear Build Cache

#### Option 1: Via Dashboard
1. Cloudflare Dashboard → **Workers & Pages** → Your Project
2. **Deployments** tab
3. Click **Manage deployments** → **Clear build cache**
4. Trigger new deployment

#### Option 2: Force Rebuild
```bash
# Create empty commit to trigger fresh build
git commit --allow-empty -m "build: force rebuild to clear cache"
git push origin main
```

#### Option 3: Change Build Command (temporary)
Add a cache-busting step:
```json
{
  "scripts": {
    "build": "rm -rf node_modules/.cache && git submodule update --init --recursive && astro check && astro build"
  }
}
```

---

## Deployment Configuration

### Optimal Cloudflare Pages Settings

#### Build Configuration
```yaml
Build command: pnpm install && pnpm build
Build output directory: /dist
Root directory: (empty or /)
Build watch paths: (empty)
```

#### Environment Variables
```
NODE_VERSION=20
PNPM_VERSION=10.25.0
```

#### Build Settings (Advanced)
- **Build cache:** ✅ Enabled
- **Branch deployments:** ✅ Enabled (for previews)
- **Build image:** v2 (default)

### Verify Build Command Flow
Cloudflare automatically runs:
1. `git clone` (main repo)
2. `git submodule update --init --recursive` (automatic!)
3. Your build command

**Important:** Step 2 is automatic. You don't need to add it UNLESS having issues.

---

## Common Pitfalls

### ❌ Using Relative URLs in .gitmodules
```ini
# DON'T:
[submodule "src/content"]
    path = src/content
    url = ../DrknssCheninFR-content.git
```

**Problem:** Cloudflare may not resolve relative paths correctly.

**Fix:** Use absolute HTTPS URLs:
```ini
# DO:
[submodule "src/content"]
    path = src/content
    url = https://github.com/hostoftheshell/DrknssCheninFR-content.git
```

### ❌ Hardcoding SSH URLs
```ini
# DON'T (for Cloudflare):
url = git@github.com:hostoftheshell/DrknssCheninFR-content.git
```

**Problem:** Cloudflare can't use SSH keys; requires HTTPS.

**Fix:** Change to HTTPS (see above).

### ❌ Forgetting to Update Submodule Reference
After updating content, always:
```bash
git submodule update --remote src/content
git add src/content
git commit -m "chore: update content"
git push
```

### ❌ Nested Submodules
If your content repo has its own submodules, ensure recursive initialization:
```bash
git submodule update --init --recursive
```

---

## Debugging Checklist

When deployment fails, verify:

- [ ] Both repositories are accessible to Cloudflare
- [ ] `.gitmodules` uses HTTPS URL
- [ ] Content repository exists and is not empty
- [ ] Submodule reference is correct: `git ls-tree main src/content`
- [ ] Build command includes submodule initialization (if needed)
- [ ] No typos in repository URLs
- [ ] Content repo is not renamed/moved
- [ ] GitHub Cloudflare App has proper permissions

---

## Testing Locally

Simulate Cloudflare's build process:

```bash
# Fresh clone (as Cloudflare does)
cd /tmp
git clone https://github.com/hostoftheshell/DrknssCheninFR.git test-deploy
cd test-deploy

# Submodule init (Cloudflare does this automatically)
git submodule update --init --recursive

# Verify content
ls src/content/
find src/content -type f | wc -l

# Build
pnpm install
pnpm build

# If this works locally but fails on Cloudflare:
# → Permission issue with content repository
```

---

## Getting Help

### Check Build Logs
1. Cloudflare Dashboard → Your Project → **Deployments**
2. Click failed deployment → **View build log**
3. Search for:
   - "Submodule" (should appear)
   - "fatal" (errors)
   - "src/content" (references)

### Enable Verbose Logging
```json
{
  "scripts": {
    "build": "set -x && git submodule update --init --recursive && astro check && astro build"
  }
}
```

### Contact Support
- **Cloudflare Community:** https://community.cloudflare.com/
- **Cloudflare Support:** Dashboard → Support → Create ticket
- **GitHub Issues:** https://github.com/hostoftheshell/DrknssCheninFR/issues

---

## Success Indicators

Your deployment should show:

```
✅ Cloning repository...
✅ Submodule 'src/content' registered
✅ Cloning into '/opt/buildhome/repo/src/content'...
✅ Submodule path 'src/content': checked out '<hash>'
✅ Installing project dependencies: pnpm install
✅ Executing user command: pnpm build
✅ Build succeeded!
✅ Deployment complete!
```

---

## Quick Reference Commands

```bash
# Check submodule status
git submodule status

# Verify .gitmodules
cat .gitmodules

# Test submodule clone
git submodule deinit -f src/content
git submodule update --init --recursive

# Update to latest content
git submodule update --remote src/content
git add src/content
git commit -m "chore: update content"
git push

# Force rebuild (clear cache)
git commit --allow-empty -m "build: force rebuild"
git push
```

---

**Last Updated:** 2025-01  
**Cloudflare Pages Version:** v2  
**Git Version:** 2.x+