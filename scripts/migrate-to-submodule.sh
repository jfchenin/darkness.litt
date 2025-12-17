#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CONTENT_DIR="src/content"
CONTENT_REPO_NAME="DrknssCheninFR-content"
MAIN_REPO_REMOTE=$(git remote get-url origin)
GITHUB_ORG=$(echo $MAIN_REPO_REMOTE | sed -E 's|.*[:/]([^/]+)/[^/]+\.git|\1|')
CONTENT_REPO_URL="git@github.com:${GITHUB_ORG}/${CONTENT_REPO_NAME}.git"
BACKUP_DIR="$HOME/content-backup-$(date +%Y%m%d-%H%M%S)"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Git Submodule Migration Script                        ║${NC}"
echo -e "${BLUE}║     Converting src/content to a Git submodule              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to print section headers
section() {
    echo -e "\n${BLUE}▶ $1${NC}"
}

# Function to print success messages
success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print warnings
warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Function to print errors
error() {
    echo -e "${RED}✗ $1${NC}"
}

# Function to prompt for confirmation
confirm() {
    read -p "$(echo -e ${YELLOW}"$1 (y/n): "${NC})" -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        error "Operation cancelled by user"
        exit 1
    fi
}

# Check if we're in the right directory
if [ ! -d ".git" ]; then
    error "Not in a git repository root. Please run from project root."
    exit 1
fi

if [ ! -d "$CONTENT_DIR" ]; then
    error "Content directory '$CONTENT_DIR' not found."
    exit 1
fi

section "Pre-flight Checks"

# Check for uncommitted changes
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    warning "You have uncommitted changes."
    git status --short
    confirm "Do you want to continue anyway?"
fi

# Check if gh CLI is available
if ! command -v gh &> /dev/null; then
    warning "GitHub CLI (gh) not found. You'll need to create the repository manually."
    HAS_GH_CLI=false
else
    success "GitHub CLI found"
    HAS_GH_CLI=true
fi

success "Pre-flight checks complete"

section "Configuration Summary"
echo "  Main repository: $MAIN_REPO_REMOTE"
echo "  Content directory: $CONTENT_DIR"
echo "  Content repository: $CONTENT_REPO_URL"
echo "  Backup location: $BACKUP_DIR"
echo ""

confirm "Proceed with migration?"

# Step 1: Create backup
section "Step 1/7: Creating Backup"
mkdir -p "$BACKUP_DIR"
cp -r "$CONTENT_DIR" "$BACKUP_DIR/"
tar -czf "${BACKUP_DIR}.tar.gz" "$CONTENT_DIR/"
success "Backup created at ${BACKUP_DIR}.tar.gz"

# Step 2: Create inventory
section "Step 2/7: Creating Content Inventory"
find "$CONTENT_DIR" -type f > "${BACKUP_DIR}/inventory.txt"
FILE_COUNT=$(wc -l < "${BACKUP_DIR}/inventory.txt")
success "Inventory created: $FILE_COUNT files"

# Step 3: Commit current state
section "Step 3/7: Committing Current State"
if git diff-index --quiet HEAD -- "$CONTENT_DIR" 2>/dev/null; then
    echo "  No changes to commit in content directory"
else
    git add "$CONTENT_DIR"
    git commit -m "chore: prepare content for submodule migration" || true
    git push origin main
    success "Changes committed and pushed"
fi

# Step 4: Create content repository
section "Step 4/7: Creating Content Repository"

if [ "$HAS_GH_CLI" = true ]; then
    echo "  Creating repository on GitHub..."
    if gh repo create "${GITHUB_ORG}/${CONTENT_REPO_NAME}" --private --description "Content repository for DrknssCheninFR" 2>/dev/null; then
        success "Repository created: ${GITHUB_ORG}/${CONTENT_REPO_NAME}"
    else
        warning "Repository might already exist or creation failed"
        confirm "Continue anyway?"
    fi
else
    warning "Please create the repository manually:"
    echo "  1. Go to https://github.com/new"
    echo "  2. Repository name: $CONTENT_REPO_NAME"
    echo "  3. Set to Private (or Public)"
    echo "  4. DO NOT initialize with README, .gitignore, or license"
    confirm "Have you created the repository?"
