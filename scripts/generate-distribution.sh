#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
BUILD_DIR="${MAI_TOOLS_BUILD_DIR:-$ROOT_DIR/build}"
SOURCE_DIR="${MAI_TOOLS_SOURCE_DIR:-$ROOT_DIR}"
BUNDLE_FILE="$BUILD_DIR/scripts/all-in-one.js"

date_part() {
  format="$1"
  timestamp="$2"
  date -u -d "@$timestamp" "$format" 2>/dev/null ||
    date -u -r "$timestamp" "$format" 2>/dev/null ||
    date -u "$format"
}

strip_leading_zeroes() {
  value=$(printf '%s' "$1" | sed 's/^0*//')
  if [ -z "$value" ]; then
    value=0
  fi
  printf '%s' "$value"
}

version_from_source() {
  commit_count=$(git -C "$SOURCE_DIR" rev-list --count HEAD 2>/dev/null || true)
  commit_timestamp=$(git -C "$SOURCE_DIR" log -1 --format=%ct 2>/dev/null || true)

  case "$commit_count" in
    ''|*[!0-9]*) commit_count=1 ;;
  esac
  case "$commit_timestamp" in
    ''|*[!0-9]*) commit_timestamp=$(date -u +%s) ;;
  esac

  year=$(strip_leading_zeroes "$(date_part +%y "$commit_timestamp")")
  day=$(strip_leading_zeroes "$(date_part +%j "$commit_timestamp")")
  count=$((commit_count % 65536))
  printf '0.%s.%s.%s' "$year" "$day" "$count"
}

validate_version() {
  version="$1"
  old_ifs=$IFS
  IFS=.
  set -- $version
  IFS=$old_ifs

  if [ "$#" -lt 1 ] || [ "$#" -gt 4 ]; then
    return 1
  fi

  for part do
    case "$part" in
      ''|*[!0-9]*) return 1 ;;
    esac
    if [ "$part" -gt 65535 ]; then
      return 1
    fi
  done
}

if [ -n "${MAI_TOOLS_VERSION:-}" ]; then
  VERSION="$MAI_TOOLS_VERSION"
else
  VERSION=$(version_from_source)
fi

if ! validate_version "$VERSION"; then
  echo "Invalid extension version: $VERSION" >&2
  exit 1
fi

if [ ! -f "$BUNDLE_FILE" ]; then
  echo "Missing $BUNDLE_FILE. Run npm run build before packaging extensions." >&2
  exit 1
fi

echo "Packaging mai-tools distribution version $VERSION"

echo "Generating icon set"
node "$ROOT_DIR/scripts/generate-icons.mjs"

mkdir -p "$ROOT_DIR/extensions/chrome" "$ROOT_DIR/extensions/firefox" "$ROOT_DIR/extensions/samsung-internet"
cp "$BUNDLE_FILE" "$ROOT_DIR/extensions/chrome/all-in-one.js"
cp "$BUNDLE_FILE" "$ROOT_DIR/extensions/firefox/all-in-one.js"
cp "$BUNDLE_FILE" "$ROOT_DIR/extensions/samsung-internet/all-in-one.js"

cat > "$ROOT_DIR/install-mai-tools.meta.js" <<META
// ==UserScript==
// @name         run mai-tools on all maimaidx-net pages
// @namespace    https://github.com/hvboq/mai-tools
// @version      $VERSION
// @description  run mai-tools on all maimaidx-net pages
// @author       Ming-Yuan Jian
// @contributor  hvboq (distribution & packaging)
// @match        https://maimaidx.jp/*
// @match        https://maimaidx-eng.com/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// @downloadURL  https://cdn.jsdelivr.net/gh/hvboq/mai-tools@gh-pages/install-mai-tools.user.js
// @updateURL    https://cdn.jsdelivr.net/gh/hvboq/mai-tools@gh-pages/install-mai-tools.meta.js
// ==/UserScript==
META

cat > "$ROOT_DIR/install-mai-tools.user.js" <<USER
// ==UserScript==
// @name         run mai-tools on all maimaidx-net pages
// @namespace    https://github.com/hvboq/mai-tools
// @version      $VERSION
// @description  run mai-tools on all maimaidx-net pages
// @author       Ming-Yuan Jian
// @contributor  hvboq (distribution & packaging)
// @match        https://maimaidx.jp/*
// @match        https://maimaidx-eng.com/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// @downloadURL  https://cdn.jsdelivr.net/gh/hvboq/mai-tools@gh-pages/install-mai-tools.user.js
// @updateURL    https://cdn.jsdelivr.net/gh/hvboq/mai-tools@gh-pages/install-mai-tools.meta.js
// ==/UserScript==

