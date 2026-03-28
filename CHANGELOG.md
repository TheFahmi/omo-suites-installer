---
# OMO Suites Changelog

## [1.15.0] - 2026-03-28
### Added
- Diagnostics: `omocs doctor` and `omocs self-test` for system health checks and core integration validation.
- Configuration Management: strict config validation (`omocs config validate`), plus `import`/`export` for profiles.
- Setup & Initialization: new setup wizard and bootstrap generator for templates (`omocs template`).
- Robust Operations: global `--debug` and `--verbose` flags across all commands, structured logging with auto-rotation, and retry wrappers with timeouts for network calls.
- Self-Update Mechanism: safe self-update flow with backup and rollback if verification fails.
- Plugin Architecture: plugin isolation layer.
- Telemetry: opt-in telemetry system.
- Testing & Release: Vitest foundation for unit and smoke testing, plus automated docs/release prep.

## Unreleased
### Added
- Structured logging option via `src/utils/logger/index.ts` with auto rotation (`OMOCS_NO_LOGS` to disable)
