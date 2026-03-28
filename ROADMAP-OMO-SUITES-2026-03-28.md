# OMO Suites Technical Audit & Roadmap

## 1. Executive Summary
Technical audit conducted on the `omo-suites` repository (`v1.14.0`). The project is a solid TypeScript-based CLI and OpenCode plugin toolkit. The core structure is modular (`src/commands`, `src/core`, `src/tui`), but there are gaps in developer experience (DX), error handling, configuration safety, and test coverage.

## 2. Technical Audit

### 2.1 Repository Structure
- **Strengths:** Good separation of concerns (`commands`, `core`, `data`, `tui`, `utils`). Uses Bun for building (`bun build`).
- **Weaknesses:** No `tests/` directory. No CI/CD setup visible. Missing deep API documentation.

### 2.2 Existing Commands & Implementation
- Broad surface area: `doctor`, `mcp`, `lsp`, `profile`, `agent`, `account`, `launchboard`, etc.
- Most commands are standalone functions wired to commander.
- **Bugs/Gaps:**
  - Inconsistent error handling across commands.
  - `doctor` exists but lacks auto-fix/repair capabilities.
  - Config read/write operations lack schema validation (Zod is in `package.json` but under-utilized in `config.ts`).
  - No global retry/timeout wrapper for network operations.

### 2.3 DX & Reliability Issues
- **Lack of structured logging:** Mix of `console.log` and custom UI utils makes debugging hard.
- **Config Safety:** Direct `writeFileSync` in `config.ts` without atomic writes or backup.
- **Silent failures:** Missing verbose mode (`--verbose`) for debugging.

## 3. Implementation Roadmap

### 🔴 MUST DO (High Priority / Foundation)
*These items address critical reliability and core UX issues.*

1. **Config Validation & Safe Edit (`config validate/edit`)**
   - **Reason:** Direct file edits cause crashes. Need Zod schema validation.
   - **Effort:** Low (Zod already installed).
   - **Risk:** Low.
2. **Consistent Debug/Verbose Mode (`--verbose`)**
   - **Reason:** Hard to debug issues without tracing.
   - **Effort:** Low (Update `commander` base options and logger).
   - **Risk:** Low.
3. **Better Error Messages & Structured Logs**
   - **Reason:** Users need actionable errors, not stack traces.
   - **Effort:** Medium (Wrap execution blocks, centralize error formatter).
   - **Risk:** Low.
4. **Retry/Timeout Wrapper**
   - **Reason:** Network calls (LLM, MCP fetches) hang or fail silently.
   - **Effort:** Medium (Implement a generic `withRetry` utility).
   - **Risk:** Low.

### 🟡 SHOULD DO (Medium Priority / UX & Stability)
*These features improve the daily workflow and prevent configuration disasters.*

5. **Setup Wizard (`omocs init` overhaul)**
   - **Reason:** Lower barrier to entry for new users.
   - **Effort:** Medium (Use `inquirer` for interactive setup).
   - **Risk:** Low.
6. **Safe Self-Update & Rollback (`omocs update`)**
   - **Reason:** Prevent broken updates from locking users out.
   - **Effort:** High (Needs backup of current binary/config before replace).
   - **Risk:** Medium.
7. **Config Profiles & Export/Import**
   - **Reason:** Users switch contexts (work/personal) or machines.
   - **Effort:** Medium (Extend existing `profile` command with export/import logic).
   - **Risk:** Low.
8. **Plugin Isolation (Sandboxing)**
   - **Reason:** Prevent rogue MCP/LSP plugins from crashing the main process.
   - **Effort:** High (Requires worker threads or separate processes).
   - **Risk:** High.

### 🟢 NICE TO HAVE (Low Priority / Polish)
*Quality of life improvements.*

9. **Enhanced OMO Doctor & Self-Test**
   - **Reason:** Auto-fix common issues found by `doctor`.
   - **Effort:** High (Writing repair scripts for each check).
   - **Risk:** Medium.
10. **Shell Completion (`omocs completion`)**
    - **Reason:** Faster CLI usage.
    - **Effort:** Low (Commander has built-in completion support).
    - **Risk:** Low.
11. **Telemetry (Opt-in)**
    - **Reason:** Understand usage patterns.
    - **Effort:** Medium (Needs privacy policy, consent flow, backend endpoint).
    - **Risk:** Medium (Privacy concerns).
12. **Template/Bootstrap generation**
    - **Reason:** Quick start for custom MCPs/Agents.
    - **Effort:** Medium.
    - **Risk:** Low.

## 4. Notes on Code Smells
- *Note:* `src/core/config.ts` uses synchronous `fs` calls without atomic safeguards (e.g., write to `.tmp` then rename). This should be fixed when implementing Config Validation.
