# mai-tools distribution package

This workspace contains userscript URLs and bundled extension packages for `mai-tools`.

The original `mai-tools` application is created and maintained by **Ming-Yuan Jian**
([myjian/mai-tools](https://github.com/myjian/mai-tools)). This repository is a
distribution/packaging fork maintained by **hvboq**, which hosts the built artifacts and
produces store-ready userscript and browser-extension packages. All application source
code remains the original author's work; the contributions here are limited to
distribution, packaging, and hosting.

## 1. Userscript subscription URLs

- jsDelivr install URL: `https://cdn.jsdelivr.net/gh/hvboq/mai-tools@gh-pages/install-mai-tools.user.js`
- jsDelivr metadata URL: `https://cdn.jsdelivr.net/gh/hvboq/mai-tools@gh-pages/install-mai-tools.meta.js`
- GitHub Raw install URL: `https://raw.githubusercontent.com/hvboq/mai-tools/gh-pages/install-mai-tools.user.js`
- GitHub Pages loader URL: `https://hvboq.github.io/mai-tools/install-mai-tools.user.js`

`install-mai-tools.user.js` and `install-mai-tools.meta.js` are suitable for script managers that can subscribe to a remote userscript URL, including tools that track `@updateURL` and `@downloadURL`.

## 2. Chrome extension

Recommended install URL for userscript managers:

- `https://cdn.jsdelivr.net/gh/hvboq/mai-tools@gh-pages/install-mai-tools.user.js`

For a native extension install, load the folder below with `chrome://extensions` -> `Load unpacked`.

- `extensions/chrome`
- Packaged archive: `mai-tools-chrome-extension.zip`

The Chrome package is store-oriented: `all-in-one.js` is bundled inside the extension
archive and loaded with `chrome.runtime.getURL`.

## 3. Firefox extension

Recommended install URL for userscript managers:

- `https://cdn.jsdelivr.net/gh/hvboq/mai-tools@gh-pages/install-mai-tools.user.js`

For a native extension install, load the folder below with `about:debugging` -> `This Firefox` -> `Load Temporary Add-on`, then choose `manifest.json`.

- `extensions/firefox`
- Packaged archive: `mai-tools-firefox-extension.zip`

The Firefox package is store-oriented: `all-in-one.js` is bundled inside the extension
archive and loaded from the extension package.

## 4. Samsung Internet extension

Recommended install URL for userscript managers:

- `https://cdn.jsdelivr.net/gh/hvboq/mai-tools@gh-pages/install-mai-tools.user.js`

For Samsung Internet for Android, use the folder below as a WebExtension candidate when
validating with Samsung's extension program tooling.

- `extensions/samsung-internet`
- Packaged archive: `mai-tools-samsung-internet-extension.zip`

Samsung Internet mobile extensions are distributed through Galaxy Store and require Samsung
review/approval before public release. See `extensions/samsung-internet/README.md`.

## Notes

- Chrome, Firefox, and Samsung Internet extension packages bundle `all-in-one.js` for
  store submission. Rebuild and repackage them whenever source code changes.
- Extension icons (`extensions/*/icons/`) are generated from a single geometric
  definition by `scripts/generate-icons.mjs` (`npm run icons`), which emits both the SVG
  source and the 16/32/48/128px PNGs with no native image dependency. The design is an
  original touch-panel motif and deliberately avoids the trademarked maimai logo so the
  packages pass Chrome Web Store / AMO trademark review.
- Extension archives are produced by `scripts/pack-extension.mjs`, a dependency-free
  deterministic zip packer, so packaging works the same on Windows and CI without a
  system `zip` binary.
- Distribution versions are generated from the source repository commit date and count
  unless `MAI_TOOLS_VERSION` is set explicitly.
- The scheduled distribution workflow and GitHub Pages deploy build the upstream
  `myjian/mai-tools` `gh-pages` branch, then write/serve the generated artifacts
  from this repository.
- The userscript remains a remote loader because userscript managers use `@downloadURL`
  and `@updateURL` for subscription-style updates.
- If you only need AdGuard or Unicorn Pro subscription delivery, the jsDelivr userscript URL is the simplest stable URL to expose.
