# Git Submodule Quick Reference

> **TL;DR:** Content lives in a separate repo. Use `--recurse-submodules` when cloning.

## 🚀 Getting Started

### Clone Project (First Time)
```bash
git clone --recurse-submodules git@github.com:hostoftheshell/DrknssCheninFR.git
```

### Forgot to Clone with Submodules?
```bash
git submodule update --init --recursive
```

---

## 📝 Daily Workflows

### Pull Latest Changes
```bash
# Pull everything (main repo + submodules)
git pull --recurse-submodules

# Or two-step:
git pull origin main
git submodule update --recursive
```

### Edit Content

**Method 1: Quick Edit**
```bash
cd src/content
git checkout main           # Ensure you're on a branch
nano about/about.md         # Edit your files
git add . && git commit -m "docs: update about page"
git push origin main
cd ../..
git add src/content
git commit -m "chore: update content"
git push origin main
```

**Method 2: Content-Only Workflow**
```bash
# Clone just the content repo
git clone git@github.com:hostoftheshell/DrknssCheninFR-content.git
cd DrknssCheninFR-content
# Edit, commit, push as normal
```

### Update Content Reference in Main Repo
```bash
# From main repo root
git submodule update --remote src/content
git add src/content
git commit -m "chore: bump content to latest"
git push origin main
```

---

## 🔍 Checking Status

### Check Submodule Status
```bash
git submodule status
# Output format:
#  <commit-hash> <path> (<branch>)
# Prefix meanings:
#  - = not initialized
#  + = different commit than tracked
#  (none) = matches tracked commit
```

### Check for Content Changes
```bash
cd src/content && git status && cd ../..
```

### See Submodule Diff
```bash
git diff src/content  # Shows commit hash difference
```

---

## 🛠️ Common Issues

### Empty Content Directory
```bash
# Solution:
git submodule update --init --recursive
```

### "Detached HEAD" in src/content
```bash
# This is normal! Submodules track commits, not branches
# To make changes:
cd src/content
git checkout main
# Now you can edit and commit
```

### Submodule Shows as "Modified"
```bash
# Option 1: Update main repo to new commit
git add src/content
git commit -m "chore: update content reference"

# Option 2: Reset to tracked commit
git submodule update --init
```

### Permission Denied
```bash
# Switch to HTTPS in .gitmodules:
[submodule "src/content"]
    path = src/content
    url = https://github.com/hostoftheshell/DrknssCheninFR-content.git

# Then sync:
git submodule sync
git submodule update --init
```

---

## 🏗️ Build & Deploy

### Local Build
```bash
git submodule update --init --recursive
pnpm install
pnpm build
```

### Deploy to Cloudflare
```bash
# Cloudflare Pages automatically runs:
# git submodule update --init --recursive

# Just push to main:
git push origin main
```

### Manual Deploy with Wrangler
```bash
git submodule update --init --recursive
pnpm build  # Includes wrangler deploy
```

---

## 🌿 Branching

### Create Content Branch
```bash
cd src/content
git checkout -b feature/new-post
# Edit files
git add . && git commit -m "feat: add new post"
git push origin feature/new-post
# Create PR on content repo
```

### Use Content Branch in Main Repo
```bash
cd src/content
git fetch origin
git checkout feature/new-post
cd ../..
git add src/content
git commit -m "chore: use content branch for testing"
# Don't push this to main! Only for local testing
```

---

## 🚨 Emergency Rollback

```bash
# If you need to undo the submodule:
git submodule deinit -f src/content
git rm -f src/content
rm -rf .git/modules/src/content

# Restore from backup or previous commit:
git checkout <previous-commit-hash> -- src/content
git add src/content/
git commit -m "chore: rollback to regular directory"
```

---

## 📚 Cheat Sheet

| Task | Command |
|------|---------|
| Clone with submodules | `git clone --recurse-submodules <url>` |
| Init submodules after clone | `git submodule update --init --recursive` |
| Pull all updates | `git pull --recurse-submodules` |
| Update submodule to latest | `git submodule update --remote` |
| Check submodule status | `git submodule status` |
| Go to submodule branch | `cd src/content && git checkout main` |
| Sync submodule URL | `git submodule sync` |
| Reset submodule | `git submodule update --init --force` |

---

## 🔗 Links

- **Full Guide:** [docs/submodule-migration-guide.md](./submodule-migration-guide.md)
- **Main Repo:** https://github.com/hostoftheshell/DrknssCheninFR
- **Content Repo:** https://github.com/hostoftheshell/DrknssCheninFR-content
- **Git Submodules Docs:** https://git-scm.com/book/en/v2/Git-Tools-Submodules

---

**Pro Tip:** Add an alias to your `.bashrc` or `.zshrc`:
```bash
alias gsu='git submodule update --init --recursive'
alias gsp='git pull --recurse-submodules'
```
