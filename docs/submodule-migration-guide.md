# Git Submodule Migration Guide

## Overview

This guide walks you through converting the `./src/content` directory into a Git submodule and configuring Cloudflare Pages to properly deploy your site with submodule support.

**Current Setup:**
- Main repository: `hostoftheshell/DrknssCheninFR`
- Content location: `./src/content` (~412KB)
- Deployment platform: Cloudflare Pages/Workers
- Build tool: Astro + Wrangler

**Target Setup:**
```
┌─────────────────────────────────────┐
│  Main Repository (DrknssCheninFR)   │
│  ├── src/                            │
│  │   ├── content/ ←────────────┐    │
│  │   │   (submodule)           │    │
│  │   ├── components/           │    │
│  │   └── ...                   │    │
│  ├── .gitmodules               │    │
│  └── ...                       │    │
└─────────────────────────────────────┘
                                  │
                    Links to      │
                                  │
┌─────────────────────────────────┴───┐
│  Content Repository                 │
│  (DrknssCheninFR-content)           │
│  ├── about/                         │
│  ├── darkness/                      │
│  ├── emileMoselly/                  │
│  ├── blogroll/                      │
│  └── ...                            │
└─────────────────────────────────────┘
```

---

## Table of Contents

1. [Pre-Migration Checklist](#1-pre-migration-checklist)
2. [Create the Content Repository](#2-create-the-content-repository)
3. [Convert to Submodule](#3-convert-to-submodule)
4. [Local Testing](#4-local-testing)
5. [Configure Cloudflare Pages](#5-configure-cloudflare-pages)
6. [Team Workflow](#6-team-workflow)
7. [Troubleshooting](#7-troubleshooting)
8. [Rollback Plan](#8-rollback-plan)
9. [Command Reference](#9-command-reference)

---

## 1. Pre-Migration Checklist

### 1.1 Backup Your Content

```bash
# Create a backup of the content directory
cd /home/bap/dev/00_Projets_Pro/DrknssCheninFR
tar -czf ~/content-backup-$(date +%Y%m%d-%H%M%S).tar.gz src/content/

# Verify backup was created
ls -lh ~/content-backup-*.tar.gz
```

### 1.2 Verify Git Status

```bash
# Check for uncommitted changes
git status

# Commit any pending changes in src/content/
git add src/content/
git commit -m "chore: prepare content for submodule migration"
git push origin main
```

### 1.3 Document Current State

```bash
# List all content files (for verification later)
find src/content -type f > ~/content-inventory.txt

# Check file count
find src/content -type f | wc -l

# Note the latest commit affecting content
git log --oneline src/content/ | head -1
```

### 1.4 Verify Build Works

```bash
# Ensure current build succeeds
pnpm install
pnpm build

# If build fails, fix issues before proceeding
```

**✅ Checklist:**
- [ ] Backup created and verified
- [ ] All changes committed and pushed
- [ ] Content inventory documented
- [ ] Current build passes
- [ ] Team notified about upcoming changes

---

## 2. Create the Content Repository

### 2.1 Create New GitHub Repository

**Option A: Via GitHub Web Interface**
1. Go to https://github.com/new
2. Repository name: `DrknssCheninFR-content`
3. Description: "Content repository for DrknssCheninFR"
4. Visibility: **Private** (or Public, your choice)
5. **DO NOT** initialize with README, .gitignore, or license
6. Click "Create repository"

**Option B: Via GitHub CLI**
```bash
# If you have gh CLI installed
gh repo create hostoftheshell/DrknssCheninFR-content \
  --private \
  --description "Content repository for DrknssCheninFR"
```

### 2.2 Initialize Content Repository Locally

```bash
# Navigate to content directory
cd /home/bap/dev/00_Projets_Pro/DrknssCheninFR/src/content

# Initialize as git repository
git init

# Add all content files
git add .

# Create initial commit
git commit -m "Initial commit: migrate content from main repository"

# Add remote (replace with your actual repo URL)
git remote add origin git@github.com:hostoftheshell/DrknssCheninFR-content.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### 2.3 Verify Content Repository

```bash
# Check remote was added correctly
git remote -v

# Verify all files were pushed
git log --oneline
git ls-files | wc -l
```

**Expected output:** File count should match your inventory from step 1.3.

---

## 3. Convert to Submodule

### 3.1 Remove Content from Main Repository

```bash
# Navigate back to main repository root
cd /home/bap/dev/00_Projets_Pro/DrknssCheninFR

# Remove content directory from git tracking (but keep files for now)
git rm -r --cached src/content

# Commit the removal
git commit -m "chore: remove content directory in preparation for submodule"

# Actually delete the directory
rm -rf src/content

# Verify directory is gone
ls src/
```

### 3.2 Add Content as Submodule

```bash
# Add the content repository as a submodule
git submodule add git@github.com:hostoftheshell/DrknssCheninFR-content.git src/content

# This creates:
# - .gitmodules file (submodule configuration)
# - src/content directory (pointing to the submodule)
```

### 3.3 Verify Submodule Configuration

```bash
# Check .gitmodules file was created
cat .gitmodules
```

**Expected output:**
```ini
[submodule "src/content"]
	path = src/content
	url = git@github.com:hostoftheshell/DrknssCheninFR-content.git
```

```bash
# Verify submodule status
git submodule status

# Should show something like:
# +abc123def456 src/content (heads/main)
```

### 3.4 Commit Submodule Addition

```bash
# Stage the submodule changes
git add .gitmodules src/content

# Commit
git commit -m "chore: convert src/content to git submodule"

# Push to GitHub
git push origin main
```

### 3.5 Verify Content Files

```bash
# Check that content files are accessible
ls -la src/content/

# Verify file count matches inventory
find src/content -type f | wc -l

# Compare with original inventory
diff <(find src/content -type f | sort) <(cat ~/content-inventory.txt | sort)
```

---

## 4. Local Testing

### 4.1 Test Fresh Clone

```bash
# Clone in a separate location to test
cd ~/tmp
git clone --recurse-submodules git@github.com:hostoftheshell/DrknssCheninFR.git test-clone

cd test-clone

# Verify submodule was cloned
ls -la src/content/
git submodule status
```

### 4.2 Test Build Process

```bash
# Install dependencies
pnpm install

# Run build
pnpm build

# Verify dist was created
ls -la dist/

# Test local preview
pnpm preview
```

### 4.3 Test Submodule Without Recursive Clone

```bash
# Simulate what happens if someone clones without --recurse-submodules
cd ~/tmp
git clone git@github.com:hostoftheshell/DrknssCheninFR.git test-clone-no-recursive

cd test-clone-no-recursive

# src/content will be empty
ls src/content/
# (empty directory)

# Initialize submodules manually
git submodule update --init --recursive

# Now content should be present
ls src/content/
```

### 4.4 Common Issues & Solutions

**Issue:** `src/content` is empty after clone
```bash
# Solution:
git submodule update --init --recursive
```

**Issue:** "Permission denied" when cloning submodule
```bash
# Solution: Check SSH key access to content repository
ssh -T git@github.com

# Or switch to HTTPS in .gitmodules
git config -f .gitmodules submodule.src/content.url https://github.com/hostoftheshell/DrknssCheninFR-content.git
```

**Issue:** Build fails with "content not found"
```bash
# Solution: Ensure submodule is initialized
git submodule status
# If output starts with "-", run:
git submodule update --init --recursive
```

---

## 5. Configure Cloudflare Pages

### 5.1 Understanding Cloudflare Submodule Support

Cloudflare Pages automatically clones submodules **if**:
1. You've granted Cloudflare GitHub App access to both repositories
2. You're using SSH or HTTPS URLs in `.gitmodules`

### 5.2 Grant Repository Access

**Via Cloudflare Dashboard:**

1. Go to https://dash.cloudflare.com/
2. Navigate to **Workers & Pages** → **Pages**
3. Select your project (or create new)
4. Go to **Settings** → **Source**
5. Click **Configure** next to GitHub integration
6. In GitHub, grant access to both:
   - `hostoftheshell/DrknssCheninFR` (main repo)
   - `hostoftheshell/DrknssCheninFR-content` (content repo)

### 5.3 Update .gitmodules for Cloudflare

For maximum compatibility, use HTTPS URLs in `.gitmodules`:

```bash
# Edit .gitmodules
nano .gitmodules
```

**Before:**
```ini
[submodule "src/content"]
	path = src/content
	url = git@github.com:hostoftheshell/DrknssCheninFR-content.git
```

**After:**
```ini
[submodule "src/content"]
	path = src/content
	url = https://github.com/hostoftheshell/DrknssCheninFR-content.git
```

```bash
# Commit the change
git add .gitmodules
git commit -m "chore: use HTTPS URL for submodule (Cloudflare compatibility)"
git push origin main

# Update your local submodule remote
git submodule sync
```

### 5.4 Configure Build Settings

**In Cloudflare Dashboard:**

Navigate to your Pages project → **Settings** → **Builds & deployments**

**Build configuration:**
```yaml
Build command: pnpm install && pnpm build
Build output directory: /dist
Root directory: (leave empty or /)
```

**Environment variables:**
- `NODE_VERSION`: `20` (or your preferred version)
- `PNPM_VERSION`: `10.25.0` (match your package.json)

**Note:** Cloudflare Pages automatically runs `git submodule update --init --recursive` before the build command.

### 5.5 Update Build Scripts (Optional)

If deploying via `wrangler` locally, ensure submodules are initialized:

**Update `package.json`:**
```json
{
  "scripts": {
    "build": "git submodule update --init --recursive && astro check && astro build && pnpm apply-lqip && wrangler deploy"
  }
}
```

Or create a dedicated deploy script:

**Create `scripts/deploy.sh`:**
```bash
#!/bin/bash
set -e

echo "📦 Initializing submodules..."
git submodule update --init --recursive

echo "🔍 Running type check..."
astro check

echo "🏗️  Building project..."
astro build

echo "🖼️  Applying LQIP..."
pnpm apply-lqip

echo "🚀 Deploying to Cloudflare..."
wrangler deploy

echo "✅ Deployment complete!"
```

```bash
# Make executable
chmod +x scripts/deploy.sh

# Update package.json
# "build": "./scripts/deploy.sh"
```

### 5.6 Test Deployment

```bash
# Trigger deployment by pushing a change
git commit --allow-empty -m "test: trigger Cloudflare Pages deployment"
git push origin main

# Monitor deployment in Cloudflare Dashboard
# Check build logs for "Submodule 'src/content'" messages
```

### 5.7 Verify Deployment

After deployment completes:

1. Visit your site: https://darkness.chenin.fr/
2. Check that content pages load correctly
3. Verify images from `src/content/_images/` work
4. Test navigation between content sections

---

## 6. Team Workflow

### 6.1 Cloning the Project (New Team Members)

```bash
# Clone with submodules in one command
git clone --recurse-submodules git@github.com:hostoftheshell/DrknssCheninFR.git

cd DrknssCheninFR

# Verify submodules are present
git submodule status
ls src/content/
```

**Alternative (two-step):**
```bash
# Clone main repository
git clone git@github.com:hostoftheshell/DrknssCheninFR.git
cd DrknssCheninFR

# Initialize submodules
git submodule update --init --recursive
```

### 6.2 Updating Content

#### Scenario A: Quick Content Edit

```bash
# Navigate to content directory
cd src/content

# Content directory is its own git repository
git status

# Make changes to content files
nano darkness/examples/new-post.md

# Commit in content repository
git add .
git commit -m "feat: add new blog post"
git push origin main

# Navigate back to main repository
cd ../..

# Update submodule reference in main repo
git add src/content
git commit -m "chore: update content submodule"
git push origin main
```

#### Scenario B: Content-Only Updates

If you only work on content:

```bash
# Clone only the content repository
git clone git@github.com:hostoftheshell/DrknssCheninFR-content.git

cd DrknssCheninFR-content

# Make changes, commit, push
git add .
git commit -m "feat: update about page"
git push origin main
```

Then someone with access to main repo updates the reference:

```bash
# In main repository
cd /home/bap/dev/00_Projets_Pro/DrknssCheninFR
git submodule update --remote src/content
git add src/content
git commit -m "chore: update content to latest"
git push origin main
```

### 6.3 Pulling Latest Changes

```bash
# Pull main repository changes
git pull origin main

# Update submodules to match the references in main repo
git submodule update --recursive

# Or do both in one command:
git pull --recurse-submodules
```

### 6.4 Creating a Content Branch

```bash
# In content directory
cd src/content

# Create feature branch
git checkout -b feature/new-section

# Make changes
mkdir newSection
echo "# New Section" > newSection/index.md

# Commit
git add .
git commit -m "feat: add new section"
git push origin feature/new-section

# Create pull request on GitHub for content repository

# After merge, update main repo
cd ../..
git submodule update --remote src/content
git add src/content
git commit -m "chore: update content with new section"
git push origin main
```

### 6.5 Checking Submodule Status

```bash
# Show current commit in submodule vs latest remote
git submodule status

# Show if submodule has uncommitted changes
cd src/content && git status && cd ../..

# Show submodule commit differences
git diff src/content

# Update to latest content
git submodule update --remote --merge src/content
```

---

## 7. Troubleshooting

### 7.1 Submodule Shows as Modified

**Symptom:**
```bash
$ git status
modified:   src/content (new commits)
```

**Cause:** The submodule has moved to a different commit than what main repo expects.

**Solution:**
```bash
# Option 1: Update main repo to track new commit
git add src/content
git commit -m "chore: update content submodule reference"

# Option 2: Reset submodule to tracked commit
git submodule update --init --recursive
```

### 7.2 Submodule Directory is Empty

**Symptom:**
```bash
$ ls src/content/
# (empty)
```

**Solution:**
```bash
# Initialize and update submodules
git submodule update --init --recursive

# If that fails, check submodule status
git submodule status
# If line starts with "-", submodule isn't initialized

# Force reinitialize
git submodule deinit -f src/content
git submodule update --init --recursive
```

### 7.3 Permission Denied (SSH)

**Symptom:**
```
Permission denied (publickey).
fatal: Could not read from remote repository.
```

**Solutions:**

**A. Use HTTPS instead:**
```bash
# Edit .gitmodules
nano .gitmodules
# Change: git@github.com:hostoftheshell/DrknssCheninFR-content.git
# To: https://github.com/hostoftheshell/DrknssCheninFR-content.git

# Sync changes
git submodule sync
git submodule update --init --recursive
```

**B. Fix SSH key:**
```bash
# Test GitHub SSH access
ssh -T git@github.com

# If fails, add SSH key:
ssh-keygen -t ed25519 -C "your_email@example.com"
cat ~/.ssh/id_ed25519.pub
# Add to GitHub: Settings → SSH and GPG keys → New SSH key
```

### 7.4 Cloudflare Build Fails

**Symptom:** Build logs show "content not found" errors.

**Diagnosis:**
```bash
# Check build logs for:
# - "Submodule 'src/content'" (should appear)
# - "Submodule path 'src/content': checked out" (should appear)
```

**Solutions:**

**A. Verify repository access:**
- Ensure Cloudflare has access to content repository
- Check if content repo is private and permissions are granted

**B. Check .gitmodules:**
```bash
cat .gitmodules
# Ensure URL is accessible (prefer HTTPS for CI/CD)
```

**C. Add explicit submodule command:**
```json
// package.json
{
  "scripts": {
    "build": "git submodule update --init --recursive && astro check && astro build"
  }
}
```

### 7.5 Detached HEAD in Submodule

**Symptom:**
```bash
$ cd src/content && git status
HEAD detached at abc1234
```

**Cause:** Submodules point to specific commits, not branches.

**Solution (to make changes):**
```bash
cd src/content

# Checkout main branch
git checkout main

# Pull latest
git pull origin main

# Make changes and commit
git add .
git commit -m "feat: update content"
git push origin main

# Update main repo reference
cd ../..
git add src/content
git commit -m "chore: update content submodule"
git push origin main
```

### 7.6 Merge Conflicts with Submodule

**Symptom:**
```
CONFLICT (submodule): Merge conflict in src/content
```

**Solution:**
```bash
# Check conflicting commits
git diff src/content

# Option 1: Accept incoming changes
git checkout --theirs src/content
git add src/content

# Option 2: Accept your changes
git checkout --ours src/content
git add src/content

# Option 3: Manually resolve
cd src/content
git checkout <desired-commit-hash>
cd ../..
git add src/content

# Complete merge
git commit
```

### 7.7 Submodule Out of Sync

**Symptom:** Different team members have different content versions.

**Solution:**
```bash
# Everyone runs:
git pull origin main
git submodule update --init --recursive

# Verify everyone is on same commit:
git submodule status
```

---

## 8. Rollback Plan

If something goes wrong, here's how to revert to the original structure:

### 8.1 Quick Rollback (Before Pushing)

```bash
# Reset to before submodule was added
git reset --hard HEAD~2

# Remove submodule
git submodule deinit -f src/content
rm -rf .git/modules/src/content
git rm -f src/content

# Restore content from backup
tar -xzf ~/content-backup-*.tar.gz
git add src/content/
git commit -m "chore: rollback submodule migration"
```

### 8.2 Full Rollback (After Pushing)

```bash
# 1. Find the commit before submodule migration
git log --oneline --all | grep "remove content directory"
# Note the commit hash BEFORE this commit (e.g., abc1234)

# 2. Extract content from that commit
git checkout abc1234 -- src/content

# 3. Remove submodule configuration
git submodule deinit -f src/content
rm -rf .git/modules/src/content
git rm -f src/content
rm -f .gitmodules

# 4. Re-add content as regular directory
git add src/content/
git add .gitmodules  # (will be deleted)

# 5. Commit rollback
git commit -m "chore: rollback submodule migration, restore content as regular directory"

# 6. Force push (if necessary)
git push origin main --force-with-lease
```

### 8.3 Verify Rollback

```bash
# Check content is back
ls src/content/
find src/content -type f | wc -l

# Verify no submodule config
cat .gitmodules  # Should not exist
git submodule status  # Should show nothing

# Test build
pnpm build
```

---

## 9. Command Reference

### Essential Daily Commands

```bash
# Clone project with submodules
git clone --recurse-submodules <repo-url>

# Pull latest changes (main repo + submodules)
git pull --recurse-submodules

# Update submodules to latest
git submodule update --remote --merge

# Check submodule status
git submodule status

# Initialize submodules (if forgotten during clone)
git submodule update --init --recursive
```

### Content Editing Workflow

```bash
# 1. Navigate to content
cd src/content

# 2. Ensure you're on a branch (not detached)
git checkout main
git pull origin main

# 3. Make changes
# ... edit files ...

# 4. Commit in content repo
git add .
git commit -m "feat: your changes"
git push origin main

# 5. Update main repo reference
cd ../..
git add src/content
git commit -m "chore: update content submodule"
git push origin main
```

### Submodule Management

```bash
# Add a submodule
git submodule add <repo-url> <path>

# Remove a submodule
git submodule deinit -f <path>
git rm -f <path>
rm -rf .git/modules/<path>

# Update submodule URL
git config -f .gitmodules submodule.<path>.url <new-url>
git submodule sync

# Reset submodule to tracked commit
git submodule update --init --recursive

# Update all submodules to latest remote
git submodule update --remote --merge
```

### Troubleshooting Commands

```bash
# Show submodule configuration
cat .gitmodules
git config --list | grep submodule

# Show submodule commit info
git ls-tree main src/content

# Reinitialize submodule from scratch
git submodule deinit -f src/content
rm -rf .git/modules/src/content
git submodule update --init --recursive

# Check for detached HEAD
cd src/content && git status

# List files in submodule
git ls-files src/content
```

### Cloudflare-Specific

```bash
# Local build with submodule check
git submodule update --init --recursive && pnpm build

# Deploy with Wrangler
pnpm build  # Includes wrangler deploy

# Test deployment locally
wrangler dev
```

---

## Additional Resources

### Documentation

- **Git Submodules:** https://git-scm.com/book/en/v2/Git-Tools-Submodules
- **Cloudflare Pages Git Integration:** https://developers.cloudflare.com/pages/configuration/git-integration/
- **Astro Build Configuration:** https://docs.astro.build/en/reference/configuration-reference/

### Project-Specific

- Main repository: https://github.com/hostoftheshell/DrknssCheninFR
- Content repository: https://github.com/hostoftheshell/DrknssCheninFR-content _(after creation)_
- Deployed site: https://darkness.chenin.fr/

### Support

- Open an issue: https://github.com/hostoftheshell/DrknssCheninFR/issues
- Check CI/CD logs: Cloudflare Dashboard → Workers & Pages → Your Project → Deployments

---

## Summary Checklist

### Migration Phase

- [ ] Create content repository on GitHub
- [ ] Initialize content repo with existing content
- [ ] Remove content from main repo git tracking
- [ ] Add content as submodule
- [ ] Test fresh clone
- [ ] Verify build works locally

### Deployment Configuration

- [ ] Grant Cloudflare access to both repositories
- [ ] Update .gitmodules to use HTTPS
- [ ] Configure build settings in Cloudflare
- [ ] Test deployment
- [ ] Verify deployed site

### Team Onboarding

- [ ] Update README with clone instructions
- [ ] Document content update workflow
- [ ] Share this migration guide
- [ ] Update CI/CD documentation

---

**Last Updated:** 2025-01-XX  
**Version:** 1.0  
**Author:** DrknssCheninFR Team
