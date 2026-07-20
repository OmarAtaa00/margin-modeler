# Release Checklist

Use this checklist for every Margin Modeler release.

## 1. Release identity

- [ ] Confirm the intended version.
- [ ] Alpha example: `0.2.0-alpha.1`
- [ ] Confirm the Git tag matches: `v0.2.0-alpha.1`
- [ ] Confirm GitHub release is marked as a prerelease.
- [ ] Confirm product and publisher display names.
- [ ] Confirm copyright notice:
      `Copyright © 2026 Omar AtaaAllah. All rights reserved.`
- [ ] Do not change the Tauri identifier:
      `com.omarataaallah.margin-modeler`

## 2. Source state

- [ ] Work from a clean `main` branch.
- [ ] Pull latest changes with fast-forward only.
- [ ] Confirm no generated directories or secrets are tracked.
- [ ] Review `git diff` and recent commits.
- [ ] Confirm version values agree across package, Rust, and Tauri config.
- [ ] Confirm lockfiles are committed.

Suggested commands:

```bash
git checkout main
git pull --ff-only origin main
git status
git diff --check
npm ci
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

## 3. Security review

- [ ] Review Tauri capabilities and remove unused permissions.
- [ ] Enable and test a restrictive Content Security Policy.
- [ ] Confirm no remote scripts or untrusted web content are loaded.
- [ ] Confirm no secrets are committed.
- [ ] Run dependency audits and review results.
- [ ] Generate or update the third-party license inventory.
- [ ] Review exported/imported workspace validation.
- [ ] Verify backup recovery.
- [ ] Verify final queued edits survive immediate app closure.
- [ ] Review GitHub Actions permissions and pin security-sensitive actions.

## 4. Functional tests

- [ ] Create a scenario.
- [ ] Rename a scenario.
- [ ] Add, edit, clone, and delete a resource where supported.
- [ ] Verify new resource ordering.
- [ ] Verify dates in multiple time zones.
- [ ] Verify allocation and direct-hour synchronization.
- [ ] Verify cost, billable value, hours, and margin.
- [ ] Close and reopen the application.
- [ ] Export and re-import a workspace.
- [ ] Confirm malformed imports are rejected safely.
- [ ] Corrupt only a copied primary store and test backup recovery.

## 5. Windows signing

- [ ] Build on a native Windows runner.
- [ ] Sign the main application executable.
- [ ] Sign the NSIS installer.
- [ ] Apply a trusted timestamp.
- [ ] Verify signatures independently.
- [ ] Confirm publisher displays as `Omar AtaaAllah` or the exact validated
      identity issued by the certificate provider.
- [ ] Never commit a private key, certificate password, access token, or
      signing credential.

PowerShell verification:

```powershell
Get-AuthenticodeSignature "C:\path\to\margin-modeler.exe" |
  Format-List Status, StatusMessage, SignerCertificate

Get-AuthenticodeSignature "C:\path\to\margin-modeler-setup.exe" |
  Format-List Status, StatusMessage, SignerCertificate
```

Expected status:

```text
Valid
```

## 6. Checksums

Generate SHA-256 hashes for every released artifact.

Windows PowerShell:

```powershell
Get-FileHash "C:\path\to\artifact.exe" -Algorithm SHA256
```

macOS:

```bash
shasum -a 256 path/to/artifact.dmg
```

- [ ] Publish checksums with the release.
- [ ] Verify uploaded artifacts match locally generated hashes.

## 7. Endpoint-security review

- [ ] Record the exact Defender or CrowdStrike detection, if any.
- [ ] Record SHA-256, path, process details, timestamp, and action.
- [ ] Do not label a detection a false positive without evidence.
- [ ] Submit signed artifacts to the relevant vendor when appropriate.
- [ ] Keep submission or case identifiers.
- [ ] Do not instruct users to disable endpoint protection permanently.

## 8. Persistence tests on Windows

- [ ] Confirm primary native store exists.
- [ ] Confirm backup native store exists.
- [ ] Confirm data survives restart.
- [ ] Confirm removing the executable does not remove the data directory.
- [ ] Confirm backup recovery works using copied test files.

## 9. Release publication

- [ ] Review release notes.
- [ ] State that the release is alpha.
- [ ] State whether Windows and macOS builds are signed/notarized.
- [ ] Upload only final verified artifacts.
- [ ] Upload checksums.
- [ ] Mark the release as prerelease.
- [ ] Test downloads from a clean device.
- [ ] Verify signature and hash after download.

## 10. Post-release

- [ ] Monitor installation failures and endpoint-security alerts.
- [ ] Track known issues.
- [ ] Preserve build logs and signing-verification output.
- [ ] Do not delete the signing audit trail.
