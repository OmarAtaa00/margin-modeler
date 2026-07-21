# Security Policy

## Supported versions

Margin Modeler is currently in alpha development.

| Version | Supported |
|---|---|
| Latest published alpha release | Yes |
| Earlier alpha releases | No |
| Unofficial or modified builds | No |

Security fixes are applied to the most recent published alpha release. Users
should update to the latest available version before reporting an issue.

## Reporting a vulnerability

Please do not report security vulnerabilities through public GitHub issues,
discussions, or pull requests.

Use GitHub's private vulnerability reporting feature from the repository's
**Security** tab. If private reporting is unavailable, contact the repository
owner through a private channel.

A useful report should include:

- the affected version;
- the operating system and architecture;
- a clear description of the issue;
- steps to reproduce it;
- the expected and observed behavior;
- the potential security impact; and
- supporting logs or a minimal proof of concept, where safe.

Please remove passwords, access tokens, personal information, employer data,
and other confidential material before submitting a report.

## Coordinated disclosure

Please allow reasonable time for investigation and remediation before making a
vulnerability public.

The project will make a reasonable effort to:

1. acknowledge a complete report;
2. assess its impact and reproducibility;
3. communicate material progress when practical; and
4. publish a fix or mitigation when appropriate.

Response times may vary because Margin Modeler is currently an independently
maintained alpha project.

## Responsible research

Security testing is welcome when it is conducted responsibly.

Researchers must:

- test only systems, devices, accounts, and data they own or are authorized to
  use;
- avoid privacy violations;
- avoid disrupting services or normal use;
- avoid modifying or destroying data;
- stop testing if sensitive information is encountered; and
- comply with applicable laws.

This policy does not authorize testing of third-party systems or users without
their permission.

## Official releases

Only builds published from the official Margin Modeler repository should be
treated as official releases.

Before installing a release:

- confirm that it was downloaded from the official release page;
- verify the published SHA-256 checksum when one is available; and
- review the release notes for signing and platform-support information.

Do not disable antivirus, endpoint protection, or operating-system security
features to install Margin Modeler.

## Scope

Examples of issues that may qualify as security vulnerabilities include:

- unauthorized access to local workspace data;
- unsafe file import or export behavior;
- arbitrary code execution;
- privilege escalation;
- insecure update or release-delivery behavior; and
- exposure of secrets or sensitive data caused by the application.

General feature requests, usability problems, calculation issues, and ordinary
application crashes should be reported through the standard issue tracker
unless they have a clear security impact.

## Security updates

Security-related changes may be included in a normal release or published as a
dedicated security release, depending on severity and urgency.

Copyright © 2026 Omar AtaaAllah. All rights reserved.
