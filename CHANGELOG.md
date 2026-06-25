# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Production hardening with security headers, rate limiting, WebSocket authentication, job retries and retention cleanup.
- Shared TypeScript DTOs and WebSocket event contracts in `packages/shared`.
- Paginated check history and service alert history endpoints.
- Dashboard filtering by group and tag.
- CI, issue templates, pull request template and Dependabot configuration.

### Changed

- Browser code no longer stores or sends the API key directly; the dev proxy injects it server-side.

## [0.1.0] - 2026-06-25

### Added

- Initial DevPulse API, worker and React dashboard.
- Service checks, uptime statistics, WebSocket events and alerting.
