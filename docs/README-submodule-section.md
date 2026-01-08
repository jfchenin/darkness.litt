## 🔗 Working with Content (Git Submodule)

This project uses a Git submodule for content management. The `src/content/` directory is linked to a separate repository: [`DrknssCheninFR-content`](https://github.com/hostoftheshell/DrknssCheninFR-content).

### Initial Setup

**Clone with submodules (recommended):**
```bash
git clone --recurse-submodules git@github.com:hostoftheshell/DrknssCheninFR.git
```

**Already cloned without submodules?**
```bash
git submodule update --init --recursive
```

### Daily Workflow

**Pull latest changes:**
```bash
git pull --recurse-submodules
```

**Update content:**
```bash
# 1. Navigate to content directory
cd src/content

# 2. Checkout main branch (submodules are in detached HEAD by default)
git checkout main
git pull origin main

# 3. Make your changes
nano darkness/examples/new-post.md

# 4. Commit and push to content repository
git add .
git commit -m "feat: add new blog post"
git push origin main

# 5. Update submodule reference in main repository
cd ../..
git add src/content
git commit -m "chore: update content submodule"
git push origin main
```

### Quick Commands

```bash
# Check submodule status
git submodule status

# Update submodule to latest remote commit
git submodule update --remote src/content

# Initialize missing submodules
git submodule update --init --recursive
```

### Troubleshooting

**Empty `src/content/` directory?**
```bash
git submodule update --init --recursive
```

**Detached HEAD in src/content?**
```bash
cd src/content
git checkout main
```

**Permission denied when cloning?**
- Ensure you have access to both repositories
- Check your SSH keys: `ssh -T git@github.com`

### Documentation

- 📚 **[Complete Migration Guide](./docs/submodule-migration-guide.md)** - Full setup and deployment instructions
- 📋 **[Quick Reference](./docs/submodule-quick-reference.md)** - Common commands and workflows

### For Content Editors

If you only need to edit content (not the site code), you can clone just the content repository:

```bash
git clone git@github.com:hostoftheshell/DrknssCheninFR-content.git
```

Make changes, commit, and push as usual. A developer will then update the submodule reference in the main repository.
