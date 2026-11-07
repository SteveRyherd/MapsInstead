#!/bin/sh
# Publishes the website. docs/ also holds notes and raw files, so only the public pages and images
# are copied into .site-build before uploading.
set -eu
cd "$(dirname "$0")/.."
rm -rf .site-build
mkdir -p .site-build/images
cp docs/index.html docs/setup.html docs/support.html docs/privacy.html docs/style.css docs/site.js .site-build/
cp docs/images/*.png .site-build/images/
for f in docs/images/*.jpg docs/images/*.mp4; do
  if [ -e "$f" ]; then cp "$f" .site-build/images/; fi
done
npx --yes wrangler@4 deploy
