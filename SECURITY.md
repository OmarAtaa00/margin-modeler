# Security Policy

## Supported versions

Margin Modeler is currently alpha software.

| Version | Security support |
|---|---|
| Latest alpha release | Best-effort support |
| Older alpha builds | Not supported |
| Unofficial or modified builds | Not supported |

Only releases published through the official Margin Modeler repository should
be treated as official builds.

## Reporting a vulnerability

Do not disclose a suspected vulnerability in a public issue.

Use GitHub private vulnerability reporting when it is enabled for the
repository. Otherwise, contact the repository owner, Omar AtaaAllah, privately
through an agreed private channel.

Include:

- a clear description of the issue;
- affected version and operating system;
- reproduction steps;
- expected and actual behavior;
- logs, screenshots, or a minimal proof of concept where safe;
- potential security impact; and
- whether the issue has already been disclosed elsewhere.

Do not include real customer, employer, or confidential project data.

## Safe-harbor expectations

Security research must:

- avoid privacy violations and destruction or corruption of data;
- avoid service disruption;
- use only accounts, devices, and data the researcher owns or is authorized to
  test;
- stop when sensitive information is encountered; and
- allow reasonable time for investigation and remediation before disclosure.

This policy does not authorize testing against systems or users that the
researcher does not own or have permission to test.

## Malware and endpoint-security detections

An antivirus or EDR detection is important evidence, but it is not by itself
proof that the application is malicious or clean.

For a suspected false positive, preserve:

- exact detection name and detection ID;
- affected file path;
- SHA-256 hash;
- installer and installed executable;
- process and command-line details;
- detection date and time;
- action taken; and
- the application’s digital-signature status.

Do not recommend permanently disabling Microsoft Defender, CrowdStrike, or
other endpoint protection.

## Release security requirements

Official Windows releases should:

- be Authenticode signed by the verified publisher;
- include a trusted timestamp;
- have both the installed executable and installer signature verified;
- publish SHA-256 checksums;
- use protected CI secrets or a managed signing service;
- avoid committing private keys, tokens, or certificate passwords; and
- follow the project release checklist.

See [WINDOWS_SIGNING.md](WINDOWS_SIGNING.md) and
[RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md).
