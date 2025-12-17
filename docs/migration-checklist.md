# Submodule Migration Checklist

## Pre-Migration Phase

### 1. Preparation (Day 0)
- [ ] Read complete migration guide: `docs/submodule-migration-guide.md`
- [ ] Review quick reference: `docs/submodule-quick-reference.md`
- [ ] Notify team members about upcoming changes
- [ ] Schedule migration window (recommend low-traffic period)
- [ ] Ensure you have admin access to GitHub organization
- [ ] Verify GitHub SSH keys are configured: `ssh -T git@github.com`

### 2. Backup & Documentation (Day 0)
- [ ] Create content backup:
  ```bash
  tar -czf ~/content-backup-$(date +%Y%m%d-%H%M%S).tar.gz src/content/
  ```
- [ ] Verify backup exists: `ls -lh ~/content-backup-*.tar.gz`
- [ ] Document file inventory:
  ```bash
  find src/content -type f > ~/content-inventory.txt
  find src/content -type f | wc -l  # Note the count
  ```
- [ ] Note current commit hash: `git rev-parse HEAD`
- [ ] Take screenshot of current directory structure

### 3. Pre-Migration Testing
- [ ] Verify current build works: `pnpm build`
- [ ] Check for uncommitted changes: `git status`
- [ ] Commit all pending changes in `src/content/`
- [ ] Push to GitHub: `git push origin main`
- [ ] Verify deployment is working on production

---

## Migration Phase

### 4. Create Content Repository
- [ ] Create new repository on GitHub:
  - Name: `DrknssCheninFR-content`
  - Visibility: Private (or Public)
  - **DO NOT** initialize with README/license/.gitignore
- [ ] Note repository URL: `git@github.com:hostoftheshell/DrknssCheninFR-content.git`

### 5. Initialize Content Repository
- [ ] Navigate to content directory: `cd src/content`
- [ ] Initialize git: `git init`
- [ ] Add all files: `git add .`
- [ ] Create initial commit:
  ```bash
  git commit -m "Initial commit: migrate content from main repository"
  ```
- [ ] Set main branch: `git branch -M main`
- [ ] Add remote:
  ```bash
  git remote add origin git@github.com:hostoftheshell/DrknssCheninFR-content.git
  ```
- [ ] Push to GitHub: `git push -u origin main`
- [ ] Verify on GitHub web interface that all files are present

### 6. Convert to Submodule
- [ ] Return to main repo root: `cd ../..`
- [ ] Remove content from git tracking:
  ```bash
  git rm -r --cached src/content
  ```
- [ ] Commit removal:
  ```bash
  git commit -m "chore: remove content directory in preparation for submodule"
  ```
- [ ] Delete content directory: `rm -rf src/content`
- [ ] Add as submodule:
  ```bash
  git submodule add git@github.com:hostoftheshell/DrknssCheninFR-content.git src/content
  ```
- [ ] Verify `.gitmodules` file was created: `cat .gitmodules`
- [ ] Check submodule status: `git submodule status`

### 7. Configure for HTTPS (CI/CD Compatibility)
- [ ] Edit `.gitmodules`: `nano .gitmodules`
- [ ] Change URL to HTTPS:
  ```
  url = https://github.com/hostoftheshell/DrknssCheninFR-content.git
  ```
- [ ] Sync configuration: `git submodule sync`

### 8. Commit Submodule
- [ ] Stage changes: `git add .gitmodules src/content`
- [ ] Commit:
  ```bash
  git commit -m "chore: convert src/content to git submodule"
  ```
- [ ] **STOP**: Do NOT push yet
- [ ] Review changes: `git show`
- [ ] Verify file count:
  ```bash
  find src/content -type f | wc -l
  # Compare with original inventory
  ```

---

## Testing Phase

### 9. Local Testing
- [ ] Test build locally: `pnpm build`
- [ ] Verify dist directory: `ls dist/`
- [ ] Test local preview: `pnpm preview`
- [ ] Navigate to content pages and verify they load

### 10. Fresh Clone Test
- [ ] Clone to temp directory:
  ```bash
  cd ~/tmp
  git clone --recurse-submodules file:///home/bap/dev/00_Projets_Pro/DrknssCheninFR test-clone
  ```
- [ ] Verify submodule: `cd test-clone && ls src/content/`
- [ ] Test build: `pnpm install && pnpm build`
- [ ] Verify file count matches original

### 11. Test Without Recursive Flag
- [ ] Clone without submodules:
  ```bash
  cd ~/tmp
  git clone file:///home/bap/dev/00_Projets_Pro/DrknssCheninFR test-clone-2
  ```
- [ ] Verify `src/content` is empty: `ls test-clone-2/src/content/`
- [ ] Initialize submodules:
  ```bash
  cd test-clone-2
  git submodule update --init --recursive
  ```
- [ ] Verify content appears: `ls src/content/`
- [ ] Clean up test clones: `rm -rf ~/tmp/test-clone*`

---

## Deployment Phase

### 12. Push to GitHub
- [ ] Push main repository:
  ```bash
  git push origin main
  ```
- [ ] Verify on GitHub web interface:
  - [ ] `.gitmodules` file exists
  - [ ] `src/content` shows as "@ commit-hash"
  - [ ] Clicking `src/content` links to content repository