fi

# Step 5: Initialize content as git repository
section "Step 5/7: Initializing Content Repository"
cd "$CONTENT_DIR"

if [ -d ".git" ]; then
    error "Content directory already has .git - aborting for safety"
    exit 1
fi

git init
git add .
git commit -m "Initial commit: migrate content from main repository"
git branch -M main
git remote add origin "$CONTENT_REPO_URL"

echo "  Pushing content to remote..."
if git push -u origin main; then
    success "Content pushed to $CONTENT_REPO_URL"
else
    error "Failed to push content. Check your SSH keys and repository access."
    echo "  You can manually push later with: cd $CONTENT_DIR && git push -u origin main"
    confirm "Continue anyway?"
fi

cd ../..

# Step 6: Convert to submodule
section "Step 6/7: Converting to Submodule"

echo "  Removing content from main repository tracking..."
git rm -r --cached "$CONTENT_DIR"
git commit -m "chore: remove content directory in preparation for submodule"

echo "  Deleting content directory..."
rm -rf "$CONTENT_DIR"

echo "  Adding content as submodule..."
git submodule add "$CONTENT_REPO_URL" "$CONTENT_DIR"

# Configure submodule to use HTTPS for better CI/CD compatibility
echo "  Configuring submodule for HTTPS..."
git config -f .gitmodules submodule.${CONTENT_DIR}.url "https://github.com/${GITHUB_ORG}/${CONTENT_REPO_NAME}.git"
git submodule sync

success "Submodule added"

# Step 7: Commit and verify
section "Step 7/7: Finalizing Migration"

git add .gitmodules "$CONTENT_DIR"
git commit -m "chore: convert src/content to git submodule"

echo "  Verifying submodule..."
git submodule status

echo "  Verifying file count..."
NEW_FILE_COUNT=$(find "$CONTENT_DIR" -type f 2>/dev/null | wc -l)
echo "  Original: $FILE_COUNT files"
echo "  Current: $NEW_FILE_COUNT files"

if [ "$FILE_COUNT" -eq "$NEW_FILE_COUNT" ]; then
    success "File count matches!"
else
    warning "File count mismatch. Please verify manually."
fi

success "Migration complete (local changes only)"

section "Next Steps"
echo ""
echo "  ${GREEN}✓${NC} Migration completed successfully!"
echo ""
echo "  To push changes to GitHub:"
echo "    ${BLUE}git push origin main${NC}"
echo ""
echo "  To test fresh clone:"
echo "    ${BLUE}cd /tmp && git clone --recurse-submodules $MAIN_REPO_REMOTE test-clone${NC}"
echo ""
echo "  To configure Cloudflare Pages:"
echo "    1. Grant Cloudflare access to both repositories"
echo "    2. Ensure build command includes: git submodule update --init --recursive"
echo "    3. Deploy and verify"
echo ""
echo "  Backup location: ${YELLOW}${BACKUP_DIR}.tar.gz${NC}"
echo ""
echo "  📚 Full documentation: ${BLUE}docs/submodule-migration-guide.md${NC}"
echo "  📋 Quick reference: ${BLUE}docs/submodule-quick-reference.md${NC}"
echo ""

section "Rollback Instructions"
echo "  If something goes wrong, you can rollback with:"
echo "    ${YELLOW}git reset --hard HEAD~2${NC}"
echo "    ${YELLOW}git submodule deinit -f $CONTENT_DIR${NC}"
echo "    ${YELLOW}git rm -f $CONTENT_DIR${NC}"
echo "    ${YELLOW}rm -rf .git/modules/$CONTENT_DIR${NC}"
echo "    ${YELLOW}tar -xzf ${BACKUP_DIR}.tar.gz${NC}"
echo "    ${YELLOW}git add $CONTENT_DIR/${NC}"
echo "    ${YELLOW}git commit -m 'chore: rollback submodule migration'${NC}"
echo ""

warning "IMPORTANT: Review changes before pushing to GitHub!"
echo ""