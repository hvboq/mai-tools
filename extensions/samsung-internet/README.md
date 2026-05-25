# Samsung Internet extension target

This folder is a Samsung Internet for Android WebExtension candidate for `mai-tools`.

Samsung Internet mobile extensions are distributed through Galaxy Store and third-party
extensions must be reviewed and approved by Samsung. Public Samsung documentation also
states that the broader mobile extension development program is closed beta. Treat this
folder as the extension payload to validate with Samsung's extension tooling after
joining the program, not as a directly sideloadable Android APK.

## Package contents

- `manifest.json`: Manifest V3 content-script extension metadata.
- `content-script.js`: Injects the packaged `all-in-one.js` file into supported maimai DX NET pages.
- `all-in-one.js`: Built mai-tools bundle copied from `build/scripts/all-in-one.js`.

## Build

Run the normal project build, then generate distribution assets:

```sh
npm ci
npm run build
./scripts/generate-distribution.sh
```

The script writes `mai-tools-samsung-internet-extension.zip` at the repository root.

The package bundles `all-in-one.js` for store review compatibility. Rebuild and repackage
whenever the mai-tools source changes.
