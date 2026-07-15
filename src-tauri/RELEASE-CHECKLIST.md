# Margin Modeler release checklist

## One-time setup

1. Copy `.github/workflows/release.yml` to the same path in the project.
2. Copy `src-tauri/tauri.macos.conf.json` into the project's `src-tauri` folder.
3. In `src-tauri/tauri.conf.json`, use one version source:

```json
"version": "../package.json"
```

4. Keep the `identifier` in `src-tauri/tauri.conf.json` unchanged after the first public release.
5. Commit and push the setup files.

## Create a release

Start with a clean, tested project:

```bash
npm install
npm run tauri dev
```

Commit the application changes:

```bash
git add .
git commit -m "Describe the update"
```

Increase the version. Use `patch` for small updates, `minor` for a feature release, or `major` for a breaking release:

```bash
npm version patch
```

Push the commit and the version tag:

```bash
git push origin main
git push origin --tags
```

GitHub Actions will build:

- Windows x64 NSIS installer
- macOS Apple Silicon DMG
- macOS Intel DMG

The release is created as a draft. After all three jobs are green, open GitHub → Releases, inspect the files, and publish the draft.

## Version examples

- `1.0.0` → `1.0.1`: patch, bug fix or small UI change
- `1.0.1` → `1.1.0`: minor, new feature
- `1.1.0` → `2.0.0`: major, incompatible change

## Important unsigned-build warning

The included macOS configuration uses ad-hoc signing. It helps Apple Silicon builds launch correctly, but macOS can still require the user to approve the app in Privacy & Security. An unsigned Windows installer can show Microsoft SmartScreen. Proper public distribution without these warnings requires platform code-signing certificates.
