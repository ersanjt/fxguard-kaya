#!/bin/bash
# Deploy fxguard.io storefront from GitHub to cPanel public_html (WHM / AlmaLinux).
# Run as root on the hosting server (e.g. server.netinode.net):
#   bash deploy-to-cpanel.sh
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/ersanjt/fxguard-kaya.git}"
BRANCH="${BRANCH:-main}"
DEPLOY_DIR="${DEPLOY_DIR:-/root/fxguard-kaya}"
DOCROOT="${DOCROOT:-/home/fxguard/public_html}"
CPANEL_USER="${CPANEL_USER:-fxguard}"

echo "==> FXGuard.io cPanel deploy"
echo "    repo:    $REPO_URL ($BRANCH)"
echo "    workdir: $DEPLOY_DIR"
echo "    docroot: $DOCROOT"

if ! command -v git >/dev/null 2>&1; then
  echo "ERROR: git not installed. On AlmaLinux: yum install -y git"
  exit 1
fi

if ! command -v rsync >/dev/null 2>&1; then
  echo "ERROR: rsync not installed. On AlmaLinux: yum install -y rsync"
  exit 1
fi

# Auto-detect document root for fxguard.io if default path missing
if [ ! -d "$DOCROOT" ]; then
  echo "==> $DOCROOT not found — searching cPanel userdata ..."
  FOUND=""
  if [ -d /var/cpanel/userdata ]; then
    FOUND=$(grep -rl 'fxguard\.io' /var/cpanel/userdata 2>/dev/null | head -1 || true)
    if [ -n "$FOUND" ] && grep -q 'documentroot:' "$FOUND" 2>/dev/null; then
      DOCROOT=$(grep 'documentroot:' "$FOUND" | head -1 | awk '{print $2}')
      echo "    found documentroot: $DOCROOT"
    fi
  fi
  if [ ! -d "$DOCROOT" ] && [ -d "/home/$CPANEL_USER/public_html" ]; then
    DOCROOT="/home/$CPANEL_USER/public_html"
    echo "    fallback docroot: $DOCROOT"
  fi
fi

if [ ! -d "$DOCROOT" ]; then
  echo "ERROR: Document root not found. Set DOCROOT=/path/to/public_html and re-run."
  exit 1
fi

if [ ! -d "$DEPLOY_DIR/.git" ]; then
  echo "==> Cloning repository ..."
  git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$DEPLOY_DIR"
else
  echo "==> Updating repository ..."
  cd "$DEPLOY_DIR"
  git fetch origin "$BRANCH"
  git reset --hard "origin/$BRANCH"
fi

cd "$DEPLOY_DIR"

if [ ! -d fxguard-io-landing ]; then
  echo "ERROR: fxguard-io-landing/ missing in repo checkout"
  exit 1
fi

echo "==> Syncing fxguard-io-landing/ -> $DOCROOT (keeping .well-known) ..."
rsync -a --delete --exclude '.well-known' fxguard-io-landing/ "$DOCROOT/"

if id "$CPANEL_USER" >/dev/null 2>&1; then
  chown -R "$CPANEL_USER:$CPANEL_USER" "$DOCROOT"
  echo "==> Ownership set to $CPANEL_USER"
fi

echo "==> Quick checks (local files) ..."
test -f "$DOCROOT/privacy.html" && echo "  OK privacy.html"
test -f "$DOCROOT/llms.txt" && echo "  OK llms.txt"
test -f "$DOCROOT/.htaccess" && echo "  OK .htaccess"

echo ""
echo "Done. In your browser test:"
echo "  https://fxguard.io/privacy"
echo "  https://fxguard.io/llms.txt"
echo ""
echo "If Cloudflare still shows old pages: Purge Cache in Cloudflare dashboard."
