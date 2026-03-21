# mai-tools distribution package

This workspace contains three delivery targets for `install-mai-tools.user.js`.

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

The Chrome package bundles `all-in-one.js` locally instead of loading remote code at runtime.

## 3. Firefox extension

Recommended install URL for userscript managers:

- `https://cdn.jsdelivr.net/gh/hvboq/mai-tools@gh-pages/install-mai-tools.user.js`

For a native extension install, load the folder below with `about:debugging` -> `This Firefox` -> `Load Temporary Add-on`, then choose `manifest.json`.

- `extensions/firefox`
- Packaged archive: `mai-tools-firefox-extension.zip`

The Firefox package also bundles `all-in-one.js` locally.

## Notes

- If you want to publish the extensions through stores, keep the bundled `all-in-one.js` updated whenever `https://hvboq.github.io/mai-tools/scripts/all-in-one.js` changes.
- If you only need AdGuard or Unicorn Pro subscription delivery, the jsDelivr userscript URL is the simplest stable URL to expose.
