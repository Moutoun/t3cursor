import * as NodeChildProcess from "node:child_process";
import * as NodeCrypto from "node:crypto";
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";

const branch = "custom/cursor-experience";

function run(cwd, command, args, { inherit = false } = {}) {
  const result = NodeChildProcess.spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: inherit ? "inherit" : ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = result.stderr?.trim() || result.stdout?.trim() || `exit ${result.status}`;
    throw new Error(`${command} ${args.join(" ")} failed: ${detail}`);
  }
  return result.stdout?.trim() ?? "";
}

const git = (cwd, ...args) => run(cwd, "git", args);

function ensureReady(cwd, expectedHead) {
  if (git(cwd, "branch", "--show-current") !== branch) {
    throw new Error(`Switch to ${branch} before updating.`);
  }
  if (git(cwd, "status", "--porcelain", "--untracked-files=all")) {
    throw new Error("Commit or remove all changes, including untracked files, before updating.");
  }
  const head = git(cwd, "rev-parse", "HEAD");
  if (expectedHead && head !== expectedHead) {
    throw new Error("The branch changed while the update was being tested; no update was applied.");
  }
  return head;
}

function testCandidate(cwd) {
  const executable = "vp";
  run(cwd, executable, ["install", "--frozen-lockfile"], { inherit: true });
  run(cwd, executable, ["run", "check:changed"], { inherit: true });
  run(cwd, executable, ["run", "build"], { inherit: true });
}

function withCandidate(cwd, head, operation) {
  const stagingPath = NodePath.join(
    NodePath.dirname(cwd),
    `.t3cursor-update-${NodeCrypto.randomUUID()}`,
  );
  git(cwd, "worktree", "add", "--detach", stagingPath, head);
  try {
    return operation(stagingPath);
  } finally {
    // Git removes only this uniquely named worktree that this invocation created.
    git(cwd, "worktree", "remove", "--force", stagingPath);
  }
}

function commitGit(cwd, ...args) {
  return git(
    cwd,
    "-c",
    "user.name=T3Cursor Updater",
    "-c",
    "user.email=updater@t3cursor.invalid",
    ...args,
  );
}

function applyCandidate(cwd, before, candidate) {
  ensureReady(cwd, before);
  const backupRef = `refs/t3cursor/backups/${candidate}`;
  try {
    git(cwd, "update-ref", backupRef, before, "");
  } catch (error) {
    let existing;
    try {
      existing = git(cwd, "rev-parse", "--verify", backupRef);
    } catch {
      throw error;
    }
    if (existing !== before) throw error;
  }
  try {
    git(cwd, "merge", "--ff-only", "--no-overwrite-ignore", candidate);
  } catch (error) {
    throw new Error(
      `Could not apply tested commit ${candidate}; backup ${backupRef} remains. ${error.message}`,
    );
  }
  return { before, after: candidate, backupRef };
}

export function update(cwd, validate = testCandidate) {
  cwd = NodeFS.realpathSync(cwd);
  const before = ensureReady(cwd);
  try {
    git(cwd, "rev-parse", "--verify", `refs/t3cursor/rollbacks/${before}`);
  } catch {
    return updateFromUpstream(cwd, before, validate);
  }
  throw new Error(
    "This branch was rolled back. Reapply or reconcile the reverted update before checking for another update; Git otherwise considers it integrated.",
  );
}

function updateFromUpstream(cwd, before, validate) {
  const remoteHead = git(cwd, "ls-remote", "--symref", "upstream", "HEAD");
  const name = /^ref: refs\/heads\/(.+)\s+HEAD$/m.exec(remoteHead)?.[1];
  const advertised = /^([0-9a-f]{40,64})\s+HEAD$/m.exec(remoteHead)?.[1];
  if (!name || !advertised) throw new Error("Cannot determine the upstream default branch.");
  git(cwd, "check-ref-format", "--branch", name);
  const incoming = `refs/t3cursor/incoming/${NodeCrypto.randomUUID()}`;
  try {
    git(cwd, "fetch", "--no-tags", "upstream", `refs/heads/${name}:${incoming}`);
    const fetched = git(cwd, "rev-parse", incoming);
    if (fetched !== advertised)
      throw new Error("Upstream changed during the check; retry the update.");
    if (git(cwd, "merge-base", before, fetched) === fetched)
      return { before, after: before, upToDate: true };
    return withCandidate(cwd, before, (candidatePath) => {
      try {
        commitGit(candidatePath, "merge", "--no-ff", "--no-edit", fetched);
      } catch (error) {
        throw new Error(
          `Upstream merge failed or has conflicts. The working branch was not modified. ${error.message}`,
        );
      }
      const candidate = git(candidatePath, "rev-parse", "HEAD");
      validate(candidatePath);
      if (
        git(candidatePath, "rev-parse", "HEAD") !== candidate ||
        git(candidatePath, "status", "--porcelain", "--untracked-files=all")
      ) {
        throw new Error("Validation changed tracked or untracked files; no update was applied.");
      }
      return applyCandidate(cwd, before, candidate);
    });
  } finally {
    git(cwd, "update-ref", "-d", incoming);
  }
}

export function rollback(cwd, validate = testCandidate) {
  cwd = NodeFS.realpathSync(cwd);
  const before = ensureReady(cwd);
  const backup = `refs/t3cursor/backups/${before}`;
  let original;
  try {
    original = git(cwd, "rev-parse", "--verify", backup);
  } catch {
    throw new Error("The current commit has no matching update backup; nothing was changed.");
  }
  const firstParent = git(cwd, "rev-parse", `${before}^1`);
  if (firstParent !== original)
    throw new Error("The update backup does not match the merge parent.");
  return withCandidate(cwd, before, (candidatePath) => {
    try {
      commitGit(candidatePath, "revert", "--no-edit", "-m", "1", before);
    } catch (error) {
      throw new Error(`Rollback failed; the working branch was not modified. ${error.message}`);
    }
    const candidate = git(candidatePath, "rev-parse", "HEAD");
    if (
      git(candidatePath, "rev-parse", `${candidate}^{tree}`) !==
      git(candidatePath, "rev-parse", `${original}^{tree}`)
    ) {
      throw new Error("Rollback did not reproduce the saved tree; no update was applied.");
    }
    validate(candidatePath);
    if (
      git(candidatePath, "rev-parse", "HEAD") !== candidate ||
      git(candidatePath, "status", "--porcelain", "--untracked-files=all")
    )
      throw new Error("Validation changed files; no rollback was applied.");
    git(cwd, "update-ref", `refs/t3cursor/rollbacks/${candidate}`, before, "");
    return applyCandidate(cwd, before, candidate);
  });
}

const isMain =
  process.argv[1] && NodePath.resolve(process.argv[1]) === NodeURL.fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const action = process.argv[2] ?? "update";
    if (!["update", "rollback"].includes(action) || process.argv.length > 3)
      throw new Error("Usage: node custom/update-upstream.mjs [update|rollback]");
    const result =
      action === "update"
        ? update(NodeURL.fileURLToPath(new URL("..", import.meta.url)))
        : rollback(NodeURL.fileURLToPath(new URL("..", import.meta.url)));
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
