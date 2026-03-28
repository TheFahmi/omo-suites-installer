# OMO Suites - Batch 3D Release Notes

## 🚀 New Features & Enhancements
- **Robust Configuration Validation**: Added strict checks via `config validate`.
- **Diagnostic Tooling**: Introduced `omocs doctor` and `omocs self-test` for comprehensive system health checks and troubleshooting.
- **Enhanced CLI Output**: Added `--debug` and `--verbose` flags across all commands for better visibility into operations and stack traces.
- **Logging System**: Implemented structured logging with auto-rotation.
- **Profile Import/Export**: Added the ability to share custom profiles easily with `omocs profile export` and `import`.
- **Testing Foundation**: Set up Vitest for unit and smoke testing, ensuring better stability.

## 🛠️ Upgrading
If you are upgrading from a previous version, simply run:
```bash
npm update -g omo-suites
```
After updating, we recommend running:
```bash
omocs doctor
```
