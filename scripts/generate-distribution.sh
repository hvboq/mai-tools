#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
VERSION="${MAI_TOOLS_VERSION:-0.1.1}"
BUILD_BUNDLE="$ROOT_DIR/build/scripts/all-in-one.js"
LOCAL_BUNDLE="$ROOT_DIR/scripts/all-in-one.js"
BUNDLE_URL="${MAI_TOOLS_BUNDLE_URL:-https://hvboq.github.io/mai-tools/scripts/all-in-one.js}"
BUNDLE_TMP=$(mktemp)
trap 'rm -f "$BUNDLE_TMP"' EXIT INT TERM

if [ -f "$BUILD_BUNDLE" ]; then
  cp "$BUILD_BUNDLE" "$BUNDLE_TMP"
elif [ -f "$LOCAL_BUNDLE" ]; then
  cp "$LOCAL_BUNDLE" "$BUNDLE_TMP"
else
  curl -fsSL "$BUNDLE_URL" -o "$BUNDLE_TMP"
fi

mkdir -p "$ROOT_DIR/extensions/chrome" "$ROOT_DIR/extensions/firefox"
cp "$BUNDLE_TMP" "$ROOT_DIR/extensions/chrome/all-in-one.js"
cp "$BUNDLE_TMP" "$ROOT_DIR/extensions/firefox/all-in-one.js"

cat > "$ROOT_DIR/install-mai-tools.meta.js" <<META
// ==UserScript==
// @name         run mai-tools on all maimaidx-net pages
// @namespace    https://github.com/hvboq/mai-tools
// @version      $VERSION
// @description  run mai-tools on all maimaidx-net pages
// @author       Ming-yuen Jien
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
// @author       Ming-yuen Jien
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

  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("all-in-one.js");
  script.dataset.source = "mai-tools-chrome-extension";
  script.onload = () => script.remove();
  (document.head || document.documentElement).append(script);
})();
CHROME_CS

cat > "$ROOT_DIR/extensions/chrome/manifest.json" <<MANIFEST_CHROME
{
  "manifest_version": 3,
  "name": "mai-tools",
  "version": "$VERSION",
  "description": "Run mai-tools on all maimaidx-net pages.",
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

  const script = document.createElement("script");
  script.src = browser.runtime.getURL("all-in-one.js");
  script.dataset.source = "mai-tools-firefox-extension";
  script.onload = () => script.remove();
  (document.head || document.documentElement).append(script);
})();
FIREFOX_CS

cat > "$ROOT_DIR/extensions/firefox/manifest.json" <<MANIFEST_FIREFOX
{
  "manifest_version": 3,
  "name": "mai-tools",
  "version": "$VERSION",
  "description": "Run mai-tools on all maimaidx-net pages.",
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

rm -f "$ROOT_DIR/mai-tools-chrome-extension.zip" "$ROOT_DIR/mai-tools-firefox-extension.zip"
(
  cd "$ROOT_DIR/extensions/chrome"
  zip -qr "$ROOT_DIR/mai-tools-chrome-extension.zip" .
)
(
  cd "$ROOT_DIR/extensions/firefox"
  zip -qr "$ROOT_DIR/mai-tools-firefox-extension.zip" .
)