### 13. Configure Cloudflare Pages
- [ ] Log in to Cloudflare Dashboard
- [ ] Navigate to **Workers & Pages** → **Pages**
- [ ] Select your project (or create new)
- [ ] Go to **Settings** → **Source**
- [ ] Click **Configure** next to GitHub integration
- [ ] Grant access to **both** repositories:
  - [ ] `hostoftheshell/DrknssCheninFR`
  - [ ] `hostoftheshell/DrknssCheninFR-content`

### 14. Verify Build Settings
- [ ] Check **Settings** → **Builds & deployments**:
  - [ ] Build command: `pnpm install && pnpm build`
  - [ ] Build output directory: `/dist`
  - [ ] Root directory: `/` (or empty)
- [ ] Verify environment variables:
  - [ ] `NODE_VERSION`: `20`
  - [ ] `PNPM_VERSION`: `10.25.0`

### 15. Test Deployment
- [ ] Trigger deployment:
  ```bash
  git commit --allow-empty -m "test: trigger deployment"
  git push origin main
  ```
- [ ] Monitor build logs in Cloudflare Dashboard
- [ ] Look for "Submodule 'src/content'" in logs
- [ ] Verify build completes successfully
- [ ] Check deployment URL: https://darkness.chenin.fr/

### 16. Verify Production
- [ ] Visit homepage: https://darkness.chenin.fr/
- [ ] Test content pages:
  - [ ] About page
  - [ ] Blog posts
  - [ ] Emile Moselly section
- [ ] Verify images load from `src/content/_images/`
- [ ] Check navigation between sections
- [ ] Test on mobile device

---

## Post-Migration Phase

### 17. Team Communication
- [ ] Notify team that migration is complete
- [ ] Share documentation links:
  - [ ] Migration guide: `docs/submodule-migration-guide.md`
  - [ ] Quick reference: `docs/submodule-quick-reference.md`
- [ ] Update team wiki/internal docs
- [ ] Schedule team sync to answer questions

### 18. Update Documentation
- [ ] Update main README with submodule instructions
  - [ ] Use template: `docs/README-submodule-section.md`
- [ ] Add clone instructions to CONTRIBUTING.md (if exists)
- [ ] Update CI/CD documentation
- [ ] Document new content update workflow

### 19. Configure CI/CD (if applicable)
- [ ] Update GitHub Actions workflows (if any)
- [ ] Add submodule initialization to build scripts
- [ ] Test automated builds/deployments

### 20. Cleanup
- [ ] Keep backup for 30 days: `~/content-backup-*.tar.gz`
- [ ] Remove test clones: `rm -rf ~/tmp/test-clone*`
- [ ] Archive old deployment logs
- [ ] Update project management tools (Jira, Trello, etc.)

---

## Verification Checklist

### ✅ Migration Success Criteria
- [ ] Content repository exists on GitHub
- [ ] Main repository has `.gitmodules` file
- [ ] Fresh clone with `--recurse-submodules` works
- [ ] Local build succeeds
- [ ] Cloudflare deployment succeeds
- [ ] Production site displays all content correctly
- [ ] Images from content repo load properly
- [ ] File count matches original inventory
- [ ] No broken links on production site
- [ ] Team members can clone and build successfully

---

## Rollback Plan

### If Migration Fails
- [ ] Stop and document what went wrong
- [ ] Do NOT push to GitHub if issues found locally
- [ ] Reset to before submodule:
  ```bash
  git reset --hard HEAD~2
  git submodule deinit -f src/content
  git rm -f src/content
  rm -rf .git/modules/src/content
  ```
- [ ] Restore from backup:
  ```bash
  tar -xzf ~/content-backup-*.tar.gz
  git add src/content/
  git commit -m "chore: rollback submodule migration"
  ```
- [ ] Test build again: `pnpm build`
- [ ] Push restored state: `git push origin main --force-with-lease`

### If Issues After Deployment
- [ ] Document the issue with screenshots/logs
- [ ] Check build logs in Cloudflare Dashboard
- [ ] Verify both repositories are accessible to Cloudflare
- [ ] Contact Cloudflare support if needed
- [ ] Consider rollback if critical

---

## Timeline Estimate

| Phase | Duration | Risk |
|-------|----------|------|
| Pre-Migration | 30 min | Low |
| Migration | 15 min | Medium |
| Testing | 30 min | Low |
| Deployment | 20 min | Medium |
| Post-Migration | 15 min | Low |
| **Total** | **~2 hours** | **Low-Medium** |

**Recommended Schedule:**
- Perform migration during low-traffic hours
- Have rollback plan ready
- Keep backup for 30 days
- Monitor for 24-48 hours post-migration

---

## Support & Resources

### Documentation
- 📚 Full guide: `docs/submodule-migration-guide.md`
- 📋 Quick reference: `docs/submodule-quick-reference.md`
- 🔧 Migration script: `scripts/migrate-to-submodule.sh`

### External Resources
- Git Submodules: https://git-scm.com/book/en/v2/Git-Tools-Submodules
- Cloudflare Pages: https://developers.cloudflare.com/pages/
- GitHub Issues: https://github.com/hostoftheshell/DrknssCheninFR/issues

### Emergency Contacts
- GitHub: support@github.com
- Cloudflare: https://dash.cloudflare.com/?to=/:account/support
- Project maintainer: [Your contact info]

---

**Migration Date:** _________________  
**Completed By:** _________________  
**Verified By:** _________________  
**Notes:** _________________