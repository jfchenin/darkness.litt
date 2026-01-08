Assume your main repo is main-repo and content repo is content-repo (both on GitHub). Replace URLs and paths as needed.

    In main-repo root: git submodule add https://github.com/yourorg/content-repo.git src/content clones content into the target path.

Commit the addition: git add .gitmodules src/content && git commit -m "Add content submodule" && git push.

Clone elsewhere: git clone --recurse-submodules https://github.com/yourorg/main-repo.git (or git submodule update --init --recursive post-clone).

Update content: cd src/content && git checkout main && git pull origin main && cd ../.. && git add src/content && git commit -m "Update content" && git push.

For CI/deploy: Add git submodule update --init --recursive to build scripts.

Cloudflare Workers Config

Cloudflare Workers (via Wrangler) supports submodules with Git integration if Cloudflare has repo access. Use Pages for static sites or Workers for functions.

    Grant Access: In GitHub, approve Cloudflare's GitHub App for both main-repo and content-repo (Settings > Integrations).

.gitmodules: Use relative paths like url = ../content-repo.git or SSH git@github.com:yourorg/content-repo.git for auth reuse.

wrangler.toml (Workers project in main-repo):

text
name = "your-worker"
main = "src/index.js"
compatibility_date = "2025-12-12"

[build]
command = "npm install && git submodule update --init --recursive && npm run build"

Deploy: npx wrangler deploy or connect GitHub repo in Workers dashboard (auto-builds on push).

Troubleshoot: Add PAT to .gitmodules URL if HTTPS fails: url = https://ghp_xxx@github.com/yourorg/content-repo.git.

Test locally with wrangler dev after submodule init.
