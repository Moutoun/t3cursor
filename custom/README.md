# Custom source maintenance

This checkout is an unofficial customization. `upstream` points to the official T3 Code
repository, and custom changes belong on `custom/cursor-experience`.

Run `node custom/check-upstream.mjs` to compare the checked-out commit with the current
upstream default branch without fetching or modifying Git refs. If the upstream commit is
not available locally, the result is inconclusive and the script reports that changes may
be available. Network and Git errors cause a nonzero exit status.

The desktop application's existing updater installs official binary releases; it is not a
source merge mechanism and must not be used to update a customized build. No automated
source merge or rollback mechanism has been implemented yet.

## Custom modifications

- `custom/check-upstream.mjs`: read-only upstream check.
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
