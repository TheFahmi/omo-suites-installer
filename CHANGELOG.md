---
# OMO Suites Changelog

## [1.16.0] - 2026-03-31
### Added
- Shell Completion: updated `omocs completion` with all 34 CLI commands for bash, zsh, and fish.
- CI/CD: GitHub Actions workflows for continuous integration (`ci.yml`) and automated npm releases (`release.yml`).
- API Documentation: comprehensive command reference at `docs/API.md` covering all commands, config schema, plugin API, and environment variables.

### Fixed
- Test Fixes: resolved `vi.mock` hoisting issues in `auto.test.ts`, `store.test.ts`, and `telemetry.test.ts` using `vi.hoisted()`.
- Test Fix: corrected password mismatch in `crypto.test.ts` encrypt/decrypt test.
- All 221 tests now pass (16 test files, 0 failures).

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
