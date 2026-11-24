import * as NodeAssert from "node:assert/strict";
import * as NodeChildProcess from "node:child_process";
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import * as NodeTest from "node:test";
import { update, rollback } from "./update-upstream.mjs";

function git(cwd, ...args) {
  return NodeChildProcess.execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function fixture() {
  const root = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "t3cursor-update-test-"));
  const upstream = NodePath.join(root, "upstream");
  const checkout = NodePath.join(root, "checkout");
  NodeFS.mkdirSync(upstream);
  git(upstream, "init", "-b", "main");
  git(upstream, "config", "user.name", "Test");
  git(upstream, "config", "user.email", "test@example.invalid");
  git(upstream, "config", "core.autocrlf", "false");
  NodeFS.writeFileSync(NodePath.join(upstream, "base.txt"), "base\n");
  git(upstream, "add", ".");
  git(upstream, "commit", "-m", "base");
  git(root, "clone", upstream, checkout);
  git(checkout, "switch", "-c", "custom/cursor-experience");
  git(checkout, "config", "user.name", "Test");
  git(checkout, "config", "user.email", "test@example.invalid");
  git(checkout, "config", "core.autocrlf", "false");
  git(checkout, "remote", "add", "upstream", upstream);
  NodeFS.writeFileSync(NodePath.join(checkout, "custom.txt"), "custom\n");
  git(checkout, "add", ".");
  git(checkout, "commit", "-m", "custom");
  return {
    root,
    upstream,
    checkout,
    dispose: () => NodeFS.rmSync(root, { recursive: true, force: true }),
  };
}

function upstreamCommit(f, filename, content) {
  NodeFS.writeFileSync(NodePath.join(f.upstream, filename), content);
  git(f.upstream, "add", ".");
  git(f.upstream, "commit", "-m", "upstream change");
}

NodeTest.test(
  "tests a merge in a separate worktree, applies it, and restores the saved tree",
  () => {
    const f = fixture();
    try {
      upstreamCommit(f, "new.txt", "new\n");
      const before = git(f.checkout, "rev-parse", "HEAD");
      let validated = false;
      const result = update(f.checkout, (candidate) => {
        NodeAssert.notEqual(candidate, f.checkout);
        NodeAssert.equal(git(f.checkout, "rev-parse", "HEAD"), before);
        NodeAssert.equal(
          NodeFS.readFileSync(NodePath.join(candidate, "custom.txt"), "utf8"),
          "custom\n",
        );
        NodeAssert.equal(NodeFS.readFileSync(NodePath.join(candidate, "new.txt"), "utf8"), "new\n");
        validated = true;
      });
      NodeAssert.equal(validated, true);
      NodeAssert.equal(git(f.checkout, "rev-parse", "HEAD"), result.after);
      NodeAssert.equal(git(f.checkout, "rev-parse", result.backupRef), before);
      rollback(f.checkout, () => {});
      NodeAssert.equal(NodeFS.existsSync(NodePath.join(f.checkout, "new.txt")), false);
      NodeAssert.equal(
        NodeFS.readFileSync(NodePath.join(f.checkout, "custom.txt"), "utf8"),
        "custom\n",
      );
      NodeAssert.throws(() => update(f.checkout, () => {}), /rolled back/);
    } finally {
      f.dispose();
    }
  },
);

NodeTest.test("leaves the original branch unchanged when validation fails", () => {
  const f = fixture();
  try {
    upstreamCommit(f, "new.txt", "new\n");
    const before = git(f.checkout, "rev-parse", "HEAD");
    NodeAssert.throws(
      () =>
        update(f.checkout, () => {
          throw new Error("tests failed");
        }),
      /tests failed/,
    );
    NodeAssert.equal(git(f.checkout, "rev-parse", "HEAD"), before);
    NodeAssert.equal(NodeFS.existsSync(NodePath.join(f.checkout, "new.txt")), false);
  } finally {
    f.dispose();
  }
});

NodeTest.test("refuses to apply when the checkout changes during validation", () => {
  const f = fixture();
  try {
    upstreamCommit(f, "new.txt", "new\n");
    const before = git(f.checkout, "rev-parse", "HEAD");
    NodeAssert.throws(
      () =>
        update(f.checkout, () =>
          NodeFS.writeFileSync(NodePath.join(f.checkout, "custom.txt"), "new local work"),
        ),
      /Commit or remove/,
    );
    NodeAssert.equal(git(f.checkout, "rev-parse", "HEAD"), before);
    NodeAssert.equal(
      NodeFS.readFileSync(NodePath.join(f.checkout, "custom.txt"), "utf8"),
      "new local work",
    );
  } finally {
    f.dispose();
  }
});

NodeTest.test("reports conflicts without altering the checkout", () => {
  const f = fixture();
  try {
    NodeFS.writeFileSync(NodePath.join(f.checkout, "base.txt"), "custom\n");
    git(f.checkout, "add", ".");
    git(f.checkout, "commit", "-m", "change custom");
    upstreamCommit(f, "base.txt", "upstream\n");
    const before = git(f.checkout, "rev-parse", "HEAD");
    NodeAssert.throws(() => update(f.checkout, () => {}), /conflicts/);
    NodeAssert.equal(git(f.checkout, "rev-parse", "HEAD"), before);
    NodeAssert.equal(
      NodeFS.readFileSync(NodePath.join(f.checkout, "base.txt"), "utf8"),
      "custom\n",
    );
  } finally {
    f.dispose();
  }
});

NodeTest.test("does not overwrite an ignored file or update a dirty checkout", () => {
  const f = fixture();
  try {
    NodeFS.writeFileSync(NodePath.join(f.checkout, ".gitignore"), "ignored.txt\n");
    git(f.checkout, "add", ".gitignore");
    git(f.checkout, "commit", "-m", "ignore local data");
    upstreamCommit(f, "ignored.txt", "upstream\n");
    NodeFS.writeFileSync(NodePath.join(f.checkout, "ignored.txt"), "local\n");
    const before = git(f.checkout, "rev-parse", "HEAD");
    NodeAssert.throws(() => update(f.checkout, () => {}), /Could not apply/);
    NodeAssert.equal(git(f.checkout, "rev-parse", "HEAD"), before);
    NodeAssert.equal(
      NodeFS.readFileSync(NodePath.join(f.checkout, "ignored.txt"), "utf8"),
      "local\n",
    );
    NodeFS.writeFileSync(NodePath.join(f.checkout, "custom.txt"), "dirty\n");
    NodeAssert.throws(() => update(f.checkout, () => {}), /Commit or remove/);
  } finally {
    f.dispose();
  }
});
