# Windows Signing Guide

## Goal

Windows Authenticode signing should:

- identify the verified publisher;
- show whether a released file was modified after signing;
- sign both the main executable and NSIS installer;
- use SHA-256; and
- include a trusted timestamp.

Signing is one part of release security. It does not guarantee that Microsoft
SmartScreen, Defender, CrowdStrike, or another security product will never
inspect, warn about, or block a new build.

## Publisher identity

Planned personal publisher display name:

```text
Omar AtaaAllah
```

The actual publisher displayed by Windows must match the identity validated and
issued by the certificate or managed signing provider. Do not hardcode a
different company identity.

## Recommended provider approach

For a personal project using GitHub-hosted Windows runners, prefer a
CI-compatible managed signing service or a standards-compliant code-signing
certificate whose private key is protected by approved hardware or cloud key
storage.

Evaluate:

1. Microsoft Artifact Signing, if the account and region are eligible.
2. A reputable individual or organization-validation code-signing provider
   with CI-compatible cloud/HSM integration.
3. Microsoft Store MSIX distribution, where suitable for the product.

Do not buy a certificate until its:

- identity requirements;
- country availability;
- hardware or cloud-key requirements;
- GitHub Actions integration;
- timestamp service;
- annual or monthly cost; and
- renewal process

have been confirmed.

## Repository preparation

Before adding signing:

- keep the repository free of certificate files and credentials;
- add certificate filename patterns to `.gitignore`;
- use GitHub repository or environment secrets;
- restrict the release environment;
- limit workflow permissions;
- build only from protected release tags or approved manual dispatch; and
- pin security-sensitive actions to reviewed commit SHAs where practical.

Potential secret names depend on the selected provider. Examples:

```text
WINDOWS_SIGNING_CERTIFICATE
WINDOWS_SIGNING_CERTIFICATE_PASSWORD
WINDOWS_SIGNING_ACCOUNT
WINDOWS_SIGNING_PROFILE
WINDOWS_SIGNING_CLIENT_ID
WINDOWS_SIGNING_TENANT_ID
```

These are examples only. Add only the secrets required by the chosen provider.

## Tauri integration

Tauri supports Windows signing through its Windows bundle configuration and
can also use a custom signing command for managed providers.

The exact `tauri.conf.json` and `.github/workflows/release.yml` changes must be
written only after the signing provider is selected. Do not add placeholder
credentials or an untested cloud-signing command to the release workflow.

## Required signed files

At minimum verify:

- the final installed application executable; and
- the final NSIS setup executable.

Do not assume that signing one automatically proves the other was signed.

## Verification

On a separate Windows environment:

```powershell
Get-AuthenticodeSignature "C:\path\to\margin-modeler.exe" |
  Format-List Status, StatusMessage, SignerCertificate

Get-AuthenticodeSignature "C:\path\to\margin-modeler-setup.exe" |
  Format-List Status, StatusMessage, SignerCertificate
```

The expected status is:

```text
Valid
```

Also inspect:

```powershell
Get-FileHash "C:\path\to\margin-modeler.exe" -Algorithm SHA256
Get-FileHash "C:\path\to\margin-modeler-setup.exe" -Algorithm SHA256
```

Store the complete outputs with the release audit records.

## Timestamping

Use the timestamp service supported by the certificate or signing provider.
Timestamping allows a valid signature to remain verifiable after the signing
certificate later expires, provided the signature and timestamp were valid
when applied.

## CrowdStrike and Defender

For a detection on a managed device, obtain from the administrator:

- exact detection name;
- detection or incident ID;
- SHA-256;
- affected path;
- whether the installer or installed executable was detected;
- process tree and command line;
- detection time;
- prevention or quarantine action; and
- signer information.

After verifying that the binary is an official, clean build, submit it through
the security vendor’s official false-positive process where appropriate.

Do not create broad exclusions and do not disable endpoint protection
permanently.

## Completion criteria

Signing is complete only when:

- the provider identity is validated;
- GitHub Actions can sign without exposing credentials;
- the app executable signature is valid;
- the NSIS installer signature is valid;
- both signatures include a timestamp;
- hashes are published;
- a clean-device installation succeeds; and
- release records retain the verification output.
