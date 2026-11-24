process.env.T3CODE_DISABLE_AUTO_UPDATE = "true";
if (process.env.T3CURSOR_HOME) {
  process.env.T3CODE_HOME = process.env.T3CURSOR_HOME;
} else {
  delete process.env.T3CODE_HOME;
}
require("./compileCache.cjs");
require("./main.cjs");
