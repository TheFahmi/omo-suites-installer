# Safe Self-Update

OMO Suites includes a safe self-update mechanism that automatically checks for updates in the background.

## Auto-Update Process

1.  **Check**: The CLI checks the npm registry for a newer version (cached for 5 minutes).
2.  **Install**: If a new version is found, it automatically installs it via `npm install -g omo-suites@latest`.
3.  **Verify**: It verifies the installation by running `omocs --version` to ensure the CLI isn't broken.
4.  **Rollback**: If the installation or verification fails, it automatically rolls back to the previous working version.
5.  **Restart**: Upon successful update, the CLI restarts with the new version seamlessly.

## Disabling Auto-Update

If you prefer to update manually or are running in an environment where global installs aren't permitted, you can disable auto-updates:

```bash
export OMOCS_NO_UPDATE=1
```

Auto-updates are also automatically disabled in CI environments (`CI=true`).