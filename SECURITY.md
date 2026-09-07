# Security policy

This is an experimental, single-owner local application. Only the latest reviewed release is supported. Bind it to loopback; do not expose it directly to the internet or treat agent output as trusted instructions. Host scripts are disabled. Delegation is a bounded, explicitly permitted read-only pilot.

## Reporting a vulnerability

Do not post credentials, private workspace records, exploit payloads containing user data, or unredacted logs in public issues.

Use GitHub's **Security → Report a vulnerability** private reporting option when available. If that option is unavailable, open a public issue containing only a request for a private security contact, without vulnerability details; wait for the maintainer to establish a private channel. There is no guaranteed response SLA or bug bounty.

Include affected commit/release, a minimal reproduction using synthetic data, impact and suggested mitigation. Report only against systems you own or have permission to test. Never send real API keys.

## Operator response

Revoke exposed provider keys and owner tokens before remediation. Preserve private evidence, disable affected capabilities, update to a reviewed release, and verify recovery. Removing a file from the current tree does not remove it from Git history.
