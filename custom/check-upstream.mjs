import * as NodeChildProcess from "node:child_process";
import * as NodeURL from "node:url";

const cwd = NodeURL.fileURLToPath(new URL("..", import.meta.url));

function git(...args) {
  return NodeChildProcess.execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

try {
  const remote = git("remote", "get-url", "upstream");
  const head = git("ls-remote", "--symref", "upstream", "HEAD");
  const branch = /^ref: refs\/heads\/(.+)\s+HEAD$/m.exec(head)?.[1];
  const commit = /^([0-9a-f]{40,64})\s+HEAD$/m.exec(head)?.[1];
  if (!branch || !commit)
    throw new Error("Could not determine the upstream default branch and commit.");
  const local = git("rev-parse", "HEAD");
  let contains = false;
  try {
    git("merge-base", "--is-ancestor", commit, local);
    contains = true;
  } catch {
    // The remote commit may not be present locally; this check never fetches or changes refs.
  }
  console.log(
    JSON.stringify(
      { remote, branch, upstreamCommit: commit, localCommit: local, containsUpstream: contains },
      null,
      2,
    ),
  );
  if (!contains)
    console.log("Upstream may have new changes. Fetch and review them before updating.");
} catch (error) {
  console.error(`Upstream check failed: ${error.message}`);
  process.exitCode = 1;
}
