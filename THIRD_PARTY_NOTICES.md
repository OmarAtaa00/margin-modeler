# Third-Party Notices

Margin Modeler includes third-party software distributed under open-source
licenses.

Copyright in third-party components belongs to their respective authors and
contributors. The Margin Modeler proprietary license applies only to original
Margin Modeler material and does not replace, reduce, or override valid
third-party license rights.

## Required dependency inventory

Before a public release, generate and review an exact dependency and license
inventory from:

- `package-lock.json`
- `src-tauri/Cargo.lock`

The final inventory must include each distributed dependency’s:

- package name;
- version;
- license identifier;
- copyright or attribution notice where required; and
- license text or source reference where required by that license.

Do not treat this placeholder as the completed final dependency notice.

## Suggested review commands

Node dependency reports may be generated with a maintained license-audit tool.
Rust dependency reports may be generated with a maintained Cargo license tool.

Any tool added only for auditing should be reviewed before execution and
should not be included as a runtime dependency unless needed by the app.

## Core projects

Margin Modeler uses technologies including Tauri, Rust, React, TypeScript,
Zustand, and Vite. Their inclusion here is an acknowledgement, not a substitute
for the exact lockfile-derived inventory required before release.
