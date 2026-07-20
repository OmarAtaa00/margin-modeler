# Margin Modeler

Margin Modeler is a desktop application for planning project scenarios, assigning resources, modeling cost and bill rates, calculating direct hours, and reviewing project margin outcomes.

> **Alpha software**
>
> Margin Modeler is currently under active development. The planned release version is `0.2.0-alpha.1`. Alpha builds are intended for testing and evaluation and may contain defects or incomplete features. Keep independent backups of important workspace exports.

## Current capabilities

- Create and manage project scenarios
- Add and edit resource assignments
- Configure project and resource dates
- Set cost rates, bill rates, allocation, and direct hours
- Calculate project hours, cost, billable value, and margin
- Store workspace data locally using the Tauri Store plugin
- Maintain a local primary store and backup store
- Migrate older browser-based local storage
- Export and import workspace JSON
- Build native installers for macOS and Windows through GitHub Actions

## Technology

- Tauri 2
- React
- TypeScript
- Zustand
- Vite
- Rust

## Data and privacy

Margin Modeler is designed as a local desktop application. Project workspace data is stored on the user’s device. The application does not require an account or a remote application backend.

See [PRIVACY.md](PRIVACY.md) for details.

## Alpha release status

The planned alpha release is:

```text
0.2.0-alpha.1
```

Alpha releases should be published as GitHub **prereleases** and should not be presented as production-stable builds.

Windows binaries must not be described as signed until Authenticode signing has been configured and independently verified.

## Installation

### macOS

Download the correct DMG for the Mac architecture:

- Apple Silicon for M1, M2, M3, M4, and later Apple Silicon systems
- Intel for Intel-based Macs

macOS code signing and notarization should be configured before broad public distribution.

### Windows

Download the Windows NSIS setup executable from the matching GitHub release.

Until Windows Authenticode signing is configured, Windows may display an unknown-publisher warning and managed endpoint-security software may apply additional inspection. Do not disable endpoint protection to install the application.

See [WINDOWS_SIGNING.md](WINDOWS_SIGNING.md).

## Development

### Requirements

- Node.js
- npm
- Rust toolchain
- Tauri platform prerequisites

Install dependencies:

```bash
npm ci
```

Run the web frontend:

```bash
npm run dev
```

Run the Tauri desktop application:

```bash
npm run tauri dev
```

Create a production build:

```bash
npm run build
npm run tauri build
```

## Application data

The Tauri application identifier is:

```text
com.omarataaallah.margin-modeler
```

Do not change this identifier without a deliberate data-migration plan. It determines the platform-specific application-data directory, and changing it can make existing data appear missing.

The native persistence files are:

```text
margin-modeler-store.json
margin-modeler-store.backup.json
```

Users should periodically export important workspaces as an additional independent backup.

## Security

Please read [SECURITY.md](SECURITY.md) before reporting a security issue.

Security-sensitive release requirements are documented in:

- [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md)
- [WINDOWS_SIGNING.md](WINDOWS_SIGNING.md)

## License

Copyright © 2026 Omar AtaaAllah. All rights reserved.

This project is currently proprietary and is **not** licensed under MIT or another open-source license. See [LICENSE.txt](LICENSE.txt).

Third-party dependencies remain subject to their own licenses. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Credits

Created and maintained by **Omar AtaaAllah**.

See [CREDITS.md](CREDITS.md).
