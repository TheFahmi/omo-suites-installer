# OMO Suites - Final Release Summary (v1.14.0)

## 🚀 Key Features Shipped
This release solidifies OMO Suites as a comprehensive AI toolkit for OpenCode power users. Key additions include:

- **Diagnostic Tooling:** `omocs doctor` and `omocs self-test` for environment health checks and core integration validation.
- **Enhanced Configuration Management:** Strict configuration validation via `omocs config validate`, import/export capabilities (`omocs export`, `omocs import`), and configuration templating (`omocs template`).
- **Debugging & Output Control:** `--debug` and `--verbose` flags across all commands for granular visibility into CLI operations.
- **Automation & Background Tasks:** `omocs auto` to manage background checks (doctor, index, compact, template), and `omocs watch` to auto-regenerate AGENTS.md based on project structure changes.
- **Advanced Agent Operations:** `omocs squad` to launch parallel OpenCode agent instances, and `omocs worktree` for git worktree management (task isolation).
- **Workspace Tooling:** `omocs memory` for persistent workspace notes, `omocs check` for AI-generated code/comment scanning, and `omocs index` for workspace metadata caching.
- **Testing & Stability:** Established Vitest foundation for unit/smoke testing.

## 🛠️ Upgrade Notes
To upgrade from a previous version, run:
```bash
npm update -g omo-suites
# or using bun
bun update -g omo-suites
```

After updating, we highly recommend verifying your installation:
```bash
omocs doctor
```
If you encounter issues, re-run failing commands with the `--debug` flag and review the updated [Troubleshooting Guide](troubleshooting.md).
