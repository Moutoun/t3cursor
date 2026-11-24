import * as NodeAssert from "node:assert/strict";
import * as NodeFS from "node:fs";
import * as NodeTest from "node:test";
import * as NodeVM from "node:vm";

const source = NodeFS.readFileSync(new URL("../apps/desktop/src/boot.ts", import.meta.url), "utf8");

NodeTest.test(
  "desktop boot ignores the official home and disables official updates before startup",
  () => {
    const env = { T3CODE_HOME: "official-data", T3CODE_DISABLE_AUTO_UPDATE: "false" };
    const snapshots = [];
    NodeVM.runInNewContext(source, {
      process: { env },
      require: (name) => snapshots.push({ name, env: { ...env } }),
    });
    NodeAssert.deepEqual(
      snapshots.map((item) => item.name),
      ["./compileCache.cjs", "./main.cjs"],
    );
    for (const snapshot of snapshots) {
      NodeAssert.equal(snapshot.env.T3CODE_HOME, undefined);
      NodeAssert.equal(snapshot.env.T3CODE_DISABLE_AUTO_UPDATE, "true");
    }
  },
);

NodeTest.test("desktop boot honors the T3Cursor-specific data directory", () => {
  const env = { T3CODE_HOME: "official-data", T3CURSOR_HOME: "custom-data" };
  NodeVM.runInNewContext(source, { process: { env }, require: () => {} });
  NodeAssert.equal(env.T3CODE_HOME, "custom-data");
});
