# Custom source maintenance

This checkout is an unofficial customization. `upstream` points to the official T3 Code
repository, and custom changes belong on `custom/cursor-experience`.

Run `node custom/check-upstream.mjs` to compare the checked-out commit with the current
upstream default branch without fetching or modifying Git refs. If the upstream commit is
not available locally, the result is inconclusive and the script reports that changes may
be available. Network and Git errors cause a nonzero exit status.

The desktop application's existing updater installs official binary releases; it is not a
source merge mechanism and must not be used to update a customized build.

To merge the official default branch into this source checkout, activate Vite+ and run
`node custom/update-upstream.mjs update`. The command requires a clean
`custom/cursor-experience` branch, creates a neighboring temporary Git worktree, and runs
dependency installation, the repository's changed-code checks, and a build there before
fast-forwarding the checkout. Merge conflicts, validation failures, ignored-file
collisions, or a changed checkout stop the update. A Git backup ref is retained. The
command updates source only; it does not install or replace the running application.

For the latest successful merge, `node custom/update-upstream.mjs rollback` creates and
validates a revert in another worktree before applying it. Rollback requires the merge to
remain at HEAD. After a rollback, reconcile or reapply the reverted changes manually before
running another update, because Git still records the upstream merge in history. The
command never resets or deletes user data. Neither command is connected to Settings yet.

## Custom modifications

- `custom/check-upstream.mjs`: read-only upstream check.
- `custom/update-upstream.mjs`: tested source-update and rollback commands.
- `custom/README.md`: maintenance notes for this checkout.
- `apps/desktop/src/app/DesktopStatePaths.ts`: the desktop backend defaults to
  `~/.t3-custom`, keeping its state separate from the official app. An explicit
  `T3CODE_HOME` still overrides this default.
- `apps/desktop/src/app/DesktopUserData.ts`: custom Electron profiles are separate
  from official profiles; no official browser data is copied automatically. Installer
  identity isolation has not yet been verified with an installed build.
- `apps/desktop/src/app/DesktopEnvironment.ts`, `apps/desktop/package.json`, and
  `scripts/build-desktop-artifact.ts`: custom desktop display name and application ID.
  Installer behavior and protocol registration still require end-to-end verification.
