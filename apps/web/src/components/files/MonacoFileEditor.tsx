import type { EnvironmentId } from "@t3tools/contracts";
import * as monaco from "monaco-editor";
import EditorWorker from "monaco-editor/editor/editor.worker?worker";
import JsonWorker from "monaco-editor/languages/features/json/json.worker?worker";
import CssWorker from "monaco-editor/languages/features/css/css.worker?worker";
import HtmlWorker from "monaco-editor/languages/features/html/html.worker?worker";
import TypeScriptWorker from "monaco-editor/languages/features/typescript/ts.worker?worker";
import { useEffect, useEffectEvent, useRef } from "react";

import { changeFileSaveSession, useFileSaveSession } from "./fileSaveSessions";
import { getProjectFileContents, setProjectFileQueryData } from "./projectFilesQueryState";

globalThis.MonacoEnvironment = {
  getWorker(_workerId, label) {
    if (label === "json") return new JsonWorker();
    if (label === "css" || label === "scss" || label === "less") return new CssWorker();
    if (label === "html" || label === "handlebars" || label === "razor") return new HtmlWorker();
    if (label === "typescript" || label === "javascript") return new TypeScriptWorker();
    return new EditorWorker();
  },
};

interface MonacoFileEditorProps {
  environmentId: EnvironmentId;
  cwd: string;
  relativePath: string;
  contents: string;
  resolvedTheme: "light" | "dark";
  wordWrap: boolean;
  revealLine: number | null;
  revealRequestId: number;
  onPendingChange: (path: string, pending: boolean) => void;
  onFocusReady: (focus: (() => void) | null) => void;
}

export default function MonacoFileEditor(props: MonacoFileEditorProps) {
  const { environmentId, cwd, relativePath, contents, resolvedTheme, wordWrap, onPendingChange } =
    props;
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const applyingExternalChange = useRef(false);
  const saveTarget = { environmentId, cwd, relativePath };
  useFileSaveSession(saveTarget, onPendingChange);
  const onChange = useEffectEvent((value: string) => {
    if (
      applyingExternalChange.current ||
      value === getProjectFileContents(environmentId, cwd, relativePath)
    )
      return;
    setProjectFileQueryData(environmentId, cwd, relativePath, value);
    changeFileSaveSession({ environmentId, cwd, relativePath }, value);
  });
  const onFocusReady = useEffectEvent(props.onFocusReady);
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- Monaco owns an imperative editor and model for this mounted file.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const filename = relativePath.split(/[\\/]/).at(-1) ?? relativePath;
    const extension = filename.includes(".") ? `.${filename.split(".").at(-1)?.toLowerCase()}` : "";
    const language = monaco.languages
      .getLanguages()
      .find(
        (entry) => entry.filenames?.includes(filename) || entry.extensions?.includes(extension),
      )?.id;
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- subsequent contents are synchronized without resetting undo history.
    const model = monaco.editor.createModel(contents, language);
    const editor = monaco.editor.create(container, {
      model,
      automaticLayout: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 13,
    });
    editorRef.current = editor;
    onFocusReady(() => editor.focus());
    const subscription = model.onDidChangeContent(() => onChange(model.getValue()));
    return () => {
      subscription.dispose();
      onFocusReady(null);
      editorRef.current = null;
      editor.dispose();
      model.dispose();
    };
  }, [environmentId, cwd, relativePath]);
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- syncs remote file changes into the external editor model.
  useEffect(() => {
    const model = editorRef.current?.getModel();
    if (!model || model.getValue() === contents) return;
    applyingExternalChange.current = true;
    model.setValue(contents);
    applyingExternalChange.current = false;
  }, [contents]);
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- syncs visual preferences to Monaco.
  useEffect(() => {
    monaco.editor.setTheme(resolvedTheme === "dark" ? "vs-dark" : "vs");
    editorRef.current?.updateOptions({ wordWrap: wordWrap ? "on" : "off" });
  }, [resolvedTheme, wordWrap]);
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- opens a requested file location in the editor.
  useEffect(() => {
    if (props.revealLine === null) return;
    editorRef.current?.revealLineInCenter(props.revealLine);
    editorRef.current?.setPosition({ lineNumber: props.revealLine, column: 1 });
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- repeated navigation to the same line must reveal it again.
  }, [props.revealLine, props.revealRequestId]);
  return (
    <div ref={containerRef} data-testid="monaco-file-editor" className="min-h-0 min-w-0 flex-1" />
  );
}
