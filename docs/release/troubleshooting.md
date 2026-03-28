# Troubleshooting Guide

If you encounter issues while using OMO Suites, try the following steps before submitting an issue:

## 1. Run Diagnostic Tools
The easiest way to check if your environment is correctly configured is to use the built-in diagnostic tools:
```bash
omocs doctor
```
This command will verify your configuration files, check for required dependencies like `opencode`, and ensure your active profile and agent are valid.

## 2. Enable Verbose and Debug Output
If a command is failing without a clear reason, re-run it with the `--verbose` or `--debug` flag to see more detailed output and stack traces:
```bash
omocs <command> --debug
```

## 3. Configuration Validation
Sometimes issues arise from manually editing the configuration files. You can validate your configuration using:
```bash
omocs config validate
```
This will check for syntax errors and schema mismatches in your `oh-my-opencode.json` and `.opencode.json` files.

## 4. Check the Logs
OMO Suites includes a structured logging system. If you haven't disabled logs (via `OMOCS_NO_LOGS`), you can review the recent log files for errors or warnings.

## 5. Clean Install
If all else fails, a clean install might resolve corrupted configurations:
```bash
npm uninstall -g omo-suites
npm install -g omo-suites
omocs init
```

If the issue persists, please open an issue on the [GitHub repository](https://github.com/TheFahmi/omo-suites-installer/issues) with the output of `omocs doctor` and the debug logs.