(function() {
    'use strict';
    const scriptId = 'mai-tools-user-script-loader';
    if (document.getElementById(scriptId)) {
        return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://hvboq.github.io/mai-tools/scripts/all-in-one.js?t=' + Math.floor(Date.now() / 60000);
    script.onload = function() {
        script.remove();
    };
    (document.body || document.documentElement).append(script);
})();
USER

cat > "$ROOT_DIR/extensions/chrome/content-script.js" <<'CHROME_CS'
(() => {
  const marker = "data-mai-tools-extension";
  if (document.documentElement.hasAttribute(marker)) {
    return;
  }

  document.documentElement.setAttribute(marker, "chrome");

  const scriptUrl = chrome.runtime.getURL("all-in-one.js");
  const script = document.createElement("script");
  script.src = scriptUrl;
  script.dataset.source = "mai-tools-chrome-extension";
  script.onload = () => script.remove();
  (document.body || document.documentElement).append(script);
})();
CHROME_CS

cat > "$ROOT_DIR/extensions/chrome/manifest.json" <<MANIFEST_CHROME
{
  "manifest_version": 3,
  "name": "mai-tools",
  "version": "$VERSION",
  "description": "Run mai-tools on all maimaidx-net pages.",
  "icons": {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  "content_scripts": [
    {
      "matches": [
        "https://maimaidx.jp/*",
        "https://maimaidx-eng.com/*"
      ],
      "js": [
        "content-script.js"
      ],
      "run_at": "document_idle"
    }
  ],
  "host_permissions": [
    "https://maimaidx.jp/*",
    "https://maimaidx-eng.com/*"
  ],
  "web_accessible_resources": [
    {
      "resources": [
        "all-in-one.js"
      ],
      "matches": [
        "https://maimaidx.jp/*",
        "https://maimaidx-eng.com/*"
      ]
    }
  ]
}
MANIFEST_CHROME

cat > "$ROOT_DIR/extensions/firefox/content-script.js" <<'FIREFOX_CS'
(() => {
  const marker = "data-mai-tools-extension";
  if (document.documentElement.hasAttribute(marker)) {
    return;
  }

  document.documentElement.setAttribute(marker, "firefox");

  const runtime = globalThis.browser?.runtime || globalThis.chrome?.runtime;
  const scriptUrl = runtime.getURL("all-in-one.js");
  const script = document.createElement("script");
  script.src = scriptUrl;
  script.dataset.source = "mai-tools-firefox-extension";
  script.onload = () => script.remove();
  (document.body || document.documentElement).append(script);
})();
FIREFOX_CS

cat > "$ROOT_DIR/extensions/firefox/manifest.json" <<MANIFEST_FIREFOX
{
  "manifest_version": 3,
  "name": "mai-tools",
  "version": "$VERSION",
  "description": "Run mai-tools on all maimaidx-net pages.",
  "icons": {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  "browser_specific_settings": {
    "gecko": {
      "id": "mai-tools@hvboq.github.io"
    }
  },
  "content_scripts": [
    {
      "matches": [
        "https://maimaidx.jp/*",
        "https://maimaidx-eng.com/*"
      ],
      "js": [
        "content-script.js"
      ],
      "run_at": "document_idle"
    }
  ],
  "host_permissions": [
    "https://maimaidx.jp/*",
    "https://maimaidx-eng.com/*"
  ],
  "web_accessible_resources": [
    {
      "resources": [
        "all-in-one.js"
      ],
      "matches": [
        "https://maimaidx.jp/*",
        "https://maimaidx-eng.com/*"
      ]
    }
  ]
}
MANIFEST_FIREFOX

cat > "$ROOT_DIR/extensions/samsung-internet/content-script.js" <<'SAMSUNG_CS'
(() => {
  const marker = "data-mai-tools-extension";
  if (document.documentElement.hasAttribute(marker)) {
    return;
  }

  document.documentElement.setAttribute(marker, "samsung-internet");

  const runtime = globalThis.chrome?.runtime || globalThis.browser?.runtime;
  const scriptUrl = runtime.getURL("all-in-one.js");
  const script = document.createElement("script");
  script.src = scriptUrl;
  script.dataset.source = "mai-tools-samsung-internet-extension";
  script.onload = () => script.remove();
  (document.body || document.documentElement).append(script);
})();
SAMSUNG_CS

cat > "$ROOT_DIR/extensions/samsung-internet/manifest.json" <<MANIFEST_SAMSUNG
{
  "manifest_version": 3,
  "name": "mai-tools",
  "version": "$VERSION",
  "description": "Run mai-tools on all maimaidx-net pages in Samsung Internet.",
  "icons": {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  "content_scripts": [
    {
      "matches": [
        "https://maimaidx.jp/*",
        "https://maimaidx-eng.com/*"
      ],
      "js": [
        "content-script.js"
      ],
      "run_at": "document_idle"
    }
  ],
  "host_permissions": [
    "https://maimaidx.jp/*",
    "https://maimaidx-eng.com/*"
  ],
  "web_accessible_resources": [
    {
      "resources": [
        "all-in-one.js"
      ],
      "matches": [
        "https://maimaidx.jp/*",
        "https://maimaidx-eng.com/*"
      ]
    }
  ]
}
MANIFEST_SAMSUNG

rm -f "$ROOT_DIR/mai-tools-chrome-extension.zip" "$ROOT_DIR/mai-tools-firefox-extension.zip" "$ROOT_DIR/mai-tools-samsung-internet-extension.zip"
node "$ROOT_DIR/scripts/pack-extension.mjs" "$ROOT_DIR/extensions/chrome" "$ROOT_DIR/mai-tools-chrome-extension.zip"
node "$ROOT_DIR/scripts/pack-extension.mjs" "$ROOT_DIR/extensions/firefox" "$ROOT_DIR/mai-tools-firefox-extension.zip"
node "$ROOT_DIR/scripts/pack-extension.mjs" "$ROOT_DIR/extensions/samsung-internet" "$ROOT_DIR/mai-tools-samsung-internet-extension.zip"
