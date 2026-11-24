import { EnvironmentId } from "@t3tools/contracts";
import { expect, it, vi } from "vite-plus/test";
import * as monaco from "monaco-editor";
import { render } from "../../../test/render";

const state = vi.hoisted(() => ({ change: vi.fn(), setQuery: vi.fn() }));
vi.mock("./fileSaveSessions", () => ({
  useFileSaveSession: vi.fn(),
  changeFileSaveSession: state.change,
}));
vi.mock("./projectFilesQueryState", () => ({
  getProjectFileContents: () => "const value = 1;",
  setProjectFileQueryData: state.setQuery,
}));

import MonacoFileEditor from "./MonacoFileEditor";

it("edits a file using the existing save session", async () => {
  state.change.mockReset();
  state.setQuery.mockReset();
  const container = document.createElement("div");
  container.style.height = "500px";
  container.style.width = "800px";
  // The editor is independent of the application router.
  await using screen = await render(
    <MonacoFileEditor
      environmentId={EnvironmentId.make("test")}
      cwd={"C:\\project"}
      relativePath="src/example.ts"
      contents="const value = 1;"
      resolvedTheme="dark"
      wordWrap={false}
      revealLine={null}
      revealRequestId={0}
      onPendingChange={() => {}}
      onFocusReady={() => {}}
    />,
    { container, router: false },
  );
  const editor = screen.container.querySelector<HTMLElement>(".monaco-editor");
  expect(editor).not.toBeNull();
  const instance = monaco.editor.getEditors().find((item) => item.getDomNode() === editor);
  expect(instance).toBeDefined();
  instance!.setPosition({ lineNumber: 1, column: 17 });
  instance!.trigger("test", "type", { text: " " });
  await vi.waitFor(() => expect(state.change).toHaveBeenCalled());
  expect(state.change.mock.lastCall?.[0]).toEqual({
    environmentId: EnvironmentId.make("test"),
    cwd: "C:\\project",
    relativePath: "src/example.ts",
  });
  expect(state.change.mock.lastCall?.[1]).toBe("const value = 1; ");
});
