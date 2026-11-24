# Custom source maintenance

This checkout is an unofficial customization. `upstream` points to the official T3 Code
repository, and custom changes belong on `custom/cursor-experience`.

Run `node custom/check-upstream.mjs` to compare the checked-out commit with the current
upstream default branch without fetching or modifying Git refs. If the upstream commit is
not available locally, the result is inconclusive and the script reports that changes may
be available. Network and Git errors cause a nonzero exit status.
The GitHub Actions upstream check also runs daily and records the comparison in its job
summary; it never merges or installs updates.

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
remain at HEAD. A later update is refused while a rollback remains in the branch history,
even after additional commits, because Git still records the upstream merge as integrated.
To resume, reapply the rollback with `git revert <rollback-commit>` or reconcile those
changes manually. After reviewing and testing the result, remove the corresponding marker
with `git update-ref -d refs/t3cursor/rollbacks/<rollback-commit>`. List the markers with
`git for-each-ref refs/t3cursor/rollbacks/`. The command never resets or deletes user data.
Neither command is connected to Settings yet.

## Custom modifications

- `custom/check-upstream.mjs`: read-only upstream check.
- `custom/update-upstream.mjs`: tested source-update and rollback commands.
- `custom/README.md`: maintenance notes for this checkout.
- `apps/desktop/src/app/DesktopStatePaths.ts`: the desktop backend defaults to
  `~/.t3cursor`, keeping its state separate from the official app. The packaged
  desktop app uses `T3CURSOR_HOME` for an explicit override and ignores inherited
  `T3CODE_HOME` to avoid accidentally opening the official data directory.
- `apps/desktop/src/app/DesktopUserData.ts`: custom Electron profiles are separate
  from official profiles; no official browser data is copied automatically. Installer
  identity isolation has not yet been verified with an installed build.
- `apps/desktop/src/app/DesktopEnvironment.ts`, `apps/desktop/package.json`, and
  `scripts/build-desktop-artifact.ts`: custom desktop display name and application ID.
  Installer behavior and protocol registration still require end-to-end verification.
