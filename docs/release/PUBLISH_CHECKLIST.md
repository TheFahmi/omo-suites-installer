# Publishing Checklist (v1.14.0)

## ✅ Pre-flight
- [ ] Ensure all local changes are committed.
- [ ] Run test suite (`bun run test` or `npm run test`) and ensure all tests pass.
- [ ] Run a manual build (`bun run build` or `npm run build`) and verify the output in `dist/`.
- [ ] Perform a manual smoke test using `omocs self-test` and `omocs doctor`.
- [ ] Verify `package.json` version matches the intended release version (currently `1.14.0`).
- [ ] Verify dependencies are up-to-date and locked correctly in `package-lock.json` / `bun.lock`.

## 📝 Documentation
- [ ] Review `CHANGELOG.md` for accuracy and completeness.
- [ ] Ensure `README.md` reflects current CLI capabilities and commands.
- [ ] Verify `FINAL_RELEASE_SUMMARY.md` covers all key selling points for this release.

## 🚀 Publish Steps
1. Push all finalized commits to the `main` branch.
2. (Manual Decision) Review any outstanding PRs or last-minute fixes.
3. If necessary, tag the release via git: `git tag v1.14.0 && git push origin v1.14.0`
4. Publish to npm: `npm publish` (ensure you are logged in and have the correct permissions).
5. Create a GitHub Release using the contents of `FINAL_RELEASE_SUMMARY.md`.

## 🛑 Post-Publish Verification
- [ ] Verify the package is live on npm (`npm view omo-suites version`).
- [ ] Perform a clean global install on a test machine to ensure the package resolves and runs correctly.
