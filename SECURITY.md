# Security Policy

## Supported Versions

Security fixes target the latest version on the default branch.

## Reporting a Vulnerability

Please do not open a public issue for a suspected vulnerability.

Report security issues by emailing the maintainer or by opening a private security advisory on GitHub if the repository has advisories enabled.

Include:

- Affected version or commit
- Steps to reproduce
- Impact
- Any suggested fix or mitigation

You should receive an initial response within 72 hours.

## Secrets

Do not commit `.env` files, API keys, database URLs with credentials, tokens, or private certificates. Use `.env.example` for documented configuration only.
