# Privacy Notice

Last updated: 2026-07-20

## Overview

Margin Modeler is designed as a local desktop application. It does not require
a Margin Modeler account and does not require a remote application backend for
normal workspace operation.

## Workspace data

Project scenarios, resources, dates, rates, allocation, direct hours, and other
workspace information are stored locally on the user’s device.

The application uses native Tauri Store files and may retain an older
local-storage recovery copy during migration.

Primary native store:

```text
margin-modeler-store.json
```

Backup native store:

```text
margin-modeler-store.backup.json
```

## Data transmission

The application itself is not intended to transmit workspace content to a
server operated by Omar AtaaAllah.

Users may choose to:

- export a workspace file;
- move or share an exported file;
- attach files to email, cloud storage, or support requests; or
- use operating-system backup and synchronization services.

Those actions are controlled by the user and may be governed by third-party
privacy policies.

## Telemetry and analytics

The current alpha design does not include author-operated analytics,
advertising, or behavioral telemetry.

Operating systems, app stores, GitHub, endpoint-security products, and other
third-party services may independently collect technical data under their own
policies.

## Sensitive information

Do not store secrets, passwords, payment-card information, health information,
or other highly sensitive personal data in Margin Modeler unless an appropriate
security and compliance review has been completed.

## Deleting local data

Uninstalling an application does not always remove its application-data
directory. Users who want to remove workspace data should first export any
required backup, then delete the Margin Modeler application-data directory
using the operating system’s normal file-management tools.

## Changes

This notice may be updated as features such as cloud synchronization,
telemetry, accounts, or remote services are added. Any such feature should be
documented before release.
